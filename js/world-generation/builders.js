import * as THREE from 'three';
import { applyEnvironment } from './environment.js';
import { YamlPlayer } from '../core/yaml-player.js';

// Optional: external textures util could be injected; here we recreate forest_floor.
function makeForestFloorTexture(){
  const c = document.createElement('canvas'); c.width=512; c.height=512; const ctx=c.getContext('2d');
  const grad = ctx.createLinearGradient(0,0,512,512); grad.addColorStop(0,'#2a3f20'); grad.addColorStop(1,'#20351a');
  ctx.fillStyle=grad; ctx.fillRect(0,0,512,512);
  for(let i=0;i<400;i++){ const x=Math.random()*512, y=Math.random()*512, r=2+Math.random()*6; ctx.fillStyle=`rgba(80,120,70,${0.08+Math.random()*0.12})`; ctx.beginPath(); ctx.ellipse(x,y,r*1.2,r,Math.random()*Math.PI,0,Math.PI*2); ctx.fill(); }
  const tex = new THREE.CanvasTexture(c); tex.wrapS=tex.wrapT=THREE.RepeatWrapping; tex.repeat.set(4,4); if(THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding; return tex;
}

// NEU: einfache prozedurale Texturen, ähnlich zum forest floor
function makeGrassTexture(){
  const c = document.createElement('canvas'); c.width=512; c.height=512; const ctx=c.getContext('2d');
  ctx.fillStyle = '#2e5d2e'; ctx.fillRect(0,0,512,512);
  for(let i=0;i<1200;i++){ const x=Math.random()*512, y=Math.random()*512, len=4+Math.random()*10, w=1+Math.random()*2; ctx.strokeStyle=`rgba(180,220,160,${0.06+Math.random()*0.12})`; ctx.lineWidth=w; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+Math.random()*2-1, y-len); ctx.stroke(); }
  const tex = new THREE.CanvasTexture(c); tex.wrapS=tex.wrapT=THREE.RepeatWrapping; tex.repeat.set(6,6); if(THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding; return tex;
}
function makeMarbleTexture(){
  const c=document.createElement('canvas'); c.width=512; c.height=512; const ctx=c.getContext('2d');
  ctx.fillStyle='#dcdcdc'; ctx.fillRect(0,0,512,512);
  ctx.globalAlpha=0.25; ctx.strokeStyle='#aaa';
  for(let i=0;i<60;i++){ ctx.beginPath(); const y= Math.random()*512; for(let x=0;x<=512;x+=8){ const off = Math.sin((x*0.02)+(i*0.5))*6; ctx.lineTo(x, y+off); } ctx.stroke(); }
  ctx.globalAlpha=1;
  const tex=new THREE.CanvasTexture(c); tex.wrapS=tex.wrapT=THREE.RepeatWrapping; tex.repeat.set(2,2); if(THREE.sRGBEncoding) tex.encoding=THREE.sRGBEncoding; return tex;
}
function makeStoneTexture(){
  const c=document.createElement('canvas'); c.width=512; c.height=512; const ctx=c.getContext('2d');
  ctx.fillStyle='#5c5c5c'; ctx.fillRect(0,0,512,512);
  for(let i=0;i<800;i++){ const x=Math.random()*512, y=Math.random()*512, r=1+Math.random()*3; ctx.fillStyle=`rgba(255,255,255,${0.05+Math.random()*0.05})`; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill(); }
  for(let i=0;i<400;i++){ const x=Math.random()*512, y=Math.random()*512, w=2+Math.random()*6, h=1+Math.random()*3; ctx.fillStyle=`rgba(0,0,0,${0.05+Math.random()*0.05})`; ctx.fillRect(x,y,w,h); }
  const tex=new THREE.CanvasTexture(c); tex.wrapS=tex.wrapT=THREE.RepeatWrapping; tex.repeat.set(4,4); if(THREE.sRGBEncoding) tex.encoding=THREE.sRGBEncoding; return tex;
}
function makeFloorTexture(){
  const c=document.createElement('canvas'); c.width=512; c.height=512; const ctx=c.getContext('2d');
  ctx.fillStyle='#999'; ctx.fillRect(0,0,512,512);
  ctx.strokeStyle='#7a7a7a'; ctx.lineWidth=2;
  for(let i=0;i<=8;i++){ const t=i/8*512; ctx.beginPath(); ctx.moveTo(t,0); ctx.lineTo(t,512); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0,t); ctx.lineTo(512,t); ctx.stroke(); }
  const tex=new THREE.CanvasTexture(c); tex.wrapS=tex.wrapT=THREE.RepeatWrapping; tex.repeat.set(2,2); if(THREE.sRGBEncoding) tex.encoding=THREE.sRGBEncoding; return tex;
}
function makeWaterTexture(){
  const c=document.createElement('canvas'); c.width=512; c.height=512; const ctx=c.getContext('2d');
  const grad=ctx.createLinearGradient(0,0,512,512); grad.addColorStop(0,'#5cc9ff'); grad.addColorStop(1,'#0e89c0'); ctx.fillStyle=grad; ctx.fillRect(0,0,512,512);
  ctx.globalAlpha=0.25; ctx.strokeStyle='#ffffff';
  for(let i=0;i<40;i++){ ctx.beginPath(); const y=Math.random()*512; for(let x=0;x<=512;x+=6){ const off = Math.sin((x*0.04)+(i*0.4))*5; ctx.lineTo(x, y+off); } ctx.stroke(); }
  ctx.globalAlpha=1;
  const tex=new THREE.CanvasTexture(c); tex.wrapS=tex.wrapT=THREE.RepeatWrapping; tex.repeat.set(2,2); if(THREE.sRGBEncoding) tex.encoding=THREE.sRGBEncoding; return tex;
}

