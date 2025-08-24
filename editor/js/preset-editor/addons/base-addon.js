/**
 * Basis-Interface für alle Interaktions-Addons im PresetEditor
 * 
 * Dieses Interface definiert die gemeinsame Basis für alle Addons, die
 * Interaktionsfunktionalität für die YAML-Bearbeitung bereitstellen.
 * 
 * @example
 * // Einfache Addon-Implementierung
 * class MyAddon extends InteractionAddon {
 *   constructor(editor) {
 *     super(editor);
 *     this.name = 'Mein Addon';
 *     this.description = 'Beschreibung meines Addons';
 *   }
 *   
 *   async activate() {
 *     console.log('Addon aktiviert');
 *   }
 * }
 */

export class InteractionAddon {
  /**
   * Erstellt eine neue Addon-Instanz
   * @param {PresetEditor} editor - Die PresetEditor-Instanz
   */
  constructor(editor) {
    this.editor = editor;
    this.name = 'Unnamed Addon';
    this.description = 'No description provided';
    this.icon = '⚙️';
    this.isActive = false;
  }
  
  /**
   * Wird aufgerufen wenn das Addon aktiviert wird
   * @returns {Promise<void>}
   */
  async activate() {
    this.isActive = true;
    console.log(`[Addon] ${this.name} aktiviert`);
  }
  
  /**
   * Wird aufgerufen wenn das Addon deaktiviert wird
   * @returns {Promise<void>}
   */
  async deactivate() {
    this.isActive = false;
    console.log(`[Addon] ${this.name} deaktiviert`);
  }
  
  /**
   * Terrain-Click Handler - wird vom ThreeJSManager aufgerufen
   * @param {{ point: {x:number,y:number,z:number}, object: any, event: MouseEvent }} hitInfo
   * @returns {Promise<void>}
   */
  async onTerrainClick(hitInfo) {
    // Basis-Implementierung: nichts tun
  }
  
  /**
   * Mouse Move Handler für kontinuierliche Interaktionen
   * @param {MouseEvent} event
   * @returns {Promise<void>}
   */
  async onMouseMove(event) {
    // Basis-Implementierung: nichts tun
  }
  
  /**
   * Key Press Handler für Tastatureingaben
   * @param {KeyboardEvent} event
   * @returns {Promise<void>}
   */
  async onKeyPress(event) {
    // Basis-Implementierung: nichts tun
  }
  
  /**
   * Gibt UI-Elemente für die Addon-Konfiguration zurück
   * @returns {HTMLElement[]} Array von UI-Elementen
   */
  getUIElements() {
    console.log(`[${this.name}] getUIElements aufgerufen`);
    return [];
  }
  
  /**
   * Serialisiert den aktuellen Zustand für Persistenz
   * @returns {Object} Serialisierter Zustand
   */
  serializeState() {
    return {
      name: this.name,
      isActive: this.isActive
    };
  }
  
  /**
   * Deserialisiert einen gespeicherten Zustand
   * @param {Object} state - Serialisierter Zustand
   */
  deserializeState(state) {
    if (state) {
      this.isActive = state.isActive || false;
    }
  }
  
  /**
   * Hilfsmethode: Rundet einen Punkt auf 2 Dezimalstellen
   * @param {{x:number,y:number,z:number}} point
   * @returns {{x:number,y:number,z:number}}
   */
  _roundPoint(point) {
    const round = (n) => Math.round(n * 100) / 100;
    return {
      x: round(point.x),
      y: round(point.y),
      z: round(point.z)
    };
  }
  
  /**
   * Hilfsmethode: Zeigt einen Toast an
   * @param {string} type - Toast-Typ (success, error, info, warning)
   * @param {string} message - Nachricht
   */
  _showToast(type, message) {
    if (window.showToast) {
      window.showToast(type, message);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  /**
   * Hilfsmethode: Serialisiert ein Objekt zu YAML-Text
   * @param {Object} obj - Das zu serialisierende Objekt
   * @returns {string} Serialisierter YAML-Text
   */
  _serializeToYaml(obj) {
    if (!this.editor.yamlProcessor) {
      throw new Error('YAML Processor nicht verfügbar');
    }
    return this.editor.yamlProcessor.constructor.safeYamlDump(obj);
  }

  /**
   * Hilfsmethode: Wendet YAML-Änderungen auf den Editor an
   * @param {string} yaml - Der YAML-Text
   * @returns {Promise<void>}
   */
  async _applyYamlChange(yaml) {
    const targetTab = this.editor.activeTab === 'patch' ? 'patch' : 'world';
    const targetTextarea = targetTab === 'patch' ? this.editor.patchTextarea : this.editor.worldTextarea;
    
    if (targetTextarea) {
      try {
        targetTextarea.value = yaml;
        const ev = new Event('input', { bubbles: true, cancelable: true });
        targetTextarea.dispatchEvent(ev);
        return;
      } catch (e) {
        console.error('[Addon] Fehler beim Anwenden des YAML-Changes:', e);
        throw e;
      }
    }
    
    // Fallback
    console.warn('[Addon] Kein Ziel-Textarea gefunden, verwende worldTextarea als Fallback.');
    if (this.editor.worldTextarea) {
      try {
        this.editor.worldTextarea.value = yaml;
        const ev = new Event('input', { bubbles: true, cancelable: true });
        this.editor.worldTextarea.dispatchEvent(ev);
      } catch (e) {
        console.error('[Addon] Fehler beim Anwenden des YAML-Changes (Fallback):', e);
        throw e;
      }
    }
  }

  /**
   * Hilfsmethode: Parst den aktuellen YAML-Inhalt
   * @returns {Object|null} Geparstes Objekt oder null
   */
  _parseCurrentYaml() {
    if (!this.editor.yamlProcessor) {
      throw new Error('YAML Processor nicht verfügbar');
    }
    return this.editor.yamlProcessor.parseYaml();
  }

  /**
   * Hilfsmethode: Erstellt ein neues YAML-Objekt mit Standard-Struktur
   * @returns {Object} Neues YAML-Objekt
   */
  _createNewYamlObject() {
    return {
      metadata: {
        schema_version: 'patchkit/1.0',
        name: 'Neue Welt',
        description: ''
      },
      entities: {
        objects: {},
        portals: {},
        personas: {}
      }
    };
  }
}