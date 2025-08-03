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
