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
      
      // Initialisiere die Patch-UI
      this.editor.patchUI = new PatchUI({
        worldId: this.editor.worldId,
        patchKit: this.editor.patchKit,
        container: document.getElementById('patch-list-container')
      });
      
      console.log('[DEBUG] Patch-UI initialisiert');
    } catch (error) {
      console.error('Fehler bei der Initialisierung der Patch-UI:', error);
      this.editor._setStatus('Patch-UI Initialisierung fehlgeschlagen: ' + error.message, 'error');
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
      
      if (worldTab && patchTab && worldEditor && patchEditor) {
        if (tabName === 'world') {
          worldTab.classList.add('active');
          patchTab.classList.remove('active');
          worldEditor.style.display = 'block';
          patchEditor.style.display = 'none';
          this.editor.textarea = this.editor.worldTextarea;
        } else if (tabName === 'patch') {
          worldTab.classList.remove('active');
          patchTab.classList.add('active');
          worldEditor.style.display = 'none';
          patchEditor.style.display = 'block';
          this.editor.textarea = this.editor.patchTextarea;
        }
      }
      
      // Aktualisiere die Vorschau basierend auf dem aktiven Tab
      if (tabName === 'world') {
        const obj = this.editor.yamlProcessor.parseYaml();
        if (obj) {
          const normalized = this.editor.yamlProcessor.normalizeUserYaml(obj);
          this.editor.previewRenderer.updatePreviewFromObject(normalized);
        }
      } else if (tabName === 'patch') {
        const obj = this.editor.yamlProcessor.parseYaml();
        if (obj) {
          const normalizedPatch = this.editor.yamlProcessor.normalizePatchYaml(obj);
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
      let errorText = 'Validierungsfehler:\n';
      for (const error of errors) {
        errorText += `- ${error.message || error}\n`;
        
        // Füge den Pfad hinzu, falls vorhanden
        if (error.path) {
          errorText += `  Pfad: ${error.path}\n`;
        }
        
        // Füge den Wert hinzu, falls vorhanden
        if (error.value !== undefined) {
          errorText += `  Wert: ${JSON.stringify(error.value)}\n`;
        }
      }
      
      container.textContent = errorText;
    } catch (e) {
      console.error('Fehler beim Anzeigen der Validierungsfehler:', e);
    }
  }

  /**
   * Aktualisiert die Patch-Liste in der UI
   */
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