import * as THREE from 'three';
import { seededRng, pick } from '../utils/random.js';

// Skybox: create 6 canvases with gradient + noise
export function makeSkyboxTextures(rng){
  const faces = ['px','nx','py','ny','pz','nz'];
  const canvases = {};
  for(const f of faces){
    const c = document.createElement('canvas');
    c.width = 512; c.height = 512;
    const ctx = c.getContext('2d');
    const hue = Math.floor(rng()*360);
    const grad = ctx.createLinearGradient(0,0,512,512);
    grad.addColorStop(0, `hsl(${(hue+10)%360} 70% 12%)`);
    grad.addColorStop(1, `hsl(${(hue+200)%360} 70% 6%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,512,512);
    // stars/noise
    const stars = 500;
    for(let i=0;i<stars;i++){
      const x = rng()*512, y = rng()*512;
      const s = rng()*1.5;
      const a = 0.3 + rng()*0.7;
      ctx.fillStyle = `hsla(${(hue+Math.floor(rng()*60))%360} 90% 80% / ${a})`;
      ctx.beginPath(); ctx.arc(x,y,s,0,Math.PI*2); ctx.fill();
    }
    canvases[f] = new THREE.CanvasTexture(c);
  }
  return canvases;
}

// Ground texture checker/gradient
export function makeGroundTexture(rng){
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 1024;
  const ctx = c.getContext('2d');
  const hue = Math.floor(rng()*360);
  for(let y=0;y<16;y++){
    for(let x=0;x<16;x++){
      const l = 10 + Math.floor(rng()*10);
      ctx.fillStyle = `hsl(${hue} 30% ${l}%)`;
      ctx.fillRect(x*64,y*64,64,64);
    }
  }
  // subtle vignette
  const grd = ctx.createRadialGradient(512,512,100,512,512,600);
  grd.addColorStop(0,'rgba(0,0,0,0)');
  grd.addColorStop(1,'rgba(0,0,0,0.25)');
  ctx.fillStyle = grd; ctx.fillRect(0,0,1024,1024);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6,6);
  return tex;
}

// Persona billboard texture
export function makePersonaTexture(name, role, rng){
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d');
  const hue = Math.floor(rng()*360);
  const grad = ctx.createLinearGradient(0,0,256,256);
  grad.addColorStop(0, `hsl(${hue} 60% 18%)`);
  grad.addColorStop(1, `hsl(${(hue+60)%360} 60% 10%)`);
  ctx.fillStyle = grad; ctx.fillRect(0,0,256,256);

  // simple avatar circle
  ctx.beginPath(); ctx.arc(128,100,60,0,Math.PI*2);
  ctx.fillStyle = `hsl(${(hue+180)%360} 70% 60%)`; ctx.fill();

  // eyes
  ctx.fillStyle = '#0b0f14';
  ctx.beginPath(); ctx.arc(108,90,8,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(148,90,8,0,Math.PI*2); ctx.fill();

  // name
  ctx.fillStyle = '#d8e7ff';
  ctx.font = '700 20px system-ui, sans-serif';
  ctx.textAlign='center';
  ctx.fillText(name, 128, 190);
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = '#a9bfdc';
  ctx.fillText(role, 128, 210);

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  return tex;
}

// Portal material (simple animated material without custom shader)
export function makePortalMaterial(){
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x66ffee),
    roughness: 0.2,
    metalness: 0.6,
    emissive: new THREE.Color(0x116677),
    emissiveIntensity: 1.2,
    transparent: true,
    opacity: 0.8
  });
  return mat;
}
