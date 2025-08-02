import * as THREE from 'three';

export class ThirdPersonCamera {
  constructor(camera, playerMarker) {
    this.camera = camera;
    this.playerMarker = playerMarker;
    this.yaw = 0;
    this.mouseX = 0;
    this.mouseY = 0;
    this.distance = 8;
    this.height = 5;
  }

  update() {
    // Kamera-Position: Feste Third-Person-Perspektive mit Maus-Kontrolle
    const cameraHeight = this.height + Math.sin(this.mouseY) * 3; // Vertikale Maus-Bewegung
    const cameraOffset = new THREE.Vector3(
      -Math.sin(this.yaw) * this.distance * Math.cos(this.mouseY),
      cameraHeight,
      -Math.cos(this.yaw) * this.distance * Math.cos(this.mouseY)
    );
    
    this.camera.position.copy(cameraOffset);
    this.camera.lookAt(0, 1, 0); // Immer zum Spieler schauen (der bei 0,0,0 bleibt)
    
    // Spieler-Marker zeigt in Bewegungsrichtung
    this.playerMarker.rotation.y = this.yaw;
  }

  setMouseRotation(mouseX, mouseY) {
    this.mouseX = mouseX;
    this.mouseY = Math.max(-Math.PI/3, Math.min(Math.PI/3, mouseY)); // Begrenzen der vertikalen Rotation
  }

  setYaw(yaw) {
    this.yaw = yaw;
  }
}
