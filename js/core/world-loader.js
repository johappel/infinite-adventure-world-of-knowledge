import * as THREE from 'three';

/**
 * World Loader - Lädt und konvertiert YAML-Weltdefinitionen
 */
export class WorldLoader {
  constructor() {
    this.loadedWorlds = new Map();
    this.yamlParser = null;
    this.initYAMLParser();
  }

  async initYAMLParser() {
    // Lade js-yaml dynamisch
    if (typeof window !== 'undefined' && !window.jsyaml) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js';
      document.head.appendChild(script);
      
      await new Promise((resolve) => {
        script.onload = resolve;
      });
    }
    this.yamlParser = window.jsyaml;
  }

  /**
   * Lädt eine YAML-Weltdefinition
   */
  async loadWorld(yamlPath) {
    try {
      console.log(`🌍 Lade YAML-Welt: ${yamlPath}`);
      
      const response = await fetch(yamlPath);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const yamlText = await response.text();
      const worldData = this.yamlParser.load(yamlText);
      
      console.log('📄 YAML-Weltdaten geladen:', worldData);
      
      // Cache the loaded world
      this.loadedWorlds.set(worldData.id || worldData.name || yamlPath, worldData);
      
      return worldData;
    } catch (error) {
      console.error(`❌ Fehler beim Laden von ${yamlPath}:`, error);
      throw error;
    }
  }

  /**
   * Validiert YAML-Weltdaten
   */
  validateWorldData(worldData) {
    const errors = [];
    const warnings = [];

    if (!worldData.name) errors.push('Weltname fehlt');
    if (!worldData.id) warnings.push('Welt-ID fehlt (wird aus Name/Pfad abgeleitet)');
    if (!worldData.description) warnings.push('Weltbeschreibung fehlt');

    // Validiere Objekte
    if (worldData.objects) {
      worldData.objects.forEach((obj, index) => {
        if (!obj.type && !obj.preset) warnings.push(`Objekt ${index}: Typ oder Preset fehlt`);
      });
    }

    // Validiere Portale
    if (worldData.portals) {
      worldData.portals.forEach((portal, index) => {
        if (!portal.destination && !portal.target) warnings.push(`Portal ${index}: Ziel fehlt`);
      });
    }

    // Validiere Personas
    if (worldData.personas) {
      worldData.personas.forEach((persona, index) => {
        if (!persona.name) warnings.push(`Persona ${index}: Name fehlt`);
      });
    }

    return { errors, warnings, isValid: errors.length === 0 };
  }
}
