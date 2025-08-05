import * as THREE from 'three';
import { /* adjustToTerrainHeight, */ } from '../world-generation/index.js'; // optional ref

export class Player {
  constructor(worldRoot, marker=null) {
    this.pos = new THREE.Vector3(0,0,0);
    this.speed = 6;
    this.worldRoot = worldRoot;
    this.marker = marker; // sichtbarer Marker (Mesh)
    this.terrainRef = null; // Terrain-Mesh
    this.hoverOffset = 0.2; // näher am Boden, um natürlicher zu wirken
    
    // Stelle sicher, dass der Player erkennbar ist für Animationen
    if(this.worldRoot) {
      this.worldRoot.name = this.worldRoot.name || 'LocationMarker';
      this.worldRoot.userData = this.worldRoot.userData || {};
      this.worldRoot.userData.type = 'player';
      this.worldRoot.userData.isPlayer = true;
    }
  }

  setMarker(marker){ this.marker = marker || this.marker; }

  setTerrainRef(ref){ this.terrainRef = ref || null; }

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
    
    // Clamp to terrain bounds
    const clampedX = Math.max(0, Math.min(width - 0.01, localX));
    const clampedZ = Math.max(0, Math.min(height - 0.01, localZ));
    
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
      if (index >= posAttr.count) {
        return 0;
      }
      // Zurück zur ursprünglichen Z-Koordinate (Höhenwert)
      return posAttr.getZ(index);
    };

    const h00 = getH(segX, segZ);
    const h10 = getH(segX+1, segZ);
    const h01 = getH(segX, segZ+1);
    const h11 = getH(segX+1, segZ+1);
    
    // Bilineare Interpolation
    const fx = (clampedX - segX * segmentSize) / segmentSize;
    const fz = (clampedZ - segZ * segmentSize) / segmentSize;
    const h0 = h00 * (1 - fx) + h10 * fx;
    const h1 = h01 * (1 - fx) + h11 * fx;
    const interpolatedHeight = h0 * (1 - fz) + h1 * fz;
    
    const result = baseY + interpolatedHeight;
    
    return result; // Kann jetzt auch negative Werte zurückgeben
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
        
        // Clamp zur Bodenradius-Grenze
        if(this.pos.length() > 17.5) {
          const excess = this.pos.length() - 17.5;
          const correction = forward.multiplyScalar(-excess);
          this.worldRoot.position.add(correction);
          this.pos.setLength(17.5);
        }
      }

      // YAML Player rotation update
      const isMoving = moveDir !== 0;
      if(this.marker && this.marker.userData?.yamlPlayer) {
        // Rotate player to face movement direction when moving
        if (isMoving) {
          this.marker.rotation.y = yaw;
        }
      }

      // Nach Positionsänderung: Terrainhöhe anwenden auf Marker selbst (immer, nicht nur bei Bewegung)
      // Verwende Multi-Sampling für bessere Stabilität bei hügeligem Terrain
      const isHillyTerrain = this.terrainRef?.userData?.isHills || false;
      const yGround = this.getTerrainHeightAt(this.pos.x, this.pos.z, isHillyTerrain);
      
      if(this.marker){
        if (yGround !== null) {
          // Gültiges Terrain gefunden - sanfte Anpassung mit besserem Offset
          const avatarHeightOffset = 0.8; // Höher für YAML Player Avatar
          const targetY = yGround + avatarHeightOffset;
          
          // Schnellere Y-Anpassung für besseres Terrain-Following
          const lerpSpeed = isMoving ? 0.15 : 0.08; // Schneller bei Bewegung
          this.marker.position.y += (targetY - this.marker.position.y) * lerpSpeed;
        } else {
          // Kein Terrain gefunden - versuche Fallback-Höhe oder halte aktuelle Position
          // Falls der Marker zu weit vom erwarteten Terrain-Level entfernt ist, bringe ihn zurück
          if (this.marker.position.y < -10 || this.marker.position.y > 10) {
            this.marker.position.y += (0.8 - this.marker.position.y) * 0.1; // Fallback zu Basis-Höhe
          }
        }
      }
      
      // Return movement state for external animation control
      return isMoving;
    }
    
    // If typing in chat, no movement
    return false;
  }  reset() {
    this.pos.set(0,0,0);
    this.worldRoot.position.set(0,0,0);
    if(this.marker){ this.marker.position.y = this.hoverOffset; }
  }
}
