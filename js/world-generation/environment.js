import * as THREE from 'three';
import { withDefaultsEnv } from './presets.js';

export function getSkyColor(skyPreset, t){
  const lerpHex = (a, b, t) => {
    const ca = new THREE.Color(a); const cb = new THREE.Color(b);
    return new THREE.Color(ca.r + (cb.r - ca.r) * t, ca.g + (cb.g - ca.g) * t, ca.b + (cb.b - ca.b) * t).getHex();
  };
  switch (skyPreset) {
    case 'sunset':
      if (t < 0.25) return lerpHex(0x0b0d26, 0xff7e5f, t / 0.25);
      if (t < 0.5)  return lerpHex(0xff7e5f, 0x87ceeb, (t - 0.25) / 0.25);
      if (t < 0.75) return lerpHex(0x87ceeb, 0xff9966, (t - 0.5) / 0.25);
      return lerpHex(0xff9966, 0x0b0d26, (t - 0.75) / 0.25);
    case 'night': return 0x0b0d26;
    case 'storm': return 0x3b3f47;
    case 'mystery_dark': return 0x1a1a1a;
    case 'skyline': return 0x334455;
    case 'ocean': return 0x2e6f95;
    case 'bay': return 0x5fa3c8;
    case 'clear_day':
    default:
      if (t < 0.25) return lerpHex(0x0b0d26, 0x87ceeb, t / 0.25);
      if (t < 0.75) return 0x87ceeb;
      return lerpHex(0x87ceeb, 0x0b0d26, (t - 0.75) / 0.25);
  }
}

export function applyEnvironment(envConfig, sceneOrGroup){
  const env = withDefaultsEnv(envConfig||{});
  const tod = Math.max(0, Math.min(1, env.time_of_day));
  const skyColor = getSkyColor(env.skybox, tod);

  // Background color
  const scene = sceneOrGroup.isScene ? sceneOrGroup : (sceneOrGroup.parent || sceneOrGroup);
  if (scene && scene.background !== undefined) {
    scene.background = new THREE.Color(skyColor);
  }

  // Fog
  if (env.fog_distance) {
    const fogColor = new THREE.Color(skyColor);
    (scene.isScene ? scene : scene.parent).fog = new THREE.Fog(fogColor, 10, env.fog_distance);
  }

  // Remove existing lights inside the group (avoid duplicates)
  const toRemove = [];
  sceneOrGroup.traverse && sceneOrGroup.traverse(o=>{ if(o.isLight) toRemove.push(o); });
  toRemove.forEach(l=> l.parent && l.parent.remove(l));

  // Lights
  const ambient = new THREE.AmbientLight(0x404040, env.ambient_light);
  sceneOrGroup.add(ambient);

  const sun = new THREE.DirectionalLight(0xffffff, env.sun_intensity);
  const angle = (tod * Math.PI * 2);
  const sunY = Math.max(0.15, Math.sin(angle));
  const radius = 30;
  sun.position.set(Math.cos(angle) * radius, sunY * radius, Math.sin(angle) * radius);
  sun.castShadow = true;
  sceneOrGroup.add(sun);

  const fill = new THREE.HemisphereLight(0xaaccff, 0x223344, 0.15);
  sceneOrGroup.add(fill);
}
