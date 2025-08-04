import * as THREE from 'three';
import { applyEnvironment } from './environment.js';
import { buildTerrain, buildObject, buildPersona, buildPortal, buildSkyboxCube } from './builders.js';
import { resolveWorldSpec } from './resolve.js';
import { startZoneAnimations } from './animation.js';
import { findFreePos, isOnPath, generateFromCollections } from '../presets/index.js';

// Handle automatic path-aware placement for objects and personas
function handlePathAwarePlacement(spec, pathMask, terrainSize, terrainMesh) {
  // If position is already specified and avoid_paths is explicitly false, don't modify
  if (spec.position && spec.avoid_paths === false) {
    return adjustToTerrainHeight(spec, terrainMesh);
  }
  
  // If no paths exist, still adjust to terrain height
  if (!pathMask) {
    return adjustToTerrainHeight(spec, terrainMesh);
  }
  
  // If position is not specified or avoid_paths is true (default), find free position
  if (!spec.position || spec.avoid_paths !== false) {
    const minDistance = typeof spec.min_path_distance === 'number' ? spec.min_path_distance : 2;
    const freePos = findFreePos(pathMask, terrainSize, {
      maxAttempts: 50,
      minDistance: minDistance,
      margin: 5
    });
    
    if (freePos) {
      // Create new spec with found position
      const newSpec = {
        ...spec,
        position: [freePos[0], spec.position?.[1] || 0, freePos[1]]
      };
      return adjustToTerrainHeight(newSpec, terrainMesh);
    }
  }
  
  return adjustToTerrainHeight(spec, terrainMesh);
}

// Adjust object/persona position to terrain height
function adjustToTerrainHeight(spec, terrainMesh) {
  if (!spec.position || !terrainMesh) {
    return spec;
  }
  
  const [x, y, z] = spec.position;
  let terrainHeight = 0;
  
  // Get terrain height at position
  if (terrainMesh.type === 'Group') {
    // Terrain with paths - get terrain mesh from group
    const terrain = terrainMesh.children.find(child => child.name === 'terrain');
    if (terrain) {
      terrainHeight = getTerrainHeightAt(terrain, x, z);
    }
  } else {
    // Single terrain mesh
    terrainHeight = getTerrainHeightAt(terrainMesh, x, z);
  }
  
  // Adjust Y position to terrain height + small offset
  const adjustedY = terrainHeight + (y || 0) + 0.1; // Small offset to prevent Z-fighting
  
  return {
    ...spec,
    position: [x, adjustedY, z]
  };
}

// Get terrain height at specific world coordinates using raycasting
function getTerrainHeightAt(terrainMesh, worldX, worldZ) {
  if (!terrainMesh || !terrainMesh.geometry) {
    return 0;
  }
  
  // For hills terrain with geometry data
  if (terrainMesh.geometry.attributes.position) {
    const geometry = terrainMesh.geometry;
    const position = geometry.attributes.position;
    
    // Get terrain dimensions
    const terrainSize = terrainMesh.userData.terrainSize || [50, 50];
    const [width, height] = terrainSize;
    
    // Convert world coordinates to geometry coordinates
    const localX = worldX + width * 0.5;  // Convert to 0..width
    const localZ = worldZ + height * 0.5; // Convert to 0..height
    
    // Clamp to terrain bounds
    const clampedX = Math.max(0, Math.min(width, localX));
    const clampedZ = Math.max(0, Math.min(height, localZ));
    
    // Get geometry resolution (segments + 1)
    const segments = Math.sqrt(position.count) - 1;
    const segmentSize = width / segments;
    
    // Find nearest vertices
    const segX = Math.floor(clampedX / segmentSize);
    const segZ = Math.floor(clampedZ / segmentSize);
    
    // Get heights of the 4 surrounding vertices
    const getVertexHeight = (sx, sz) => {
      sx = Math.max(0, Math.min(segments, sx));
      sz = Math.max(0, Math.min(segments, sz));
      const index = sz * (segments + 1) + sx;
      return index < position.count ? position.getZ(index) : 0;
    };
    
    const h00 = getVertexHeight(segX, segZ);
    const h10 = getVertexHeight(segX + 1, segZ);
    const h01 = getVertexHeight(segX, segZ + 1);
    const h11 = getVertexHeight(segX + 1, segZ + 1);
    
    // Bilinear interpolation
    const fx = (clampedX % segmentSize) / segmentSize;
    const fz = (clampedZ % segmentSize) / segmentSize;
    
    const h0 = h00 * (1 - fx) + h10 * fx;
    const h1 = h01 * (1 - fx) + h11 * fx;
    const interpolatedHeight = h0 * (1 - fz) + h1 * fz;
    
    return interpolatedHeight;
  }
  
  return 0; // Fallback for flat terrain
}

