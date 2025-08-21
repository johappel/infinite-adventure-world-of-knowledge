/**
 * Patch Manager Module
 * Verwaltung von Patch-Operationen wie Erstellen, Bearbeiten, Löschen, Anwenden
 */


export class PatchManager {
  constructor(editor) {
    this.editor = editor;

    // Expose a synchronous normalization helper on the editor so other UI parts
    // (e.g. PatchUI) can call the same normalization logic without turning
    // their callers async. This delegates to _ensureNormalizedPatch below.
    if (this.editor) {
      try {
        this.editor.ensureNormalizedPatch = async (p) => await this._ensureNormalizedPatch(p);
        this.editor.ensureNormalizedPatchSync = (p) => this._ensureNormalizedPatchSync(p);
      } catch (e) {
        console.warn('Konnte ensureNormalizedPatch nicht registrieren:', e);
      }
    }
  }

  async createNewPatch() {
    try {
      if (!this.editor.worldId) {
        this.editor._setStatus('Keine World ID gesetzt. Bitte laden oder erstellen Sie zuerst eine Welt.', 'error');
        return;
      }

      // Erstelle einen leeren Patch
      this.editor.currentPatchId = 'patch_' + Math.random().toString(36).slice(2, 10);

      // Setze einen leeren YAML-Content im Editor
      const yamlEditor = document.getElementById('patch-yaml-editor');
      if (yamlEditor) {
        yamlEditor.value = `# Neuer Patch
name: "Neuer Patch"
description: "Beschreibung hier einfügen"
operations: add
objects:
   - type: "box"
     position: [2, 0, -2]
     scale: [1, 1, 1]
     color: "#1a4a1a"
`;
      }

      // Wechsle zum Patch-Tab
      this.editor.uiManager.switchTab('patch');

      // Aktualisiere die Patch-UI, falls vorhanden
      if (this.editor.patchUI) {
        try {
          await this.editor.patchUI.load(this.editor.worldId);
        } catch (error) {
          console.warn('Konnte Patch-Liste nicht aktualisieren:', error);
        }
      }

      if (window.showToast) window.showToast('success', 'Neuer Patch erstellt');
      this.editor._setStatus('Neuer Patch erstellt', 'success');
    } catch (e) {
      console.error(e);
      if (window.showToast) window.showToast('error', 'Patch-Erstellung fehlgeschlagen: ' + e.message);
      this.editor._setStatus('Patch-Erstellung fehlgeschlagen: ' + e.message, 'error');
    }
  }

