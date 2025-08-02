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
    
    // raycast towards where the camera looks from player position
    const rayOrig = this.playerMarker.position.clone().add(new THREE.Vector3(0,0.3,0));
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const ray = new THREE.Raycaster(rayOrig, dir, 0, 4);
    const objs = this.zoneManager.getCurrentZone().group.children;
    const hits = ray.intersectObjects(objs, true);
    
    if(hits.length){
      const obj = hits[0].object;
      // E-Taste hat bereits Distanzcheck durch Raycast-Range (0, 4)
      this.handleInteraction(obj);
    }
  }

  interactWithMouse(event) {
    if(!this.zoneManager.currentZoneId) return;
    
    // Maus-Position in normalisierte Device-Koordinaten (-1 bis +1)
    const canvas = event.target;
    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Raycaster von der Kamera aus
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);
    
    const objs = this.zoneManager.getCurrentZone().group.children;
    const hits = raycaster.intersectObjects(objs, true);
    
    if(hits.length) {
      const obj = hits[0].object;
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
