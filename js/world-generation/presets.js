// Zentrale Presets & Defaults
export const terrainPresets = {
  forest_floor: { type: 'hills', texture: 'forest_floor', color: '#4a7c1e', amplitude: 2.5, size: [50,50] },
  grass_flat:   { type: 'flat', texture: 'grass_texture', color: '#4a7c1e', size: [50,50] },
  marble_flat:  { type: 'flat', texture: 'marble_texture', color: '#d6d6d6', size: [50,50] }
};

export const objectPresets = {
  tree_simple: { type: 'tree', color: '#1a4a1a', scale: [2,2.5,2] },    // Sync mit js/presets/objects/tree_simple.js
  rock_small:  { type: 'rock', color: '#6b5b4f', scale: [1,1,1] },      // Sync mit js/presets/objects/rock_small.js  
  crystal:     { type: 'crystal', color: '#00ffff', scale: [1,1,1] },   // Sync mit js/presets/objects/crystal.js
  mushroom_small: { type: 'mushroom', color: '#8b4513', scale: [0.5,0.8,0.5] }, // Sync mit js/presets/objects/mushroom_small.js
  stone_circle_thin: { type: 'stone_circle', color: '#696969', scale: [0.7,0.7,4.0] }, // Sync mit js/presets/objects/stone_circle_thin.js
  bookshelf:   { type: 'bookshelf', color: '#8b6d5c', scale: [1,1,1] }, // Sync mit js/presets/objects/bookshelf.js
  truncated_cone: { type: 'truncated_cone', color: '#8b4513', scale: [1,1,1] },
  sphere:      { type: 'sphere', color: '#ff6b6b', scale: [1,1,1] }
};

export const personaPresets = {
  npc_plain:    { role: 'NPC', appearance: { color: '#ff6b6b', height: 1.6 } },
  npc_guardian: { role: 'Guardian', appearance: { color: '#4169e1', height: 1.8 } },
  npc_scholar:  { role: 'Scholar', appearance: { color: '#2f4f4f', height: 1.7 } },
  npc_fairy:    { role: 'Fairy', appearance: { color: '#ffd700', height: 1.4 } }
};

export const defaults = {
  terrain: { type: 'flat', color: '#4a7c1e', size: [50,50], amplitude: 2.5, flat_radius: null, blend_radius: null, outer_gain: 1.0, y: 0 },
  object:  { type: 'box', color: '#8b4513', position: [0,0,0], scale: [1,1,1], rotation: [0,0,0], interactive: false },
  persona: { role: 'NPC', appearance: { color: '#ff6b6b', height: 1.6 }, position: [0,0,0] },
  portal:  { size: [1.8,3.2,0.2], color: '#4169e1', position: [0,0,0] },
  environment: { skybox: 'clear_day', time_of_day: 0.5, ambient_light: 0.3, sun_intensity: 0.6, fog_distance: 50, skybox_mode: null }
};

export function deepMerge(a, b){
  const out = Array.isArray(a) ? [...a] : { ...a };
  for(const [k,v] of Object.entries(b||{})){
    if(v && typeof v==='object' && !Array.isArray(v)) out[k] = deepMerge(out[k]||{}, v);
    else out[k] = v;
  }
  return out;
}

export const withDefaultsTerrain = cfg => deepMerge(defaults.terrain, cfg||{});
export const withDefaultsObject  = cfg => deepMerge(defaults.object,  cfg||{});
export const withDefaultsPersona = cfg => deepMerge(defaults.persona, cfg||{});
export const withDefaultsPortal  = cfg => deepMerge(defaults.portal,  cfg||{});
export const withDefaultsEnv     = cfg => deepMerge(defaults.environment, cfg||{});
