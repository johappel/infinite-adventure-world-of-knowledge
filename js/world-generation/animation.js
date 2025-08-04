import * as THREE from 'three';

export function startZoneAnimations(group){
  console.log('🎬 startZoneAnimations called for group:', group);
  
  // Einfache Kamera-Referenz
  let camera = null;
  
  function findCamera(){
    if(camera) return camera;
    
    // 1. Suche Kamera über userData.__camera (wie im ZoneManager gesetzt)
    if(group.parent && group.parent.userData?.__camera && !camera) {
      camera = group.parent.userData.__camera;
      console.log('📷 Camera found in parent.userData.__camera');
      return camera;
    }
    
    // 2. Suche in der Großeltern-Ebene (group -> worldRoot -> scene)
    if(group.parent && group.parent.parent && group.parent.parent.userData?.__camera && !camera) {
      camera = group.parent.parent.userData.__camera;
      console.log('📷 Camera found in parent.parent.userData.__camera');
      return camera;
    }
    
    // 3. Suche in der Scene traversieren
    if(group.parent) {
      group.parent.traverse((child) => {
        if((child.isCamera || child.type === 'PerspectiveCamera' || child.type === 'OrthographicCamera') && !camera) {
          camera = child;
          console.log('📷 Camera found via traverse:', child.type);
        }
      });
    }
    
    // 4. Suche in der kompletten Scene, falls parent nicht die Scene ist
    if(!camera && group.parent && group.parent.parent) {
      group.parent.parent.traverse((child) => {
        if((child.isCamera || child.type === 'PerspectiveCamera') && !camera) {
          camera = child;
          console.log('📷 Camera found in scene traverse:', child.type);
        }
      });
    }
    
    // 5. Fallback: Suche in window
    if(!camera && typeof window !== 'undefined') {
      if(window.camera) {
        camera = window.camera;
        console.log('📷 Camera found in window.camera');
      } else if(window.scene) {
        window.scene.traverse((child) => {
          if((child.isCamera || child.type === 'PerspectiveCamera') && !camera) {
            camera = child;
            console.log('📷 Camera found in window.scene');
          }
        });
      }
    }
    
    // 6. Debug: Zeige was wir haben wenn keine Kamera gefunden
    if(!camera) {
      console.log('🚨 No camera found. Debug info:', {
        hasParent: !!group.parent,
        parentType: group.parent?.type,
        parentUserData: group.parent?.userData,
        hasGrandParent: !!(group.parent && group.parent.parent),
        grandParentType: group.parent?.parent?.type,
        grandParentUserData: group.parent?.parent?.userData,
        windowCamera: !!(typeof window !== 'undefined' && window.camera),
        windowScene: !!(typeof window !== 'undefined' && window.scene)
      });
    }
    
    return camera;
  }
  
  function animate(){
    const time = Date.now() * 0.001;
    const cam = findCamera();
    
    // Debug: Zeige alle 3 Sekunden den Kamera-Status
    // if(Math.floor(time) % 3 === 0 && time % 1 < 0.02) {
    //   console.log('🎬 Animation Status:', {
    //     cameraFound: !!cam,
    //     cameraPosition: cam ? cam.position : 'N/A',
    //     groupParent: !!group.parent,
    //     userDataCamera: !!group.parent?.userData?.__camera
    //   });
    // }
    
    group.traverse((child) => {
      // Billboard-Verhalten für Personas
      if(child.userData?.type === 'persona' && cam) {
        // const oldRotation = child.rotation.y;
        child.lookAt(cam.position);
        
        // Debug: Zeige gelegentlich Rotation-Updates
        // if(Math.random() < 0.01) {
        //   console.log('🎯 Billboard Update:', {
        //     persona: child.userData.name,
        //     oldY: (oldRotation * 180 / Math.PI).toFixed(1) + '°',
        //     newY: (child.rotation.y * 180 / Math.PI).toFixed(1) + '°',
        //     cameraPos: cam.position.toArray(),
        //     personaPos: child.position.toArray()
        //   });
        // }
      }
      
      // Aura-Ringe rotieren lassen
      if(child.userData?.type === 'personaAura'){
        child.rotation.z += 0.04;
        if(child.material && child.material.emissiveIntensity !== undefined){ 
          child.material.emissiveIntensity = 0.8 + 0.4 * Math.sin(time * 2.2); 
        }
      }
      
      // Portal-Animationen
      if(child.userData?.type === 'portal' && child.material){
        if(child.material.emissiveIntensity !== undefined){ 
          child.material.emissiveIntensity = 0.8 + 0.3 * Math.sin(time * 2.0); 
        }
        child.rotation.y += 0.005;
      }
    });
    
    requestAnimationFrame(animate);
  }
  
  console.log('🚀 Starting animation loop with billboard behavior...');
  requestAnimationFrame(animate);
}
