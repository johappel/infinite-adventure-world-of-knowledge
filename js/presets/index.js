// Preset Registry – Terrain, Objects, Personas
// Minimal, selbsterklärend und LLM-freundlich

import { makeForestFloorTexture, forestFloorPreset } from './terrain/forest_floor.js';
import { presetGrassFlat } from './terrain/grass_flat.js';
import { presetMarbleFlat } from './terrain/marble_flat.js';
import { presetTreeSimple } from './objects/tree_simple.js';
import { presetRockSmall } from './objects/rock_small.js';
import { presetMushroomSmall } from './objects/mushroom_small.js';
import { presetStoneCircleThin } from './objects/stone_circle_thin.js';
import { presetCrystal } from './objects/crystal.js';
import { presetBookshelf } from './objects/bookshelf.js';
import { 
  presetHouseSimple, presetHouseLarge, presetHutSmall, 
  presetTowerWatch, presetWindmill, presetBarn, presetWell 
} from './objects/village.js';
import { presetNpcPlain } from './personas/npc_plain.js';
import { presetNpcFairy } from './personas/npc_fairy.js';
import { presetNpcScholar } from './personas/npc_scholar.js';
import { presetNpcGuardian } from './personas/npc_guardian.js';
import { applySafePlacement } from '../utils/collision-detection.js';

export const terrainPresets = {
  forest_floor: forestFloorPreset,
  grass_flat: presetGrassFlat,
  marble_flat: presetMarbleFlat,
};

export const objectPresets = {
  tree_simple: presetTreeSimple,
  rock_small: presetRockSmall,
  mushroom_small: presetMushroomSmall,
  stone_circle_thin: presetStoneCircleThin,
  crystal: presetCrystal,
  bookshelf: presetBookshelf,
  // Village buildings
  house_simple: presetHouseSimple,
  house_large: presetHouseLarge,
  hut_small: presetHutSmall,
  tower_watch: presetTowerWatch,
  windmill: presetWindmill,
  barn: presetBarn,
  well: presetWell,
};

export const personaPresets = {
  npc_plain: presetNpcPlain,
  npc_fairy: presetNpcFairy,
  npc_scholar: presetNpcScholar,
  npc_guardian: presetNpcGuardian,
};

// --- Player Presets für YAML-konfigurierbaren Avatar ---

export const playerPresets = {
  default: {
    appearance: {
      body_color: '#3366cc',
      skin_color: '#99ccff',
      hair_color: '#222222',
      height: 1.0
    },
    style: {
      hair_type: 'hat',
      clothing: 'basic',
      accessories: []
    }
  },
  
  knight: {
    appearance: {
      body_color: '#708090',
      skin_color: '#deb887',
      hair_color: '#8b4513',
      height: 1.2
    },
    style: {
      hair_type: 'short',
      clothing: 'armor',
      accessories: ['weapon']
    },
    animations: {
      walking: { speed: 8 },
      running: { speed: 12 }
    }
  },
  
  mage: {
    appearance: {
      body_color: '#4b0082',
      skin_color: '#f5deb3',
      hair_color: '#ffffff',
      height: 1.1
    },
    style: {
      hair_type: 'long',
      clothing: 'robe',
      accessories: ['cape', 'glasses']
    },
    animations: {
      idle: { arm_swing: 0.2, body_sway: 0.1 },
      walking: { arm_swing: 0.5, speed: 9 }
    }
  },
  
  fairy: {
    appearance: {
      body_color: '#ffd700',
      skin_color: '#ffffe0',
      hair_color: '#ff69b4',
      height: 0.8,
      proportions: {
        head_size: 0.5
      }
    },
    style: {
      hair_type: 'long',
      clothing: 'casual',
      accessories: ['cape']
    },
    animations: {
      idle: { arm_swing: 0.3, body_sway: 0.15 },
      walking: { arm_swing: 0.6, leg_swing: 0.4, speed: 12 }
    }
  },
  
  scholar: {
    appearance: {
      body_color: '#2f4f4f',
      skin_color: '#deb887',
      hair_color: '#696969',
      height: 1.0
    },
    style: {
      hair_type: 'short',
      clothing: 'robe',
      accessories: ['glasses']
    },
    animations: {
      idle: { arm_swing: 0.05, body_sway: 0.02 },
      walking: { speed: 7 }
    }
  }
};

