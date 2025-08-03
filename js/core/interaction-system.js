import * as THREE from 'three';

export class InteractionSystem {
  constructor(zoneManager, camera, playerMarker) {
    this.zoneManager = zoneManager;
    this.camera = camera;
    this.playerMarker = playerMarker;
    this.maxDistance = 4.0;
  }

  interact() {
    if(!this.zoneManager.currentZoneId) return;
    if(!this.camera || !this.camera.camera) {
      console.error('InteractionSystem: Kamera nicht verfügbar');
      return;
    }
    
    // E-Taste: Raycast vom Spieler in die Richtung der Kamera-Orientierung (yaw)
    // Da der Spieler bei (0,0,0) steht, verwenden wir die yaw-Rotation direkt
    const playerPos = new THREE.Vector3(0, 0.5, 0); // Spieler-Augenhöhe
    const yaw = this.camera.getYaw();
    const direction = new THREE.Vector3(
      Math.sin(yaw),  // X-Komponente basierend auf yaw
      0,              // Horizontal raycast
      Math.cos(yaw)   // Z-Komponente basierend auf yaw
    ).normalize();
    
    const ray = new THREE.Raycaster(playerPos, direction, 0, 4);
    const objs = this.zoneManager.getCurrentZone().group.children;
    const hits = ray.intersectObjects(objs, true);
    
    // Debug-Ausgabe
    console.log('E-Taste Raycast:', {
      origin: playerPos,
      direction: direction,
      yaw: yaw,
      hits: hits.length
    });
    
    if(hits.length){
      const obj = hits[0].object;
      console.log('E-Taste Hit:', obj.userData?.type, obj.userData?.name);
      this.handleInteraction(obj);
    }
  }

  interactWithMouse(event) {
    if(!this.zoneManager.currentZoneId) return;
    if(!this.camera || !this.camera.camera) {
      console.error('InteractionSystem: Kamera nicht verfügbar für Maus-Interaktion');
      return;
    }
    
    // Maus-Position in normalisierte Device-Koordinaten (-1 bis +1)
    const canvas = event.target;
    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Raycaster von der Kamera aus
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera.camera); // this.camera.camera für Three.js Kamera
    
    const objs = this.zoneManager.getCurrentZone().group.children;
    const hits = raycaster.intersectObjects(objs, true);
    
    // Debug-Ausgabe
    console.log('Maus-Raycast:', {
      mouse: mouse,
      cameraPos: this.camera.camera.position,
      hits: hits.length
    });
    
    if(hits.length) {
      const obj = hits[0].object;
      console.log('Maus Hit:', obj.userData?.type, obj.userData?.name, 'Distance:', hits[0].distance);
      // Distanzcheck: Nur interagieren wenn in der Nähe
      if(this.isObjectInRange(obj)) {
        this.handleInteraction(obj);
      } else {
        // Visual feedback dass zu weit entfernt
        if(this.onFeedback) {
          this.onFeedback('Du bist zu weit entfernt. Gehe näher heran!');
        }
      }
    }
  }

  isObjectInRange(obj) {
    // Spieler steht immer bei (0, 0, 0) in der Szene
    const playerPos = new THREE.Vector3(0, 0, 0);
    
    // Objektposition direkt aus der Szene nehmen
    const objPos = new THREE.Vector3();
    obj.getWorldPosition(objPos);
    
    const distance = playerPos.distanceTo(objPos);
    return distance <= this.maxDistance;
  }

  handleInteraction(obj) {
    // persona
    if(obj.userData?.type==='persona'){
      if(this.onPersonaInteract) {
        this.onPersonaInteract(obj);
      }
      return;
    }
    
    // portal
    let p = obj;
    while(p && p.userData?.type!=='portal') p = p.parent;
    if(p && p.userData?.type==='portal'){
      if(p.userData.target){
        if(this.onPortalInteract) {
          this.onPortalInteract(p.userData.target);
        }
        return;
      } else {
        if(this.onFeedback) {
          this.onFeedback('Dieses Portal hat noch kein Ziel. Bitte eine Persona um Hilfe (Option A).');
        }
      }
    }

    // YAML-spezifische interaktive Objekte
    if(obj.userData?.interaction) {
      if(this.onFeedback) {
        this.onFeedback(obj.userData.interaction.text || 'Ein interessantes Objekt.');
      }
      return;
    }

    // Info-Schilder
    if(obj.userData?.type==='info_sign') {
      if(this.onFeedback) {
        this.onFeedback(obj.userData.text || 'Ein Schild ohne Text.');
      }
      return;
    }
  }

  setPersonaInteractCallback(callback) {
    this.onPersonaInteract = callback;
  }

  setPortalInteractCallback(callback) {
    this.onPortalInteract = callback;
  }

  setFeedbackCallback(callback) {
    this.onFeedback = callback;
  }
}
