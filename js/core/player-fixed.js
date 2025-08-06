import * as THREE from 'three';
import { getTerrainHeightAtPosition } from '../world-generation/index.js';

export class Player {
  constructor(worldRoot, marker=null) {
    this.pos = new THREE.Vector3(0,0,0);
    this.speed = 6;
    this.worldRoot = worldRoot;
    this.marker = marker; // sichtbarer Marker (Mesh)
    this.terrainRef = null; // Terrain-Mesh
    this.hoverOffset = 0.2; // näher am Boden, um natürlicher zu wirken

    // Einfache Boden-/Physik-Parameter
    this.verticalVel = 0;        // vertikale Geschwindigkeit (m/s)
    this.gravity = -18;          // Gravitation
    // Entferne weiche Step-Parameter aus der Logik (wir snappen hart)
    this.footRadius = 0.4;       // Radius für Multi-Ray-Kreuz
    this.avatarHeightOffset = 0.85;// Offset vom Boden bis Avatar
    this.grounded = true;        // ob der Spieler auf dem Boden ist

    // Raycast-basierte Bodenbestimmung
    this.raycastOriginLift = 20.0;  // höher starten, unabhängig von aktueller Avatarhöhe
    this.raycastRange = 200.0;      // großzügige Reichweite (Map-abhängig)

    // Sicherheits-Bounds (werden bei setTerrainRef aus BBox des Terrains gesetzt)
    this.terrainMinY = -10;
    this.terrainMaxY = 50;

    // Zuletzt gute Bodenhöhe (zur Stabilisierung bei kurzzeitigem Miss-Hit)
    this.lastGoodGroundY = null;

    // Stelle sicher, dass der Player erkennbar ist für Animationen
    if(this.worldRoot) {
      this.worldRoot.name = this.worldRoot.name || 'LocationMarker';
      this.worldRoot.userData = this.worldRoot.userData || {};
      this.worldRoot.userData.type = 'player';
      this.worldRoot.userData.isPlayer = true;
    }
  }

  setMarker(marker){ this.marker = marker || this.marker; }

  setTerrainRef(ref){
    this.terrainRef = ref || null;
    // BBox des eigentlichen Terrain-Meshes bestimmen, um Bounds zu setzen
    const terrain = this._resolveTerrainTarget();
    if (terrain && terrain.geometry) {
      terrain.geometry.computeBoundingBox();
      const bb = terrain.geometry.boundingBox;
      // Terrain kann verschoben sein – versetze BoundingBox nach Weltkoordinaten
      const worldMin = new THREE.Vector3(bb.min.x, bb.min.y, bb.min.z).applyMatrix4(terrain.matrixWorld);
      const worldMax = new THREE.Vector3(bb.max.x, bb.max.y, bb.max.z).applyMatrix4(terrain.matrixWorld);
      // etwas Puffer
      this.terrainMinY = Math.min(worldMin.y, worldMax.y) - 2;
      this.terrainMaxY = Math.max(worldMin.y, worldMax.y) + 10;
    }
  }

  // Liefert das tatsächliche Terrain-Target (Mesh/Group mit Kind "terrain")
  _resolveTerrainTarget() {
    if (!this.terrainRef) return null;
    if (this.terrainRef.type === 'Group') {
      const terrainChild = this.terrainRef.children?.find(c => c.name === 'terrain');
      return terrainChild || this.terrainRef;
    }
    return this.terrainRef;
  }

  // Heightfield-Höhe via bilinearem Sampling (wenn vorhanden)
  _heightfieldY(worldX, worldZ) {
    // Zone-Gruppe über worldRoot finden
    const zoneGroup = this.worldRoot?.parent; // worldRoot wird in scene.add(worldRoot) gelegt; parent ist die Scene – ZoneGroup ist worldRoot selbst
    // In dieser Architektur ist worldRoot die Container-Gruppe der Zone
    const g = this.worldRoot || zoneGroup;
    const hf = g?.userData?.heightfield;
    if (!hf || !hf.size || !hf.seg || !hf.heights) return null;

    const [W, H] = hf.size;
    const [nx, nz] = hf.seg; // Anzahl Segmente in X/Z (hier 1, aber Code ist generisch)
    const cols = nx + 1;
    const rows = nz + 1;

    // Koordinaten von Welt in lokale Raster-Koordinaten: Terrain liegt zentriert um (0,0)
    const u = (worldX + W * 0.5) / W; // 0..1
    const v = (worldZ + H * 0.5) / H; // 0..1
    // Clamp ins Feld
    const uu = Math.max(0, Math.min(0.999999, u));
    const vv = Math.max(0, Math.min(0.999999, v));

    // Index in Gitter
    const x = uu * nx;
    const z = vv * nz;
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    const fx = x - ix;
    const fz = z - iz;

    // Index-Helfer
    const idx = (cx, cz) => cz * cols + cx;

    // 4 Eckhöhen lesen (alle 0 im aktuellen „flat"-Fix, aber bilinear bleibt korrekt)
    const h00 = hf.heights[idx(ix,     iz    )] || 0;
    const h10 = hf.heights[idx(ix + 1, iz    )] || 0;
    const h01 = hf.heights[idx(ix,     iz + 1)] || 0;
    const h11 = hf.heights[idx(ix + 1, iz + 1)] || 0;

    const h0 = h00 * (1 - fx) + h10 * fx;
    const h1 = h01 * (1 - fx) + h11 * fx;
    const h  = h0 * (1 - fz) + h1 * fz;

    return h;
  }