// --- Path texture generator with Bezier smoothing ---
function makePathTexture(paths=[], terrainSize=[50, 50], options={}){
  const w = options.width || 512;
  const h = options.height || 512;
  const pathWidth = options.pathWidth || 16; // pixels - increased default width
  const pathColor = options.pathColor || '#8b7355'; // brown path
  
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  
  // Transparent background for overlay
  ctx.clearRect(0, 0, w, h);
  
  // Pfadmaske für group.userData
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = w; maskCanvas.height = h;
  const maskCtx = maskCanvas.getContext('2d');
  
  // Convert world coordinates to texture coordinates
  const worldToTex = (worldX, worldZ) => {
    const texX = (worldX + terrainSize[0] * 0.5) / terrainSize[0] * w;
    const texZ = (worldZ + terrainSize[1] * 0.5) / terrainSize[1] * h;
    return [texX, texZ];
  };
  
  // Bezier smoothing helper - improved for smoother transitions
  const smoothPath = (points) => {
    if(points.length < 3) return points;
    const smooth = [points[0]];
    
    for(let i = 1; i < points.length - 1; i++){
      const prev = points[i-1];
      const curr = points[i];  
      const next = points[i+1];
      
      // Calculate tangent vector for smoother curves
      const tangentX = (next[0] - prev[0]) * 0.25; // reduced tension for smoother curves
      const tangentY = (next[1] - prev[1]) * 0.25;
      
      // Control points for Bezier curve
      const cp1x = curr[0] - tangentX;
      const cp1y = curr[1] - tangentY;
      const cp2x = curr[0] + tangentX;
      const cp2y = curr[1] + tangentY;
      
      // Add intermediate point for smoother transition
      const midX = (prev[0] + curr[0]) * 0.5;
      const midY = (prev[1] + curr[1]) * 0.5;
      smooth.push([midX, midY], [cp1x, cp1y], [cp2x, cp2y], curr);
    }
    
    // Add final point
    const lastIdx = points.length - 1;
    if(lastIdx > 0) {
      const midX = (points[lastIdx-1][0] + points[lastIdx][0]) * 0.5;
      const midY = (points[lastIdx-1][1] + points[lastIdx][1]) * 0.5;
      smooth.push([midX, midY], points[lastIdx]);
    }
    
    return smooth;
  };
  
  // Draw paths with anti-aliasing
  ctx.strokeStyle = pathColor;
  ctx.lineWidth = pathWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.imageSmoothingEnabled = true; // Enable anti-aliasing
  ctx.imageSmoothingQuality = 'high';
  
  maskCtx.strokeStyle = '#ffffff';
  maskCtx.lineWidth = pathWidth;
  maskCtx.lineCap = 'round';
  maskCtx.lineJoin = 'round';
  maskCtx.imageSmoothingEnabled = true;
  maskCtx.imageSmoothingQuality = 'high';
  
  paths.forEach(path => {
    if(!path.points || path.points.length < 2) return;
    
    // Convert to texture coordinates
    const texPoints = path.points.map(p => worldToTex(p[0], p[2] || p[1]));
    const smoothed = path.smooth !== false ? smoothPath(texPoints) : texPoints;
    
    // Draw main path
    ctx.beginPath();
    maskCtx.beginPath();
    
    if(path.smooth === false || smoothed.length === texPoints.length){
      // Simple path
      ctx.moveTo(smoothed[0][0], smoothed[0][1]);
      maskCtx.moveTo(smoothed[0][0], smoothed[0][1]);
      for(let i = 1; i < smoothed.length; i++){
        ctx.lineTo(smoothed[i][0], smoothed[i][1]);
        maskCtx.lineTo(smoothed[i][0], smoothed[i][1]);
      }
    } else {
      // Smooth Bezier path with more segments
      ctx.moveTo(smoothed[0][0], smoothed[0][1]);
      maskCtx.moveTo(smoothed[0][0], smoothed[0][1]);
      
      for(let i = 1; i < smoothed.length; i += 4){
        if(i + 3 < smoothed.length){
          // Quadratic Bezier for smoother curves
          const p1 = smoothed[i];
          const cp = smoothed[i+1];
          const p2 = smoothed[i+3];
          
          ctx.quadraticCurveTo(cp[0], cp[1], p2[0], p2[1]);
          maskCtx.quadraticCurveTo(cp[0], cp[1], p2[0], p2[1]);
        } else if(i < smoothed.length) {
          // Fallback to line for remaining points
          ctx.lineTo(smoothed[i][0], smoothed[i][1]);
          maskCtx.lineTo(smoothed[i][0], smoothed[i][1]);
        }
      }
    }
    
    ctx.stroke();
    maskCtx.stroke();
  });
  
  // Return texture and mask
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; // No repeat for path overlay
  if(THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
  
  return { texture: tex, pathMask: maskCanvas };
}

// --- Deterministic Random Number Generator ---
function makeSeededRNG(seed) {
  let state = seed ? hashStringToNumber(seed) : 12345;
  
  return function() {
    // Linear congruential generator (LCG) - same as used in presets/index.js
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function hashStringToNumber(str) {
  if (typeof str === 'number') return Math.abs(str) % 4294967296;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash) % 4294967296;
}

// --- Noise util (simple value noise) ---
function makeNoise(width=256, height=256, scale=32){
  const c=document.createElement('canvas'); c.width=width; c.height=height; const ctx=c.getContext('2d');
  const img=ctx.createImageData(width,height);
  for(let y=0;y<height;y++){
    for(let x=0;x<width;x++){
      const nx = x/scale, ny=y/scale;
      const v = (Math.sin(nx)+Math.sin(ny*1.3)+Math.sin((nx+ny)*0.7))*0.3335; // [-1,1]
      const g = Math.floor((v*0.5+0.5)*255);
      const i=(y*width+x)*4; img.data[i]=g; img.data[i+1]=g; img.data[i+2]=g; img.data[i+3]=255;
    }
  }
  ctx.putImageData(img,0,0); return c;
}

// --- Compositor API ---
// composeTexture(layers, opts)
// layers: [{ fn: 'grass'|'stone'|'marble'|'floor'|'water'|'forest', alpha: 1, mask: 'noise'|'none', maskScale: 32, blend: 'normal'|'multiply'|'screen' }]
function getGeneratorByName(name){
  switch(name){
    case 'grass': return makeGrassTexture;
    case 'stone': return makeStoneTexture;
    case 'marble': return makeMarbleTexture;
    case 'floor': return makeFloorTexture;
    case 'water': return makeWaterTexture;
    case 'forest': return makeForestFloorTexture;
    default: return null;
  }
}

function composeTexture(layers=[], opts={}){
  const w = opts.width || 512, h = opts.height || 512;
  const out=document.createElement('canvas'); out.width=w; out.height=h; const octx=out.getContext('2d');
  octx.clearRect(0,0,w,h);

  layers.forEach(layer=>{
    const gen = typeof layer.fn==='function' ? layer.fn : getGeneratorByName(layer.fn);
    if(!gen) return;
    // Generator liefert THREE.CanvasTexture; wir brauchen das Source-Canvas
    const tex = gen();
    const src = tex.image || tex.source?.data; // Canvas
    if(!src) return;

    // Maske
    let mask=null; let maskData=null;
    if(layer.mask === 'noise'){
      mask = makeNoise(w,h, layer.maskScale||32);
      const mctx = mask.getContext('2d');
      maskData = mctx.getImageData(0,0,w,h).data;
    }

    // Ziel vorbereiten mit globalCompositeOperation
    const blend = layer.blend || 'source-over';
    const alpha = Math.max(0, Math.min(1, layer.alpha==null?1:layer.alpha));

    if(!mask){
      octx.globalAlpha = alpha;
      octx.globalCompositeOperation = blend;
      octx.drawImage(src, 0,0, w,h);
    } else {
      // Pixelweise mischen via ImageData mit Maske
      const sctx = src.getContext('2d');
      const sData = sctx.getImageData(0,0,w,h);
      const dData = octx.getImageData(0,0,w,h);
      const S = sData.data; const D = dData.data;
      for(let i=0;i<w*h;i++){
        const mi = i*4, aMask = (maskData[mi]/255) * alpha; // nur R-Kanal
        const sr=S[mi], sg=S[mi+1], sb=S[mi+2];
        const dr=D[mi], dg=D[mi+1], db=D[mi+2];
        // simple alpha blend (normal)
        const outA = aMask + (1-aMask)*1; // Ziel hat volle Deckkraft
        D[mi]   = sr*aMask + dr*(1-aMask);
        D[mi+1] = sg*aMask + dg*(1-aMask);
        D[mi+2] = sb*aMask + db*(1-aMask);
        D[mi+3] = 255;
      }
      octx.putImageData(dData,0,0);
    }
  });

  const tex = new THREE.CanvasTexture(out);
  tex.wrapS=tex.wrapT=THREE.RepeatWrapping; tex.repeat.set(4,4);
  if(THREE.sRGBEncoding) tex.encoding=THREE.sRGBEncoding;
  return tex;
}

export function buildTerrain(cfg){
  const size = cfg.size || [50,50];
  const width=size[0], height=size[1];
  const isHills = cfg.type==='hills';
  const seg = isHills ? 96 : 2;
  const geometry = new THREE.PlaneGeometry(width, height, seg, seg);
  
  // Base color from config
  const baseColor = new THREE.Color(cfg.color||'#4a7c1e');
  
  // Add some emissive light to make terrain visible even in low light
  const emissiveIntensity = cfg.emissive_intensity ?? 0.15; // Subtle glow to ensure visibility
  const material = new THREE.MeshStandardMaterial({ 
    color: baseColor, 
    emissive: baseColor.clone().multiplyScalar(emissiveIntensity),
    side: THREE.FrontSide, 
    roughness: 0.75, 
    metalness: 0.05 
  });
  
  // Seed-basierte Terrain-Generierung
  const terrainSeed = cfg.seed || cfg.zone_id || 'default_terrain';
  const rng = makeSeededRNG(terrainSeed);
  
  if(isHills){
    const pos = geometry.attributes.position; const v = new THREE.Vector3();
    const amplitude = (typeof cfg.amplitude==='number') ? cfg.amplitude : 2.5;
    const flatRadius = (typeof cfg.flat_radius==='number') ? cfg.flat_radius : Math.min(width,height)*0.15;
    const blendRadius = (typeof cfg.blend_radius==='number') ? cfg.blend_radius : Math.min(width,height)*0.25;
    const outerGain = (typeof cfg.outer_gain==='number') ? cfg.outer_gain : 1.0;
    const maxR = Math.hypot(width*0.5, height*0.5);
    
    // Seed-basierte Phasenverschiebungen für deterministische Hügel
    const phase1 = rng() * Math.PI * 2;
    const phase2 = rng() * Math.PI * 2; 
    const phase3 = rng() * Math.PI * 2;
    const freq1 = 0.06 + rng() * 0.04; // 0.06-0.10
    const freq2 = 0.12 + rng() * 0.08; // 0.12-0.20
    const freq3 = 0.24 + rng() * 0.12; // 0.24-0.36
    
    for(let i=0;i<pos.count;i++){
      v.fromBufferAttribute(pos,i); const x=v.x, y=v.y;
      
      // Deterministische Wellen mit seed-basierten Parametern
      const wave1 = Math.sin(x*freq1 + phase1)*Math.cos(y*freq1 + phase1*0.7)*0.9;
      const wave2 = Math.sin(x*freq2 + phase2)*Math.cos(y*freq2 + phase2*0.8)*0.6;
      const wave3 = Math.sin(x*freq3 + phase3)*Math.cos(y*freq3 + phase3*0.9)*0.3;
      const base = (wave1+wave2+wave3)*amplitude;
      
      const r = Math.hypot(x, y);
      let blend; if(r<=flatRadius) blend=0; else if(r>=flatRadius+blendRadius) blend=1; else { const t=(r-flatRadius)/Math.max(1e-6,blendRadius); blend = t*t*(3-2*t); }
      const radial = outerGain===1.0 ? 1.0 : (1 + (outerGain-1)*(r/maxR));
      pos.setZ(i, base*blend*radial);
    }
    pos.needsUpdate=true; geometry.computeVertexNormals();
  }
  // Texturwahl inkl. Compositing
  if (Array.isArray(cfg.texture_layers)){
    const tex = composeTexture(cfg.texture_layers, { width:512, height:512 });
    material.map = tex; material.color = new THREE.Color('#ffffff'); material.needsUpdate=true;
  } else if(cfg.texture==='forest_floor'){
    const tex = makeForestFloorTexture(); material.map = tex; material.color = new THREE.Color('#ffffff'); material.needsUpdate=true;
  } else if (cfg.texture==='grass_texture'){
    const tex = makeGrassTexture(); material.map = tex; material.color = new THREE.Color('#ffffff'); material.needsUpdate=true;
  } else if (cfg.texture==='marble_texture'){
    const tex = makeMarbleTexture(); material.map = tex; material.color = new THREE.Color('#ffffff'); material.needsUpdate=true;
  } else if (cfg.texture==='stone_texture'){
    const tex = makeStoneTexture(); material.map = tex; material.color = new THREE.Color('#ffffff'); material.needsUpdate=true;
  } else if (cfg.texture==='floor_texture'){
    const tex = makeFloorTexture(); material.map = tex; material.color = new THREE.Color('#ffffff'); material.needsUpdate=true;
  } else if (cfg.texture==='water_texture'){
    const tex = makeWaterTexture(); material.map = tex; material.color = new THREE.Color('#a0d8ef'); material.roughness = 0.2; material.metalness = 0.1; material.needsUpdate=true;
  }
  
  // Path system integration - create separate path mesh
  let pathMask = null;
  let pathMesh = null;
  
  if(cfg.paths && cfg.paths.length > 0){
    const pathResult = makePathTexture(cfg.paths, size, cfg.path_options);
    pathMask = pathResult.pathMask;
    
    // Create separate path mesh (slightly above terrain)
    const pathGeometry = new THREE.PlaneGeometry(width, height, seg, seg); // Same segments as terrain for hills
    const pathMaterial = new THREE.MeshStandardMaterial({
      map: pathResult.texture,
      transparent: true,
      alphaTest: 0.1, // Only render non-transparent pixels
      roughness: 0.8,
      metalness: 0.0
    });
    
    pathMesh = new THREE.Mesh(pathGeometry, pathMaterial);
    pathMesh.rotation.x = -Math.PI/2;
    pathMesh.position.y = (cfg.y ?? 0.01) + 0.01; // Slightly higher offset for hills
    pathMesh.name = 'paths';
    pathMesh.renderOrder = -9; // Render after terrain but before objects
    
    // For hills terrain, copy the height data from terrain geometry
    if(isHills && geometry.attributes.position){
      const terrainPos = geometry.attributes.position;
      const pathPos = pathGeometry.attributes.position;
      
      // Copy height values from terrain to path mesh
      for(let i = 0; i < pathPos.count; i++){
        if(i < terrainPos.count){
          const terrainHeight = terrainPos.getZ(i);
          pathPos.setZ(i, terrainHeight + 0.02); // Small offset above terrain
        }
      }
      pathPos.needsUpdate = true;
      pathGeometry.computeVertexNormals();
    }
  }
  
  const mesh = new THREE.Mesh(geometry, material); 
  mesh.rotation.x = -Math.PI/2; 
  mesh.position.y = cfg.y ?? 0.01; 
  mesh.name = 'terrain'; 
  mesh.renderOrder = -10; 
  
  // Store terrain information in userData for object placement logic
  mesh.userData.terrainSize = size;
  if(isHills) {
    mesh.userData.isHills = true;
  }
  if(pathMask){
    mesh.userData.pathMask = pathMask;
  }
  
  // Return both terrain and path mesh if paths exist
  if(pathMesh){
    const group = new THREE.Group();
    group.add(mesh);
    group.add(pathMesh);
    group.userData = mesh.userData; // Forward path data
    return group;
  }
  
  return mesh;
}

export function buildObject(cfg, index){
  // Unterstütze zusammengesetzte Presets unter cfg.composite oder speziellen type-Namen
  // Beispiel: type: 'deciduous_tree' oder composite: [ {type:'cylinder', ...}, {type:'ball', ...} ]
  const compositeAliases = {
    // Laubbaum: Stamm (Zylinder) + Krone (Kugel)
    'deciduous_tree': [
      { type: 'cylinder', position: [0, 1.5, 0], scale: [0.4, 3.0, 0.4], color: '#8b5a2b' },
      { type: 'ball',     position: [0, 4.5, 0], scale: [2.0, 2.0, 2.0], color: '#2e8b57' }
    ],
    // Kiefernartiger Baum: hoher Stamm + konische Krone
    'conifer_tree': [
      { type: 'cylinder', position: [0, 1, 0], scale: [0.5,1,0.5], color: '#311b07' },
      { type: 'cone',     position: [0, 7, 0], scale: [1.2,1.7,1.2],  color: '#105532' }
    ],
    'mushroom_group': [
      { type: 'mushroom', position: [0, 0, 0], color: '#f1e7dd' },
      { type: 'ball',   position: [0, 1, 0], scale: [.8,.5,.8], color: '#a3140a' }
    ],
    
    // === DORF-GEBÄUDE ===
    
    // Einfaches Haus mit Satteldach
    'house_simple': [
      { type: 'box', position: [0, 1.5, 0], scale: [3.0, 3.0, 3.0], color: '#8b7355' }, // Wände
      { type: 'roof', position: [0, 3.2, 0], scale: [3.2, 1.2, 3.4], color: '#8b0000' } // Satteldach
    ],
    
    // Größeres Haus mit Satteldach und Schornstein
    'house_large': [
      { type: 'box', position: [0, 2.0, 0], scale: [4.0, 4.0, 4.0], color: '#d2b48c' }, // Haupthaus
      { type: 'roof', position: [0, 4.5, 0], scale: [4.4, 1.5, 4.6], color: '#8b0000' }, // Satteldach
      { type: 'cylinder', position: [1.5, 6.0, 1.5], scale: [0.3, 2.0, 0.3], color: '#696969' } // Schornstein
    ],
    
    // Schloss-Turm mit spitzem Dach
    'castle_tower': [
      { type: 'cylinder', position: [0, 4.0, 0], scale: [2.5, 8.0, 2.5], color: '#696969' }, // Turm
      { type: 'cone', position: [0, 9.0, 0], scale: [2.8, 3.0, 2.8], color: '#4a4a4a' }, // Spitzdach
      { type: 'cylinder', position: [0, 8.5, 0], scale: [2.7, 0.5, 2.7], color: '#8b7355' } // Zinnen-Ring
    ],
    
    // Schloss mit begehbarem Torbogen
    'castle_gate': [
      { type: 'box', position: [-3.0, 3.0, 0], scale: [2.0, 6.0, 2.0], color: '#696969' }, // Linke Mauer
      { type: 'box', position: [3.0, 3.0, 0], scale: [2.0, 6.0, 2.0], color: '#696969' }, // Rechte Mauer
      { type: 'box', position: [0, 5.5, 0], scale: [2.0, 1.0, 2.0], color: '#696969' }, // Oberer Querbalken
      { type: 'arch', position: [0, 2.5, 0], scale: [1.8, 2.0, 2.2], color: '#4a4a4a' }, // Torbogen (nur visuell)
      { type: 'cylinder', position: [-3.0, 7.0, 0], scale: [1.0, 2.0, 1.0], color: '#696969' }, // Linker Turm
      { type: 'cylinder', position: [3.0, 7.0, 0], scale: [1.0, 2.0, 1.0], color: '#696969' }, // Rechter Turm
      { type: 'cone', position: [-3.0, 8.5, 0], scale: [1.2, 1.5, 1.2], color: '#4a4a4a' }, // Linkes Dach
      { type: 'cone', position: [3.0, 8.5, 0], scale: [1.2, 1.5, 1.2], color: '#4a4a4a' } // Rechtes Dach
    ],
    
    // Einfacher begehbarer Torbogen (standalone)
    'gate_arch': [
      { type: 'box', position: [-1.5, 2.0, 0], scale: [0.8, 4.0, 1.0], color: '#696969' }, // Linker Pfeiler
      { type: 'box', position: [1.5, 2.0, 0], scale: [0.8, 4.0, 1.0], color: '#696969' }, // Rechter Pfeiler
      { type: 'arch', position: [0, 2.5, 0], scale: [1.5, 1.8, 1.2], color: '#696969' } // Torbogen (nur visuell)
    ],
    
    // Begehbare Brücke mit seitlichen Torbögen
    'bridge_arch': [
      { type: 'box', position: [0, 0.5, 0], scale: [8.0, 1.0, 2.0], color: '#696969' }, // Brücken-Deck
      { type: 'box', position: [-3.0, 1.5, -1.2], scale: [0.6, 2.0, 0.6], color: '#8b7355' }, // Linker Pfeiler hinten
      { type: 'box', position: [3.0, 1.5, -1.2], scale: [0.6, 2.0, 0.6], color: '#8b7355' }, // Rechter Pfeiler hinten  
      { type: 'box', position: [-3.0, 1.5, 1.2], scale: [0.6, 2.0, 0.6], color: '#8b7355' }, // Linker Pfeiler vorne
      { type: 'box', position: [3.0, 1.5, 1.2], scale: [0.6, 2.0, 0.6], color: '#8b7355' }, // Rechter Pfeiler vorne
      { type: 'arch', position: [-3.0, 1.8, 0], scale: [0.8, 1.2, 1.8], color: '#8b7355' }, // Linker Bogen (seitlich)
      { type: 'arch', position: [3.0, 1.8, 0], scale: [0.8, 1.2, 1.8], color: '#8b7355' } // Rechter Bogen (seitlich)
    ],
    
    // Einfache begehbare Brücke
    'bridge_simple': [
      { type: 'box', position: [0, 0.3, 0], scale: [8.0, 0.6, 2.0], color: '#8b7355' }, // Brücken-Deck
      { type: 'box', position: [-3.5, 0.8, -0.8], scale: [0.4, 1.0, 0.4], color: '#654321' }, // Geländer-Pfosten
      { type: 'box', position: [3.5, 0.8, -0.8], scale: [0.4, 1.0, 0.4], color: '#654321' }, // Geländer-Pfosten
      { type: 'box', position: [-3.5, 0.8, 0.8], scale: [0.4, 1.0, 0.4], color: '#654321' }, // Geländer-Pfosten
      { type: 'box', position: [3.5, 0.8, 0.8], scale: [0.4, 1.0, 0.4], color: '#654321' } // Geländer-Pfosten
    ],
    
    // Kleine Hütte
    'hut_small': [
      { type: 'cylinder', position: [0, .5, 0], scale: [1.8, 1.3, 1.8] }, // Runde Basis
      { type: 'truncated_cone', position: [0, 2.0, 0], scale: [2.4, 0.4, 2.4],  color: '#8b6914' } // Stroh-Dach
    ],
    
    // Wachturm
    'tower_watch': [
      { type: 'cylinder', position: [0, 3.0, 0], scale: [1.5, 6.0, 1.5], color: '#696969' }, // Turm-Basis
      { type: 'cylinder', position: [0, 6.5, 0], scale: [2.0, 1.0, 2.0], color: '#8b7355' }, // Plattform
      { type: 'cone', position: [0, 7.5, 0], scale: [1.8, 2.0, 1.8], color: '#8b0000' } // Spitzdach
    ],
    
    // Kirche mit Satteldach
    'church': [
      { type: 'box', position: [0, 3.0, 0], scale: [5.0, 6.0, 8.0], color: '#f5deb3' }, // Hauptschiff
      { type: 'roof', position: [0, 6.5, 0], scale: [5.4, 2.0, 8.4], color: '#8b0000' }, // Hauptdach
      { type: 'cylinder', position: [0, 8.0, -3.0], scale: [1.0, 6.0, 1.0], color: '#f5deb3' }, // Turm
      { type: 'roof', position: [0, 11.5, -3.0], scale: [1.4, 1.5, 1.4], color: '#8b0000' } // Turmdach
    ],
    
    // Windmühle
    'windmill': [
      { type: 'cylinder', position: [0, 4.0, 0], scale: [2.0, 8.0, 2.0], color: '#f5deb3' }, // Mühlen-Turm
      { type: 'cone', position: [0, 8.5, 0], scale: [1.6, 1.5, 1.6], color: '#8b0000' }, // Dach
      { type: 'box', position: [2.5, 6.0, 0], scale: [0.2, 4.0, 0.8], color: '#654321' }, // Flügel 1
      { type: 'box', position: [-2.5, 6.0, 0], scale: [0.2, 4.0, 0.8], color: '#654321' }, // Flügel 2
      { type: 'box', position: [0, 6.0, 2.5], scale: [0.8, 4.0, 0.2], color: '#654321' }, // Flügel 3
      { type: 'box', position: [0, 6.0, -2.5], scale: [0.8, 4.0, 0.2], color: '#654321' } // Flügel 4
    ],
    
    // Scheune mit Satteldach
    'barn': [
      { type: 'box', position: [0 ,1.8,0], scale: [8,3,4], color: '#8b0000' }, // Hauptgebäude
      { type: 'roof', position: [0 ,3,0], rotation: [0, 1.57, 0], scale: [2.5,2,4.5], color: '#654321' } // Satteldach
    ],
    
    // Brunnen
    'well': [
      { type: 'cylinder', position: [0, 0.5, 0], scale: [1.5, 1.0, 1.5], color: '#696969' }, // Brunnen-Basis
      { type: 'cylinder', position: [0, 1.5, 0], scale: [1.2, 1.0, 1.2], color: '#2f4f2f' }, // Brunnen-Rand
      { type: 'cylinder', position: [-1.0, 3.0, 0], scale: [0.15, 4.0, 0.15], color: '#8b4513' }, // Pfosten 1
      { type: 'cylinder', position: [1.0, 3.0, 0], scale: [0.15, 4.0, 0.15], color: '#8b4513' }, // Pfosten 2
      { type: 'cylinder', position: [0, 4.8, 0], scale: [1.2, 0.2, 0.2], color: '#8b4513' } // Querbalken
    ]
  };

  // Kreis aus Felsen
  if (cfg.type === 'circle_of_rocks') {
    const count = Math.max(3, Number(cfg.number) || 8);
    const radius = Number(cfg.radius) || 3.5;
    const heightJitter = Number(cfg.heightJitter) || 0.4; // leichte Variationen

    const group = new THREE.Group();
    group.name = `circle_of_rocks_${index}`;

    for (let i = 0; i < count; i++) {
      const t = (i / count) * Math.PI * 2;
      const x = Math.cos(t) * radius;
      const z = Math.sin(t) * radius;

      // Einzelner Fels (Icosahedron) mit kleiner Zufalls-Skalierung
      const rock = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.8, 0),
        new THREE.MeshStandardMaterial({ color: new THREE.Color(cfg.color || '#8b7a5e'), roughness: 0.9, metalness: 0.05 })
      );
      const s = 0.8 + (cfg.randomScale ? Math.random() * 0.6 : 0);
      rock.scale.set(s, s * (1 + Math.random() * 0.5), s);
      rock.position.set(x, (cfg.y || 0) + (Math.random() - 0.5) * heightJitter, z);
      rock.castShadow = rock.receiveShadow = true;
      group.add(rock);
    }

    // Basistransform (optional) anwenden
    if (cfg.position) group.position.set(...cfg.position);
    if (cfg.rotation) group.rotation.set(...cfg.rotation);
    if (cfg.scale)    group.scale.set(...cfg.scale);

    group.userData.type = 'circle_of_rocks';
    if (cfg.interactive) group.userData.interactive = true;
    return group;
  }

  // Wenn eine Composite-Definition gewünscht ist
  if (Array.isArray(cfg.composite) || compositeAliases[cfg.type]) {
    const parts = Array.isArray(cfg.composite) ? cfg.composite : compositeAliases[cfg.type];
    const group = new THREE.Group();
    group.name = `${cfg.type||'composite'}_${index}`;
    // Basistransform auf der Gruppe anwenden
    if(cfg.position) group.position.set(...cfg.position);
    if(cfg.rotation) group.rotation.set(...cfg.rotation);
    if(cfg.scale)    group.scale.set(...cfg.scale);

    parts.forEach((part, i) => {
      const child = buildObject({ ...part }, i);
      if (!child) return;
      group.add(child);
    });

    // Interaktivität auf Gruppe heben (Raycasting soll die Gruppe treffen)
    group.traverse(o => { o.userData = o.userData || {}; });
    if (cfg.interactive) group.userData.interactive = true;
    group.userData.type = cfg.type || 'composite';
    return group;
  }

  // Primitive/Synonyme unterstützen
  let geometry; const type = cfg.type;
  switch(type){
    case 'tree': case 'cone': geometry = new THREE.ConeGeometry(2,6,12); break;
    case 'rock': 
      // Verwende IcosahedronGeometry als Basis - das ist bereits unregelmäßig
      geometry = new THREE.IcosahedronGeometry(0.8, 1); // subdivision level 1 für natürlichere Form
      
      // Leichte Verformung für mehr Variation
      const positions = geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const z = positions.getZ(i);
        
        // Sanfte Deformation basierend auf Position
        const noise = Math.sin(x * 3.7) * Math.cos(y * 4.1) * Math.sin(z * 3.3) * 0.15;
        const scale = 1 + noise;
        
        positions.setXYZ(i, x * scale, y * scale, z * scale);
      }
      positions.needsUpdate = true;
      geometry.computeVertexNormals();
      break;
    case 'roof':
      // Satteldach - vollständig geschlossenes Dreiecksprisma
      geometry = new THREE.BufferGeometry();
      const roofVertices = new Float32Array([
        // Vorderseite (Giebel vorne) - counter-clockwise
        -1, 0, 1,   1, 0, 1,   0, 1, 1,
        // Rückseite (Giebel hinten) - counter-clockwise von hinten gesehen
        -1, 0, -1,  0, 1, -1,  1, 0, -1,
        // Unterseite - counter-clockwise von unten gesehen
        -1, 0, -1,  -1, 0, 1,  1, 0, 1,
        -1, 0, -1,  1, 0, 1,   1, 0, -1,
        // Linke Dachfläche - counter-clockwise
        -1, 0, -1,  0, 1, -1,  0, 1, 1,
        -1, 0, -1,  0, 1, 1,   -1, 0, 1,
        // Rechte Dachfläche - counter-clockwise
        1, 0, -1,   1, 0, 1,   0, 1, 1,
        1, 0, -1,   0, 1, 1,   0, 1, -1
      ]);
      geometry.setAttribute('position', new THREE.BufferAttribute(roofVertices, 3));
      geometry.computeVertexNormals();
      break;
    case 'arch':
      // Torbogen - Ring mit rechteckigem Querschnitt
      const archRadius = 1.0;
      const archThickness = 0.3;
      const archHeight = 0.5;
      const archSegments = 16;
      
      geometry = new THREE.BufferGeometry();
      const archVertices = [];
      const archIndices = [];
      
      // Generiere Vertices für den Bogen (nur obere Hälfte)
      for(let i = 0; i <= archSegments; i++){
        const theta = (i / archSegments) * Math.PI; // 0 to PI (halber Kreis)
        
        // Äußerer Ring
        const outerX = Math.cos(theta) * (archRadius + archThickness);
        const outerY = Math.sin(theta) * (archRadius + archThickness);
        
        // Innerer Ring
        const innerX = Math.cos(theta) * archRadius;
        const innerY = Math.sin(theta) * archRadius;
        
        // Vordere Vertices
        archVertices.push(outerX, outerY, archHeight);  // Äußerer vorne
        archVertices.push(innerX, innerY, archHeight);  // Innerer vorne
        
        // Hintere Vertices
        archVertices.push(outerX, outerY, -archHeight); // Äußerer hinten
        archVertices.push(innerX, innerY, -archHeight); // Innerer hinten
      }
      
      // Generiere Indices für Faces
      for(let i = 0; i < archSegments; i++){
        const base = i * 4;
        const next = (i + 1) * 4;
        
        // Vordere Fläche
        archIndices.push(base, base + 1, next + 1);
        archIndices.push(base, next + 1, next);
        
        // Hintere Fläche  
        archIndices.push(base + 2, next + 2, next + 3);
        archIndices.push(base + 2, next + 3, base + 3);
        
        // Äußere Fläche
        archIndices.push(base, next, next + 2);
        archIndices.push(base, next + 2, base + 2);
        
        // Innere Fläche
        archIndices.push(base + 1, base + 3, next + 3);
        archIndices.push(base + 1, next + 3, next + 1);
      }
      
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(archVertices, 3));
      geometry.setIndex(archIndices);
      geometry.computeVertexNormals();
      break;
    case 'mushroom': geometry = new THREE.CylinderGeometry(0.5,0.2,1,12); break;
    case 'cylinder': geometry = new THREE.CylinderGeometry(1,1,2,16); break;
    case 'truncated_cone': geometry = new THREE.CylinderGeometry(0.5,1,2,16); break; // Kegelstumpf: oben schmaler, unten breiter
    case 'stone_circle': geometry = new THREE.TorusGeometry(2,0.2,12,24); break;
    case 'crystal': geometry = new THREE.OctahedronGeometry(1,0); break;
    case 'ball': case 'sphere': geometry = new THREE.SphereGeometry(1, 16, 12); break;
    case 'box': geometry = new THREE.BoxGeometry(1,1,1); break;
    case 'bookshelf': geometry = new THREE.BoxGeometry(2,4,0.5); break;
    default: geometry = new THREE.BoxGeometry(1,1,1);
  }
  const baseColor = new THREE.Color(cfg.color||'#8b4513');
  const emissiveIntensity = cfg.emissive_intensity ?? 0.15;
  const material = new THREE.MeshStandardMaterial({ 
    color: baseColor,
    emissive: baseColor.clone().multiplyScalar(emissiveIntensity),
    roughness: type === 'rock' ? 0.9 : 0.75, // Felsen noch rauer
    metalness: type === 'rock' ? 0.02 : 0.08, // Felsen weniger metallisch
    side: type === 'roof' ? THREE.DoubleSide : THREE.FrontSide // Doppelseitig für Dächer
  });
  const mesh = new THREE.Mesh(geometry, material);
  if(cfg.position) mesh.position.set(...cfg.position);
  if(cfg.scale) mesh.scale.set(...cfg.scale);
  if(cfg.rotation) mesh.rotation.set(...cfg.rotation);
  if(type==='stone_circle'){ mesh.rotation.x = Math.PI/2; mesh.position.y = Math.max(mesh.position.y||0, 0.02); }
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.name = `${type||'object'}_${index}`;
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

