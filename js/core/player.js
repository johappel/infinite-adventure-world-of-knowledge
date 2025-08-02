import * as THREE from 'three';

export class Player {
  constructor(worldRoot) {
    this.pos = new THREE.Vector3(0,0,0);
    this.speed = 6;
    this.yaw = 0;
    this.worldRoot = worldRoot;
  }

  // Prüfen ob gerade im Chat-Input getippt wird
  isTypingInChat() {
    const activeElement = document.activeElement;
    return activeElement && (activeElement.id === 'userInput' || activeElement.tagName === 'INPUT');
  }

  move(dt, keys, isRightMouseDown) {
    const rotSpeed = 2.0; // Rotationsgeschwindigkeit
    
    // Navigation nur wenn nicht im Chat getippt wird
    if (!this.isTypingInChat()) {
      // A/D: Kamera um Spieler drehen (Yaw) - nur wenn Maus nicht gedrückt
      if (!isRightMouseDown) {
        if(keys.has('a')) this.yaw += rotSpeed * dt;
        if(keys.has('d')) this.yaw -= rotSpeed * dt;
      }
      
      // W/S: Vor/Zurück relativ zur aktuellen Blickrichtung
      let moveDir = 0;
      if(keys.has('w')) moveDir = 1;
      if(keys.has('s')) moveDir = -1;
      
      if(moveDir !== 0) {
        // Bewegungsrichtung basierend auf Yaw berechnen
        const forward = new THREE.Vector3(
          Math.sin(this.yaw),
          0,
          Math.cos(this.yaw)
        );
        
        const movement = forward.multiplyScalar(moveDir * this.speed * dt);
        
        // Welt bewegen statt Spieler
        this.worldRoot.position.sub(movement);
        
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
    }
  }

  reset() {
    this.pos.set(0,0,0);
    this.yaw = 0;
    this.worldRoot.position.set(0,0,0);
  }
}