  // Robust: reine Raycast-Bodenhöhe (optional 5-Strahl-Kreuz), unabhängig von Vertex-Sampling
  _raycastGroundY(worldX, worldZ, currentY) {
    // Terrain aus Referenz ableiten; falls nicht gesetzt, versuche automatische Suche im worldRoot:
    let terrain = this._resolveTerrainTarget();
    if (!terrain && this.worldRoot) {
      // Suche rekursiv nach Mesh mit userData.terrainSize (wird in Terrain-Builder gesetzt)
      const candidates = [];
      this.worldRoot.traverse(obj => {
        if (obj.isMesh && (obj.userData?.terrainSize || obj.name === 'terrain')) {
          candidates.push(obj);
        }
      });
      // Wähle bevorzugt name==='terrain', sonst erstes mit terrainSize
      terrain = candidates.find(o => o.name === 'terrain') || candidates[0] || null;
      // Wenn gefunden, als Referenz speichern für die nächsten Frames
      if (terrain) this.terrainRef = terrain;
    }
    if (!terrain) return null;

    const raycaster = new THREE.Raycaster();
    const dir = new THREE.Vector3(0, -1, 0);

    // 5 Strahlen: Mitte + Kreuz um footRadius (stabilisiert schräge Flächen)
    const offsets = [
      [0, 0],
      [ this.footRadius, 0],
      [-this.footRadius, 0],
      [0,  this.footRadius],
      [0, -this.footRadius],
    ];

    const hits = [];
    const originY = (currentY ?? 0) + this.raycastOriginLift;
    for (const [ox, oz] of offsets) {
      const origin = new THREE.Vector3(worldX + ox, originY, worldZ + oz);
      raycaster.set(origin, dir);
      raycaster.far = this.raycastRange;
      // Intersect mit Terrain-Target rekursiv
      const isects = raycaster.intersectObject(terrain, true);
      if (isects && isects.length > 0) {
        // Wähle erstes valides Dreieck, das nach oben zeigt (normale.y >= 0) bevorzugt, um Unterseiten zu vermeiden
        const first = isects.find(h => !h.face || (h.face && h.face.normal && h.face.normal.y >= -0.25)) || isects[0];
        hits.push(first.point.y);
      }
    }

    if (hits.length === 0) return null;

    // Filtere Treffer, die außerhalb plausibler Bounds liegen
    const minY = this.terrainMinY;
    const maxY = this.terrainMaxY;
    const inBounds = hits.filter(y => y >= minY && y <= maxY);
    if (inBounds.length === 0) return null;

    // Nimm Median statt Minimum/Maximum, um Ausreißer (Kanten) zu dämpfen
    inBounds.sort((a,b)=>a-b);
    const median = inBounds[Math.floor(inBounds.length/2)];
    return median;
  }

  getTerrainHeightAt(x, z, useSampling = false){
    if(!this.terrainRef) {
      return null; // null statt 0, um "kein Terrain" zu signalisieren
    }
    const terrain = this.terrainRef;
    if(!terrain || !terrain.geometry) {
      return null;
    }
    const geom = terrain.geometry;
    const posAttr = geom.attributes?.position;
    const size = terrain.userData?.terrainSize || [50,50];
    if(!posAttr || !size) return null;

    const [width, height] = size;
    const baseY = terrain.position?.y || 0; // Terrain-Basis berücksichtigen
    
    // Multi-Sample Ansatz für bessere Stabilität in hügeligem Terrain
    if (useSampling) {
      const sampleRadius = 0.3; // Radius für Sampling in Weltkoordinaten
      const samples = [
        [x, z],                           // Center
        [x + sampleRadius, z],            // Right
        [x - sampleRadius, z],            // Left  
        [x, z + sampleRadius],            // Forward
        [x, z - sampleRadius],            // Back
        [x + sampleRadius*0.7, z + sampleRadius*0.7], // Diagonal samples
        [x - sampleRadius*0.7, z - sampleRadius*0.7],
        [x + sampleRadius*0.7, z - sampleRadius*0.7],
        [x - sampleRadius*0.7, z + sampleRadius*0.7]
      ];
      
      let validHeights = [];
      let totalWeight = 0;
      let weightedSum = 0;
      
      samples.forEach(([sx, sz], index) => {
        const sampledHeight = this._sampleHeightAtPoint(sx, sz, width, height, baseY, posAttr);
        if (sampledHeight !== null) {
          // Gewichtung: Zentrum hat höchstes Gewicht, Ecken niedrigstes
          const weight = index === 0 ? 4.0 : (index < 5 ? 2.0 : 1.0);
          validHeights.push(sampledHeight);
          weightedSum += sampledHeight * weight;
          totalWeight += weight;
        }
      });
      
      if (validHeights.length > 0) {
        // Gewichteter Durchschnitt für smoothere Höhenberechnung
        return weightedSum / totalWeight;
      }
    }
    
    // Fallback: Einzelner Sample mit bilinearer Interpolation
    return this._sampleHeightAtPoint(x, z, width, height, baseY, posAttr);
  }