  async selectPatch(patchId) {
    console.log('[DEBUG PATCH MANAGER] Lade Patch in den Editor:', patchId);
    try {
      if (!this.editor.worldId) {
        this.editor._setStatus('Keine World ID gesetzt. Bitte laden oder erstellen Sie zuerst eine Welt.', 'error');
        return;
      }

      if (!patchId) {
        this.editor._setStatus('Keine Patch ID angegeben.', 'error');
        return;
      }
      console.info('[DEBUG PATCH MANAGER] Selected Patch:', this.editor.patchKit.io?.patchPort?.getById);
      // Lade den Patch vom Server
      let patchEvent = null;
      if (this.editor.patchKit.io?.patchPort?.getById) {
        try {
          patchEvent = await this.editor.patchKit.io.patchPort.getById(patchId);
        } catch (error) {
          console.error('Fehler beim Laden des Patches:', error);
          this.editor._setStatus('Fehler beim Laden des Patches: ' + error.message, 'error');
          if (window.showToast) {
            window.showToast('error', 'Patch konnte nicht geladen werden: ' + error.message);
          }
          return;
        }
      }

      if (!patchEvent || (typeof patchEvent === 'object' && Object.keys(patchEvent).length === 0)) {
        console.error('Patch nicht gefunden oder leer:', patchEvent);
        this.editor._setStatus('Patch nicht gefunden oder leer.', 'error');
        if (window.showToast) {
          window.showToast('error', 'Patch konnte nicht geladen werden: Patch nicht gefunden oder leer.');
        }
        return;
      }

      // Parse den Patch - verwende originalYaml falls verfügbar, sonst das Event direkt
      let patch;
      if (patchEvent.originalYaml && typeof patchEvent.originalYaml === 'string') {
        // originalYaml ist bereits ein String, parse direkt
        patch = this.editor.patchKit.patch.parse(patchEvent.originalYaml);
      } else if (patchEvent.yaml && typeof patchEvent.yaml === 'string') {
        // yaml ist bereits ein String, parse direkt
        patch = this.editor.patchKit.patch.parse(patchEvent.yaml);
      } else if (patchEvent.metadata && patchEvent.operations) {
        // Event ist bereits ein geparster Patch
        patch = patchEvent;
      } else {
        console.error('Unbekanntes Patch-Format:', patchEvent);
        this.editor._setStatus('Unbekanntes Patch-Format.', 'error');
        if (window.showToast) {
          window.showToast('error', 'Patch-Format wird nicht unterstützt.');
        }
        return;
      }

      // Setze die aktuelle Patch-ID
      this.editor.currentPatchId = patchId;

      // Konvertiere den Patch in das benutzerfreundliche YAML-Format
      // @todo: wir brauchen hier den YAML-Prozessor
      
      const yamlText = patchEvent.originalYaml || this._convertPatchToYaml(patch);
      

      // Setze den YAML-Content im Editor
      const yamlEditor = document.getElementById('patch-yaml-editor');
      if (yamlEditor) {
        yamlEditor.value = yamlText;
      }

      // Wechsle zum Patch-Tab
      this.editor.uiManager.switchTab('patch');

      // Aktualisiere den Tab-Namen
      this.editor.uiManager._updatePatchTabName(patch.metadata?.name || 'Patch');

      // Visualisiere den Patch, falls der Patch-Visualizer verfügbar ist
      if (this.editor.patchVisualizer) {
        try {
          await this.visualizePatch(patch, {
            highlightChanges: true,
            showConflicts: false
          }); 
        } catch (error) {
          console.warn('Konnte Patch nicht visualisieren:', error);
        }
      }

      if (window.showToast) window.showToast('success', 'Patch geladen und zur Bearbeitung geöffnet.');
      this.editor._setStatus('Patch zur Bearbeitung geladen.', 'success');
    } catch (e) {
      console.error(e);
      if (window.showToast) window.showToast('error', 'Patch-Ladung fehlgeschlagen: ' + e.message);
      this.editor._setStatus('Patch-Ladung fehlgeschlagen: ' + e.message, 'error');
    }
  }

