import * as THREE from 'three';
import { applyEnvironment } from './environment.js';
import { buildTerrain, buildObject, buildPersona, buildPortal, buildSkyboxCube, buildPlayer } from './builders.js';
import { resolveWorldSpec } from './resolve.js';
import { startZoneAnimations } from './animation.js';
import { findFreePos, isOnPath, findPathPosition, generateFromCollections } from '../presets/index.js';

// Handle automatic path-aware placement for objects and personas
function handlePathAwarePlacement(spec, pathMask, terrainSize, terrainMesh, zoneSeed) {
  // Special handling for gate and bridge objects - they should prefer paths
  const pathPreferringTypes = ['gate_arch', 'castle_gate', 'bridge_arch', 'bridge_simple'];
  const shouldPreferPaths = pathPreferringTypes.includes(spec.type);
  
  // Create a unique seed for this object based on zone seed and object properties
  const objectSeed = `${zoneSeed || 'default'}_${spec.type || 'object'}_${spec.position ? spec.position.join('_') : 'auto'}`;
  
  // If position is already specified and avoid_paths is explicitly false, don't modify
  if (spec.position && spec.avoid_paths === false) {
    return adjustToTerrainHeight(spec, terrainMesh);
  }
  
  // If no paths exist, still adjust to terrain height
  if (!pathMask) {
    return adjustToTerrainHeight(spec, terrainMesh);
  }
  
  // For path-preferring objects, try to place them ON paths
  if (shouldPreferPaths && (!spec.position || spec.avoid_paths !== false)) {
    const pathPos = findPathPosition(pathMask, terrainSize, {
      maxAttempts: 50,
      margin: 5,
      seed: objectSeed
    });
    
    if (pathPos) {
      // Create new spec with found path position
      const newSpec = {
        ...spec,
        position: [pathPos[0], spec.position?.[1] || 0, pathPos[1]]
      };
      return adjustToTerrainHeight(newSpec, terrainMesh);
    }
  }
  
  // If position is not specified or avoid_paths is true (default), find free position
  if (!spec.position || spec.avoid_paths !== false) {
    const minDistance = typeof spec.min_path_distance === 'number' ? spec.min_path_distance : 2;
    const freePos = findFreePos(pathMask, terrainSize, {
      maxAttempts: 50,
      minDistance: minDistance,
      margin: 5,
      seed: objectSeed
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

  // Extract or generate zone seed for deterministic world generation
  const zoneSeed = spec.zone_id || spec.seed || options.seed || 'default_zone';

  // Optional Skybox cube (procedural)
  if(spec.environment?.skybox_mode === 'cube' && typeof options.rng === 'function'){
    const skybox = buildSkyboxCube(options.rng);
    group.add(skybox);
  }

  // Apply environment (lights/background/fog) on the group
  applyEnvironment(spec.environment, group);

  // Terrain (pass zone seed to terrain builder)
  let terrainMesh = null;
  if(spec.terrain){
    const terrainConfig = { ...spec.terrain, seed: zoneSeed };
    terrainMesh = buildTerrain(terrainConfig);
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

  // Personas with path-aware placement (create first so Collections can avoid them)
  const personas=[];
  (spec.personas||[]).forEach((personaSpec, i) => {
    const enhancedSpec = handlePathAwarePlacement(personaSpec, pathMask, terrainSize, terrainMesh, `${zoneSeed}_persona_${i}`);
    const npc = buildPersona(enhancedSpec, i); 
    if(npc){ 
      group.add(npc); 
      personas.push(npc);
    }
  });

  // Objects with path-aware placement and collections support (with collision detection)
  const objects=[];
  
  // Prepare existing entities for collision detection
  const existingEntities = personas.map(npc => ({
    position: [npc.position.x, npc.position.y, npc.position.z],
    name: npc.userData?.name || 'NPC',
    type: 'npc'
  }));
  
  (spec.objects||[]).forEach((objSpec, i) => {
    // Handle collections
    if (objSpec.collections && Array.isArray(objSpec.collections)) {
      const count = objSpec.number || objSpec.count || 10;
      const seed = objSpec.seed || `${zoneSeed}_objects_${i}`;
      
      const generatedObjects = generateFromCollections(
        objSpec.collections, 
        count, 
        { 
          seed,
          pathMask, 
          terrainSize,
          avoidPaths: objSpec.avoid_paths !== false,
          existingEntities: [...existingEntities, ...objects.map(obj => ({
            position: [obj.position.x, obj.position.y, obj.position.z],
            type: obj.userData?.objectType || 'object'
          }))],
          enableCollisionDetection: objSpec.enable_collision_detection !== false,
          npcBufferDistance: objSpec.npc_buffer_distance || 3,
          objectBufferDistance: objSpec.object_buffer_distance || 1
        }
      );
      
      // Process each generated object
      generatedObjects.forEach((genSpec, genIndex) => {
        const enhancedSpec = handlePathAwarePlacement(genSpec, pathMask, terrainSize, terrainMesh, `${zoneSeed}_col_${i}_${genIndex}`);
        const mesh = buildObject(enhancedSpec, `${i}_col_${genIndex}`);
        if(mesh){ 
          // Store object type for collision detection
          mesh.userData.objectType = genSpec.type || genSpec.preset || 'object';
          group.add(mesh); 
          objects.push(mesh);
        }
      });
    } else {
      // Regular single object
      const enhancedSpec = handlePathAwarePlacement(objSpec, pathMask, terrainSize, terrainMesh, `${zoneSeed}_obj_${i}`);
      const mesh = buildObject(enhancedSpec, i); 
      if(mesh){ 
        mesh.userData.objectType = objSpec.type || objSpec.preset || 'object';
        group.add(mesh); 
        objects.push(mesh);
      }
    }
  });

  // Portals
  const portals=[];
  (spec.portals||[]).forEach((p,i)=>{ const portal = buildPortal(p,i); if(portal){ group.add(portal); portals.push(portal);} });

  // Player (YAML-configurable avatar to replace simple marker)
  // Always create a default player if none specified
  let player = null;
  const playerConfig = spec.player || {
    appearance: {
      body_color: "#3366cc",
      skin_color: "#f4c2a1", 
      hair_color: "#8b4513",
      height: 0.5,  // Smaller height to prevent sinking
      proportions: {
        head_size: 0.25,
        torso_height: 0.7,
        arm_length: 0.5,
        leg_length: 0.6
      }
    },
    style: {
      hair_type: "short",
      accessories: []
    },
    animations: {
      idle: { arm_swing: 0.1, body_sway: 0.05 },
      walking: { arm_swing: 0.8, leg_swing: 0.8, speed: 12 }
    }
  };
  
  player = buildPlayer(playerConfig, 'main');
  if (player && player.avatar) {
    // DON'T add player to zone group - player should be separate
    // Set initial position at origin for movement system compatibility
    // The position adjustment is now handled in YamlPlayer class
    player.avatar.position.set(0, 0, 0);
    
    // Store player configuration in userData for movement system
    player.avatar.userData = player.avatar.userData || {};
    player.avatar.userData.yamlPlayer = player;
    player.avatar.userData.type = 'player';
    player.avatar.userData.isPlayer = true;
  }

  // Animations
  startZoneAnimations(group);

  return { group, personas, portals, objects, player, spec };
}