  // Hilfsmethode für einzelne Höhenmessung
  _sampleHeightAtPoint(x, z, width, height, baseY, posAttr) {
    // Korrekte Koordinatenumrechnung: Player-Position zu Terrain-Koordinaten
    const localX = x + width * 0.5;  // Player pos 0,0 = Terrain-Mitte
    const localZ = z + height * 0.5;
    
    // Clamp to terrain bounds mit kleinem Puffer
    const epsilon = 0.001;
    const clampedX = Math.max(epsilon, Math.min(width - epsilon, localX));
    const clampedZ = Math.max(epsilon, Math.min(height - epsilon, localZ));
    
    const segments = Math.sqrt(posAttr.count) - 1;
    
    if(!Number.isFinite(segments) || segments <= 0) {
      return baseY;
    }
    
    const segmentSize = width / segments;
    const segX = Math.floor(clampedX / segmentSize);
    const segZ = Math.floor(clampedZ / segmentSize);

    const getH = (sx, sz) => {
      sx = Math.max(0, Math.min(segments, sx));
      sz = Math.max(0, Math.min(segments, sz));
      const index = sz * (segments + 1) + sx;
      if (index >= posAttr.count || index < 0) {
        return 0;
      }
      // Höhenwert aus Y-Koordinate (nicht Z)
      const y = posAttr.getY ? posAttr.getY(index) : 
                posAttr.getZ ? posAttr.getZ(index) : 0;
      return Number.isFinite(y) ? y : 0;
    };

    const h00 = getH(segX, segZ);
    const h10 = getH(segX+1, segZ);
    const h01 = getH(segX, segZ+1);
    const h11 = getH(segX+1, segZ+1);
    
    // Bilineare Interpolation mit Bounds-Check
    const fx = Math.max(0, Math.min(1, (clampedX - segX * segmentSize) / segmentSize));
    const fz = Math.max(0, Math.min(1, (clampedZ - segZ * segmentSize) / segmentSize));
    const h0 = h00 * (1 - fx) + h10 * fx;
    const h1 = h01 * (1 - fx) + h11 * fx;
    const interpolatedHeight = h0 * (1 - fz) + h1 * fz;
    
    const result = baseY + interpolatedHeight;
    
    // Sanity check für das Ergebnis
    if (!Number.isFinite(result)) {
      return baseY;
    }
    
    return result;
  }

  // Prüfen ob gerade im Chat-Input getippt wird
  isTypingInChat() {
    const activeElement = document.activeElement;
    return activeElement && (activeElement.id === 'userInput' || activeElement.tagName === 'INPUT');
  }