  async deletePatch(patchId) {
    try {
      if (!patchId) {
        this.editor._setStatus('Keine Patch ID angegeben.', 'error');
        return;
      }
      
      // Bestätigungsdialog anzeigen
      const confirmDelete = confirm('Möchten Sie diesen Patch wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.');
      if (!confirmDelete) {
        this.editor._setStatus('Löschung abgebrochen.', 'info');
        return;
      }
      
      // Lade den Patch vom Server, um zu prüfen, ob der aktuelle Benutzer der Autor ist
      let patchEvent = null;
      if (this.editor.patchKit.io?.patchPort?.getById) {
        patchEvent = await this.editor.patchKit.io.patchPort.getById(patchId);
      }
        
      if (!patchEvent) {
        this.editor._setStatus('Patch nicht gefunden.', 'error');
        return;
      }
      
      // Parse den Patch - verwende originalYaml falls verfügbar, sonst das Event direkt
      let patch;
      if (patchEvent.originalYaml && typeof patchEvent.originalYaml === 'string') {
        // originalYaml ist bereits ein String, parse direkt
        patch = this.editor.patchKit.patch.parse(patchEvent.originalYaml);
      } else if (patchEvent.yaml && typeof patchEvent.yaml === 'string') {
        // yaml ist bereits ein String, parse direkt
        patch = this.editor.patchKit.patch.parse(patchEvent.yaml);
      } else {
        // Fallback: verwende das Event direkt (falls es bereits geparst ist)
        patch = patchEvent;
      }
      // @todo: author_npub ermitteln
      // Ermittle author_npub aus aktiver Identität
      let author_npub = 'npub0';
      try {
        // Versuche 1: Über den nostrService des Editors
        if (this.editor.nostrService && typeof this.editor.nostrService.getIdentity === 'function') {
          const ident = await this.editor.nostrService.getIdentity();
          if (ident?.pubkey) author_npub = ident.pubkey;
        }
        
        // Versuche 2: Über die NostrServiceFactory, falls der erste Versuch fehlschlägt
        if (author_npub === 'npub0' && window.NostrServiceFactory) {
          try {
            const factoryService = await window.NostrServiceFactory.getNostrService();
            if (factoryService && typeof factoryService.getIdentity === 'function') {
              const ident = await factoryService.getIdentity();
              if (ident?.pubkey) author_npub = ident.pubkey;
            }
          } catch (e) {
            console.warn('Fehler bei der Identitätsabfrage über NostrServiceFactory:', e);
          }
        }
      } catch (e) {
        console.error('Fehler bei der Autor-Identifikation:', e);
      }
      
      // Prüfe, ob der aktuelle Benutzer der Autor ist
      const patchAuthor = patch.metadata?.author_npub || patch.author_npub || patch.author || patch.pubkey;
      const isAuthor = patchAuthor === author_npub || patchAuthor === 'npub0';
      
      if (!isAuthor) {
        this.editor._setStatus('Sie können nur Ihre eigenen Patches löschen.', 'error');
        return;
      }
      
      // Lösche den Patch
      await this.editor.patchKit.io.patchPort.deletePatch(patchId);
      
      // Setze die aktuelle Patch-ID zurück, wenn der gelöschte Patch gerade bearbeitet wird
      if (this.editor.currentPatchId === patchId) {
        this.editor.currentPatchId = null;
        
        // Setze einen leeren YAML-Content im Editor
        const yamlEditor = document.getElementById('patch-yaml-editor');
        if (yamlEditor) {
          yamlEditor.value = '';

        }
        
        // Aktualisiere den Tab-Namen
        this.editor.uiManager._updatePatchTabName('Patch');
      }
      
      // Aktualisiere die Patch-UI, falls vorhanden
      if (this.editor.patchUI) {
        try {
          await this.editor.patchUI.load(this.editor.worldId);
        } catch (error) {
          console.warn('Konnte Patch-Liste nicht aktualisieren:', error);
        }
      }

      // Setze die Patch-Visualisierung zurück, falls der gelöschte Patch gerade visualisiert wird
      if (this.editor.patchVisualizer) {
        try {
          await this.resetPatchVisualization();
        } catch (error) {
          console.warn('Konnte Patch-Visualisierung nicht zurücksetzen:', error);
        }
      }

      if (window.showToast) window.showToast('success', 'Patch gelöscht.');
      this.editor._setStatus('Patch gelöscht.', 'success');
    } catch (e) {
      console.error(e);
      if (window.showToast) window.showToast('error', 'Patch-Löschung fehlgeschlagen: ' + e.message);
      this.editor._setStatus('Patch-Löschung fehlgeschlagen: ' + e.message, 'error');
    }
  }

