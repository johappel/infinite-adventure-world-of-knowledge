export function startZoneAnimations(group){
  function animate(){
    const time = Date.now()*0.001;
    group.traverse((child)=>{
      if(child.userData?.type==='personaAura'){
        child.rotation.z += 0.02;
        if(child.material && child.material.emissiveIntensity!==undefined){
          child.material.emissiveIntensity = 0.8 + 0.3*Math.sin(time*2.0);
        }
      }
      if(child.userData?.type==='portal' && child.material){
        if(child.material.emissiveIntensity!==undefined){
          child.material.emissiveIntensity = 0.8 + 0.3*Math.sin(time*2.0);
        }
        child.rotation.y += 0.005;
      }
      if(child.userData?.type==='persona' && group.parent && group.parent.isScene){
        const cam = group.parent.userData?.__camera;
        if(cam){ child.lookAt(cam.position.x, child.position.y, cam.position.z); }
      }
    });
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}
