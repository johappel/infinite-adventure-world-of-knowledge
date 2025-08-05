// Test Script für Skybox-System
// Prüft, ob createSkyboxForPreset richtig funktioniert

console.log("Testing Skybox System...");

// Import the environment module
import { createSkyboxForPreset, getSkyColor } from './js/world-generation/environment.js';
import * as THREE from 'three';

// Test alle Skybox-Presets
const presets = ['sunset', 'night', 'storm', 'mystery_dark', 'skyline', 'ocean', 'bay', 'clear_day'];

presets.forEach(preset => {
  console.log(`Testing preset: ${preset}`);
  try {
    const skybox = createSkyboxForPreset(preset, 0.5);
    console.log(`✅ ${preset} skybox created successfully`);
    console.log(`   - Geometry: ${skybox.geometry.type}`);
    console.log(`   - Material: ${skybox.material.type}`);
    console.log(`   - Has texture: ${!!skybox.material.map}`);
  } catch (error) {
    console.error(`❌ ${preset} failed:`, error);
  }
  
  // Test color function
  const color = getSkyColor(preset, 0.5);
  console.log(`   - Sky color: #${color.toString(16).padStart(6, '0')}`);
  console.log('');
});

console.log("Skybox test complete!");
