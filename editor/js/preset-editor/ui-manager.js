/**
 * UI Manager Module
 * Verwaltung der UI-Elemente, Tabs, Validierungsfehler und Event-Bindings
 *
 * Dieses Modul ist verantwortlich für die Verwaltung der Benutzeroberfläche im PresetEditor.
 * Es bietet Funktionen zum Wechseln zwischen Tabs, Anzeigen von Validierungsfehlern,
 * Aktualisieren der UI-Elemente und Verwalten von Benutzereingaben.
 *
 * @example
 * // UI-Manager initialisieren
 * const uiManager = new UIManager(editor);
 *
 * // Tab wechseln
 * uiManager.switchTab('world');
 *
 * // Validierungsfehler anzeigen
 * uiManager._setValidationErrorsUI(errors, rawYaml);
 *
 * // UI-Zustand aktualisieren
 * uiManager.updateUIState();
 */
export class UIManager {
  /**
   * Erstellt eine neue UIManager-Instanz
   * @param {PresetEditor} editor - Die PresetEditor-Instanz
   */
  constructor(editor) {
    this.editor = editor;
  }

  /**
   * Initialisiert die Patch-UI
   * Importiert die PatchUI-Klasse und erstellt eine neue Instanz
   */
  async _initPatchUI() {
    try {
      // Importiere die PatchUI
      const { PatchUI } = await import('../patch-ui.js');
      
      // Initialisiere die Patch-UI zeige Liste der Patches an
      this.editor.patchUI = new PatchUI({
        worldId: this.editor.worldId,
        patchKit: this.editor.patchKit,
        container: document.getElementById('patch-list-container'),
        editor: this.editor
      });
      // Fallback: sicherstellen, dass die Editor-Referenz gesetzt ist
      if (this.editor.patchUI && typeof this.editor.patchUI.setEditor === 'function') {
        this.editor.patchUI.setEditor(this.editor);
      }
      console.log('[DEBUG] Patch-UI initialisiert');
      //if patch-list is not empty
      if (document.querySelector('#patch-list-container .patch-list-content').childElementCount > 0) {
        document.getElementById('patch-list-container').classList.remove('hidden');
      }
    } catch (error) {
      console.error('Fehler bei der Initialisierung der Patch-UI:', error);
      this.editor._setStatus('Patch-UI Initialisierung fehlgeschlagen: ' + error.message, 'error');
    }
  }

  /**
   * Initialisiert Interaktions-Controls (Modus/Objekttyp) am Preview-Header
   * - Mode: none | place_object | path_add | path_finish | path_cancel
   * - Object-Type: nur sichtbar bei place_object
   */
  initInteractionControls() {
    try {
      // Container neben/über dem Canvas platzieren
      let container = document.getElementById('preview-interaction-controls');
      if (!container) {
        container = document.createElement('div');
        container.id = 'preview-interaction-controls';
        container.style.display = 'flex';
        container.style.gap = '8px';
        container.style.alignItems = 'center';
        container.style.padding = '6px 8px';
        container.style.background = '#1e1e1e';
        container.style.borderBottom = '1px solid #333';
        container.style.fontSize = '12px';
        // Versuche über dem Canvas-Container einzuhängen
        const canvasContainer = document.querySelector('#preview-controls') || this.editor.canvas?.parentElement;
        if (canvasContainer && canvasContainer.parentElement) {
          // insert container in canvasContainer
          canvasContainer.appendChild(container);
        } else {
          // Fallback: am Body
          document.body.prepend(container);
        }
      } else {
        container.innerHTML = '';
      }

      // Label
      const label = document.createElement('span');
      label.textContent = 'Interaktion:';
      label.style.opacity = '0.8';

      // Mode Select
      const modeSelect = document.createElement('select');
      modeSelect.id = 'interactionMode';
      modeSelect.style.padding = '3px 6px';
      const modes = [
        { v: 'none', t: 'None' },
        { v: 'place_object', t: 'Place Object' },
        { v: 'path_add', t: 'Path (Add Points)' },
        { v: 'path_finish', t: 'Path (Finish)' },
        { v: 'path_cancel', t: 'Path (Cancel)' }
      ];
      modes.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.v;
        opt.textContent = m.t;
        modeSelect.appendChild(opt);
      });

