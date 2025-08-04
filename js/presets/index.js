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
import { presetNpcPlain } from './personas/npc_plain.js';
import { presetNpcFairy } from './personas/npc_fairy.js';
import { presetNpcScholar } from './personas/npc_scholar.js';
import { presetNpcGuardian } from './personas/npc_guardian.js';

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
};

export const personaPresets = {
  npc_plain: presetNpcPlain,
  npc_fairy: presetNpcFairy,
  npc_scholar: presetNpcScholar,
  npc_guardian: presetNpcGuardian,
};

export const textures = { makeForestFloorTexture };

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
 * @param {Object} options - { maxAttempts: 50, minDistance: 2, margin: 5 }
 * @returns {number[]|null} [x, z] world coordinates or null if no position found
 */
export function findFreePos(pathMask, terrainSize, options = {}){
  const opts = {
    maxAttempts: 50,
    minDistance: 2, // minimum distance from paths
    margin: 5,      // margin from terrain edges
    ...options
  };
  
  if(!pathMask || !terrainSize) {
    // Fallback: random position with margin
    const x = (Math.random() - 0.5) * (terrainSize[0] - opts.margin * 2);
    const z = (Math.random() - 0.5) * (terrainSize[1] - opts.margin * 2);
    return [x, z];
  }
  
  for(let attempt = 0; attempt < opts.maxAttempts; attempt++){
    // Random position within terrain bounds, respecting margin
    const x = (Math.random() - 0.5) * (terrainSize[0] - opts.margin * 2);
    const z = (Math.random() - 0.5) * (terrainSize[1] - opts.margin * 2);
    
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
