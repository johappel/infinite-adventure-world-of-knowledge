/**
 * World Manager Module
 * Verwaltung von World-Operationen wie Erstellen, Laden, Speichern
 *
 * Dieses Modul ist verantwortlich für die Verwaltung von World-Operationen im PresetEditor.
 * Es bietet Funktionen zum Erstellen, Laden, Speichern, Importieren und Exportieren von Worlds.
 *
 * @example
 * // Neue Welt erstellen
 * const worldManager = new WorldManager(editor);
 * await worldManager.createNewWorld();
 *
 * // Welt laden
 * await worldManager.loadWorldById('world_id');
 *
 * // Aktuelle Welt speichern
 * await worldManager.saveCurrent();
 */
import { updateUrlParam } from '../load.js';
export class WorldManager {
  /**
   * Erstellt eine neue WorldManager-Instanz
   * @param {any} editor - Die PresetEditor-Instanz
   */
  constructor(editor) {
    this.editor = editor;
  }

  /**
   * Erstellt eine neue Welt mit einer benutzerfreundlichen Vorlage
   * Setzt die World-ID im Editor und aktualisiert die Vorschau
   */
  async createNewWorld() {
    try {
      const newWorldId = 'world_' + Math.random().toString(36).slice(2, 10);
      this.editor._setWorldId(newWorldId);
      updateUrlParam();

      const newWorldTemplate = `
# Basis-Metadaten
name: "Neue Welt"
description: "Eine neue, mit dem Editor erstellte Welt."
id: ${newWorldId}

# Umgebung
environment:
  skybox: "clear_day"
  time_of_day: 0.5
  ambient_light: 0.6
  sun_intensity: 0.8
  fog_distance: 100
  ambient_sound: "birds"

# Terrain/Boden
terrain:
  type: "flat"
  size: [50, 50]
  color: "#4a7c1e"
  texture: "grass"

# Objekte, Portale und Personen können hier hinzugefügt werden


objects:
  - type: "rock"
    position: [5, 0, 3]
    scale: [1.2, 0.8, 1.1]
    color: "#8b7355"

portals:
  - id: "to-forest"
    name: "Zum Mystischen Wald"
    position: [-10, 1, 0]
    size: [2, 3, 0.5]
    destination: "zone-forest"
    color: "#9370db"

personas:
  - name: "Lehrmeister Aelion"
    position: [0, 0, 5]
    appearance:
      color: "#ff6b6b"
      height: 1.8
      type: "humanoid"
`.trim();

      // Setze den YAML-Content im Editor
      this.editor.setYamlText(newWorldTemplate);

      // Parse den neuen YAML-Text, um ein Objekt für die Vorschau zu erhalten
      const newWorldObject = this.editor.yamlProcessor.parseYaml();
      
      // Aktualisiere die Vorschau
      if (newWorldObject) {
        const normalized = this.editor.yamlProcessor.normalizeUserYaml(newWorldObject);
        await this.editor.previewRenderer.updatePreviewFromObject(normalized);
      }
      
      if (window.showToast) window.showToast('success', 'Neue Welt Vorlage geladen');
      this.editor._setStatus('Neue Welt Vorlage geladen', 'success');
    } catch (e) {
      console.error(e);
      if (window.showToast) window.showToast('error', 'Welt-Erstellung fehlgeschlagen: ' + e.message);
      this.editor._setStatus('Welt-Erstellung fehlgeschlagen: ' + e.message, 'error');
    }
  }

  /**
   * Zeigt einen Prompt zur Eingabe einer World-ID und lädt die entsprechende Welt
   */
  async loadByWorldIdPrompt() {
    try {
      const worldId = prompt('World-ID zum Laden:');
      if (!worldId) return;
      await this.loadWorldById(worldId);
    } catch (e) {
      console.error(e);
      if (window.showToast) window.showToast('error', 'Laden fehlgeschlagen: ' + e.message);
      this.editor._setStatus('Laden fehlgeschlagen: ' + e.message, 'error');
    }
  }