      // Object-Type Select
      const typeSelect = document.createElement('select');
      typeSelect.id = 'objectType';
      typeSelect.style.padding = '3px 6px';
      typeSelect.style.display = 'none';
      // Vorläufige Liste aus vorhandenen Presets
      const types = [
        'tree_simple',
        'rock_small',
        'mushroom_small',
        'crystal',
        'stone_circle_thin',
        'bookshelf',
        'village'
      ];
      types.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        typeSelect.appendChild(opt);
      });

      // Events binden
      modeSelect.addEventListener('change', async () => {
        this.editor.interactionMode = modeSelect.value;
        // Object-Select nur bei place_object zeigen
        typeSelect.style.display = this.editor.interactionMode === 'place_object' ? 'inline-block' : 'none';

        // Sofortaktionen für Path
        if (this.editor.interactionMode === 'path_finish') {
          await this.editor._finishPathFromUI();
          // Zurück auf Add-Mode oder None?
          this.editor.interactionMode = 'none';
          modeSelect.value = 'none';
          typeSelect.style.display = 'none';
        } else if (this.editor.interactionMode === 'path_cancel') {
          this.editor._cancelPathFromUI();
          this.editor.interactionMode = 'none';
          modeSelect.value = 'none';
          typeSelect.style.display = 'none';
        }
      });

      typeSelect.addEventListener('change', () => {
        this.editor.selectedObjectType = typeSelect.value;
      });

      // Initialwerte übernehmen
      modeSelect.value = this.editor.interactionMode || 'none';
      typeSelect.value = this.editor.selectedObjectType || 'tree_simple';
      typeSelect.style.display = (this.editor.interactionMode === 'place_object') ? 'inline-block' : 'none';

      // Einhängen
      container.appendChild(label);
      container.appendChild(modeSelect);
      container.appendChild(typeSelect);
    } catch (e) {
      console.error('Fehler beim Erzeugen der Interaktions-Controls:', e);
    }
  }

  /**
   * Bindet Event-Listener für Tab-Wechsel
   */
  _bindTabEvents() {
    // Tab-Wechsel-Event-Listener
    const worldTab = document.getElementById('world-tab');
    const patchTab = document.getElementById('patch-tab');
    
    if (worldTab) {
      worldTab.addEventListener('click', () => this.switchTab('world'));
    }
    
    if (patchTab) {
      patchTab.addEventListener('click', () => this.switchTab('patch'));
    }
  }

  /**
   * Bindet Event-Listener für Patch-Visualisierungs-Optionen
   */
  _bindPatchVisualizationEvents() {
    // Event-Listener für Patch-Visualisierungs-Optionen
    const highlightChangesCheckbox = document.getElementById('highlight-changes');
    const showConflictsCheckbox = document.getElementById('show-conflicts');
    const resetVisualizationBtn = document.getElementById('reset-visualization');
    
    if (highlightChangesCheckbox) {
      highlightChangesCheckbox.addEventListener('change', (e) => {
        if (this.editor.patchVisualizer) {
          this.editor.patchVisualizer.setHighlightChanges(e.target.checked);
        }
      });
    }
    
    if (showConflictsCheckbox) {
      showConflictsCheckbox.addEventListener('change', (e) => {
        if (this.editor.patchVisualizer) {
          this.editor.patchVisualizer.setShowConflicts(e.target.checked);
        }
      });
    }
    
    if (resetVisualizationBtn) {
      resetVisualizationBtn.addEventListener('click', () => {
        if (this.editor.patchVisualizer) {
          this.editor.patchVisualizer.resetVisualization();
        }
      });
    }
  }

  /**
   * Wechselt den aktiven Tab
   * @param {string} tabName - Der Name des Tabs ('world' oder 'patch')
   */
  switchTab(tabName) {
    try {
      // Aktualisiere den aktiven Tab
      this.editor.activeTab = tabName;
      
      // Aktualisiere die Tab-UI
      const worldTab = document.getElementById('world-tab');
      const patchTab = document.getElementById('patch-tab');
      const worldEditor = document.getElementById('world-editor');
      const patchEditor = document.getElementById('patch-editor');
      const savePatchBtn = document.getElementById('savePatchBtn');
      const saveGenesisBtn = document.getElementById('saveGenesisBtn');
      
      if (worldTab && patchTab && worldEditor && patchEditor) {
        const newWorldBtn = document.getElementById('newWorldBtn');
        const newPatchBtn = document.getElementById('newPatchBtn');

        if (tabName === 'world') {
          worldTab.classList.add('active');
          patchTab.classList.remove('active');
          worldEditor.style.display = 'flex';
          patchEditor.style.display = 'none';
          this.editor.textarea = this.editor.worldTextarea;
          // Buttons: im Welt-Tab Genesis speichern sichtbar, Patch speichern ausblenden
          if (savePatchBtn) savePatchBtn.style.display = 'none';
          if (saveGenesisBtn) saveGenesisBtn.style.display = 'inline-block';
          // Neuen-World-Button zeigen, NewPatch ausblenden
          if (newWorldBtn) newWorldBtn.style.display = 'inline-block';
          if (newPatchBtn) newPatchBtn.style.display = 'none';
        
        } else if (tabName === 'patch') {
          worldTab.classList.remove('active');
          patchTab.classList.add('active');
          worldEditor.style.display = 'none';
          patchEditor.style.display = 'flex';
          this.editor.textarea = this.editor.patchTextarea;
          // Buttons: im Patch-Tab Patch speichern sichtbar, Genesis speichern optional ausblenden
          if (savePatchBtn) savePatchBtn.style.display = 'inline-block';
          if (saveGenesisBtn) saveGenesisBtn.style.display = 'none';
          // Neuen-Patch-Button zeigen, NewWorld ausblenden
          if (newWorldBtn) newWorldBtn.style.display = 'none';
          if (newPatchBtn) newPatchBtn.style.display = 'inline-block';
        }
      }
      
      // Aktualisiere die Vorschau basierend auf dem aktiven Tab
      if (tabName === 'world') {
        const obj = this.editor.yamlProcessor.parseYaml();
        if (obj) {
          const normalized = this.editor.yamlProcessor.normalizeUserYaml(obj);
          this.editor.renderWorldPreview();
          // this.editor.previewRenderer.updatePreviewFromObject(normalized);
        }
      } else if (tabName === 'patch') {
        const obj = this.editor.yamlProcessor.parseYaml();
        if (obj) {
          const normalizedPatch = this.editor.yamlProcessor.normalizePatchYaml(obj);
          // targets_world für Validierung/Vorschau setzen
          try {
            if (normalizedPatch && normalizedPatch.metadata && this.editor.worldId) {
              normalizedPatch.metadata.targets_world = this.editor.worldId;
            }
          } catch {}
          this.editor.patchManager._updatePatchPreview(normalizedPatch);
        }
      }
    } catch (error) {
      console.error('Fehler beim Tab-Wechsel:', error);
      this.editor._setStatus('Tab-Wechsel fehlgeschlagen: ' + error.message, 'error');
    }
  }

  /**
   * Aktualisiert den Namen des Patch-Tabs
   * @param {string} name - Der neue Tab-Name
   */
  _updatePatchTabName(name) {
    try {
      const patchTab = document.getElementById('patch-tab');
      if (patchTab) {
        patchTab.textContent = name || 'Patch';
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Tab-Namens:', error);
    }
  }

  /**
   * Zeigt Validierungsfehler in der UI an
   * @param {Array} errors - Die Validierungsfehler
   * @param {string} rawYaml - Der rohe YAML-Text
   */
  _setValidationErrorsUI(errors, rawYaml) {
    try {
      let container = document.getElementById('preview-errors');
      if (!container) {
        const anchor = this.editor.statusEl || document.body;
        container = document.createElement('div');
        container.id = 'preview-errors';
        container.style.whiteSpace = 'pre-wrap';
        container.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
        container.style.fontSize = '12px';
        container.style.marginTop = '6px';
        container.style.borderLeft = '3px solid #f44336';
        container.style.padding = '6px 8px';
        container.style.background = '#1e1e1e';
        anchor?.parentElement?.appendChild(container);
      }
      
      if (!errors || errors.length === 0) {
        container.style.display = 'none';
        container.textContent = '';
        return;
      }
      
      // Zeige die Fehler an
      container.style.display = 'block';
      
      // Erstelle eine lesbare Fehlermeldung
      let errorText = 'Validierungsfehler:\n\n';
      for (const error of errors) {
        // Nutze JSON.stringify für eine detaillierte, lesbare Ausgabe des Fehlerobjekts
        errorText += `${JSON.stringify(error, null, 2)}\n\n`;
      }
      
      container.textContent = errorText;
    } catch (e) {
      console.error('Fehler beim Anzeigen der Validierungsfehler:', e);
    }
  }

  
  /**
   * Aktualisiert die Patch-Liste in der UI
   */
  async updatePatchList() {
    try {
      if (!this.editor.patchUI) {
        console.warn('Patch-UI nicht initialisiert, überspringe Aktualisierung der Patch-Liste');
        return;
      }
      await this.editor.patchUI.load(this.editor.worldId);
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Patch-Liste:', error);
      this.editor._setStatus('Fehler beim Aktualisieren der Patch-Liste: ' + error.message, 'error');
    }
  }

  /**
   * Zeigt einen Toast an
   * @param {string} type - Der Typ des Toasts (success, error, info, warning)
   * @param {string} message - Die Nachricht des Toasts
   */
  /**
   * Zeigt einen Toast an
   * @param {string} type - Der Typ des Toasts (success, error, info, warning)
   * @param {string} message - Die Nachricht des Toasts
   */
  showToast(type, message) {
    try {
      if (window.showToast) {
        window.showToast(type, message);
      } else {
        // Fallback: Einfache Konsolenausgabe
        console.log(`[${type.toUpperCase()}] ${message}`);
      }
    } catch (error) {
      console.error('Fehler beim Anzeigen des Toasts:', error);
    }
  }

  /**
   * Zeigt einen Bestätigungsdialog an
   * @param {string} message - Die Nachricht des Dialogs
   * @returns {boolean} - True, wenn der Benutzer bestätigt hat, sonst False
   */
  /**
   * Zeigt einen Bestätigungsdialog an
   * @param {string} message - Die Nachricht des Dialogs
   * @returns {boolean} - True, wenn der Benutzer bestätigt hat, sonst False
   */
  showConfirmDialog(message) {
    try {
      return confirm(message);
    } catch (error) {
      console.error('Fehler beim Anzeigen des Bestätigungsdialogs:', error);
      return false;
    }
  }

  /**
   * Zeigt einen Eingabedialog an
   * @param {string} message - Die Nachricht des Dialogs
   * @param {string} defaultValue - Der Standardwert der Eingabe
   * @returns {string|null} - Die Eingabe des Benutzers oder null bei Abbruch
   */
  /**
   * Zeigt einen Eingabedialog an
   * @param {string} message - Die Nachricht des Dialogs
   * @param {string} defaultValue - Der Standardwert der Eingabe
   * @returns {string|null} - Die Eingabe des Benutzers oder null bei Abbruch
   */
  showInputDialog(message, defaultValue = '') {
    try {
      return prompt(message, defaultValue);
    } catch (error) {
      console.error('Fehler beim Anzeigen des Eingabedialogs:', error);
      return null;
    }
  }

  /**
   * Aktualisiert den Status der UI-Elemente basierend auf dem aktuellen Zustand
   */
  updateUIState() {
    try {
      // Aktualisiere den World-ID-Input
      const worldIdInput = document.getElementById('worldIdInput');
      if (worldIdInput) {
        worldIdInput.value = this.editor.worldId || '';
      }
      
      // Aktualisiere den Save-Button
      const saveBtn = document.getElementById('saveGenesisBtn');
      if (saveBtn) {
        saveBtn.disabled = !this.editor.worldId;
      }
      
      // Aktualisiere den Patch-Tab
      const patchTab = document.getElementById('patch-tab');
      if (patchTab) {
        patchTab.disabled = !this.editor.worldId;
      }
      
      // Aktualisiere die Patch-Buttons
      const savePatchBtn = document.getElementById('savePatchBtn');
      const newPatchBtn = document.getElementById('newPatchBtn');
      
      if (savePatchBtn) {
        savePatchBtn.disabled = !this.editor.worldId;
      }
      
      if (newPatchBtn) {
        newPatchBtn.disabled = !this.editor.worldId;
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren des UI-Zustands:', error);
    }
  }
}