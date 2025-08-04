import * as THREE from 'three';
import { applyEnvironment } from './environment.js';

// Optional: external textures util could be injected; here we recreate forest_floor.
function makeForestFloorTexture(){
  const c = document.createElement('canvas'); c.width=512; c.height=512; const ctx=c.getContext('2d');
  const grad = ctx.createLinearGradient(0,0,512,512); grad.addColorStop(0,'#2a3f20'); grad.addColorStop(1,'#20351a');
  ctx.fillStyle=grad; ctx.fillRect(0,0,512,512);
  for(let i=0;i<400;i++){ const x=Math.random()*512, y=Math.random()*512, r=2+Math.random()*6; ctx.fillStyle=`rgba(80,120,70,${0.08+Math.random()*0.12})`; ctx.beginPath(); ctx.ellipse(x,y,r*1.2,r,Math.random()*Math.PI,0,Math.PI*2); ctx.fill(); }
  const tex = new THREE.CanvasTexture(c); tex.wrapS=tex.wrapT=THREE.RepeatWrapping; tex.repeat.set(4,4); if(THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding; return tex;
}

export function buildTerrain(cfg){
  const size = cfg.size || [50,50];
  const width=size[0], height=size[1];
  const isHills = cfg.type==='hills';
  const seg = isHills ? 96 : 2;
  const geometry = new THREE.PlaneGeometry(width, height, seg, seg);
  const material = new THREE.MeshStandardMaterial({ color: new THREE.Color(cfg.color||'#4a7c1e'), side: THREE.FrontSide, roughness:0.75, metalness:0.05 });
  if(isHills){
    const pos = geometry.attributes.position; const v = new THREE.Vector3();
    const amplitude = (typeof cfg.amplitude==='number') ? cfg.amplitude : 2.5;
    const flatRadius = (typeof cfg.flat_radius==='number') ? cfg.flat_radius : Math.min(width,height)*0.15;
    const blendRadius = (typeof cfg.blend_radius==='number') ? cfg.blend_radius : Math.min(width,height)*0.25;
    const outerGain = (typeof cfg.outer_gain==='number') ? cfg.outer_gain : 1.0;
    const maxR = Math.hypot(width*0.5, height*0.5);
    for(let i=0;i<pos.count;i++){
      v.fromBufferAttribute(pos,i); const x=v.x, y=v.y;
      const wave1 = Math.sin(x*0.08)*Math.cos(y*0.08)*0.9;
      const wave2 = Math.sin(x*0.18+1.2)*Math.cos(y*0.14+0.7)*0.6;
      const wave3 = Math.sin(x*0.3+2.4)*Math.cos(y*0.22+1.7)*0.3;
      const base = (wave1+wave2+wave3)*amplitude;
      const r = Math.hypot(x, y);
      let blend; if(r<=flatRadius) blend=0; else if(r>=flatRadius+blendRadius) blend=1; else { const t=(r-flatRadius)/Math.max(1e-6,blendRadius); blend = t*t*(3-2*t); }
      const radial = outerGain===1.0 ? 1.0 : (1 + (outerGain-1)*(r/maxR));
      pos.setZ(i, base*blend*radial);
    }
    pos.needsUpdate=true; geometry.computeVertexNormals();
  }
  if(cfg.texture==='forest_floor'){
    const tex = makeForestFloorTexture(); material.map = tex; material.color = new THREE.Color('#ffffff'); material.needsUpdate=true;
  }
  const mesh = new THREE.Mesh(geometry, material); mesh.rotation.x = -Math.PI/2; mesh.position.y = cfg.y ?? 0.01; mesh.name = 'terrain'; mesh.renderOrder=-10; return mesh;
}

export function buildObject(cfg, index){
  let geometry; const type = cfg.type;
  switch(type){
    case 'tree': geometry = new THREE.ConeGeometry(1,3,12); break;
    case 'rock': geometry = new THREE.IcosahedronGeometry(0.8); break; // Icosa statt Dodeca
    case 'mushroom': geometry = new THREE.CylinderGeometry(0.5,0.2,1,12); break;
    case 'cylinder': geometry = new THREE.CylinderGeometry(1,1,2); break;
    case 'stone_circle': geometry = new THREE.TorusGeometry(2,0.2,12,24); break;
    case 'crystal': geometry = new THREE.OctahedronGeometry(1,0); break;
    case 'ball': geometry = new THREE.OctahedronGeometry(1,10); break;
    case 'bookshelf': geometry = new THREE.BoxGeometry(2,4,0.5); break;
    default: geometry = new THREE.BoxGeometry(1,1,1);
  }
  const material = new THREE.MeshStandardMaterial({ color: new THREE.Color(cfg.color||'#8b4513'), roughness:0.75, metalness:0.08 });
  const mesh = new THREE.Mesh(geometry, material);
  if(cfg.position) mesh.position.set(...cfg.position);
  if(cfg.scale) mesh.scale.set(...cfg.scale);
  if(type==='stone_circle'){ mesh.rotation.x = Math.PI/2; mesh.position.y = Math.max(mesh.position.y||0, 0.02); }
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.name = `${type}_${index}`;
  if(cfg.interactive) mesh.userData.interactive = true;
  return mesh;
}

function parseCssColor(color){
  // Accepts hex like #rrggbb or css color names; returns rgba string with given alpha
  try {
    const col = new THREE.Color(color || '#ff6b6b');
    return { r: Math.round(col.r*255), g: Math.round(col.g*255), b: Math.round(col.b*255) };
  } catch { return { r: 255, g: 107, b: 107 }; }
}

function makePersonaBillboardTexture(name, role, baseColor){
  const canvas = document.createElement('canvas'); 
  canvas.width = 256; 
  canvas.height = 256; 
  const ctx = canvas.getContext('2d');
  
  // Parse color
  const { r, g, b } = parseCssColor(baseColor);
  const hue = Math.round(Math.atan2(Math.sqrt(3) * (g - b), 2 * r - g - b) * 180 / Math.PI);
  
  // Background gradient wie in der ursprünglichen Version
  const grad = ctx.createLinearGradient(0,0,256,256);
  grad.addColorStop(0, `hsl(${hue} 60% 18%)`);
  grad.addColorStop(1, `hsl(${(hue+60)%360} 60% 10%)`);
  ctx.fillStyle = grad; 
  ctx.fillRect(0,0,256,256);

  // Simple avatar circle
  ctx.beginPath(); 
  ctx.arc(128,100,60,0,Math.PI*2);
  ctx.fillStyle = `hsl(${(hue+180)%360} 70% 60%)`; 
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#0b0f14';
  ctx.beginPath(); ctx.arc(108,90,8,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(148,90,8,0,Math.PI*2); ctx.fill();

  // Name
  ctx.fillStyle = '#d8e7ff';
  ctx.font = '700 20px system-ui, sans-serif';
  ctx.textAlign='center';
  ctx.fillText(name||'NPC', 128, 190);
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = '#a9bfdc';
  ctx.fillText(`(${role||'NPC'})`, 128, 210);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  return tex;
}

export function buildPersona(cfg, index){
  const baseColor = cfg.appearance?.color || '#ff6b6b';
  const tex = makePersonaBillboardTexture(cfg.name, cfg.role, baseColor);
  const height = cfg.appearance?.height || 1.6; // Ursprüngliche Größe
  const width = height; // Quadratisch
  
  // Einfache Plane wie im Original
  const geometry = new THREE.PlaneGeometry(width, height);
  const material = new THREE.MeshStandardMaterial({ 
    map: tex, 
    transparent: true, 
    side: THREE.DoubleSide, // Wichtig für die Lesbarkeit
    metalness: 0.1, 
    roughness: 0.9,
    alphaTest: 0.1
  });

  const plane = new THREE.Mesh(geometry, material);
  
  // Position direkt auf dem Plane setzen
  if(cfg.position){ 
    plane.position.set(...cfg.position); 
    plane.position.y += 1.0; // Feste Höhe
  }
  
  // Vollständiges userData für Interaktionssystem - direkt auf Plane
  plane.userData = { 
    type:'persona', 
    interactive: true,
    name: cfg.name || `persona_${index}`, 
    role: cfg.role||'NPC', 
    id: `persona_${index}`, 
    zoneId: cfg.zoneId,
    dialogue: cfg.dialogue,
    behavior: cfg.behavior,
    greeting: cfg.behavior?.greeting || cfg.dialogue?.opening || 'Hallo!'
  };
  plane.name = cfg.name || `persona_${index}`;
  
  // Shadows
  plane.castShadow = plane.receiveShadow = true;

  // Group nur für Aura + Plane zusammen
  const group = new THREE.Group();
  group.add(plane);

  // Sichtbare Aura: Ring wie im Original
  const ringGeom = new THREE.TorusGeometry(0.9, 0.02, 8, 64);
  const ringMat = new THREE.MeshStandardMaterial({ 
    color: 0x8bffb0, 
    emissive: 0x1a6032, 
    emissiveIntensity: 0.6
  });
  const ring = new THREE.Mesh(ringGeom, ringMat);
  ring.position.copy(plane.position).add(new THREE.Vector3(0, 0.05, 0));
  ring.rotation.x = Math.PI/2;
  ring.userData = { type:'personaAura', target: plane };
  group.add(ring);

  return group;
}

export function buildPortal(cfg, index){
  const width = cfg.size?.[0] || 1.8; const height = cfg.size?.[1] || 3.2;
  const geometry = new THREE.CylinderGeometry(width, width, height, 32, 1, true);
  const color = new THREE.Color(cfg.color || '#4169e1');
  const material = new THREE.MeshStandardMaterial({ color, transparent:true, opacity:0.6, emissive: color, emissiveIntensity: 0.25, roughness:0.2, metalness:0.2, side: THREE.DoubleSide });
  const portal = new THREE.Mesh(geometry, material);
  if(cfg.position) portal.position.set(...cfg.position);
  portal.userData = { type:'portal', id: cfg.id || `portal_${index}`, target: cfg.destination || cfg.target, name: cfg.name||'Portal' };
  return portal;
}

export function buildSkyboxCube(rng){
  // Reuse approach similar to asset-generators skybox, but inline.
  const faces = ['px','nx','py','ny','pz','nz'];
  const texMap = {};
  for(const f of faces){
    const c = document.createElement('canvas'); c.width=512; c.height=512; const ctx = c.getContext('2d');
    const hue = Math.floor(rng()*360);
    const grad = ctx.createLinearGradient(0,0,512,512);
    grad.addColorStop(0, `hsl(${(hue+10)%360} 70% 12%)`);
    grad.addColorStop(1, `hsl(${(hue+200)%360} 70% 6%)`);
    ctx.fillStyle = grad; ctx.fillRect(0,0,512,512);
    const stars = 500; for(let i=0;i<stars;i++){ const x=rng()*512, y=rng()*512, s=rng()*1.5, a=0.3 + rng()*0.7; ctx.fillStyle=`hsla(${(hue+Math.floor(rng()*60))%360} 90% 80% / ${a})`; ctx.beginPath(); ctx.arc(x,y,s,0,Math.PI*2); ctx.fill(); }
    texMap[f] = new THREE.CanvasTexture(c);
  }
  const skyGeo = new THREE.BoxGeometry(1000,1000,1000);
  const materials = [
    new THREE.MeshBasicMaterial({ map: texMap.px, side: THREE.BackSide }),
    new THREE.MeshBasicMaterial({ map: texMap.nx, side: THREE.BackSide }),
    new THREE.MeshBasicMaterial({ map: texMap.py, side: THREE.BackSide }),
    new THREE.MeshBasicMaterial({ map: texMap.ny, side: THREE.BackSide }),
    new THREE.MeshBasicMaterial({ map: texMap.pz, side: THREE.BackSide }),
    new THREE.MeshBasicMaterial({ map: texMap.nz, side: THREE.BackSide }),
  ];
  return new THREE.Mesh(skyGeo, materials);
}
