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
    
    // Zustandsvariablen (migriert von core.js)
    this.interactionMode = 'none';
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
      
      const mode = this.interactionMode || 'none';
      
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
   * Migriert von ui-manager.js initInteractionControls()
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
    
    // Mode Select Dropdown (migriert von ui-manager.js)
    const modeSelect = document.createElement('select');
    modeSelect.id = 'interactionMode';
    modeSelect.style.marginRight = '8px';
    modeSelect.style.padding = '4px';
    modeSelect.style.borderRadius = '3px';
    modeSelect.style.border = '1px solid #555';
    modeSelect.style.background = '#333';
    modeSelect.style.color = '#fff';
    
    const modes = [
      { value: 'none', text: 'Keine Interaktion' },
      { value: 'place_object', text: 'Objekt platzieren' },
      { value: 'path_add', text: 'Pfad hinzufügen' },
      { value: 'path_finish', text: 'Pfad abschließen' },
      { value: 'path_cancel', text: 'Pfad abbrechen' }
    ];
    
    modes.forEach(mode => {
      const option = document.createElement('option');
      option.value = mode.value;
      option.textContent = mode.text;
      modeSelect.appendChild(option);
    });
    
    // Object Type Select Dropdown (migriert von ui-manager.js)
    const typeSelect = document.createElement('select');
    typeSelect.id = 'objectType';
    typeSelect.style.marginRight = '8px';
    typeSelect.style.padding = '4px';
    typeSelect.style.borderRadius = '3px';
    typeSelect.style.border = '1px solid #555';
    typeSelect.style.background = '#333';
    typeSelect.style.color = '#fff';
    
    const objectTypes = [
      { value: 'tree_simple', text: 'Baum (einfach)' },
      { value: 'tree_pine', text: 'Tanne' },
      { value: 'tree_palm', text: 'Palme' },
      { value: 'rock_small', text: 'Kleiner Fels' },
      { value: 'rock_large', text: 'Großer Fels' },
      { value: 'bush', text: 'Busch' },
      { value: 'flower', text: 'Blume' },
      { value: 'grass', text: 'Gras' },
      { value: 'mushroom', text: 'Pilz' },
      { value: 'crystal', text: 'Kristall' }
    ];
    
    objectTypes.forEach(type => {
      const option = document.createElement('option');
      option.value = type.value;
      option.textContent = type.text;
      typeSelect.appendChild(option);
    });
    
    // Event Handler für Mode Select
    modeSelect.addEventListener('change', () => {
      this.interactionMode = modeSelect.value;
      
      // Bei path_finish oder path_cancel direkt ausführen
      if (this.interactionMode === 'path_finish') {
        this.finishPath().then(() => {
          modeSelect.value = 'none';
          this.interactionMode = 'none';
        });
      } else if (this.interactionMode === 'path_cancel') {
        this.cancelPath();
        modeSelect.value = 'none';
        this.interactionMode = 'none';
      }
      
      // Object-Type-Select nur bei place_object anzeigen
      typeSelect.style.display = (this.interactionMode === 'place_object') ? 'inline-block' : 'none';
    });
    
    // Event Handler für Object Type Select
    typeSelect.addEventListener('change', () => {
      this.selectedObjectType = typeSelect.value;
    });
    
    // Initialwerte setzen
    modeSelect.value = this.interactionMode || 'none';
    typeSelect.value = this.selectedObjectType || 'tree_simple';
    typeSelect.style.display = (this.interactionMode === 'place_object') ? 'inline-block' : 'none';
    
    // UI-Elemente hinzufügen
    const controlsContainer = document.createElement('div');
    controlsContainer.style.marginTop = '8px';
    
    const modeLabel = document.createElement('label');
    modeLabel.textContent = 'Modus: ';
    modeLabel.style.color = '#fff';
    modeLabel.style.marginRight = '4px';
    
    const typeLabel = document.createElement('label');
    typeLabel.textContent = 'Objekttyp: ';
    typeLabel.style.color = '#fff';
    typeLabel.style.marginRight = '4px';
    
    controlsContainer.appendChild(modeLabel);
    controlsContainer.appendChild(modeSelect);
    controlsContainer.appendChild(typeLabel);
    controlsContainer.appendChild(typeSelect);
    
    container.appendChild(controlsContainer);
    
    return [container];
  }
  
  /**
   * Serialisiert den aktuellen Zustand
   */
  serializeState() {
    return {
      ...super.serializeState(),
      interactionMode: this.interactionMode,
      tmpPathPoints: this.tmpPathPoints,
      selectedObjectType: this.selectedObjectType
    };
  }
  
  /**
   * Deserialisiert einen gespeicherten Zustand
   */
  /**
   * Setzt den ausgewählten Objekttyp basierend auf einem Catalog-Objekt
   * @param {Object} catalogObject - Das Objekt aus dem ObjectCatalog
   */
  setSelectedObjectType(catalogObject) {
    console.log('[TerrainClick] setSelectedObjectType aufgerufen mit:', catalogObject);
    
    // Mapping von Catalog-Objekten zu Terrain-Objekttypen
    const typeMapping = {
      'house_1': 'tree_simple',      // Gebäude -> Baum als Platzhalter
      'tower_1': 'tree_pine',        // Turm -> Tanne
      'tree_1': 'tree_simple',       // Baum -> einfacher Baum
      'bush_1': 'bush',              // Busch -> Busch
      'bridge_1': 'rock_large',      // Brücke -> großer Fels
      'fence_1': 'rock_small',       // Zaun -> kleiner Fels
      'fountain_1': 'crystal',       // Springbrunnen -> Kristall
      'statue_1': 'mushroom'         // Statue -> Pilz
    };
    
    // Standardmapping basierend auf Kategorie, falls keine direkte Übereinstimmung
    const categoryMapping = {
      'buildings': 'tree_simple',
      'vegetation': 'tree_simple',
      'infrastructure': 'rock_large',
      'decoration': 'crystal'
    };
    
    // Bestimme den Terrain-Objekttyp
    let terrainType = typeMapping[catalogObject.id] ||
                     categoryMapping[catalogObject.category] ||
                     'tree_simple';
    
    console.log('[TerrainClick] Mapping:', catalogObject.id, '->', terrainType);
    
    this.selectedObjectType = terrainType;
    this.interactionMode = 'place_object';
    
    // UI aktualisieren falls vorhanden
    const typeSelect = document.getElementById('objectType');
    if (typeSelect) {
      typeSelect.value = terrainType;
    }
    
    console.log('[TerrainClick] Objekttyp gesetzt:', terrainType, 'Modus:', this.interactionMode);
  }

  deserializeState(state) {
    super.deserializeState(state);
    if (state) {
      this.interactionMode = state.interactionMode || 'none';
      this.tmpPathPoints = state.tmpPathPoints || [];
      this.selectedObjectType = state.selectedObjectType || 'tree_simple';
    }
  }
}