export const textures = { makeForestFloorTexture };

// --- Collections System für schnelle Landschafts-Generierung ---

export const objectCollections = {
  trees: [
    { type: "tree", weight: 3, variations: [
      { scale: [1.0, 1.0, 1.0], color: "#084b5c" },
      { scale: [1.3, 1.5, 1.3], color: "#1a4a1a" },
      { scale: [0.8, 1.2, 0.8], color: "#0e500e" }
    ]},
    { type: "deciduous_tree", weight: 2, variations: [
      { scale: [1.0, 1.0, 1.0] },
      { scale: [1.1, 1.2, 1.1] },
      { scale: [0.9, 0.8, 0.9] }
    ]},
    { type: "conifer_tree", weight: 2, variations: [
      { scale: [1.2, 1.2, 1.2] },
      { scale: [1.0, 1.5, 1.0] },
      { scale: [0.8, 1.0, 0.8] }
    ]}
  ],
  
  rocks: [
    { type: "rock", variations: [
      { scale: [1.0, 1.0, 1.0], color: "#6b5b4f" },
      { scale: [1.5, 0.8, 1.2], color: "#8b7a5e" },
      { scale: [0.7, 1.3, 0.9], color: "#5a4a3a" },
      { scale: [1.2, 0.9, 1.1], color: "#7a6b5f" },
      { scale: [0.8, 1.2, 0.8], color: "#4a3d33" }
    ]},
  ],
  
  forest_objects: [
    { type: "tree", weight: 3, color: "#084b5c" },
    { type: "deciduous_tree", weight: 2 },
    { type: "conifer_tree", weight: 2 },
    { type: "rock", weight: 1, color: "#6b5b4f" },
    { type: "mushroom_group", weight: 5, variations: [
      { scale: [0.5, 0.8, 0.5], color: "#8b4513" },
      { scale: [0.6, 1.0, 0.6], color: "#a0522d" },
      { scale: [0.4, 0.7, 0.4], color: "#cd853f" }
    ]}
  ],
  
  mystical: [
    { type: "crystal", variations: [
      { color: "#66ffee" },
      { color: "#ff6b9d" },
      { color: "#9d6bff" },
      { scale: [1.5, 1.5, 1.5] }
    ]},
    { type: "circle_of_rocks", variations: [
      { number: 6, radius: 2.5 },
      { number: 8, radius: 3.5 },
      { number: 10, radius: 4.0 }
    ]},
  ],
  
  village: [
    // Häuser (Hauptgebäude)
    { type: "house_simple", weight: 3, variations: [
      { scale: [0.8, 0.8, 0.8] },
      { scale: [1.0, 1.0, 1.0] },
      { scale: [1.2, 1.0, 1.2] }
    ]},
    { type: "house_large", weight: 2, variations: [
      { scale: [0.9, 0.9, 0.9] },
      { scale: [1.1, 1.1, 1.1] }
    ]},
    { type: "hut_small", weight: 2, variations: [
      { scale: [0.7, 0.7, 0.7] },
      { scale: [1.0, 1.0, 1.0] },
      { scale: [1.3, 1.0, 1.3] }
    ]},
    
    // Spezielle Gebäude (seltener)
    { type: "tower_watch", weight: 1, variations: [
      { scale: [0.8, 1.0, 0.8] },
      { scale: [1.0, 1.2, 1.0] }
    ]},
    { type: "windmill", weight: 1 },
    { type: "barn", weight: 1, variations: [
      { scale: [0.8, 0.8, 0.8] },
      { scale: [1.2, 1.0, 1.0] }
    ]},
    
    // Dorf-Infrastruktur
    { type: "well", weight: 2, variations: [
      { scale: [0.8, 0.8, 0.8] },
      { scale: [1.0, 1.0, 1.0] }
    ]},
    { type: "circle_of_rocks", weight: 1, variations: [
      { number: 4, radius: 1.5 }, // Kleine Feuerstelle
      { number: 6, radius: 2.0 }  // Größerer Versammlungsplatz
    ]},
    
    // Lagerobjekte
    { type: "bookshelf", weight: 1 },
    { type: "crystal", weight: 1, variations: [
      { color: "#ffeeaa", scale: [0.6, 0.6, 0.6] } // Kleinere Dorf-Kristalle
    ]},
  ],
  
  castle: [
    { type: "castle_tower", weight: 3, variations: [
      { scale: [1.0, 1.0, 1.0] },
      { scale: [1.2, 1.3, 1.2] },
      { scale: [0.8, 0.9, 0.8] }
    ]},
    { type: "castle_gate", weight: 2, avoid_paths: false }, // Torbögen sollen Pfade bevorzugen
    { type: "gate_arch", weight: 2, avoid_paths: false }, // Einfachere begehbare Torbögen
    { type: "tower_watch", weight: 2, variations: [
      { scale: [1.0, 1.2, 1.0] },
      { scale: [1.3, 1.0, 1.3] }
    ]},
    { type: "bridge_arch", weight: 1, avoid_paths: false, variations: [
      { scale: [1.0, 1.0, 1.0] },
      { scale: [1.5, 1.0, 1.0] } // Längere Brücke
    ]},
    { type: "bridge_simple", weight: 1, avoid_paths: false }, // Einfache begehbare Brücken
    { type: "well", weight: 1 }, // Brunnen im Burghof
    { type: "circle_of_rocks", weight: 1, variations: [
      { number: 8, radius: 3.0 } // Burgwall-Verstärkung
    ]}
  ]
};