// Build YAML-configurable player avatar
export function buildPlayer(cfg, index = 'main') {
  if (!cfg) return null; // No player config = use default marker
  
  try {
    const yamlPlayer = new YamlPlayer(cfg);
    
    // Position and rotation
    if (cfg.position) {
      yamlPlayer.avatar.position.set(...cfg.position);
    }
    if (cfg.rotation !== undefined) {
      yamlPlayer.avatar.rotation.y = cfg.rotation;
    }
    
    // Add player marker functionality
    yamlPlayer.avatar.userData = {
      type: 'player',
      isPlayer: true,
      yamlPlayer: yamlPlayer // Reference for animation updates
    };
    
    yamlPlayer.avatar.name = `player_${index}`;
    
    return yamlPlayer;
  } catch (error) {
    console.error('Failed to build YAML player:', error);
    return null; // Fallback to default marker
  }
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

// Build themed skybox cube for specific presets
export function buildThemedSkyboxCube(preset, timeOfDay = 0.5, rng) {
  const faces = ['px','nx','py','ny','pz','nz']; // +X, -X, +Y, -Y, +Z, -Z
  const texMap = {};
  
  for(const f of faces) {
    const c = document.createElement('canvas'); 
    c.width = 512; c.height = 512; 
    const ctx = c.getContext('2d');
    
    // Draw different content based on preset and face
    drawThemedSkyboxFace(ctx, preset, f, timeOfDay, rng);
    texMap[f] = new THREE.CanvasTexture(c);
  }
  
  const skyGeo = new THREE.BoxGeometry(1000, 1000, 1000); 
  const materials = [
    new THREE.MeshBasicMaterial({ map: texMap.px, side: THREE.BackSide, name: 'px' }),
    new THREE.MeshBasicMaterial({ map: texMap.nx, side: THREE.BackSide, name: 'nx' }),
    new THREE.MeshBasicMaterial({ map: texMap.py, side: THREE.BackSide, name: 'py' }),
    new THREE.MeshBasicMaterial({ map: texMap.ny, side: THREE.BackSide, name: 'ny' }),
    new THREE.MeshBasicMaterial({ map: texMap.pz, side: THREE.BackSide, name: 'pz' }),
    new THREE.MeshBasicMaterial({ map: texMap.nz, side: THREE.BackSide, name: 'nz' }),
  ];
  
  const skybox = new THREE.Mesh(skyGeo, materials);
  skybox.userData.isSkybox = true;
  skybox.userData.preset = preset;
  return skybox;
}

function drawThemedSkyboxFace(ctx, preset, face, timeOfDay, rng) {
  const isHorizon = (face === 'px' || face === 'nx' || face === 'pz' || face === 'nz'); // Side faces
  const isSky = (face === 'py'); // Top face (+Y)
  const isGround = (face === 'ny'); // Bottom face (-Y)
  
  switch(preset) {
    case 'sunset':
      drawSunsetSkybox(ctx, face, isHorizon, isSky, isGround, timeOfDay, rng);
      break;
    case 'night':
      drawNightSkybox(ctx, face, isHorizon, isSky, isGround, rng);
      break;
    case 'storm':
      drawStormSkybox(ctx, face, isHorizon, isSky, isGround, rng);
      break;
    case 'skyline':
      drawSkylineSkybox(ctx, face, isHorizon, isSky, isGround, rng);
      break;
    case 'ocean':
      drawOceanSkybox(ctx, face, isHorizon, isSky, isGround, rng);
      break;
    case 'mystery_dark':
      drawMysteryDarkSkybox(ctx, face, isHorizon, isSky, isGround, rng);
      break;
    case 'bay':
      drawBaySkybox(ctx, face, isHorizon, isSky, isGround, rng);
      break;
    case 'clear_day':
    default:
      drawClearDaySkybox(ctx, face, isHorizon, isSky, isGround, rng);
      break;
  }
}

function drawSunsetSkybox(ctx, face, isHorizon, isSky, isGround, timeOfDay, rng) {
  if (isSky) {
    // Sky: Orange to purple gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#ff6b35'); // Orange top
    grad.addColorStop(0.7, '#f7931e'); // Yellow-orange
    grad.addColorStop(1, '#c0392b'); // Deep red
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    
    // Add some clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for(let i = 0; i < 8; i++) {
      const x = rng() * 512;
      const y = rng() * 300 + 100;
      const w = rng() * 80 + 40;
      const h = rng() * 20 + 10;
      ctx.beginPath();
      ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (isHorizon) {
    // Horizon: Show sun on one face
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#f39c12'); // Warm yellow top
    grad.addColorStop(0.7, '#e67e22'); // Orange middle  
    grad.addColorStop(1, '#2c3e50'); // Dark ground
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    
    // Draw sun on one of the horizon faces - moved higher
    if (face === 'px') {
      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.arc(256, 280, 40, 0, Math.PI * 2); // Moved from 350 to 280
      ctx.fill();
      
      // Sun rays
      ctx.strokeStyle = 'rgba(241, 196, 15, 0.5)';
      ctx.lineWidth = 2;
      for(let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const x1 = 256 + Math.cos(angle) * 50;
        const y1 = 280 + Math.sin(angle) * 50; // Moved from 350 to 280
        const x2 = 256 + Math.cos(angle) * 80;
        const y2 = 280 + Math.sin(angle) * 80; // Moved from 350 to 280
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }
  } else if (isGround) {
    // Ground: Dark silhouette
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#2c3e50');
    grad.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
  }
}

function drawNightSkybox(ctx, face, isHorizon, isSky, isGround, rng) {
  // DEBUG: Use different colors for each face to identify issues
  console.log(`🌙 Drawing night skybox face: ${face}, isHorizon: ${isHorizon}, isSky: ${isSky}, isGround: ${isGround}`);
  
  // Fill the entire canvas with the appropriate night sky pattern
  if (isSky) {
    // Dark night sky with stars
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#0b1426'); // Deep blue
    grad.addColorStop(1, '#1a1a2e'); // Purple-blue
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    
    // Add many stars
    for(let i = 0; i < 300; i++) {
      const x = rng() * 512;
      const y = rng() * 512;
      const size = rng() * 2 + 0.5;
      const alpha = 0.5 + rng() * 0.5;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Add moon on one part
    if (rng() > 0.7) {
      ctx.fillStyle = '#f4f4f4';
      ctx.beginPath();
      ctx.arc(100, 100, 25, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (isHorizon) {
    // Dark horizon with subtle city lights
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#1a1a2e');
    grad.addColorStop(0.7, '#16213e');
    grad.addColorStop(1, '#0f0f23');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    
    // Add some distant lights - moved higher to match horizon
    for(let i = 0; i < 20; i++) {
      const x = rng() * 512;
      const y = 320 + rng() * 192; // Moved from 400 to 320 for higher horizon
      ctx.fillStyle = `rgba(255, 255, 0, ${0.3 + rng() * 0.4})`;
      ctx.fillRect(x, y, 2, 4);
    }
  } else if (isGround) {
    // Very dark ground
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, 512, 512);
  } else {
    // FALLBACK: if none of the conditions are met, use a debug color
    console.warn(`🚨 Night skybox fallback for face ${face}`);
    ctx.fillStyle = '#ff0000'; // RED for debugging
    ctx.fillRect(0, 0, 512, 512);
  }
}

function drawSkylineSkybox(ctx, face, isHorizon, isSky, isGround, rng) {
  if (isSky) {
    // Urban sky
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#87ceeb'); // Light blue
    grad.addColorStop(1, '#b0c4de'); // Light steel blue
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
  } else if (isHorizon) {
    // Sky with city skyline
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#87ceeb');
    grad.addColorStop(0.6, '#b0c4de');
    grad.addColorStop(1, '#696969');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    
    // Draw city skyline - moved up for better horizon
    ctx.fillStyle = '#2c3e50';
    const numBuildings = 8 + Math.floor(rng() * 6);
    for(let i = 0; i < numBuildings; i++) {
      const x = (i / numBuildings) * 512;
      const width = 30 + rng() * 40;
      const height = 60 + rng() * 120; // Reduced max height
      const y = 400 - height; // Moved from 512 to 400 for higher horizon
      ctx.fillRect(x, y, width, height);
      
      // Add windows
      ctx.fillStyle = '#f39c12';
      for(let j = 0; j < Math.floor(height / 20); j++) {
        for(let k = 0; k < Math.floor(width / 15); k++) {
          if (rng() > 0.3) {
            const wx = x + k * 15 + 5;
            const wy = y + j * 20 + 5;
            ctx.fillRect(wx, wy, 6, 8);
          }
        }
      }
      ctx.fillStyle = '#2c3e50';
    }
  } else if (isGround) {
    // Concrete/asphalt ground
    ctx.fillStyle = '#34495e';
    ctx.fillRect(0, 0, 512, 512);
  }
}

function drawClearDaySkybox(ctx, face, isHorizon, isSky, isGround, rng) {
  if (isSky) {
    // Clear blue sky
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#87ceeb');
    grad.addColorStop(1, '#e0f6ff');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    
    // Add some white clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for(let i = 0; i < 5; i++) {
      const x = rng() * 512;
      const y = rng() * 300 + 50;
      const w = rng() * 60 + 30;
      const h = rng() * 25 + 15;
      ctx.beginPath();
      ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (isHorizon) {
    // Horizon with grass/hills
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#87ceeb');
    grad.addColorStop(0.7, '#98d8e8');
    grad.addColorStop(1, '#4a7c1e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
  } else if (isGround) {
    // Green grass
    ctx.fillStyle = '#4a7c1e';
    ctx.fillRect(0, 0, 512, 512);
  }
}

function drawStormSkybox(ctx, face, isHorizon, isSky, isGround, rng) {
  if (isSky) {
    // Dark stormy clouds
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#2c3e50');
    grad.addColorStop(0.5, '#34495e');
    grad.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    
    // Add lightning
    if (rng() > 0.6) {
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      const x = rng() * 512;
      ctx.moveTo(x, 0);
      ctx.lineTo(x + (rng() - 0.5) * 100, 200);
      ctx.lineTo(x + (rng() - 0.5) * 150, 400);
      ctx.stroke();
    }
  } else if (isHorizon || isGround) {
    // Dark stormy atmosphere
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#34495e');
    grad.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
  }
}

function drawOceanSkybox(ctx, face, isHorizon, isSky, isGround, rng) {
  if (isSky) {
    // Ocean blue sky
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#5dade2');
    grad.addColorStop(1, '#85c1e9');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
  } else if (isHorizon) {
    // Ocean horizon
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#5dade2');
    grad.addColorStop(0.5, '#3498db');
    grad.addColorStop(1, '#2980b9');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    
    // Add waves - individual wave crests that don't reach edges
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    
    for(let i = 0; i < 5; i++) {
      const y = 250 + i * 35;
      
      // Create 3-5 distinct wave segments per row, well separated from edges
      const numSegments = 3 + Math.floor(rng() * 3);
      const edgeMargin = 80; // Larger margin from edges
      const availableWidth = 512 - (2 * edgeMargin);
      const segmentSpacing = availableWidth / (numSegments + 1);
      
      for(let seg = 0; seg < numSegments; seg++) {
        ctx.beginPath();
        
        // Position segments evenly with random variation
        const baseX = edgeMargin + (seg + 1) * segmentSpacing;
        const segmentStart = baseX + (rng() - 0.5) * 30; // Random offset
        const segmentLength = 25 + rng() * 35; // Shorter waves: 25-60px
        const segmentEnd = segmentStart + segmentLength;
        
        // Only draw if segment stays within bounds
        if (segmentStart > edgeMargin && segmentEnd < (512 - edgeMargin)) {
          // Draw wavy segment
          for(let x = segmentStart; x <= segmentEnd; x += 3) {
            const normalizedX = (x - segmentStart) / segmentLength;
            const wavePhase = normalizedX * Math.PI * 2.5 + i * 0.7 + seg * 1.3;
            const amplitude = 6 * Math.sin(normalizedX * Math.PI); // Fade amplitude at ends
            const waveY = y + Math.sin(wavePhase) * amplitude;
            
            if (x === segmentStart) ctx.moveTo(x, waveY);
            else ctx.lineTo(x, waveY);
          }
          ctx.stroke();
        }
      }
    }
  } else if (isGround) {
    // Deep ocean
    ctx.fillStyle = '#1b4f72';
    ctx.fillRect(0, 0, 512, 512);
  }
}

function drawMysteryDarkSkybox(ctx, face, isHorizon, isSky, isGround, rng) {
  if (isSky) {
    // Mysterious purple sky
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#2d1b69');
    grad.addColorStop(0.5, '#8e44ad');
    grad.addColorStop(1, '#4a148c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    
    // Add mystical sparkles
    for(let i = 0; i < 50; i++) {
      const x = rng() * 512;
      const y = rng() * 512;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + rng() * 0.7})`;
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (isHorizon || isGround) {
    // Dark mysterious ground
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#4a148c');
    grad.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
  }
}

function drawBaySkybox(ctx, face, isHorizon, isSky, isGround, rng) {
  if (isSky) {
    // Bay sky
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#7fb3d3');
    grad.addColorStop(1, '#b0e0e6');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
  } else if (isHorizon) {
    // Bay with gentle water
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#7fb3d3');
    grad.addColorStop(0.6, '#5fa3c8');
    grad.addColorStop(1, '#4a90a4');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    
    // Add gentle waves - individual short segments
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    for(let i = 0; i < 3; i++) {
      const y = 280 + i * 30;
      
      // Create short gentle wave segments
      const numSegments = 2 + Math.floor(rng() * 2); // 2-3 segments for calmer bay
      for(let seg = 0; seg < numSegments; seg++) {
        ctx.beginPath();
        
        const segmentStart = 80 + (rng() * (512 - 200)); // Start between 80-312
        const segmentLength = 60 + rng() * 60; // Length 60-120px  
        const segmentEnd = Math.min(segmentStart + segmentLength, 512 - 80);
        
        // Draw gentle wavy segment
        for(let x = segmentStart; x <= segmentEnd; x += 6) {
          const normalizedX = (x - segmentStart) / segmentLength;
          const wavePhase = normalizedX * Math.PI * 1.5 + i * 0.3 + seg * 0.8;
          const waveY = y + Math.sin(wavePhase) * 3; // Small amplitude for bay
          
          if (x === segmentStart) ctx.moveTo(x, waveY);
          else ctx.lineTo(x, waveY);
        }
        ctx.stroke();
      }
    }
  } else if (isGround) {
    // Water floor
    ctx.fillStyle = '#2980b9';
    ctx.fillRect(0, 0, 512, 512);
  }
}
