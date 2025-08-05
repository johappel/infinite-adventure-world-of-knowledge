import * as THREE from 'three';
import { buildThemedSkyboxCube } from './builders.js';

// Create skybox for YAML presets using the themed cube system
export function createSkyboxForPreset(skyPreset, timeOfDay = 0.5) {
  try {
    // Use a simple seeded random function for consistent results
    let seed = 12345;
    const rng = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    
    const result = buildThemedSkyboxCube(skyPreset, timeOfDay, rng);
    return result;
  } catch (error) {
    console.error('❌ Error creating skybox:', error);
    // Fallback: create a simple colored skybox
    const geometry = new THREE.BoxGeometry(1000, 1000, 1000);
    const material = new THREE.MeshBasicMaterial({ 
      color: skyPreset === 'ocean' ? 0x3498db : 0x87ceeb, 
      side: THREE.BackSide 
    });
    const fallback = new THREE.Mesh(geometry, material);
    fallback.userData.isSkybox = true;
    fallback.userData.preset = skyPreset;
    return fallback;
  }
}

export function getSkyColor(skyPreset, t){
  const lerpHex = (a, b, t) => {
    const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
    const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
    return ((ar + (br - ar) * t) << 16) | ((ag + (bg - ag) * t) << 8) | (ab + (bb - ab) * t);
  };
  
  switch(skyPreset){
    case 'sunset':
      if (t < 0.25) return lerpHex(0xff7e5f, 0xfeb47b, t * 4);
      if (t < 0.5) return 0xfeb47b;
      if (t < 0.75) return lerpHex(0xfeb47b, 0xff9966, (t - 0.5) * 4);
      return lerpHex(0xff9966, 0x0b0d26, (t - 0.75) * 4);
    case 'night':
      return 0x0b0d26;
    case 'storm':
      return 0x3b3f47;
    case 'mystery_dark':
      return 0x1a1a1a;
    case 'skyline':
      return 0x334455;
    case 'ocean':
      return 0x2e6f95;
    case 'bay':
      return 0x5fa3c8;
    case 'clear_day':
    default:
      if (t < 0.25) return lerpHex(0x87ceeb, 0x98d8e8, t * 4);
      if (t < 0.5) return 0x98d8e8;
      if (t < 0.75) return 0x87ceeb;
      return lerpHex(0x87ceeb, 0x0b0d26, (t - 0.75) / 0.25);
  }
}

export function applyEnvironment(envConfig, sceneOrGroup, options = {}){
  const { skipSkybox = false, skipFog = false, skipLights = false } = options;
  const env = withDefaultsEnv(envConfig||{});
  const tod = Math.max(0, Math.min(1, env.time_of_day));
  const skyColor = getSkyColor(env.skybox, tod);

  // --- SKYBOX ---
  if (!skipSkybox) {
    const useProceduralCube = env.skybox_mode === 'cube' && (!env.skybox || env.skybox === 'clear_day');
    const needsSkybox = env.skybox && !useProceduralCube;

    // Always clean up old skyboxes from the direct target before adding a new one
    const existingSkyboxes = [];
    sceneOrGroup.traverse(o => {
        if (o.userData?.isSkybox) {
            existingSkyboxes.push(o);
        }
    });
    if (existingSkyboxes.length > 0) {
        existingSkyboxes.forEach(box => box.parent?.remove(box));
    }

    if (needsSkybox) {
      try {
        const skybox = createSkyboxForPreset(env.skybox, tod);
        skybox.userData.isSkybox = true;
        skybox.name = 'YAMLSkybox';
        sceneOrGroup.add(skybox);
      } catch (error) {
        console.error('❌ Failed to create skybox:', error);
      }
    } else {
        // Background color (fallback for scenes that don't have skybox)
        const scene = sceneOrGroup.isScene ? sceneOrGroup : (window.presetEditor?.scene || window.wisdomWorld?.scene);
        if (scene?.background) {
            scene.background = new THREE.Color(skyColor);
        }
    }
  }


  // --- FOG ---
  // Fog must be applied to the main scene, not a group.
  if (!skipFog && env.fog_distance) {
    const fogColor = new THREE.Color(skyColor);
    
    // Find the top-level scene
    let targetScene = sceneOrGroup;
    while (targetScene.parent) {
      targetScene = targetScene.parent;
    }
    
    if (targetScene.isScene) {
      targetScene.fog = new THREE.Fog(fogColor, 5, env.fog_distance);
    } else {
      console.warn('Could not find a valid scene for fog application.');
    }
  }

  // --- LIGHTS ---
  if (!skipLights) {
      // Find the scene to apply lights to. This is crucial.
      let targetScene = sceneOrGroup;
      while (targetScene.parent && !targetScene.isScene) {
        targetScene = targetScene.parent;
      }

      // Remove only lights that were previously added by this function
      const lightsToRemove = [];
      targetScene.children.forEach(child => {
          if (child.isLight && child.name.startsWith('YAML_')) {
              lightsToRemove.push(child);
          }
      });
      if(lightsToRemove.length > 0) {
        lightsToRemove.forEach(light => targetScene.remove(light));
      }

      // Ambient Light
      const ambientLight = new THREE.AmbientLight(0xffffff, env.ambient_light);
      ambientLight.name = 'YAML_AmbientLight';
      targetScene.add(ambientLight);

      // Hemisphere Light for more natural ambient lighting
      const hemisphereLight = new THREE.HemisphereLight(skyColor, env.ground_color || 0x444444, env.hemisphere_intensity);
      hemisphereLight.name = 'YAML_HemisphereLight';
      targetScene.add(hemisphereLight);

      // Directional Light (Sun)
      if (env.sun_intensity > 0) {
          const sunLight = new THREE.DirectionalLight(0xffffff, env.sun_intensity);
          sunLight.name = 'YAML_SunLight';
          sunLight.position.set(env.sun_position[0], env.sun_position[1], env.sun_position[2]);
          sunLight.castShadow = true;
          sunLight.shadow.mapSize.width = 2048;
          sunLight.shadow.mapSize.height = 2048;
          targetScene.add(sunLight);
      }
  }
}