  /**
   * Lädt eine Welt basierend auf der Eingabe im World-ID-Input-Feld
   */
  async loadWorldByIdFromInput() {
    try {
      const input = document.getElementById('worldIdInput');
      if (!input) {
        this.editor._setStatus('World-ID Input nicht gefunden', 'error');
        return;
      }
      
      const worldId = input.value.trim();
      if (!worldId) {
        this.editor._setStatus('Bitte geben Sie eine World-ID ein', 'error');
        return;
      }
      
      await this.loadWorldById(worldId);
    } catch (e) {
      console.error(e);
      if (window.showToast) window.showToast('error', 'Laden fehlgeschlagen: ' + e.message);
      this.editor._setStatus('Laden fehlgeschlagen: ' + e.message, 'error');
    }
  }

  /**
   * Lädt eine Welt anhand ihrer ID
   * @param {string} worldId - Die ID der zu ladenden Welt
   */
  async loadWorldById(worldId) {
    try {
      if (!this.editor.patchKit || !this.editor.patchKit.io || !this.editor.patchKit.io.genesisPort) {
        throw new Error('PatchKit nicht initialisiert');
      }
      
      const genesisEvt = await this.editor.patchKit.io.genesisPort.getById(worldId);
      if (!genesisEvt) {
        throw new Error('Welt nicht gefunden');
      }
      
      // Parse die Genesis-Daten
      const genesis = this.editor.patchKit.genesis.parse(genesisEvt?.yaml || genesisEvt);
      console.log('[DEBUG] Geladene Genesis-Daten type:', typeof genesis);
      
      // Setze die World-ID
      this.editor.worldId = worldId;
      
      // Aktualisiere das UI-Input-Feld
      const worldIdInput = document.getElementById('worldIdInput');
      if (worldIdInput) {
        worldIdInput.value = worldId;
      }
      // Konvertiere in das benutzerfreundliche YAML-Format
      const serializedYaml = this.editor.yamlProcessor.denormalizeUserYaml(genesis);
      
      console.log('[DEBUG] Serialisiertes YAML:', serializedYaml);
      const yamlText = window.chooseYamlFromData(genesisEvt);
      
      
      // Setze den YAML-Content im Editor
      this.editor.setYamlText(yamlText);
      
      // Aktualisiere die Patch-UI, falls vorhanden
      if (this.editor.uiManager && typeof this.editor.uiManager.updatePatchList === 'function') {
        try {
          await this.editor.uiManager.updatePatchList();
        } catch (error) {
          console.warn('Konnte Patch-Liste nicht aktualisieren:', error);
        }
      }
      // Aktualisiere die Vorschau
      //await this.editor.previewRenderer.updatePreviewFromObject(genesis);
      await this.loadWorldCurrentYaml();

      
      
      if (window.showToast) window.showToast('success', 'Welt geladen');
      this.editor._setStatus('Welt geladen: ' + worldId, 'success');
    } catch (e) {
      console.error(e);
      if (window.showToast) window.showToast('error', 'Laden fehlgeschlagen: ' + e.message);
      this.editor._setStatus('Laden fehlgeschlagen: ' + e.message, 'error');
    }
  }
  // Lädt die aktuelle Welt basierend auf dem YAML-Inhalt
  async loadWorldCurrentYaml() {
    try {
      const yamlText = this.editor.getYamlText();
      if (!yamlText) {
        console.warn('Kein YAML-Inhalt zum Laden');
        return;
      }
      const obj = this.editor.yamlProcessor.parseYaml();
      if (!obj) {
        throw new Error('Ungültiges YAML');
      }
      const genesis = this.editor.yamlProcessor.normalizeUserYaml(obj);
      let worldId = this.editor._getWorldId();
      const evt = await this.editor.patchKit.io.genesisPort.getById(worldId);
      if(!evt) {
        console.warn('[DEBUG] Genesis noch nicht gespeichert');
        worldId = 'new';
      }
      if(!genesis.metadata.id) {
        throw new Error('Keine gültige World-ID gefunden');
      }
      document.querySelector('.patch-list-content').innerHTML = '';
      if (worldId && worldId !== 'new') {
        //list patches
        const list = await this.editor.patchKit.io.patchPort.listPatchesByWorld(worldId);
        // Normalisieren; Parsen falls nötig. Verwende zentrale Normalizer wenn verfügbar.
        const patches = [];
        if (Array.isArray(list)) {
          for (const raw of list) {
            let p = null;
            try {
              // Prefer editor-provided synchronous normalizer for UI performance
              if (this.editor && typeof this.editor.ensureNormalizedPatchSync === 'function') {
                p = await this.editor.ensureNormalizedPatchSync(raw) || null;
              }
            } catch (e) {
              console.warn('ensureNormalizedPatchSync failed:', e);
              p = null;
            }
            // Fallbacks: async normalizer or local fallback
            if (!p && this.editor && typeof this.editor.ensureNormalizedPatch === 'function') {
              try { p = await this.editor.ensureNormalizedPatch(raw); } catch (e) { p = null; }
            }
            if (!p) p = this._ensurePatchObject(raw);
            patches.push(p);
          }
        }
        await this.editor.patchUI.load(worldId, genesis, patches); 
        // Stelle sicher, dass die Szene gerendert wird
        if (this.editor.threeJSManager && this.editor.threeJSManager.renderer) {
          this.editor.threeJSManager.renderer.render(this.editor.threeJSManager.scene, this.editor.threeJSManager.camera);
        }

        

      }else{
        await this.editor.patchUI.load(worldId, genesis); 
      }
      // Setze den Editor-Status
      this.editor._setStatus('Welt geladen: ' + worldId, 'success');

     
    } catch (e) {
      console.error(e);
      if (window.showToast) window.showToast('error', 'Laden fehlgeschlagen: ' + e.message);
      this.editor._setStatus('Laden fehlgeschlagen: ' + e.message, 'error');
    }
  }