  async saveAsPatch() {
    try {
      // Versuche World ID aus dem UI-Input zu lesen, falls nicht im Editor gesetzt
      if (!this.editor.worldId) {
        const worldIdInput = document.getElementById('worldIdInput');
        if (worldIdInput && worldIdInput.value.trim()) {
          this.editor.worldId = worldIdInput.value.trim();
        } else {
          throw new Error('Keine World ID gesetzt. Bitte laden oder erstellen Sie zuerst eine Welt.');
        }
      }
      console.log('[DEBUG saveAsPatch] World ID:', this.editor.worldId);
      const yamlText = this.editor.getYamlText('patch');
      if (!yamlText) {
        throw new Error('Kein YAML-Inhalt zum Speichern');
      }
      
      const obj = this.editor.yamlProcessor.parseYaml();
      if (!obj) {
        throw new Error('Ungültiges YAML');
      }

      console.log('[DEBUG saveAsPatch] parsedYaml:', obj, yamlText);
      
      // Normalisiere das YAML-Objekt für das Speichern als Patch
      let normalizedPatch = null;
      try {
        if (this.editor && typeof this.editor.ensureNormalizedPatchSync === 'function') {
          normalizedPatch = this.editor.ensureNormalizedPatchSync(obj);
        }
      } catch (e) { console.warn('ensureNormalizedPatchSync failed:', e); }
      if (!normalizedPatch && this.editor && typeof this.editor.ensureNormalizedPatch === 'function') {
        try { normalizedPatch = await this.editor.ensureNormalizedPatch(obj); } catch (e) { console.warn('ensureNormalizedPatch failed:', e); }
      }
      if (!normalizedPatch && this.editor?.yamlProcessor?.normalizePatchYaml) {
        normalizedPatch = this.editor.yamlProcessor.normalizePatchYaml(obj);
      }
      if (!normalizedPatch) throw new Error('Patch-Normalisierung fehlgeschlagen');

      // Setze die World-ID als Ziel
      normalizedPatch.metadata.targets_world = this.editor.worldId;
      // Speichere den Patch
      const result = await this.editor.patchKit.io.patchPort.save(normalizedPatch);
      
      // Setze die aktuelle Patch-ID
      this.editor.currentPatchId = normalizedPatch.metadata.id;
      
      // Aktualisiere die Patch-UI, falls vorhanden
      if (this.editor.patchUI) {
        try {
          await this.editor.patchUI.load(this.editor.worldId);
        } catch (error) {
          console.warn('Konnte Patch-Liste nicht aktualisieren:', error);
        }
      }
      
      if (window.showToast) window.showToast('success', 'Patch gespeichert');
      this.editor._setStatus('Patch gespeichert: ' + normalizedPatch.metadata.id, 'success');
    } catch (e) {
      console.error(e);
      if (window.showToast) window.showToast('error', 'Speichern fehlgeschlagen: ' + e.message);
      this.editor._setStatus('Speichern fehlgeschlagen: ' + e.message, 'error');
    }
  }

  async applyPatch(patchId) {
    try {
      if (!this.editor.worldId) {
        throw new Error('Keine World ID gesetzt. Bitte laden oder erstellen Sie zuerst eine Welt.');
      }
      
      if (!patchId) {
        throw new Error('Keine Patch ID angegeben.');
      }
      
      // Lade den Patch vom Server
      let patchEvent = null;
      if (this.editor.patchKit.io?.patchPort?.getById) {
        patchEvent = await this.editor.patchKit.io.patchPort.getById(patchId);
      }
      
      if (!patchEvent) {
        throw new Error('Patch nicht gefunden.');
      }
      
      // Parse den Patch - verwende originalYaml falls verfügbar, sonst das Event direkt
      let patch;
      if (patchEvent.originalYaml && typeof patchEvent.originalYaml === 'string') {
        // originalYaml ist bereits ein String, parse direkt
        patch = this.editor.patchKit.patch.parse(patchEvent.originalYaml);
      } else if (patchEvent.yaml && typeof patchEvent.yaml === 'string') {
        // yaml ist bereits ein String, parse direkt
        patch = this.editor.patchKit.patch.parse(patchEvent.yaml);
      } else {
        // Fallback: verwende das Event direkt (falls es bereits geparst ist)
        patch = patchEvent;
      }

      // Lade die Genesis-Daten
      const genesisData = await this.editor.previewRenderer._getCurrentGenesisData();
      if (!genesisData) {
        throw new Error('Genesis-Daten nicht verfügbar');
      }

      // Wende den Patch an
      const result = await this.editor.patchKit.world.applyPatches(genesisData, [patch]);

      // Aktualisiert die Vorschau mit dem neuen Weltzustand
      await this.editor.previewRenderer.updatePreviewFromObject(result.state);

      if (window.showToast) window.showToast('success', 'Patch angewendet');
      this.editor._setStatus('Patch angewendet: ' + patchId, 'success');
    } catch (e) {
      console.error(e);
      if (window.showToast) window.showToast('error', 'Anwenden fehlgeschlagen: ' + e.message);
      this.editor._setStatus('Anwenden fehlgeschlagen: ' + e.message, 'error');
    }
  }