  move(dt, keys, isRightMouseDown, yaw, onRotationChange) {
    const rotSpeed = 2.0; // Rotationsgeschwindigkeit
    
    // Navigation nur wenn nicht im Chat getippt wird
    if (!this.isTypingInChat()) {
      // A/D: Kamera um Spieler drehen (Yaw) - nur wenn Maus nicht gedrückt
      if (!isRightMouseDown) {
        let rotationChange = 0;
        if(keys.has('a')) rotationChange += rotSpeed * dt;
        if(keys.has('d')) rotationChange -= rotSpeed * dt;
        
        if(rotationChange !== 0 && onRotationChange) {
          onRotationChange(rotationChange);
        }
      }
      
      // W/S: Vor/Zurück relativ zur aktuellen Blickrichtung
      let moveDir = 0;
      if(keys.has('w')) moveDir = 1;
      if(keys.has('s')) moveDir = -1;

      // YAML Player rotation update flag
      let isMoving = false;
      
      if(moveDir !== 0) {
        // Check if running (Shift key pressed)
        const isRunning = keys.has('shift') || keys.has('Shift');
        const currentSpeed = isRunning ? this.speed * 1.8 : this.speed; // 80% faster when running
        
        // Bewegungsrichtung basierend auf aktuellen Yaw berechnen
        const forward = new THREE.Vector3(
          Math.sin(yaw),
          0,
          Math.cos(yaw)
        );
        
        const movement = forward.multiplyScalar(moveDir * currentSpeed * dt);
        
        // Welt bewegen statt Spieler (nur X/Z)
        this.worldRoot.position.sub(new THREE.Vector3(movement.x, 0, movement.z));
        
        // Virtuelle Spielerposition für Clipping aktualisieren
        this.pos.add(movement);
        isMoving = true;
        
        // Clamp zur Bodenradius-Grenze
        if(this.pos.length() > 17.5) {
          const excess = this.pos.length() - 17.5;
          const correction = forward.multiplyScalar(-excess);
          this.worldRoot.position.add(correction);
          this.pos.setLength(17.5);
        }
      }

      // Drehe Avatar in Bewegungsrichtung
      if(this.marker && this.marker.userData?.yamlPlayer && isMoving) {
        this.marker.rotation.y = yaw;
      }

      // --- Boden-Follow/Physik ---
      const currentY = this.marker ? this.marker.position.y : 0;

      // Hybride Höhenbestimmung: zuerst Vertex-Sampling, dann Raycast als Fallback
      let groundY = null;
      
      // 1. Versuche getTerrainHeightAt mit Multi-Sampling für bessere Stabilität
      if (this.terrainRef) {
        groundY = this.getTerrainHeightAt(this.pos.x, this.pos.z, true);
        
        // Falls Vertex-Sampling fehlschlägt oder unrealistische Werte liefert
        if (groundY == null || !Number.isFinite(groundY)) {
          // 2. Fallback auf Raycast
          groundY = this._raycastGroundY(this.pos.x, this.pos.z, currentY);
        }
        
        // 3. Falls beide fehlschlagen, versuche Heightfield-Sampling
        if (groundY == null) {
          groundY = this._heightfieldY(this.pos.x, this.pos.z);
        }
      }

      // Sanity-Check gegen extreme Sprünge
      if (groundY != null && this.lastGoodGroundY != null) {
        const maxJump = 1.0;
        const heightDiff = Math.abs(groundY - this.lastGoodGroundY);
        if (heightDiff > maxJump) {
          const interpFactor = 0.2;
          groundY = this.lastGoodGroundY + (groundY - this.lastGoodGroundY) * interpFactor;
        }
      }

      const desiredY = (groundY != null) ? (groundY + this.avatarHeightOffset) : null;

      if (desiredY != null) {
        // Harter Snap auf Bodenhöhe (kein Lerp/Step) mit Bounds
        if (this.marker) {
          this.marker.visible = true;
          this.marker.position.y = THREE.MathUtils.clamp(desiredY, this.terrainMinY, this.terrainMaxY);
        }
        // Letzte gute Bodenhöhe aktualisieren
        this.lastGoodGroundY = groundY;
        this.verticalVel = 0;
        this.grounded = true;
      } else {
        // Kein aktueller Ground-Treffer:
        // Wenn letzte gute Bodenhöhe existiert, nie unter diese Haltelinie fallen
        if (this.marker && this.lastGoodGroundY != null) {
          const floorY = this.lastGoodGroundY + this.avatarHeightOffset - 0.02;
          if (this.marker.position.y < floorY) {
            this.marker.position.y = floorY;
          }
          this.marker.visible = true;
          this.verticalVel = 0;
          this.grounded = true;
        } else {
          // Keine Infos: Höhe beibehalten, minimale Dämpfung (kein Wegfallen)
          this.grounded = false;
        }
      }

      // Gravitation nur, wenn kein Ground und keine Floor-Info vorhanden
      if (!this.grounded && this.marker) {
        this.verticalVel += this.gravity * .05 * dt; // sehr gedämpft
        this.marker.position.y += this.verticalVel * dt;
        this.marker.visible = true;
      }

      // Return movement state for external animation control
      return isMoving;
    }
    
    // If typing in chat, no movement
    return false;
  }
  
  reset() {
    this.pos.set(0,0,0);
    this.worldRoot.position.set(0,0,0);
    if(this.marker){
      // Start auf Basis Heightfield (falls vorhanden), sonst Raycast, sonst 0
      let groundY = this._heightfieldY(0, 0);
      if (groundY == null) {
        groundY = this._raycastGroundY(0, 0, 10);
      }
      if (groundY == null) groundY = 0;
      const startY = groundY + this.avatarHeightOffset;
      this.marker.position.y = startY;
      this.lastGoodGroundY = groundY;
      this.marker.visible = true;
      this.verticalVel = 0;
      this.grounded = true;
    }
  }
}
