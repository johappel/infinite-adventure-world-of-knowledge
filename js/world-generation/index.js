import * as THREE from 'three';
import { applyEnvironment } from './environment.js';
import { buildTerrain, buildObject, buildPersona, buildPortal, buildSkyboxCube } from './builders.js';
import { resolveWorldSpec } from './resolve.js';
import { startZoneAnimations } from './animation.js';

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
  if(spec.terrain){
    const terrain = buildTerrain(spec.terrain);
    group.add(terrain);
  }

  // Objects
  const objects=[];
  (spec.objects||[]).forEach((o,i)=>{ const mesh = buildObject(o,i); if(mesh){ group.add(mesh); objects.push(mesh);} });

  // Portals
  const portals=[];
  (spec.portals||[]).forEach((p,i)=>{ const portal = buildPortal(p,i); if(portal){ group.add(portal); portals.push(portal);} });

  // Personas
  const personas=[];
  (spec.personas||[]).forEach((p,i)=>{ const npc = buildPersona(p,i); if(npc){ group.add(npc); personas.push(npc);} });

  // Animations
  startZoneAnimations(group);

  return { group, personas, portals, objects, spec };
}