// Default environment settings
export function withDefaultsEnv(env) {
    const baseDefaults = {
        skybox: 'clear_day',
        skybox_mode: 'themed',
        time_of_day: 0.5,
        sun_position: [50, 80, 30],
        fog_distance: 0, // 0 = off
        ground_color: 0x444444, // Default ground color for hemisphere light
    };

    // Preset-specific light defaults
    const lightDefaults = {
        'clear_day': { ambient_light: 0.4, sun_intensity: 0.8, hemisphere_intensity: 0.6 },
        'sunset':    { ambient_light: 0.3, sun_intensity: 0.7, hemisphere_intensity: 0.8 },
        'night':     { ambient_light: 0.2, sun_intensity: 0.1, hemisphere_intensity: 0.3 },
        'storm':     { ambient_light: 0.3, sun_intensity: 0.2, hemisphere_intensity: 0.5 },
        'skyline':   { ambient_light: 0.4, sun_intensity: 0.5, hemisphere_intensity: 0.7 },
        'mystery_dark': { ambient_light: 0.2, sun_intensity: 0.3, hemisphere_intensity: 0.4 },
        'ocean':     { ambient_light: 0.4, sun_intensity: 0.7, hemisphere_intensity: 0.8 },
        'bay':       { ambient_light: 0.5, sun_intensity: 0.6, hemisphere_intensity: 0.7 },
    };
    
    const selectedSkybox = env.skybox || baseDefaults.skybox;
    const defaults = { ...baseDefaults, ...(lightDefaults[selectedSkybox] || lightDefaults['clear_day']) };

    const newEnv = { ...defaults, ...env };
    
    // Ensure sun_position is always valid
    if (!newEnv.sun_position || !Array.isArray(newEnv.sun_position) || newEnv.sun_position.length !== 3) {
        newEnv.sun_position = defaults.sun_position;
    }
    
    return newEnv;
}

// Skybox color and texture generation
const skyboxThemes = {
  sunset: {
    top: 0xff7e5f,
    bottom: 0x0b0d26,
    horizon: 0xfeb47b,
    sun: { size: 1.5, color: 0xffffff, intensity: 2 },
  },
  night: {
    top: 0x0b0d26,
    bottom: 0x000000,
    stars: { density: 100, color: 0xffffff },
  },
  storm: {
    top: 0x3b3f47,
    bottom: 0x101820,
    lightning: { color: 0xffffff, intensity: 5 },
  },
  mystery_dark: {
    top: 0x1a1a1a,
    bottom: 0x000000,
    fog: { color: 0x000000, density: 0.1 },
  },
  skyline: {
    top: 0x334455,
    bottom: 0x223344,
    fog: { color: 0x223344, density: 0.2 },
  },
  ocean: {
    top: 0x2e6f95,
    bottom: 0x1a1a1a,
    wave: { color: 0xffffff, height: 0.5 },
  },
  bay: {
    top: 0x5fa3c8,
    bottom: 0x223344,
    fog: { color: 0x223344, density: 0.1 },
  },
  clear_day: {
    top: 0x87ceeb,
    bottom: 0x3498db,
    sun: { size: 1, color: 0xffffff, intensity: 1 },
  },
};