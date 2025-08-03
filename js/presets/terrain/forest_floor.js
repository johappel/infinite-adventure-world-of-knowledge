// Forest Floor – Preset und CanvasTexture-Generator
import * as THREE from 'three';

export const forestFloorPreset = {
  type: 'hills',
  size: [60,60],
  color: '#2d4a22',
  amplitude: 5.2,
  y: -0.9,
  texture: 'forest_floor',
  flat_radius: 18,
  blend_radius: 12,
  outer_gain: 2.0
};

export function makeForestFloorTexture(){
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 1024;
  const ctx = c.getContext('2d');

  // Grundfläche: dunkles Moosgrün
  const grad = ctx.createLinearGradient(0,0,1024,1024);
  grad.addColorStop(0, '#2a3f20');
  grad.addColorStop(1, '#20351a');
  ctx.fillStyle = grad; ctx.fillRect(0,0,1024,1024);

  // Flecken/Blätter – sanfte Noise-Pattern
  for(let i=0;i<1200;i++){
    const x = Math.random()*1024;
    const y = Math.random()*1024;
    const r = 2 + Math.random()*10;
    ctx.fillStyle = `rgba(80,120,70,${0.05+Math.random()*0.08})`;
    ctx.beginPath(); ctx.ellipse(x,y,r*1.4,r,Math.random()*Math.PI,0,Math.PI*2); ctx.fill();
  }

  // Trockene Blätter 
  for(let i=0;i<700;i++){
    const x = Math.random()*1024;
    const y = Math.random()*1024;
    const r = 1 + Math.random()*6;
    ctx.fillStyle = `rgba(140,100,60,${0.06+Math.random()*0.08})`;
    ctx.beginPath(); ctx.ellipse(x,y,r, r*0.6, Math.random()*Math.PI, 0, Math.PI*2); ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.repeat.set(6,6);
  return tex;
}
