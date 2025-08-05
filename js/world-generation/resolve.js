import { terrainPresets, objectPresets, personaPresets, withDefaultsTerrain, withDefaultsObject, withDefaultsPersona, withDefaultsPortal, withDefaultsEnv, deepMerge } from './presets.js';
import { playerPresets } from '../presets/index.js';

export function resolveTerrainConfig(cfg){
  if(cfg?.preset && terrainPresets[cfg.preset]) return withDefaultsTerrain(deepMerge(terrainPresets[cfg.preset], cfg));
  return withDefaultsTerrain(cfg||{});
}
export function resolveObjectConfig(cfg){
  if(cfg?.preset && objectPresets[cfg.preset]) return withDefaultsObject(deepMerge(objectPresets[cfg.preset], cfg));
  return withDefaultsObject(cfg||{});
}
export function resolvePersonaConfig(cfg){
  if(cfg?.preset && personaPresets[cfg.preset]) return withDefaultsPersona(deepMerge(personaPresets[cfg.preset], cfg));
  return withDefaultsPersona(cfg||{});
}
export function resolvePortalConfig(cfg){
  return withDefaultsPortal(cfg||{});
}
export function resolveEnvironment(cfg){
  return withDefaultsEnv(cfg||{});
}

// Player configuration resolver
export function resolvePlayerConfig(cfg){
  const defaults = {
    appearance: {
      body_color: '#3366cc',
      skin_color: '#99ccff', 
      hair_color: '#222222',
      height: 1.0,
      proportions: {
        head_size: 0.4,
        torso_height: 1.2,
        arm_length: 0.8,
        leg_length: 1.0
      }
    },
    style: {
      hair_type: 'hat',
      clothing: 'basic',
      accessories: []
    },
    animations: {
      idle: { arm_swing: 0.1, body_sway: 0.05 },
      walking: { arm_swing: 0.8, leg_swing: 0.8, speed: 10 },
      running: { arm_swing: 1.2, leg_swing: 1.2, speed: 15 }
    },
    position: [0, 0, 0],
    rotation: 0
  };

  if (cfg?.preset && playerPresets[cfg.preset]) {
    return deepMerge(defaults, deepMerge(playerPresets[cfg.preset], cfg));
  }
  return deepMerge(defaults, cfg || {});
}

export function resolveWorldSpec(worldData){
  const out = { ...worldData };
  if(worldData.terrain) out.terrain = resolveTerrainConfig(worldData.terrain);
  if(Array.isArray(worldData.objects)) out.objects = worldData.objects.map(o=> resolveObjectConfig(o));
  if(Array.isArray(worldData.personas)) out.personas = worldData.personas.map(p=> resolvePersonaConfig(p));
  if(Array.isArray(worldData.portals)) out.portals = worldData.portals.map(p=> resolvePortalConfig(p));
  if(worldData.player) out.player = resolvePlayerConfig(worldData.player);
  out.environment = resolveEnvironment(worldData.environment||{});
  return out;
}