  /**
   * Speichert die aktuelle Welt
   * Wenn keine World-ID vorhanden ist, wird eine neue Welt erstellt
   */
  async saveCurrent() {
    try {
      console.log('[DEBUG] saveCurrent aufgerufen – Start');
      this.editor._getWorldId();
      if (!this.editor.worldId) {
        // Neue Welt erstellen, wenn keine ID vorhanden
        await this.createNewWorld();
        return;
      }
      
      const yamlText = this.editor.getYamlText();
      if (!yamlText) {
        throw new Error('Kein YAML-Inhalt zum Speichern');
      }
      
      const obj = this.editor.yamlProcessor.parseYaml();
      if (!obj) {
        throw new Error('Ungültiges YAML');
      }
      
      // Normalisiere das YAML-Objekt für das Speichern
      const normalized = this.editor.yamlProcessor.normalizeUserYaml(obj);
      
      // Stelle sicher, dass die ID korrekt gesetzt ist
      if(normalized.metadata.id && normalized.metadata.id !== this.editor.worldId) {
        console.warn('[DEBUG] World-ID im YAML stimmt nicht überein, aktualisiere das Inputfeld');
        this.editor._setWorldId(normalized.metadata.id);
      }

      // Speichere die Welt
      const result = await this.editor.patchKit.io.genesisPort.save(normalized);
      updateUrlParam(normalized.metadata.id);
      
      if (window.showToast) window.showToast('success', 'Welt gespeichert');
      this.editor._setStatus('Welt gespeichert: ' + this.editor.worldId, 'success');
    } catch (e) {
      console.error(e);
      if (window.showToast) window.showToast('error', 'Speichern fehlgeschlagen: ' + e.message);
      this.editor._setStatus('Speichern fehlgeschlagen: ' + e.message, 'error');
    }
  }

  

