/**
 * YAML World Loader - Konvertiert YAML-Weltbeschreibungen in THREE.js Szenen
 * Kompatibel mit dem bestehenden WisdomWorld System
 */

import * as THREE from 'three';
import { buildZoneFromSpec } from '../world-generation/index.js';
import { resolveWorldSpec } from '../world-generation/resolve.js';

// Globaler Zugriff auf js-yaml (falls via CDN geladen)
const yaml = window.jsyaml;

export class YAMLWorldLoader {
  constructor(zoneManager) {
    this.zoneManager = zoneManager;
    this.loadedWorlds = new Map();
  }

  /**
   * Lädt eine YAML-Welt-Datei und konvertiert sie in THREE.js Objekte
   */
  async loadWorldFromYAML(yamlPath, zoneId = null) {
    try {
      console.log(`🌍 Lade YAML-Welt: ${yamlPath}`);
      
      // YAML-Datei laden
      const response = await fetch(yamlPath);
      if (!response.ok) {
        throw new Error(`HTTP Fehler: ${response.status}`);
      }
      
      const yamlText = await response.text();
      const worldData = yaml.load(yamlText);
      
      console.log('📄 YAML-Weltdaten geladen:', worldData);
      
      // Zone-ID aus YAML oder Parameter verwenden
      const finalZoneId = zoneId || worldData.id || worldData.name || 'unnamed-zone';

      // Einheitliche Pipeline
      const spec = resolveWorldSpec({ id: finalZoneId, ...worldData });
      const zoneInfo = buildZoneFromSpec(spec, { rng: Math.random });

      // Im Root einhängen und sichtbar schalten
      this.zoneManager.worldRoot.add(zoneInfo.group);
      zoneInfo.group.name = finalZoneId;
      zoneInfo.group.visible = true;
      this.zoneManager.zoneMeshes[finalZoneId] = zoneInfo;

      // In Cache speichern
      this.loadedWorlds.set(finalZoneId, worldData);
      
      console.log(`✅ YAML-Welt "${finalZoneId}" erfolgreich geladen`);
      return zoneInfo;
      
    } catch (error) {
      console.error('❌ Fehler beim Laden der YAML-Welt:', error);
      throw error;
    }
  }

  /**
   * Gibt geladene Welten zurück
   */
  getLoadedWorlds() {
    return this.loadedWorlds;
  }

  /**
   * Überprüft ob eine Zone aus YAML geladen wurde
   */
  isYAMLZone(zoneId) {
    return this.loadedWorlds.has(zoneId);
  }
}
