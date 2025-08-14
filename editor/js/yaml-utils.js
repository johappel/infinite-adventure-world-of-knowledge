/**
 * @deprecated Diese Datei ist veraltet. Verwende stattdessen YamlProcessor aus './preset-editor/yaml-processor.js'
 *
 * Gemeinsame YAML-Hilfsfunktionen für den World Editor
 * Bietet wiederverwendbare YAML-Serialisierungs- und Parsing-Funktionen
 *
 * MIGRATION:
 * - serializeYamlWithTerrain() -> YamlProcessor.safeYamlDump()
 * - parseYamlSafely() -> YamlProcessor.safeYamlParse()
 */

import { YamlProcessor } from './preset-editor/yaml-processor.js';

/**
 * @deprecated Verwende stattdessen YamlProcessor.safeYamlDump()
 * Serialisiert ein Objekt zu YAML-Text mit spezieller Behandlung für terrain.size
 * @param {Object} obj - Das zu serialisierende Objekt
 * @param {Object} options - Optionale Konfigurationsoptionen (werden ignoriert)
 * @returns {string} - Der serialisierte YAML-Text
 */
export function serializeYamlWithTerrain(obj, options = {}) {
  console.warn('serializeYamlWithTerrain() ist veraltet. Verwende YamlProcessor.safeYamlDump() stattdessen.');
  return YamlProcessor.safeYamlDump(obj);
}

/**
 * @deprecated Verwende stattdessen YamlProcessor.safeYamlParse()
 * Parst YAML-Text sicher in ein Objekt
 * @param {string} str - Der zu parsende YAML-Text
 * @returns {Object|null} - Das geparste Objekt oder null bei Fehler
 */
export function parseYamlSafely(str) {
  console.warn('parseYamlSafely() ist veraltet. Verwende YamlProcessor.safeYamlParse() stattdessen.');
  return YamlProcessor.safeYamlParse(str);
}

/**
 * Standard-Konfiguration für YAML-Serialisierung
 */
export const defaultYamlOptions = {
  indent: 2,
  lineWidth: 120,
  noRefs: true,
  sortKeys: false,
  flowLevel: 3
};