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

  getTerrainHeightAt(x, z){
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
    const localX = x + width * 0.5;
    const localZ = z + height * 0.5;
    const clampedX = Math.max(0, Math.min(width, localX));
    const clampedZ = Math.max(0, Math.min(height, localZ));
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
      // Zurück zur ursprünglichen Z-Koordinate
      return posAttr.getZ(index);
    };

    const h00 = getH(segX, segZ);
    const h10 = getH(segX+1, segZ);
    const h01 = getH(segX, segZ+1);
    const h11 = getH(segX+1, segZ+1);
    const fx = (clampedX % segmentSize) / segmentSize;
    const fz = (clampedZ % segmentSize) / segmentSize;
    const h0 = h00 * (1 - fx) + h10 * fx;
    const h1 = h01 * (1 - fx) + h11 * fx;
    const result = baseY + (h0 * (1 - fz) + h1 * fz);
    
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
        // Bewegungsrichtung basierend auf aktuellen Yaw berechnen
        const forward = new THREE.Vector3(
          Math.sin(yaw),
          0,
          Math.cos(yaw)
        );
        
        const movement = forward.multiplyScalar(moveDir * this.speed * dt);
        
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

      // Nach Positionsänderung: Terrainhöhe anwenden auf Marker selbst (immer, nicht nur bei Bewegung)
      const yGround = this.getTerrainHeightAt(this.pos.x, this.pos.z);
      
      if(this.marker){
        if (yGround !== null) {
          // Gültiges Terrain gefunden - normale Anpassung
          const targetY = yGround + this.hoverOffset;
          this.marker.position.y += (targetY - this.marker.position.y) * 0.3;
        } else {
          // Kein Terrain gefunden - versuche Fallback-Höhe oder halte aktuelle Position
          // Falls der Marker zu weit vom erwarteten Terrain-Level entfernt ist, bringe ihn zurück
          if (this.marker.position.y < -10 || this.marker.position.y > 10) {
            this.marker.position.y += (this.hoverOffset - this.marker.position.y) * 0.1;
          }
        }
      }
    }
  }

  reset() {
    this.pos.set(0,0,0);
    this.worldRoot.position.set(0,0,0);
    if(this.marker){ this.marker.position.y = this.hoverOffset; }
  }
}
