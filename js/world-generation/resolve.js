import { terrainPresets, objectPresets, personaPresets, withDefaultsTerrain, withDefaultsObject, withDefaultsPersona, withDefaultsPortal, withDefaultsEnv, deepMerge } from './presets.js';

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

export function resolveWorldSpec(worldData){
  const out = { ...worldData };
  if(worldData.terrain) out.terrain = resolveTerrainConfig(worldData.terrain);
  if(Array.isArray(worldData.objects)) out.objects = worldData.objects.map(o=> resolveObjectConfig(o));
  if(Array.isArray(worldData.personas)) out.personas = worldData.personas.map(p=> resolvePersonaConfig(p));
  if(Array.isArray(worldData.portals)) out.portals = worldData.portals.map(p=> resolvePortalConfig(p));
  out.environment = resolveEnvironment(worldData.environment||{});
  return out;
}
