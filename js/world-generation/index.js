import * as THREE from 'three';
import { applyEnvironment } from './environment.js';
import { buildTerrain, buildObject, buildPersona, buildPortal, buildSkyboxCube } from './builders.js';
import { resolveWorldSpec } from './resolve.js';
import { startZoneAnimations } from './animation.js';
import { findFreePos, isOnPath } from '../presets/index.js';

// Handle automatic path-aware placement for objects and personas
function handlePathAwarePlacement(spec, pathMask, terrainSize) {
  // If position is already specified and avoid_paths is explicitly false, don't modify
  if (spec.position && spec.avoid_paths === false) {
    return spec;
  }
  
  // If no paths exist, return original spec
  if (!pathMask) {
    return spec;
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
      return {
        ...spec,
        position: [freePos[0], spec.position?.[1] || 0, freePos[1]]
      };
    }
  }
  
  return spec;
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

  // Objects with path-aware placement
  const objects=[];
  (spec.objects||[]).forEach((objSpec, i) => {
    const enhancedSpec = handlePathAwarePlacement(objSpec, pathMask, terrainSize);
    const mesh = buildObject(enhancedSpec, i); 
    if(mesh){ 
      group.add(mesh); 
      objects.push(mesh);
    }
  });

  // Portals
  const portals=[];
  (spec.portals||[]).forEach((p,i)=>{ const portal = buildPortal(p,i); if(portal){ group.add(portal); portals.push(portal);} });

  // Personas with path-aware placement
  const personas=[];
  (spec.personas||[]).forEach((personaSpec, i) => {
    const enhancedSpec = handlePathAwarePlacement(personaSpec, pathMask, terrainSize);
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