  async exportPatch() {
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
      a.download = `patch_${this.editor.currentPatchId || 'export'}.yaml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (window.showToast) window.showToast('success', 'Patch exportiert');
      this.editor._setStatus('Patch exportiert', 'success');
    } catch (e) {
      console.error(e);
      if (window.showToast) window.showToast('error', 'Export fehlgeschlagen: ' + e.message);
      this.editor._setStatus('Export fehlgeschlagen: ' + e.message, 'error');
    }
  }

  async importPatch() {
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
            this.editor.currentPatchId = obj.metadata.id;
          } else {
            // Erstelle eine neue ID, wenn keine vorhanden ist
            this.editor.currentPatchId = 'patch_' + Math.random().toString(36).slice(2, 10);
          }
          
          // Wechsle zum Patch-Tab
          this.editor.uiManager.switchTab('patch');
          
          // Aktualisiere die Vorschau mittels zentraler Normalisierung
          let normalizedPatch = null;
          try {
            if (this.editor && typeof this.editor.ensureNormalizedPatchSync === 'function') {
              normalizedPatch = this.editor.ensureNormalizedPatchSync(obj);
            }
          } catch (e) { console.warn('ensureNormalizedPatchSync failed:', e); }
          if (!normalizedPatch && this.editor && typeof this.editor.ensureNormalizedPatch === 'function') {
            try { normalizedPatch = await this.editor.ensureNormalizedPatch(obj); } catch (e) { console.warn('ensureNormalizedPatch failed:', e); }
          }
          if (!normalizedPatch && this.editor?.yamlProcessor?.normalizePatchYaml) {
            normalizedPatch = this.editor.yamlProcessor.normalizePatchYaml(obj);
          }
          await this._updatePatchPreview(normalizedPatch);
          
          if (window.showToast) window.showToast('success', 'Patch importiert');
          this.editor._setStatus('Patch importiert: ' + this.editor.currentPatchId, 'success');            
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

  /**
   * Konvertiert ein Patch-Objekt in das benutzerfreundliche YAML-Format
   * @param {Object} patch - Das zu konvertierende Patch-Objekt
   * @returns {string} - Der YAML-Text
   */
  _convertPatchToYaml(patch) {
    try {
      if (!patch || !patch.operations) {
        return '';
      }
      
      // Erstelle ein benutzerfreundliches YAML-Objekt
      const yamlObj = {
        name: patch.metadata?.name || 'Patch',
        description: patch.metadata?.description || '',
        operations: patch.operations || []
      };
      
      // Konvertiere die Operationen in ein benutzerfreundliches Format
      const entities = {
        objects: [],
        portals: [],
        personas: []
      };
      
      for (const op of patch.operations) {
        if (op.type === 'add' && op.entity_type && op.payload) {
          const entityTypeName = op.entity_type + 's'; // Plural form
          if (entities[entityTypeName]) {
            // Vereinheitliche Attributnamen: kind → type
            const payload = { ...op.payload };
            if (payload.kind && !payload.type) payload.type = payload.kind;
            delete payload.kind;
            
            entities[entityTypeName].push(payload);
          }
        } else if (op.type === 'update' && op.entity_type && op.changes) {
          // Spezialbehandlung für environment, terrain und camera
          if (['environment', 'terrain', 'camera'].includes(op.entity_type)) {
            yamlObj[op.entity_type] = op.changes;
          }
        }
      }
      
      // Füge die Entitäten zum YAML-Objekt hinzu
      Object.assign(yamlObj, entities);
      
      // Serialisiere das YAML-Objekt
      return this.editor.yamlProcessor.serializeYaml(yamlObj);
    } catch (error) {
      console.error('Fehler bei der Konvertierung des Patches zu YAML:', error);
      return '';
    }
  }
  
  /**
   * noch nicht implementiert und getestet:
   * Versucht, ein beliebiges Patch-Input in ein normalisiertes Patch-Objekt zu konvertieren.
   * Erwartetes Ergebnis: Objekt mit operations Array und metadata
   * Rückgabe: normalisiertes Patch-Objekt oder null bei Fehler
   */
  async _ensureNormalizedPatch(inputPatch) {
    try {
      if (!inputPatch) return null;
      
      // Bereits normalisiert?
      if (inputPatch.operations && Array.isArray(inputPatch.operations)) {
        return inputPatch;
      }
      
      // Delegate to the synchronous helper which implements a robust, multi-format
      // normalization path. This keeps callers that require async compatibility
      // while providing a single place to maintain the normalization logic.
      try {
        const syncResult = this._ensureNormalizedPatchSync(inputPatch);
        if (syncResult) return syncResult;
      } catch (e) {
        console.warn('Fehler beim Delegieren an _ensureNormalizedPatchSync:', e);
      }
      
      return null;
    } catch (e) {
      console.error('Fehler in _ensureNormalizedPatch:', e);
      return null;
    }
  }

  // Synchronized version used by UI lists that expect sync behavior
  _ensureNormalizedPatchSync(inputPatch) {
    try {
      if (!inputPatch) return null;

      // Already normalized?
      if (inputPatch.operations && Array.isArray(inputPatch.operations)) return inputPatch;

      // If patchKit.parse is present try parsing raw event/string
      try {
        if (typeof inputPatch === 'string') {
          // Try JSON first
          try {
            const asJson = JSON.parse(inputPatch);
            const normalized = this.editor?.yamlProcessor?.normalizePatchYaml(asJson);
            if (normalized) return normalized;
          } catch {}
          // Try YAML
          try {
            const asYaml = this.editor?.yamlProcessor?.safeYamlParse(inputPatch);
            const normalized = this.editor?.yamlProcessor?.normalizePatchYaml(asYaml);
            if (normalized) return normalized;
          } catch {}
        }

        if (inputPatch.originalYaml && typeof inputPatch.originalYaml === 'string') {
          // patchKit.parse may accept the originalYaml/event and return an object
          if (this.editor?.patchKit?.patch?.parse) {
            const parsed = this.editor.patchKit.patch.parse(inputPatch.originalYaml);
            const normalized = this.editor?.yamlProcessor?.normalizePatchYaml(parsed);
            if (normalized) return normalized;
          }
          // fallback: try yaml parse
          try {
            const parsed = this.editor?.yamlProcessor?.safeYamlParse(inputPatch.originalYaml);
            const normalized = this.editor?.yamlProcessor?.normalizePatchYaml(parsed);
            if (normalized) return normalized;
          } catch {}
        }

        if (inputPatch.yaml && typeof inputPatch.yaml === 'string') {
          if (this.editor?.patchKit?.patch?.parse) {
            const parsed = this.editor.patchKit.patch.parse(inputPatch.yaml);
            const normalized = this.editor?.yamlProcessor?.normalizePatchYaml(parsed);
            if (normalized) return normalized;
          }
          try {
            const parsed = this.editor?.yamlProcessor?.safeYamlParse(inputPatch.yaml);
            const normalized = this.editor?.yamlProcessor?.normalizePatchYaml(parsed);
            if (normalized) return normalized;
          } catch {}
        }

        // If it's already an object with metadata/operations try direct normalization
        if (inputPatch.metadata && inputPatch.operations) {
          const normalized = this.editor?.yamlProcessor?.normalizePatchYaml(inputPatch);
          if (normalized) return normalized;
          return inputPatch; // if normalization returned falsy, return original object
        }

        if (typeof inputPatch === 'object') {
          const normalized = this.editor?.yamlProcessor?.normalizePatchYaml(inputPatch);
          if (normalized) return normalized;
        }
      } catch (e) {
        // swallow and continue to generic fallback
        console.warn('Fehler beim synchronen Normalisieren des Patches:', e);
      }

      return null;
    } catch (e) {
      console.error('Fehler in _ensureNormalizedPatchSync:', e);
      return null;
    }
  }

  async _initPatchVisualizer() {
    try {
      // Importiere den PatchVisualizer
      const { PatchVisualizer } = await import('../patch-visualizer.js');
      
      // Initialisiere den Patch-Visualizer (Konstruktor erwartet threeJSManager)
      this.editor.patchVisualizer = new PatchVisualizer(this.editor.threeJSManager);
      
      console.log('[DEBUG] Patch-Visualizer initialisiert');
    } catch (error) {
      console.error('Fehler bei der Initialisierung des Patch-Visualizers:', error);
      this.editor._setStatus('Patch-Visualizer Initialisierung fehlgeschlagen: ' + error.message, 'error');
    }
  }

  /**
   * Aktualisiert die Patch-Vorschau basierend auf den normalisierten Patch-Daten
   * @param {Object} normalizedPatch - Die normalisierten Patch-Daten
   */
  async _updatePatchPreview(normalizedPatch) {
    try {
      console.info('[DEBUG] _updatePatchPreview aufgerufen mit:', normalizedPatch);
      
      if (!normalizedPatch || !normalizedPatch.operations) {
        console.warn('[DEBUG] Keine gültigen Patch-Operationen gefunden');
        return;
      }
      
      // Wenn der Three.js Manager verfügbar ist, versuche die Patch-Visualisierung
      if (this.editor.threeJSManager && this.editor.threeJSManager.initialized) {
        console.log('[DEBUG] Three.js Manager ist verfügbar, versuche Patch-Visualisierung');
        
        // Versuche zuerst, Genesis-Daten aus dem World-Tab zu verwenden
        console.log('[DEBUG] Versuche Genesis-Daten aus World-Tab zu laden');
        let genesisData = null;
        
        // Wechsle temporär zum World-Tab, um die Genesis-Daten zu laden
        const originalTab = this.editor.activeTab;
        this.editor.activeTab = 'world';
        
        try {
          const worldYamlText = this.editor.worldTextarea ? this.editor.worldTextarea.value : '';
          if (worldYamlText) {
            const parsedWorldYaml = this.editor.yamlProcessor.parseYaml();
            if (parsedWorldYaml) {
              genesisData = this.editor.yamlProcessor.normalizeUserYaml(parsedWorldYaml);
              console.log('[DEBUG] Genesis-Daten aus World-Tab geladen:', genesisData);
            }
          }
        } catch (worldLoadError) {
          console.warn('[DEBUG] Fehler beim Laden der World-Tab-Daten:', worldLoadError);
        } finally {
          // Wechsle zurück zum ursprünglichen Tab
          this.editor.activeTab = originalTab;
        }
        
        if (genesisData && this.editor.patchKit && this.editor.patchKit.world) {
          try {
            console.log('[DEBUG] Genesis-Daten verfügbar, wende Patch an');
            // Wende den Patch auf die Genesis-Daten an
            const result = await this.editor.patchKit.world.applyPatches(genesisData, [normalizedPatch]);
            console.log('[DEBUG] Patch angewendet, Ergebnis:', result);
            
            // Zeige das Ergebnis (Genesis + Patch) an
            await this.editor.previewRenderer.updatePreviewFromObject(result.state);
            
            // Stelle sicher, dass die Szene gerendert wird
            if (this.editor.threeJSManager && this.editor.threeJSManager.renderer) {
              this.editor.threeJSManager.renderer.render(this.editor.threeJSManager.scene, this.editor.threeJSManager.camera);
            }
            
            this.editor._setStatus('Patch-Vorschau mit Genesis angezeigt', 'success');
            return;
          } catch (patchError) {
            console.warn('[DEBUG] Fehler beim Anwenden des Patches auf Genesis:', patchError);
          }
        }
        
        // Fallback: Konvertiere den Patch in ein Genesis-Format und zeige ihn als Welt an
        console.warn('[DEBUG] Fallback: Zeige Patch als eigenständige Welt an');
        const genesisFormat = this.editor.previewRenderer._convertPatchToGenesisFormat(normalizedPatch);
        console.log('[DEBUG] Genesis-Format erstellt:', genesisFormat);
        await this.editor.previewRenderer.updatePreviewFromObject(genesisFormat);
        this.editor._setStatus('Patch-Vorschau angezeigt (Fallback)', 'info');
      } else {
        console.warn('[DEBUG] Three.js Manager nicht initialisiert');
        this.editor._setStatus('3D-Visualisierung nicht verfügbar', 'info');
      }
    } catch (error) {
      console.error('[DEBUG] Fehler in _updatePatchPreview:', error);
      this.editor._setStatus('Fehler bei der Patch-Vorschau: ' + error.message, 'error');
    }
  }

  /**
   * Visualisiert einen einzelnen Patch
   * @param {Object} patch - Der zu visualisierende Patch
   * @param {Object} options - Optionen für die Visualisierung
   */
  async visualizePatch(patch, options = {}) {
    try {
      if (!this.editor.patchVisualizer) {
        this.editor._setStatus('Patch-Visualizer nicht initialisiert', 'error');
        return;
      }
      
      if (!this.editor.worldId) {
        this.editor._setStatus('Keine World ID für Patch-Visualisierung', 'error');
        return;
      }
      
      // Lade die Genesis-Welt
      const genesisData = await this.editor.previewRenderer._getCurrentGenesisData();
      if (!genesisData) {
        this.editor._setStatus('Konnte Genesis-Daten nicht laden', 'error');
        return;
      }
      
      // Visualisiere den Patch
      const result = await this.editor.patchVisualizer.visualizePatches(
        genesisData,
        [patch],
        options
      );
      
      this.editor._setStatus(`Patch visualisiert: ${result.appliedPatches} Patches angewendet`, 'success');
      return result;
    } catch (error) {
      console.error('Fehler bei der Patch-Visualisierung:', error);
      this.editor._setStatus('Fehler bei der Visualisierung: ' + error.message, 'error');
    }
  }

  /**
   * Visualisiert mehrere Patches
   * @param {Array} patches - Die zu visualisierenden Patches
   * @param {Object} options - Optionen für die Visualisierung
   */
  async visualizePatches(patches, options = {}) {
    try {
      if (!this.editor.patchVisualizer) {
        this.editor._setStatus('Patch-Visualizer nicht initialisiert', 'error');
        return;
      }
      
      if (!this.editor.worldId) {
        this.editor._setStatus('Keine World ID für Patch-Visualisierung', 'error');
        return;
      }
      
      // Lade die Genesis-Welt
      const genesisData = await this.editor.previewRenderer._getCurrentGenesisData();
      if (!genesisData) {
        this.editor._setStatus('Konnte Genesis-Daten nicht laden', 'error');    
        return;
      }
      
      // Visualisiere die Patches
      const result = await this.editor.patchVisualizer.visualizePatches(
        genesisData,
        patches,
        options
      );
      
      this.editor._setStatus(`${result.appliedPatches} Patches visualisiert`, 'success');
      return result;
    } catch (error) {
      console.error('Fehler bei der Patch-Visualisierung:', error);
      this.editor._setStatus('Fehler bei der Visualisierung: ' + error.message, 'error');
    }
  }

  /**
   * Setzt die Patch-Visualisierung zurück
   */
  async resetPatchVisualization() {
    try {
      if (!this.editor.patchVisualizer) {
        this.editor._setStatus('Patch-Visualizer nicht initialisiert', 'error');
        return;
      }
      
      this.editor.patchVisualizer.resetVisualization();
      this.editor._setStatus('Patch-Visualisierung zurückgesetzt', 'success');    
    } catch (error) {
      console.error('Fehler beim Zurücksetzen der Patch-Visualisierung:', error);
      this.editor._setStatus('Fehler: ' + error.message, 'error');
    }
  }

  /**
   * Aktualisiert die Pulsier-Animationen für Konflikt-Materialien
   */
  updatePatchVisualizationAnimations() {
    try {
      if (this.editor.patchVisualizer) {
        this.editor.patchVisualizer.updatePulsingAnimations();
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Patch-Visualisierungs-Animationen:', error);
    }
  }

  /**
   * Gibt Informationen über die aktuelle Patch-Visualisierung zurück
   * @returns {Object} - Informationen über die aktuelle Patch-Visualisierung
   */
  getPatchVisualizationInfo() {
    try {
      if (this.editor.patchVisualizer) {
        return this.editor.patchVisualizer.getPatchInfo();
      }
      return {
        patchCount: 0,
        highlightedEntities: 0,
        hasConflicts: false
      };
    } catch (error) {
      console.error('Fehler beim Abrufen der Patch-Visualisierungs-Informationen:', error);
      return {
        patchCount: 0,
        highlightedEntities: 0,
        hasConflicts: false
      };
    }
  }
}