/**
 * Generate objects from collections with collision detection
 * @param {string[]} collections - Array of collection names
 * @param {number} count - Total number of objects to generate  
 * @param {Object} options - { 
 *   seed: number, 
 *   pathMask?, 
 *   terrainSize?, 
 *   avoidPaths: true, 
 *   existingEntities: [], 
 *   enableCollisionDetection: true, 
 *   npcBufferDistance: 3, 
 *   objectBufferDistance: 1 
 * }
 * @returns {Object[]} Array of object specifications with safe positions
 */
export function generateFromCollections(collections, count, options = {}) {
  const { 
    seed: providedSeed, 
    pathMask, 
    terrainSize, 
    avoidPaths = true,
    existingEntities = [],
    enableCollisionDetection = true,
    npcBufferDistance = 3,
    objectBufferDistance = 1
  } = options;
  
  // Seed-Quelle bestimmen: 1) explizit übergeben 2) zone_id aus globalem Kontext 3) echter Zufall
  let effectiveSeed = providedSeed;
  if (effectiveSeed == null || effectiveSeed === '') {
    // Versuche, eine zone_id aus globalem Kontext zu lesen (z. B. vom Loader in window.__zone_id)
    const zoneId = (typeof window !== 'undefined' && window.__zone_id) ? window.__zone_id : null;
    if (zoneId) {
      effectiveSeed = `${zoneId}__collections_default`;
    } else {
      // Fallback: einmalige, nicht-deterministische Seed-Quelle
      effectiveSeed = Math.random() * 1e9;
    }
  }
  
  // Create seeded RNG for deterministic object generation
  const rng = makeSeededRNG(effectiveSeed);
  
  // Gather all objects from specified collections
  const allObjects = [];
  collections.forEach(collectionName => {
    const collection = objectCollections[collectionName];
    if (collection && Array.isArray(collection)) {
      collection.forEach((objDef, index) => {
        if (objDef && (objDef.type || objDef.preset)) { // Ensure valid object definition
          const weight = objDef.weight || 1;
          // Add object multiple times based on weight
          for (let i = 0; i < weight; i++) {
            allObjects.push(objDef);
          }
        } else {
          console.warn(`Invalid object definition in collection '${collectionName}' at index ${index}:`, objDef);
        }
      });
    } else {
      console.warn(`Collection '${collectionName}' not found or not an array`);
    }
  });
  
  if (allObjects.length === 0) {
    console.warn('No objects found in collections:', collections);
    return [];
  }
  
  const results = [];
  
  for (let i = 0; i < count; i++) {
    // Pick random object from weighted collection
    const objDef = allObjects[Math.floor(rng() * allObjects.length)];
    
    // Safety check for undefined objDef
    if (!objDef) {
      console.warn('Undefined object definition in collections:', collections);
      continue;
    }
    
    // Create base object spec
    const spec = {
      ...(objDef.preset ? { preset: objDef.preset } : {}),
      ...(objDef.type ? { type: objDef.type } : {}),
      ...(objDef.color ? { color: objDef.color } : {}),
      ...(objDef.scale ? { scale: objDef.scale } : {}),
      position: [0, 0, 0], // Will be updated by collision detection
    };
    
    // Apply random variation if available
    if (objDef.variations && objDef.variations.length > 0) {
      const variation = objDef.variations[Math.floor(rng() * objDef.variations.length)];
      Object.assign(spec, variation);
    }
    
    // Random scale variation (±20%)
    if (spec.scale) {
      const scaleVar = 0.8 + rng() * 0.4; // 0.8 to 1.2
      spec.scale = spec.scale.map(s => s * scaleVar);
    }
    
    // Set path avoidance
    if (avoidPaths && pathMask) {
      // Don't set avoid_paths for objects that explicitly prefer paths
      const pathPreferringTypes = ['gate_arch', 'castle_gate', 'bridge_arch', 'bridge_simple'];
      if (!pathPreferringTypes.includes(spec.type)) {
        spec.avoid_paths = true;
        spec.min_path_distance = 1 + rng() * 3; // 1-4 units
      }
    }
    
    results.push(spec);
  }
  
  // Apply collision detection and safe placement if enabled
  if (enableCollisionDetection) {
    const placementOptions = {
      terrainSize: terrainSize || [50, 50],
      pathMask,
      avoidPaths,
      npcBufferDistance,
      objectBufferDistance,
      seed: effectiveSeed + '_placement',
      allowUnsafeFallback: false // Strict placement - no unsafe fallbacks
    };
    
    const safelyPlacedObjects = applySafePlacement(results, existingEntities, placementOptions);
    console.log(`Collections placement: Generated ${results.length} objects, safely placed ${safelyPlacedObjects.length}`);
    return safelyPlacedObjects;
  }
  
  return results;
}

