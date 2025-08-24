/**
 * Terrain-Click Addon für den PresetEditor
 * 
 * Migriert die bestehende Terrain-Click-Logik aus dem Core in ein separates Addon.
 * Bietet Objekt-Platzierung und Pfad-Erstellung via Terrain-Klicks.
 */

import { InteractionAddon } from './base-addon.js';

export class TerrainClickAddon extends InteractionAddon {
  constructor(editor) {
    super(editor);
    this.name = 'Terrain Interaktion';
    this.description = 'Objekt-Platzierung und Pfad-Erstellung via Klick auf das Terrain';
    this.icon = '🖱️';
    
    // Zustandsvariablen
    this.tmpPathPoints = [];
    this.selectedObjectType = 'tree_simple';
  }
  
  /**
   * Wird aufgerufen wenn das Addon aktiviert wird
   */
  async activate() {
    await super.activate();
    console.log('[TerrainClick] Addon aktiviert');
  }
  
  /**
   * Wird aufgerufen wenn das Addon deaktiviert wird
   */
  async deactivate() {
    await super.deactivate();
    // Aufräumen
    this.tmpPathPoints = [];
    console.log('[TerrainClick] Addon deaktiviert');
  }
  
  /**
   * Terrain-Click Handler - migriert aus core.js
   */
  async onTerrainClick(hitInfo) {
    try {
      if (!this.isActive) return;
      
      const mode = this.editor.interactionMode || 'none';
      
      if (mode === 'place_object') {
        await this._placeObjectAt(hitInfo.point);
      } else if (mode === 'path_add') {
        this._addPathPoint(hitInfo.point);
      }
      // path_finish / path_cancel werden über UI-Select behandelt
      
    } catch (e) {
      console.error('[TerrainClick] Fehler bei onTerrainClick:', e);
      this._showToast('error', 'Interaktionsfehler: ' + e.message);
    }
  }
  
  /**
   * Fügt einen Punkt zur temporären Pfadliste hinzu
   * @param {{x:number,y:number,z:number}} point
   */
  _addPathPoint(point) {
    const p = this._roundPoint(point);
    this.tmpPathPoints.push([p.x, p.y, p.z]);
    this._showToast('info', `Path-Punkt hinzugefügt: [${p.x}, ${p.y}, ${p.z}]`);
  }
  
  /**
   * UI-Aktion "Path (Finish)": schreibt gesammelte Punkte als Pfad ins YAML
   */
  async finishPath() {
    try {
      if (!Array.isArray(this.tmpPathPoints) || this.tmpPathPoints.length < 2) {
        this._showToast('warning', 'Mindestens 2 Punkte für einen Pfad benötigt.');
        return;
      }
      
      let obj = this._parseCurrentYaml();
      if (!obj || typeof obj !== 'object') obj = {};
      
      // Pfade sind Teil von terrain: terrain.paths: [...]
      if (!obj.terrain || typeof obj.terrain !== 'object') obj.terrain = {};
      if (!Array.isArray(obj.terrain.paths)) obj.terrain.paths = [];
      obj.terrain.paths.push({ points: this.tmpPathPoints.slice(), smooth: true });
      
      const yaml = this._serializeToYaml(obj);
      await this._applyYamlChange(yaml);
      
      // Aufräumen
      this.tmpPathPoints = [];
      this._showToast('success', 'Pfad eingefügt.');
      
    } catch (e) {
      console.error('[TerrainClick] Fehler bei Path-Finish:', e);
      this._showToast('error', 'Pfad konnte nicht eingefügt werden: ' + e.message);
    }
  }
  
  /**
   * UI-Aktion "Path (Cancel)": leert temporäre Punkte
   */
  cancelPath() {
    this.tmpPathPoints = [];
    this._showToast('info', 'Path-Aufnahme abgebrochen.');
  }
  
  /**
   * Fügt ein Objekt an der gegebenen Position in das YAML ein
   * @param {{x:number,y:number,z:number}} point
   */
  async _placeObjectAt(point) {
    const p = this._roundPoint(point);
    try {
      let obj = this._parseCurrentYaml();
      if (!obj || typeof obj !== 'object') obj = {};

      // Autorenformat: objects als Array
      if (!Array.isArray(obj.objects)) obj.objects = Array.isArray(obj.objects) ? obj.objects : [];

      const type = this.selectedObjectType || 'tree_simple';
      obj.objects.push({
        type,
        position: [p.x, p.y, p.z]
      });

      const yaml = this._serializeToYaml(obj);
      await this._applyYamlChange(yaml);
      this._showToast('success', `Objekt eingefügt: ${type} @ [${p.x}, ${p.y}, ${p.z}]`);
      
    } catch (e) {
      console.error('[TerrainClick] Fehler beim Einfügen des Objekts:', e);
      this._showToast('error', 'Objekt konnte nicht eingefügt werden: ' + e.message);
    }
  }
  
  
  /**
   * Gibt UI-Elemente für die Addon-Konfiguration zurück
   */
  getUIElements() {
    console.log('[TerrainClick] getUIElements aufgerufen');
    const container = document.createElement('div');
    container.style.marginTop = '10px';
    container.style.padding = '8px';
    container.style.background = '#2a2a2a';
    container.style.borderRadius = '4px';
    
    const title = document.createElement('h4');
    title.textContent = 'Terrain Interaktion';
    title.style.margin = '0 0 8px 0';
    title.style.color = '#fff';
    
    const desc = document.createElement('p');
    desc.textContent = this.description;
    desc.style.margin = '0 0 8px 0';
    desc.style.color = '#ccc';
    desc.style.fontSize = '12px';
    
    container.appendChild(title);
    container.appendChild(desc);
    
    return [container];
  }
  
  /**
   * Serialisiert den aktuellen Zustand
   */
  serializeState() {
    return {
      ...super.serializeState(),
      tmpPathPoints: this.tmpPathPoints,
      selectedObjectType: this.selectedObjectType
    };
  }
  
  /**
   * Deserialisiert einen gespeicherten Zustand
   */
  deserializeState(state) {
    super.deserializeState(state);
    if (state) {
      this.tmpPathPoints = state.tmpPathPoints || [];
      this.selectedObjectType = state.selectedObjectType || 'tree_simple';
    }
  }
}