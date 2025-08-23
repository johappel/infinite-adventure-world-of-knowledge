/**
 * Addon Registry und Manager für den PresetEditor
 * 
 * Zentrale Registrierungs- und Verwaltungsklasse für alle Interaktions-Addons.
 * Bietet dynamisches Laden, Aktivieren und Deaktivieren von Addons.
 */

import { TerrainClickAddon } from './terrain-click-addon.js';
import { EntityInteractionAddon } from './entity-interaction-addon.js';
import { MaterialEditorAddon } from './material-editor-addon.js';

export class AddonManager {
  /**
   * Erstellt einen neuen Addon-Manager
   * @param {PresetEditor} editor - Die PresetEditor-Instanz
   */
  constructor(editor) {
    this.editor = editor;
    this.addons = new Map();
    this.activeAddon = null;
    
    // Registriere Standard-Addons
    this._registerDefaultAddons();
  }
  
  /**
   * Registriert die Standard-Addons
   * @private
   */
  _registerDefaultAddons() {
    this.registerAddon('terrain-click', new TerrainClickAddon(this.editor));
    this.registerAddon('entity-interaction', new EntityInteractionAddon(this.editor));
    this.registerAddon('material-editor', new MaterialEditorAddon(this.editor));
  }
  
  /**
   * Registriert ein neues Addon
   * @param {string} id - Eindeutige ID des Addons
   * @param {InteractionAddon} addon - Die Addon-Instanz
   */
  registerAddon(id, addon) {
    if (this.addons.has(id)) {
      console.warn(`[AddonManager] Addon mit ID "${id}" bereits registriert, überschreibe...`);
    }
    this.addons.set(id, addon);
    console.log(`[AddonManager] Addon registriert: ${id} (${addon.name})`);
  }
  
  /**
   * Entfernt ein Addon
   * @param {string} id - ID des zu entfernenden Addons
   */
  unregisterAddon(id) {
    if (this.addons.has(id)) {
      const addon = this.addons.get(id);
      if (this.activeAddon === addon) {
        this.deactivateAddon();
      }
      this.addons.delete(id);
      console.log(`[AddonManager] Addon entfernt: ${id}`);
    }
  }
  
  /**
   * Aktiviert ein Addon
   * @param {string} id - ID des zu aktivierenden Addons
   * @returns {Promise<boolean>} Erfolgsstatus
   */
  async activateAddon(id) {
    // Deaktiviere zuerst das aktuell aktive Addon
    if (this.activeAddon) {
      await this.deactivateAddon();
    }
    
    const addon = this.addons.get(id);
    if (!addon) {
      console.error(`[AddonManager] Addon nicht gefunden: ${id}`);
      return false;
    }
    
    try {
      await addon.activate();
      this.activeAddon = addon;
      console.log(`[AddonManager] Addon aktiviert: ${id}`);
      return true;
    } catch (error) {
      console.error(`[AddonManager] Fehler beim Aktivieren von Addon ${id}:`, error);
      return false;
    }
  }
  
  /**
   * Deaktiviert das aktuell aktive Addon
   * @returns {Promise<boolean>} Erfolgsstatus
   */
  async deactivateAddon() {
    if (!this.activeAddon) {
      return true;
    }
    
    try {
      await this.activeAddon.deactivate();
      console.log(`[AddonManager] Addon deaktiviert: ${this._getAddonId(this.activeAddon)}`);
      this.activeAddon = null;
      return true;
    } catch (error) {
      console.error('[AddonManager] Fehler beim Deaktivieren des aktiven Addons:', error);
      return false;
    }
  }
  
  /**
   * Gibt die ID eines Addons zurück
   * @param {InteractionAddon} addon - Das Addon
   * @returns {string|null} Addon-ID oder null
   * @private
   */
  _getAddonId(addon) {
    for (const [id, a] of this.addons.entries()) {
      if (a === addon) return id;
    }
    return null;
  }
  
  /**
   * Delegiert einen Terrain-Click an das aktive Addon
   * @param {Object} hitInfo - Click-Informationen
   */
  async handleTerrainClick(hitInfo) {
    if (this.activeAddon && typeof this.activeAddon.onTerrainClick === 'function') {
      await this.activeAddon.onTerrainClick(hitInfo);
    }
  }
  
  /**
   * Delegiert Mouse-Move Events an das aktive Addon
   * @param {MouseEvent} event - Mouse-Event
   */
  async handleMouseMove(event) {
    if (this.activeAddon && typeof this.activeAddon.onMouseMove === 'function') {
      await this.activeAddon.onMouseMove(event);
    }
  }
  
  /**
   * Delegiert Key-Press Events an das aktive Addon
   * @param {KeyboardEvent} event - Keyboard-Event
   */
  async handleKeyPress(event) {
    if (this.activeAddon && typeof this.activeAddon.onKeyPress === 'function') {
      await this.activeAddon.onKeyPress(event);
    }
  }
  
  /**
   * Gibt alle registrierten Addons zurück
   * @returns {Map<string, InteractionAddon>} Map der Addons
   */
  getAllAddons() {
    return new Map(this.addons);
  }
  
  /**
   * Gibt das aktuell aktive Addon zurück
   * @returns {InteractionAddon|null} Aktives Addon oder null
   */
  getActiveAddon() {
    return this.activeAddon;
  }
  
  /**
   * Gibt ein spezifisches Addon zurück
   * @param {string} id - Addon-ID
   * @returns {InteractionAddon|undefined} Das Addon oder undefined
   */
  getAddon(id) {
    return this.addons.get(id);
  }
  
  /**
   * Serialisiert den Zustand aller Addons
   * @returns {Object} Serialisierter Zustand
   */
  serializeState() {
    const state = {
      activeAddonId: this.activeAddon ? this._getAddonId(this.activeAddon) : null,
      addons: {}
    };
    
    for (const [id, addon] of this.addons.entries()) {
      state.addons[id] = addon.serializeState();
    }
    
    return state;
  }
  
  /**
   * Deserialisiert einen gespeicherten Zustand
   * @param {Object} state - Serialisierter Zustand
   */
  deserializeState(state) {
    if (!state) return;
    
    // Deserialisiere einzelne Addon-Zustände
    if (state.addons) {
      for (const [id, addonState] of Object.entries(state.addons)) {
        const addon = this.addons.get(id);
        if (addon) {
          addon.deserializeState(addonState);
        }
      }
    }
    
    // Aktiviere das gespeicherte Addon
    if (state.activeAddonId) {
      this.activateAddon(state.activeAddonId).catch(console.error);
    }
  }
}

// Exportiere auch die einzelnen Addon-Klassen für direkten Zugriff
export { TerrainClickAddon } from './terrain-click-addon.js';
export { EntityInteractionAddon } from './entity-interaction-addon.js';
export { MaterialEditorAddon } from './material-editor-addon.js';