// Utility: tiefe, einfache Merge-Strategie (Arrays werden ersetzt)
export function deepMerge(base, override){
  if(Array.isArray(base) || Array.isArray(override)) return override ?? base;
  if(typeof base!== 'object' || base===null) return override ?? base;
  const out = { ...base };
  for(const k of Object.keys(override||{})){
    out[k] = deepMerge(base?.[k], override[k]);
  }
  return out;
}

// Defaults & Sanitzer – stellt robuste Minimalwerte sicher
export function withDefaultsTerrain(cfg={}){
  const d = { type:'flat', size:[50,50], color:'#4a7c1e', amplitude:0, y:0 };
  return { ...d, ...cfg, size: sanitizeVec2(cfg.size, [50,50]) };
}
export function withDefaultsObject(cfg={}){
  const d = { type:'box', position:[0,0,0], scale:[1,1,1], color:'#8b4513' };
  return { ...d, ...cfg, position: sanitizeVec3(cfg.position, [0,0,0]), scale: sanitizeVec3(cfg.scale, [1,1,1]) };
}
export function withDefaultsPersona(cfg={}){
  const d = { name:'NPC', position:[0,0,0], appearance:{ color:'#ff6b6b', height:1.4, type:'npc' }, behavior:{} };
  return { ...d, ...cfg, position: sanitizeVec3(cfg.position, [0,0,0]), appearance:{ ...d.appearance, ...(cfg.appearance||{}) } };
}

function sanitizeVec2(v, fallback){
  if(!Array.isArray(v) || v.length<2) return fallback;
  return [num(v[0], fallback[0]), num(v[1], fallback[1])];
}
function sanitizeVec3(v, fallback){
  if(!Array.isArray(v) || v.length<3) return fallback;
  return [num(v[0], fallback[0]), num(v[1], fallback[1]), num(v[2], fallback[2])];
}
function num(n, fb){ const f = Number(n); return Number.isFinite(f)? f : fb; }

// --- Path System Utilities ---

/**
 * Check if a world position is on a path
 * @param {number} worldX - X coordinate in world space  
 * @param {number} worldZ - Z coordinate in world space
 * @param {HTMLCanvasElement} pathMask - Canvas with white pixels marking paths
 * @param {number[]} terrainSize - [width, height] of terrain
 * @param {number} threshold - Alpha threshold (0-255) to consider as "on path"
 * @returns {boolean} true if position is on a path
 */
