// Collision Detection System für Collections
// Modulares ES6-System für Spatial Collision Management
// Funktioniert sowohl in index.html als auch preset-editor.html

/**
 * Get bounding box for an entity (object, NPC, collection)
 * @param {Object} entity - Entity with position and optional scale/size
 * @returns {Object} { min: [x, z], max: [x, z] }
 */
export function getEntityBounds(entity) {
  const pos = entity.position || [0, 0, 0];
  const scale = entity.scale || [1, 1, 1];
  
  // Default size based on entity type
  let baseSize = [2, 2]; // [width, depth] default
  
  // Adjust base size based on entity type/preset
  if (entity.type || entity.preset) {
    const type = entity.type || entity.preset;
    switch (type) {
      case 'tree':
      case 'tree_simple':
      case 'deciduous_tree':
      case 'conifer_tree':
        baseSize = [3, 3];
        break;
      case 'house_simple':
      case 'house_large':
        baseSize = [6, 8];
        break;
      case 'hut_small':
        baseSize = [4, 4];
        break;
      case 'tower_watch':
        baseSize = [4, 4];
        break;
      case 'windmill':
        baseSize = [5, 5];
        break;
      case 'barn':
        baseSize = [8, 6];
        break;
      case 'well':
        baseSize = [2, 2];
        break;
      case 'rock':
      case 'rock_small':
        baseSize = [1.5, 1.5];
        break;
      case 'mushroom_small':
      case 'mushroom_group':
        baseSize = [1, 1];
        break;
      case 'crystal':
        baseSize = [1.5, 1.5];
        break;
      case 'bookshelf':
        baseSize = [2, 1];
        break;
      case 'stone_circle_thin':
      case 'circle_of_rocks':
        const radius = entity.radius || 2.5;
        baseSize = [radius * 2, radius * 2];
        break;
      case 'npc_plain':
      case 'npc_fairy':
      case 'npc_scholar':
      case 'npc_guardian':
        baseSize = [1, 1];
        break;
      default:
        baseSize = [2, 2];
    }
  }
  
  // Apply scale
  const width = baseSize[0] * scale[0];
  const depth = baseSize[1] * scale[2];
  
  const halfWidth = width * 0.5;
  const halfDepth = depth * 0.5;
  
  return {
    min: [pos[0] - halfWidth, pos[2] - halfDepth],
    max: [pos[0] + halfWidth, pos[2] + halfDepth]
  };
}

/**
 * Check if two bounding boxes overlap
 * @param {Object} boundsA - First bounding box
 * @param {Object} boundsB - Second bounding box
 * @returns {boolean} true if boxes overlap
 */
export function checkBoundsOverlap(boundsA, boundsB) {
  return !(
    boundsA.max[0] <= boundsB.min[0] ||
    boundsA.min[0] >= boundsB.max[0] ||
    boundsA.max[1] <= boundsB.min[1] ||
    boundsA.min[1] >= boundsB.max[1]
  );
}

/**
 * Check if entity collides with any existing entities
 * @param {Object} newEntity - Entity to place
 * @param {Object[]} existingEntities - Array of existing entities (objects, NPCs)
 * @param {Object} options - { npcBufferDistance: 3, objectBufferDistance: 1 }
 * @returns {boolean} true if collision detected
 */