  /**
   * Speichert die aktuelle Welt als neue Welt mit einer neuen ID
   */
  async saveAsNewWorld() {
    try {
      const yamlText = this.editor.getYamlText();
      if (!yamlText) {
        throw new Error('Kein YAML-Inhalt zum Speichern');
      }
      
      const obj = this.editor.yamlProcessor.parseYaml();
      if (!obj) {
        throw new Error('Ungültiges YAML');
      }
      
      // Erstelle eine neue ID
      const newWorldId = 'world_' + Math.random().toString(36).slice(2, 10);
      
      // Normalisiere das YAML-Objekt für das Speichern
      const normalized = this.editor.yamlProcessor.normalizeUserYaml(obj);
      
      // Setze die neue ID
      normalized.metadata.id = newWorldId;
      
      // Speichere die Welt
      const result = await this.editor.patchKit.io.genesisPort.save(normalized);
      
      // Setze die neue World-ID im Editor
      this.editor.worldId = newWorldId;
      
      if (window.showToast) window.showToast('success', 'Welt als neue Welt gespeichert');
      this.editor._setStatus('Welt gespeichert: ' + newWorldId, 'success');
    } catch (e) {
      console.error(e);
      if (window.showToast) window.showToast('error', 'Speichern fehlgeschlagen: ' + e.message);
      this.editor._setStatus('Speichern fehlgeschlagen: ' + e.message, 'error');
    }
  }

  /**
   * Exportiert die aktuelle Welt als YAML-Datei
   */
  async exportWorld() {
    try {
      const yamlText = this.editor.getYamlText();
      if (!yamlText) {
        throw new Error('Kein YAML-Inhalt zum Exportieren');
      }
      
      // Erstelle einen Download-Link
      const blob = new Blob([yamlText], { type: 'text/yaml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `world_${this.editor.worldId || 'export'}.yaml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      if (window.showToast) window.showToast('success', 'Welt exportiert');
      this.editor._setStatus('Welt exportiert', 'success');
    } catch (e) {
      console.error(e);
      if (window.showToast) window.showToast('error', 'Export fehlgeschlagen: ' + e.message);
      this.editor._setStatus('Export fehlgeschlagen: ' + e.message, 'error');
    }
  }

  async importWorld() {
    try {
      // Erstelle einen Datei-Input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.yaml,.yml';
      
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
          const text = await file.text();
          
          // Setze den YAML-Content im Editor
          this.editor.setYamlText(text);
          
          // Parse die YAML, um die ID zu extrahieren
          const obj = this.editor.yamlProcessor.parseYaml();
          if (obj && obj.metadata && obj.metadata.id) {
            this.editor.worldId = obj.metadata.id;
          } else {
            // Erstelle eine neue ID, wenn keine vorhanden ist
            this.editor.worldId = 'world_' + Math.random().toString(36).slice(2, 10);
          }
          
          // Aktualisiere die Vorschau
          const normalized = this.editor.yamlProcessor.normalizeUserYaml(obj);
          await this.editor.previewRenderer.updatePreviewFromObject(normalized);
          
          if (window.showToast) window.showToast('success', 'Welt importiert');
          this.editor._setStatus('Welt importiert: ' + this.editor.worldId, 'success');
        } catch (error) {
          console.error(error);
          if (window.showToast) window.showToast('error', 'Import fehlgeschlagen: ' + error.message);
          this.editor._setStatus('Import fehlgeschlagen: ' + error.message, 'error');
        }
      };
      
      input.click();
    } catch (e) {
      console.error(e);
      if (window.showToast) window.showToast('error', 'Import fehlgeschlagen: ' + e.message);
      this.editor._setStatus('Import fehlgeschlagen: ' + e.message, 'error');
    }
  }
}