export function isOnPath(worldX, worldZ, pathMask, terrainSize, threshold = 128){
  if(!pathMask || !terrainSize) return false;
  
  const w = pathMask.width;
  const h = pathMask.height;
  
  // Convert world coordinates to texture coordinates
  const texX = Math.floor((worldX + terrainSize[0] * 0.5) / terrainSize[0] * w);
  const texZ = Math.floor((worldZ + terrainSize[1] * 0.5) / terrainSize[1] * h);
  
  // Bounds check
  if(texX < 0 || texX >= w || texZ < 0 || texZ >= h) return false;
  
  // Sample pixel
  const ctx = pathMask.getContext('2d');
  const imageData = ctx.getImageData(texX, texZ, 1, 1);
  const alpha = imageData.data[3]; // Alpha channel
  
  return alpha >= threshold;
}

/**
 * Find a random position that avoids paths
 * @param {HTMLCanvasElement} pathMask - Canvas with path data
 * @param {number[]} terrainSize - [width, height] of terrain  
 * @param {Object} options - { maxAttempts: 50, minDistance: 2, margin: 5, seed: number|string }
 * @returns {number[]|null} [x, z] world coordinates or null if no position found
 */
export function findFreePos(pathMask, terrainSize, options = {}){
  const opts = {
    maxAttempts: 50,
    minDistance: 2, // minimum distance from paths
    margin: 5,      // margin from terrain edges
    seed: 12345, // deterministic default seed
    ...options
  };
  
  // Create seeded RNG for deterministic placement
  const rng = makeSeededRNG(opts.seed);
  
  if(!pathMask || !terrainSize) {
    // Fallback: random position with margin
    const x = (rng() - 0.5) * (terrainSize[0] - opts.margin * 2);
    const z = (rng() - 0.5) * (terrainSize[1] - opts.margin * 2);
    return [x, z];
  }
  
  for(let attempt = 0; attempt < opts.maxAttempts; attempt++){
    // Random position within terrain bounds, respecting margin
    const x = (rng() - 0.5) * (terrainSize[0] - opts.margin * 2);
    const z = (rng() - 0.5) * (terrainSize[1] - opts.margin * 2);
    
    // Check if position and surrounding area is free of paths
    let isFree = true;
    const checkRadius = opts.minDistance;
    const steps = 8; // Check 8 points around the position
    
    for(let i = 0; i < steps && isFree; i++){
      const angle = (i / steps) * Math.PI * 2;
      const checkX = x + Math.cos(angle) * checkRadius;
      const checkZ = z + Math.sin(angle) * checkRadius;
      
      if(isOnPath(checkX, checkZ, pathMask, terrainSize, 64)){
        isFree = false;
      }
    }
    
    // Also check center position
    if(isFree && !isOnPath(x, z, pathMask, terrainSize, 64)){
      return [x, z];
    }
  }
  
  // If no free position found, return null
  return null;
}

/**
 * Find a random position ON a path (for gates, bridges, etc.)
 * @param {HTMLCanvasElement} pathMask - Canvas with path data
 * @param {number[]} terrainSize - [width, height] of terrain
 * @param {Object} options - { maxAttempts: 50, margin: 5, seed: number|string }
 * @returns {number[]|null} [x, z] world coordinates or null if no position found
 */
export function findPathPosition(pathMask, terrainSize, options = {}){
  const opts = {
    maxAttempts: 50,
    margin: 5,      // margin from terrain edges
    seed: 12345, // deterministic default seed
    ...options
  };
  
  // Create seeded RNG for deterministic placement
  const rng = makeSeededRNG(opts.seed);
  
  if(!pathMask || !terrainSize) {
    // Fallback: random position with margin
    const x = (rng() - 0.5) * (terrainSize[0] - opts.margin * 2);
    const z = (rng() - 0.5) * (terrainSize[1] - opts.margin * 2);
    return [x, z];
  }
  
  for(let attempt = 0; attempt < opts.maxAttempts; attempt++){
    // Random position within terrain bounds, respecting margin
    const x = (rng() - 0.5) * (terrainSize[0] - opts.margin * 2);
    const z = (rng() - 0.5) * (terrainSize[1] - opts.margin * 2);
    
    // Check if position is ON a path
    if(isOnPath(x, z, pathMask, terrainSize, 128)){
      return [x, z];
    }
  }
  
  // If no path position found, return null
  return null;
}

// Helper function to create seeded RNG (same as in builders.js)
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