export function checkCollision(newEntity, existingEntities, options = {}) {
  const { npcBufferDistance = 3, objectBufferDistance = 1 } = options;
  
  const newBounds = getEntityBounds(newEntity);
  
  for (const existing of existingEntities) {
    const isNPC = existing.name || existing.appearance || 
                  (existing.type && existing.type.includes('npc')) ||
                  (existing.preset && existing.preset.includes('npc'));
    
    const bufferDistance = isNPC ? npcBufferDistance : objectBufferDistance;
    
    // Expand existing entity bounds by buffer distance
    const existingBounds = getEntityBounds(existing);
    const bufferedBounds = {
      min: [
        existingBounds.min[0] - bufferDistance,
        existingBounds.min[1] - bufferDistance
      ],
      max: [
        existingBounds.max[0] + bufferDistance,
        existingBounds.max[1] + bufferDistance
      ]
    };
    
    if (checkBoundsOverlap(newBounds, bufferedBounds)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Find a safe position for an entity that doesn't collide with existing entities
 * @param {Object} entity - Entity to place (will be modified with new position)
 * @param {Object[]} existingEntities - Array of existing entities
 * @param {Object} options - { maxAttempts: 50, terrainSize: [50, 50], margin: 5, pathMask?, avoidPaths: true, npcBufferDistance: 3, objectBufferDistance: 1, seed: number|string }
 * @returns {boolean} true if safe position found and applied
 */
export function findNonCollidingPosition(entity, existingEntities, options = {}) {
  const {
    maxAttempts = 50,
    terrainSize = [50, 50],
    margin = 5,
    pathMask,
    avoidPaths = true,
    npcBufferDistance = 3,
    objectBufferDistance = 1,
    seed = 'collision_' + Math.random()
  } = options;
  
  // Create seeded RNG for deterministic placement
  const rng = makeSeededRNG(seed);
  
  // Determine if this entity should avoid paths
  const shouldAvoidPaths = avoidPaths && entity.avoid_paths !== false;
  const pathPreferringTypes = ['gate_arch', 'castle_gate', 'bridge_arch', 'bridge_simple'];
  const prefersPath = pathPreferringTypes.includes(entity.type || entity.preset);
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Generate random position within terrain bounds
    const x = (rng() - 0.5) * (terrainSize[0] - margin * 2);
    const z = (rng() - 0.5) * (terrainSize[1] - margin * 2);
    
    // Check path constraints if pathMask available
    if (pathMask) {
      const onPath = isOnPath(x, z, pathMask, terrainSize);
      
      if (prefersPath && !onPath) continue; // Needs to be on path
      if (shouldAvoidPaths && onPath) continue; // Needs to avoid path
    }
    
    // Create test entity with this position
    const testEntity = {
      ...entity,
      position: [x, entity.position ? entity.position[1] : 0, z]
    };
    
    // Check for collisions
    if (!checkCollision(testEntity, existingEntities, { npcBufferDistance, objectBufferDistance })) {
      // Safe position found - update entity
      entity.position = [x, entity.position ? entity.position[1] : 0, z];
      return true;
    }
  }
  
  // No safe position found
  return false;
}

/**
 * Apply safe placement to multiple entities from Collections
 * @param {Object[]} entities - Array of entities to place
 * @param {Object[]} existingEntities - Array of existing entities (NPCs, objects)
 * @param {Object} options - Placement options (same as findNonCollidingPosition)
 * @returns {Object[]} Array of successfully placed entities
 */
export function applySafePlacement(entities, existingEntities = [], options = {}) {
  const placedEntities = [];
  const allEntities = [...existingEntities]; // Start with existing entities
  
  for (const entity of entities) {
    // Skip if entity already has avoid_paths = false (manually positioned)
    if (entity.avoid_paths === false) {
      placedEntities.push(entity);
      allEntities.push(entity);
      continue;
    }
    
    // Try to find safe position
    if (findNonCollidingPosition(entity, allEntities, options)) {
      placedEntities.push(entity);
      allEntities.push(entity); // Add to tracking for next placements
    } else {
      console.warn('Could not find safe position for entity:', entity.type || entity.preset);
      // Optionally still place entity at random position as fallback
      if (options.allowUnsafeFallback) {
        const x = (Math.random() - 0.5) * (options.terrainSize?.[0] || 50);
        const z = (Math.random() - 0.5) * (options.terrainSize?.[1] || 50);
        entity.position = [x, entity.position?.[1] || 0, z];
        placedEntities.push(entity);
        allEntities.push(entity);
      }
    }
  }
  
  return placedEntities;
}

// Helper function to check if position is on path (import from path utilities)
function isOnPath(worldX, worldZ, pathMask, terrainSize, threshold = 128) {
  if (!pathMask || !terrainSize) return false;
  
  const w = pathMask.width;
  const h = pathMask.height;
  
  // Convert world coordinates to texture coordinates
  const texX = Math.floor((worldX + terrainSize[0] * 0.5) / terrainSize[0] * w);
  const texZ = Math.floor((worldZ + terrainSize[1] * 0.5) / terrainSize[1] * h);
  
  // Bounds check
  if (texX < 0 || texX >= w || texZ < 0 || texZ >= h) return false;
  
  // Sample pixel
  const ctx = pathMask.getContext('2d');
  const imageData = ctx.getImageData(texX, texZ, 1, 1);
  const alpha = imageData.data[3]; // Alpha channel
  
  return alpha >= threshold;
}

// Helper function to create seeded RNG
function makeSeededRNG(seed) {
  let state = typeof seed === 'string' ? hashStringToNumber(seed) : Math.abs(seed || 12345) % 4294967296;
  
  return function() {
    // Linear congruential generator (LCG)
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function hashStringToNumber(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash) % 4294967296;
}