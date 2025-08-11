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
export class WorldManager {
  /**
   * Erstellt eine neue WorldManager-Instanz
   * @param {any} editor - Die PresetEditor-Instanz
   */
  constructor(editor) {
    this.editor = editor;
  }

  /**
   * Erstellt eine neue Welt mit Standardwerten
   * Setzt die World-ID im Editor und aktualisiert die Vorschau
   */
  async createNewWorld() {
    try {
      // Erstelle eine neue Welt mit Standardwerten
      const newWorld = {
        metadata: {
          schema_version: 'patchkit/1.0',
          id: 'world_' + Math.random().toString(36).slice(2, 10),
          name: 'Neue Welt',
          description: 'Eine neue Welt',
          author_npub: 'npub0',
          created_at: Math.floor(Date.now() / 1000)
        },
        entities: {
          objects: {},
          portals: {},
          personas: {}
        },
        environment: {
          ambient_light: { color: '#ffffff', intensity: 0.5 },
          directional_light: { color: '#ffffff', intensity: 0.8, position: [10, 20, 10] }
        },
        terrain: {
          type: 'plane',
          size: [100, 100],
          color: '#1a4a1a'
        },
        camera: {
          position: [0, 5, 10],
          target: [0, 0, 0]
        }
      };
      
      // Setze die World-ID
      this.editor.worldId = newWorld.metadata.id;
      
      // Konvertiere in das benutzerfreundliche YAML-Format
      const yamlText = this.editor.yamlProcessor.serializeYaml(
        this.editor.yamlProcessor.denormalizeUserYaml(newWorld)
      );
      
      // Setze den YAML-Content im Editor
      this.editor.setYamlText(yamlText);
      
      // Aktualisiere die Vorschau
      await this.editor.previewRenderer.updatePreviewFromObject(newWorld);
      
      if (window.showToast) window.showToast('success', 'Neue Welt erstellt');
      this.editor._setStatus('Neue Welt erstellt', 'success');
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
      
      // Setze die World-ID
      this.editor.worldId = worldId;
      
      // Konvertiere in das benutzerfreundliche YAML-Format
      const yamlText = this.editor.yamlProcessor.serializeYaml(
        this.editor.yamlProcessor.denormalizeUserYaml(genesis)
      );
      
      // Setze den YAML-Content im Editor
      this.editor.setYamlText(yamlText);
      
      // Aktualisiere die Vorschau
      await this.editor.previewRenderer.updatePreviewFromObject(genesis);
      
      // Aktualisiere die Patch-UI, falls vorhanden
      if (this.editor.patchUI) {
        try {
          await this.editor.patchUI.load(worldId);
        } catch (error) {
          console.warn('Konnte Patch-Liste nicht aktualisieren:', error);
        }
      }
      
      if (window.showToast) window.showToast('success', 'Welt geladen');
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
      normalized.metadata.id = this.editor.worldId;
      
      // Speichere die Welt
      const result = await this.editor.patchKit.io.genesisPort.save(normalized);
      
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