export function buildZoneFromSpec(worldData, options={}){
  const spec = resolveWorldSpec(worldData);
  const group = new THREE.Group();

  // Optional Skybox cube (procedural)
  if(spec.environment?.skybox_mode === 'cube' && typeof options.rng === 'function'){
    const skybox = buildSkyboxCube(options.rng);
    group.add(skybox);
  }

  // Apply environment (lights/background/fog) on the group
  applyEnvironment(spec.environment, group);

  // Terrain
  let terrainMesh = null;
  if(spec.terrain){
    terrainMesh = buildTerrain(spec.terrain);
    group.add(terrainMesh);
  }

  // Get path information for intelligent object placement
  let pathMask = null;
  let terrainSize = [50, 50];
  
  if(terrainMesh){
    // Check if terrain is a group (with paths) or single mesh
    if(terrainMesh.type === 'Group'){
      // Terrain with paths - extract path data from terrain mesh
      const terrain = terrainMesh.children.find(child => child.name === 'terrain');
      if(terrain && terrain.userData.pathMask){
        pathMask = terrain.userData.pathMask;
        terrainSize = terrain.userData.terrainSize || terrainSize;
      }
    } else if(terrainMesh.userData.pathMask){
      // Single terrain mesh with paths
      pathMask = terrainMesh.userData.pathMask;
      terrainSize = terrainMesh.userData.terrainSize || terrainSize;
    }
  }

  // Objects with path-aware placement and collections support
  const objects=[];
  (spec.objects||[]).forEach((objSpec, i) => {
    // Handle collections
    if (objSpec.collections && Array.isArray(objSpec.collections)) {
      const count = objSpec.number || objSpec.count || 10;
      const seed = objSpec.seed || Math.floor(Math.random() * 10000);
      
      const generatedObjects = generateFromCollections(
        objSpec.collections, 
        count, 
        { 
          seed,
          pathMask, 
          terrainSize,
          avoidPaths: objSpec.avoid_paths !== false
        }
      );
      
      // Process each generated object
      generatedObjects.forEach((genSpec, genIndex) => {
        const enhancedSpec = handlePathAwarePlacement(genSpec, pathMask, terrainSize, terrainMesh);
        const mesh = buildObject(enhancedSpec, `${i}_col_${genIndex}`);
        if(mesh){ 
          group.add(mesh); 
          objects.push(mesh);
        }
      });
    } else {
      // Regular single object
      const enhancedSpec = handlePathAwarePlacement(objSpec, pathMask, terrainSize, terrainMesh);
      const mesh = buildObject(enhancedSpec, i); 
      if(mesh){ 
        group.add(mesh); 
        objects.push(mesh);
      }
    }
  });

  // Portals
  const portals=[];
  (spec.portals||[]).forEach((p,i)=>{ const portal = buildPortal(p,i); if(portal){ group.add(portal); portals.push(portal);} });

  // Personas with path-aware placement
  const personas=[];
  (spec.personas||[]).forEach((personaSpec, i) => {
    const enhancedSpec = handlePathAwarePlacement(personaSpec, pathMask, terrainSize, terrainMesh);
    const npc = buildPersona(enhancedSpec, i); 
    if(npc){ 
      group.add(npc); 
      personas.push(npc);
    }
  });

  // Animations
  startZoneAnimations(group);

  return { group, personas, portals, objects, spec };
}
