/**
 * PresetEditor: YAML-Handling, Status-Updates, einfache Render-Hooks
 * Voraussetzungen:
 * - js-yaml via CDN (global jsyaml)
 * - Ajv via CDN (global ajv2020)
 * - PatchKit: ESM-Factory (createApi) ODER bereits fertiges API-Objekt
 * - showToast/escapeHtml aus ./toast.js
 */
 
import { createPatchKitAPI } from './patchkit-wiring.js';
import { PatchUI } from './patch-ui.js';
import { ThreeJSManager } from './three-js-manager.js';
import { PatchVisualizer } from './patch-visualizer.js';
 
export class PresetEditor {
  constructor(opts = {}) {
    this.textarea = opts.textarea || document.getElementById('world-yaml-editor');
    this.statusEl = opts.statusEl || document.getElementById('status-bar');
    this.canvas = opts.canvas || document.getElementById('preview-canvas');
    this.nostrFactory = opts.nostrFactory || window.NostrServiceFactory;
    this.worldId = null;
    this.patchKit = null;
    this.scene = null; // Platzhalter für Three.js-Szene
    this.threeJSManager = null; // Three.js Manager für 3D-Visualisierung
    this.patchVisualizer = null; // Patch-Visualisierer für die Patch-Darstellung
    
    // Tab-System Eigenschaften
    this.activeTab = 'world'; // 'world' oder 'patch'
    this.currentPatchId = null;
    this.worldYamlText = '';
    this.patchYamlText = '';
    
    this._bindBasicEvents();

    // Live-Validierung bei Eingabe + Preview-Update
    const ta = this.textarea;
    let vTimer = null;
    ta?.addEventListener('input', () => {
      clearTimeout(vTimer);
      vTimer = setTimeout(async () => {
        try {
          const raw = this.getYamlText();
          const obj = this.parseYaml();
          if (!obj) return;
          const normalized = this.normalizeUserYaml(obj);
          const res = this.patchKit?.genesis?.validate
            ? await this.patchKit.genesis.validate(normalized)
            : { valid: true, errors: [] };
          const valid = res?.valid === true || res === true;
          if (valid) {
            this._setStatus('YAML gültig', 'success');
            this._setValidationErrorsUI([]);
            await this.updatePreviewFromObject(normalized);
          } else {
            const errors = Array.isArray(res?.errors) ? res.errors : [];
            this._setStatus('YAML ungültig – Details unten.', 'error');
            this._setValidationErrorsUI(errors, raw);
          }
        } catch (e) {
          console.error('[YAML Live-Validation] Fehler:', e);
          this._setStatus('YAML ungültig – Details unten.', 'error');
        }
      }, 300);
    });
  }
 
  async init() {
    try {
      if (!this.nostrFactory) throw new Error('NostrServiceFactory nicht gefunden.');
      // Factory kann create() oder getNostrService() anbieten; unterstüte beides
      let nostrService = null;
      if (typeof this.nostrFactory.create === 'function') {
        nostrService = this.nostrFactory.create();
      } else if (typeof this.nostrFactory.getNostrService === 'function') {
        const maybe = this.nostrFactory.getNostrService();
        nostrService = (maybe && typeof maybe.then === 'function') ? await maybe : maybe;
      } else {
        // Versuche direkten Service auf window.NostrService
        nostrService = (typeof window !== 'undefined' && window.NostrService) ? window.NostrService : null;
      }
      if (!nostrService) throw new Error('Kein NostrService aus Factory verfügbar (weder create() noch getNostrService()).');
      // Merke Service für spätere Identitätsabfragen
      this.nostrService = nostrService;

      // 1) Erzeuge Basis-API via Wiring (liefert Namespaces + io-Ports)
      const wiredApi = await createPatchKitAPI(nostrService);
      // make sure io facade provides direct helpers
      this.patchKit = wiredApi;

      // Debug: zeigen, welche Validator-Funktion tatsächlich verwendet wird
      try {
        const hasValidate = typeof this.patchKit?.genesis?.validate === 'function';
        console.log('[Validator] verfügbar?', hasValidate, this.patchKit?.genesis?.validate);
      } catch {}

      // 2) Versuche, PatchKit via ESM zu importieren, um ggf. eine Factory zu bekommen
      let PK = null;
      try {
        const mod = await import('../../libs/patchkit/index.js');
        PK = mod?.default ?? mod;
      } catch (e) {
        // Falls Import fehlschlägt, ist wiredApi weiterhin nutzbar (enthält Namespaces)
        console.warn('PresetEditor: ESM-Import von PatchKit fehlgeschlagen, nutze wiredApi-Namespaces. Grund:', e);
      }

      // 3) Bestimme finale API:
      const hasFactory = PK && typeof PK.createApi === 'function';
      const isReadyApi = PK && PK.genesis && PK.patch && PK.world;

      if (hasFactory) {
        console.log('PresetEditor: Nutze PatchKit.createApi({ ajv, io })');
        const apiFromFactory = await PK.createApi({
          ajv: typeof window !== 'undefined' ? window.ajv2020 : undefined,
          io: wiredApi?.io
        });
        this.patchKit = apiFromFactory || wiredApi;
      } else if (isReadyApi) {
        console.log('PresetEditor: Nutze PatchKit-API aus Modul-Export und ergänze IO-Ports aus wiring');
        this.patchKit = { ...PK, io: wiredApi?.io || PK.io };
      } else {
        console.warn('PresetEditor: Weder Factory noch fertiges API im Modul-Export gefunden – nutze wiredApi.');
        this.patchKit = wiredApi;
      }

      // 4) Minimal-Validierung der resultierenden API
      const ok = this.patchKit && this.patchKit.genesis && this.patchKit.patch && this.patchKit.world;
      if (!ok) {
        console.error('PresetEditor: PatchKit-API unvollständig:', this.patchKit);
        throw new Error('PatchKit API nicht verfügbar (Ajv/IO prüfen).');
      }

      // 5) Three.js Preview initialisieren
      await this._initThreePreview();
      
      // 6) Patch-Visualizer initialisieren
      await this._initPatchVisualizer();
      
      // 7) Patch-UI initialisieren
      await this._initPatchUI();

      this._setStatus('Bereit.', 'info');
    } catch (err) {
      this._setStatus('Fehler bei Initialisierung: ' + err.message, 'error');
    }
  }
 
  _bindBasicEvents() {
    const btnValidate = document.getElementById('btn-validate');
    if (btnValidate) btnValidate.addEventListener('click', () => this.validateYaml());
 
    const btnSave = document.getElementById('btn-save');
    if (btnSave) btnSave.addEventListener('click', () => this.saveCurrent());
 
    const btnLoad = document.getElementById('btn-load');
    if (btnLoad) btnLoad.addEventListener('click', () => this.loadByWorldIdPrompt());
    
    // Buttons aus world-editor.html
    const newWorldBtn = document.getElementById('newWorldBtn');
    if (newWorldBtn) newWorldBtn.addEventListener('click', () => this.createNewWorld());
    
    const loadWorldBtn = document.getElementById('loadWorldBtn');
    if (loadWorldBtn) loadWorldBtn.addEventListener('click', () => this.loadWorldByIdFromInput());
    
    const saveGenesisBtn = document.getElementById('saveGenesisBtn');
    if (saveGenesisBtn) saveGenesisBtn.addEventListener('click', () => this.saveCurrent());
    
    const savePatchBtn = document.getElementById('savePatchBtn');
    if (savePatchBtn) savePatchBtn.addEventListener('click', () => this.saveAsPatch());
    
    // Render-Button
    const renderBtn = document.getElementById('renderBtn');
    if (renderBtn) renderBtn.addEventListener('click', () => this.renderWorld());
    
    // Reset-Button
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) resetBtn.addEventListener('click', () => this.resetWorld());
    
    // Tab-System Event-Listener
    this._bindTabEvents();
    
    // Patch-Visualisierungs-Event-Listener
    this._bindPatchVisualizationEvents();
    
    // Fenstergrößenänderung behandeln
    window.addEventListener('resize', () => this._handleWindowResize());
  }
  
  _bindTabEvents() {
    // Tab-Buttons
    const worldTabBtn = document.getElementById('worldTabBtn');
    const patchTabBtn = document.getElementById('patchTabBtn');
    
    if (worldTabBtn) {
      worldTabBtn.addEventListener('click', () => this.switchTab('world'));
    }
    
    if (patchTabBtn) {
      patchTabBtn.addEventListener('click', () => this.switchTab('patch'));
    }
    
    // Neuen Patch erstellen Button
    const newPatchBtn = document.getElementById('newPatchBtn');
    if (newPatchBtn) {
      newPatchBtn.addEventListener('click', () => this.createNewPatch());
    }
  }
  
  _bindPatchVisualizationEvents() {
    // Toggle-Button für Patch-Visualisierung
    const toggleBtn = document.getElementById('togglePatchVisualization');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this._togglePatchVisualization());
    }
    
    // Visualisierungsmodus
    const visualizationMode = document.getElementById('visualizationMode');
    if (visualizationMode) {
      visualizationMode.addEventListener('change', () => this._updateVisualizationMode());
    }
    
    // Animationsmodus
    const animationMode = document.getElementById('animationMode');
    if (animationMode) {
      animationMode.addEventListener('change', () => this._updateAnimationMode());
    }
    
    // Animationsgeschwindigkeit
    const animationSpeed = document.getElementById('animationSpeed');
    if (animationSpeed) {
      animationSpeed.addEventListener('input', () => this._updateAnimationSpeed());
    }
    
    // Transparenz
    const transparency = document.getElementById('transparency');
    if (transparency) {
      transparency.addEventListener('input', () => this._updateTransparency());
    }
    
    // Aktions-Buttons
    const startAnimation = document.getElementById('startAnimation');
    if (startAnimation) {
      startAnimation.addEventListener('click', () => this._startVisualizationAnimation());
    }
    
    const resetVisualization = document.getElementById('resetVisualization');
    if (resetVisualization) {
      resetVisualization.addEventListener('click', () => this._resetVisualization());
    }
    
    const focusOnChanges = document.getElementById('focusOnChanges');
    if (focusOnChanges) {
      focusOnChanges.addEventListener('click', () => this._focusOnChanges());
    }
  }
 
  _setStatus(msg, type = 'info') {
    // zentrale Statusbar
    if (this.statusEl) this.statusEl.textContent = msg;
    // if (window.showToast) window.showToast(type, msg);
    // Fehlerbereich zurücksetzen, wenn kein Fehler
    try {
      let container = document.getElementById('preview-errors');
      if (!container) {
        const anchor = this.statusEl || document.body;
        container = document.createElement('div');
        container.id = 'preview-errors';
        container.style.whiteSpace = 'pre-wrap';
        container.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
        container.style.fontSize = '12px';
        container.style.marginTop = '6px';
        container.style.borderLeft = '3px solid #f44336';
        container.style.padding = '6px 8px';
        container.style.background = '#1e1e1e';
        container.style.display = 'none';
        anchor?.parentElement?.appendChild(container);
      }
      if (type !== 'error') {
        container.style.display = 'none';
        container.textContent = '';
      }
    } catch {}
  }
 
  getYamlText() {
    return this.textarea ? this.textarea.value : '';
  }
 
  setYamlText(text) {
    if (this.textarea) this.textarea.value = text;
  }
  
  // Tab-System Methoden
  switchTab(tabType) {
    if (this.activeTab === tabType) return;
    
    // Speichere den aktuellen Inhalt des aktiven Tabs
    if (this.activeTab === 'world') {
      this.worldYamlText = this.getYamlText();
    } else if (this.activeTab === 'patch') {
      this.patchYamlText = this.getYamlText();
    }
    
    // Wechsle den Tab
    this.activeTab = tabType;
    
    // Aktualisiere die UI
    this._updateTabUI();
    
    // Lade den Inhalt des neuen Tabs
    if (tabType === 'world') {
      this.setYamlText(this.worldYamlText);
      this._setStatus('Welt-Editor aktiv', 'info');
    } else if (tabType === 'patch') {
      this.setYamlText(this.patchYamlText);
      this._setStatus('Patch-Editor aktiv', 'info');
    }
  }
  
  _updateTabUI() {
    // Tab-Buttons aktualisieren
    const worldTabBtn = document.getElementById('worldTabBtn');
    const patchTabBtn = document.getElementById('patchTabBtn');
    
    if (worldTabBtn) {
      worldTabBtn.classList.toggle('active', this.activeTab === 'world');
    }
    
    if (patchTabBtn) {
      patchTabBtn.classList.toggle('active', this.activeTab === 'patch');
    }
    
    // Tab-Inhalte aktualisieren
    const worldTabContent = document.getElementById('worldTabContent');
    const patchTabContent = document.getElementById('patchTabContent');
    
    if (worldTabContent) {
      worldTabContent.style.display = this.activeTab === 'world' ? 'block' : 'none';
    }
    
    if (patchTabContent) {
      patchTabContent.style.display = this.activeTab === 'patch' ? 'block' : 'none';
    }
    
    // Save-Buttons aktualisieren
    const saveGenesisBtn = document.getElementById('saveGenesisBtn');
    const savePatchBtn = document.getElementById('savePatchBtn');
    
    if (saveGenesisBtn) {
      saveGenesisBtn.style.display = this.activeTab === 'world' ? 'inline-block' : 'none';
    }
    
    if (savePatchBtn) {
      savePatchBtn.style.display = this.activeTab === 'patch' ? 'inline-block' : 'none';
    }
    
    // Patch-Container aktualisieren
    const patchUIContainer = document.getElementById('patchUIContainer');
    if (patchUIContainer) {
      patchUIContainer.style.display = this.activeTab === 'patch' ? 'block' : 'none';
    }
  }
  
  async createNewPatch() {
    try {
      if (!this.worldId) {
        this._setStatus('Keine World ID gesetzt. Bitte laden oder erstellen Sie zuerst eine Welt.', 'error');
        return;
      }
      
      // Erstelle einen leeren Patch
      this.currentPatchId = 'patch_' + Math.random().toString(36).slice(2, 10);
      
      // Setze einen leeren YAML-Content im Editor
      const yamlEditor = document.getElementById('patch-yaml-editor');
      if (yamlEditor) {
        yamlEditor.value = `# Neuer Patch
name: "Neuer Patch"
description: "Beschreibung hier einfügen"

# Fügen Sie hier Ihre Operationen hinzu
# Beispiel:
# operations:
#   - type: add
#     entity_type: object
#     entity_id: new_object
#     payload:
#       kind: "tree"
#       position: [0, 0, 0]
#       scale: [1, 1, 1]
#       color: "#1a4a1a"
`;
      }
      
      // Wechsle zum Patch-Tab
      this.switchTab('patch');
      
      // Aktualisiere die Patch-UI, falls vorhanden
      if (this.patchUI) {
        try {
          await this.patchUI.load(this.worldId);
        } catch (error) {
          console.warn('Konnte Patch-Liste nicht aktualisieren:', error);
        }
      }
      
      if (window.showToast) window.showToast('success', 'Neuer Patch erstellt');
      this._setStatus('Neuer Patch erstellt', 'success');
    } catch (e) {
      console.error(e);
      if (window.showToast) window.showToast('error', 'Patch-Erstellung fehlgeschlagen: ' + e.message);
      this._setStatus('Patch-Erstellung fehlgeschlagen: ' + e.message, 'error');
    }
  }
  
  /**
   * Bearbeitet einen vorhandenen Patch
   * @param {string} patchId - Die ID des zu bearbeitenden Patches
   */
  async editPatch(patchId) {
    try {
      if (!this.worldId) {
        this._setStatus('Keine World ID gesetzt. Bitte laden oder erstellen Sie zuerst eine Welt.', 'error');
        return;
      }
      
      if (!patchId) {
        this._setStatus('Keine Patch ID angegeben.', 'error');
        return;
      }
      
      // Lade den Patch vom Server
      const patchEvent = await this.patchKit.io?.patchPort?.getById
        ? this.patchKit.io.patchPort.getById(patchId)
        : null;
        
      if (!patchEvent) {
        this._setStatus('Patch nicht gefunden.', 'error');
        return;
      }
      
      // Parse den Patch
      const patch = this.patchKit.patch.parse(patchEvent?.yaml || patchEvent);
      
      // Setze die aktuelle Patch-ID
      this.currentPatchId = patchId;
      
      // Konvertiere den Patch in das benutzerfreundliche YAML-Format
      const yamlText = patchEvent.originalYaml || this._convertPatchToYaml(patch);
      
      // Setze den YAML-Content im Editor
      const yamlEditor = document.getElementById('patch-yaml-editor');
      if (yamlEditor) {
        yamlEditor.value = yamlText;
      }
      
      // Wechsle zum Patch-Tab
      this.switchTab('patch');
      
      // Aktualisiere den Tab-Namen
      this._updatePatchTabName(patch.metadata?.name || 'Patch');
      
      // Visualisiere den Patch, falls der Patch-Visualizer verfügbar ist
      if (this.patchVisualizer) {
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
      this._setStatus('Patch zur Bearbeitung geladen.', 'success');
    } catch (e) {
      console.error(e);
      if (window.showToast) window.showToast('error', 'Patch-Ladung fehlgeschlagen: ' + e.message);
      this._setStatus('Patch-Ladung fehlgeschlagen: ' + e.message, 'error');
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
      return this.serializeYaml(yamlObj);
    } catch (error) {
      console.error('Fehler bei der Konvertierung des Patches zu YAML:', error);
      return '';
    }
  }
  
  /**
   * Löscht einen vorhandenen Patch
   * @param {string} patchId - Die ID des zu löschenden Patches
   */
  async deletePatch(patchId) {
    try {
      if (!patchId) {
        this._setStatus('Keine Patch ID angegeben.', 'error');
        return;
      }
      
      // Bestätigungsdialog anzeigen
      const confirmDelete = confirm('Möchten Sie diesen Patch wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.');
      if (!confirmDelete) {
        this._setStatus('Löschung abgebrochen.', 'info');
        return;
      }
      
      // Lade den Patch vom Server, um zu prüfen, ob der aktuelle Benutzer der Autor ist
      const patchEvent = await this.patchKit.io?.patchPort?.getById
        ? this.patchKit.io.patchPort.getById(patchId)
        : null;
        
      if (!patchEvent) {
        this._setStatus('Patch nicht gefunden.', 'error');
        return;
      }
      
      // Parse den Patch
      const patch = this.patchKit.patch.parse(patchEvent?.yaml || patchEvent);
      
      // Ermittle author_npub aus aktiver Identität
      let author_npub = 'npub0';
      try {
        // Versuche 1: Über den nostrService des Editors
        if (this.nostrService && typeof this.nostrService.getIdentity === 'function') {
          const ident = await this.nostrService.getIdentity();
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
      const isAuthor = patchAuthor === author_npub;
      
      if (!isAuthor) {
        this._setStatus('Sie können nur Ihre eigenen Patches löschen.', 'error');
        return;
      }
      
      // Lösche den Patch
      await this.patchKit.io.patchPort.delete(patchId);
      
      // Setze die aktuelle Patch-ID zurück, wenn der gelöschte Patch gerade bearbeitet wird
      if (this.currentPatchId === patchId) {
        this.currentPatchId = null;
        
        // Setze einen leeren YAML-Content im Editor
        const yamlEditor = document.getElementById('patch-yaml-editor');
        if (yamlEditor) {
          yamlEditor.value = '';
        }
        
        // Aktualisiere den Tab-Namen
        this._updatePatchTabName('Patch');
      }
      
      // Aktualisiere die Patch-UI, falls vorhanden
      if (this.patchUI) {
        try {
          await this.patchUI.load(this.worldId);
        } catch (error) {
          console.warn('Konnte Patch-Liste nicht aktualisieren:', error);
        }
      }
      
      // Setze die Patch-Visualisierung zurück, falls der gelöschte Patch gerade visualisiert wird
      if (this.patchVisualizer) {
        try {
          await this.resetPatchVisualization();
        } catch (error) {
          console.warn('Konnte Patch-Visualisierung nicht zurücksetzen:', error);
        }
      }
      
      if (window.showToast) window.showToast('success', 'Patch gelöscht.');
      this._setStatus('Patch gelöscht.', 'success');
    } catch (e) {
      console.error(e);
      if (window.showToast) window.showToast('error', 'Patch-Löschung fehlgeschlagen: ' + e.message);
      this._setStatus('Patch-Löschung fehlgeschlagen: ' + e.message, 'error');
    }
  }
 
  parseYaml() {
    const text = this.getYamlText();
    if (!text) return null;
    try {
      const doc = jsyaml.load(text);
      return doc || null;
    } catch (e) {
      throw new Error('YAML Parse-Fehler: ' + e.message);
    }
  }
 
  serializeYaml(obj) {
    try {
      return jsyaml.dump(obj, { noRefs: true, lineWidth: 120 });
    } catch (e) {
      throw new Error('YAML Serialize-Fehler: ' + e.message);
    }
  }
 
  stripWorldId(obj) {
    if (obj && typeof obj === 'object' && obj.id) {
      const copy = { ...obj };
      delete copy.id;
      return copy;
    }
    return obj;
  }
 
  validateYaml() {
    try {
      const rawText = this.getYamlText();
      const obj = this.parseYaml();
      if (!obj) {
        this._setStatus('Kein YAML-Inhalt zum Validieren.', 'info');
        return;
      }
      const normalized = this.normalizeUserYaml(this.stripWorldId(obj));
      
      // Prüfe, ob eine Validierungsfunktion verfügbar ist
      if (!this.patchKit || !this.patchKit.genesis || typeof this.patchKit.genesis.validate !== 'function') {
        console.warn('Keine Validierungsfunktion verfügbar, überspringe Validierung');
        this._setStatus('YAML-Validierung nicht verfügbar', 'info');
        this._setValidationErrorsUI([]);
        this.updatePreviewFromObject(normalized);
        return;
      }
      
      const resMaybe = this.patchKit.genesis.validate(normalized);

      const handle = (res) => {
        try {
          const valid = res?.valid === true || res === true;
          // EINZIGER Status: über Statusbar
          if (valid) {
            this._setStatus('YAML gültig', 'success');
            this._setValidationErrorsUI([]);
            this.updatePreviewFromObject(normalized);
          } else {
            const errors = Array.isArray(res?.errors) ? res.errors : [];
            this._setStatus('YAML ungültig', 'error');
            this._setValidationErrorsUI(errors, rawText);
          }
        } catch (e) {
          console.error('[Validator] Handle Exception:', e);
          this._setStatus('Validierungsfehler: ' + e.message, 'error');
        }
      };

      if (resMaybe && typeof resMaybe.then === 'function') {
        resMaybe.then(handle).catch(e => {
          console.error('[Validator] Promise Exception:', e);
          this._setStatus('Validierungsfehler: ' + e.message, 'error');
        });
      } else {
        handle(resMaybe);
      }
    } catch (e) {
      console.error('[Validator] Parse/Normalize Exception:', e);
      this._setStatus('YAML-Parsefehler: ' + e.message, 'error');
    }
  }
 
  async loadByWorldIdPrompt() {
    const id = prompt('World ID eingeben:');
    if (!id) return;
    this.worldId = id;
    await this.loadWorldById(id);
  }
 
  async loadWorldById(id) {
    console.log('🌍 [Integrationstest] loadWorldById aufgerufen mit id:', id);
    
    if (!this.patchKit) {
      console.error('❌ [Integrationstest] PatchKit nicht initialisiert');
      this._setStatus('PatchKit noch nicht initialisiert.', 'error');
      return;
    }
    
    try {
      console.log('📡 [Integrationstest] Lade Genesis-Daten via patchKit.io.genesisPort.getById');
      // libs/patchkit/io facade: loadGenesis(id, genesisPort)
      const genesisEvt = await this.patchKit.io?.genesisPort?.getById
        ? this.patchKit.io.genesisPort.getById(id)
        : null;
      console.log('📦 [Integrationstest] Genesis-Empfangen:', genesisEvt);
      
      if (!genesisEvt) {
        console.error('❌ [Integrationstest] Keine Genesis für World ID gefunden');
        this._setStatus('Keine Genesis für World ID gefunden.', 'info');
        return;
      }
      
      // Prüfe, ob originalYaml vorhanden ist (ursprünglicher YAML-Content)
      if (genesisEvt.originalYaml) {
        console.log('📝 [Integrationstest] Verwende originalYaml direkt');
        // Wenn originalYaml vorhanden ist, verwende es direkt
        this.setYamlText(genesisEvt.originalYaml);
        this._setStatus('World geladen und in YAML eingefügt.', 'success');
        // Parse für die Vorschau
        console.log('🔄 [Integrationstest] Parse für Vorschau');
        const worldObj = this.parseYaml();
        await this.updatePreviewFromObject(this.normalizeUserYaml(worldObj));
      } else {
        console.log('🔄 [Integrationstest] Verarbeite YAML-Inhalt');
        // Andernfalls parse den YAML-Inhalt wie bisher
        // Prüfe, ob genesisEvt ein String oder ein Objekt ist
        let yamlContent;
        if (typeof genesisEvt === 'string') {
          console.log('📝 [Integrationstest] genesisEvt ist String');
          yamlContent = genesisEvt;
        } else if (genesisEvt.yaml && typeof genesisEvt.yaml === 'string') {
          console.log('📝 [Integrationstest] genesisEvt.yaml ist String');
          yamlContent = genesisEvt.yaml;
        } else if (genesisEvt.yaml && genesisEvt.yaml instanceof ArrayBuffer) {
          console.log('📝 [Integrationstest] genesisEvt.yaml ist ArrayBuffer, dekodiere...');
          // Handle ArrayBuffer case (TextDecoder.decode Fehler)
          try {
            yamlContent = new TextDecoder().decode(genesisEvt.yaml);
            console.log('✅ [Integrationstest] ArrayBuffer dekodiert');
          } catch (decodeError) {
            console.error('❌ [Integrationstest] TextDecoder.decode Fehler:', decodeError);
            throw new Error('Konnte YAML-Inhalt nicht dekodieren: ' + decodeError.message);
          }
        } else {
          console.log('🔄 [Integrationstest] Fallback: Konvertiere Objekt in String');
          // Fallback: Konvertiere das Objekt in einen String
          yamlContent = JSON.stringify(genesisEvt);
        }
        
        console.log('🔄 [Integrationstest] Parse YAML-Inhalt');
        const worldObj = this.patchKit.genesis.parse(yamlContent);
        console.log('✅ [Integrationstest] YAML geparst:', worldObj);
        
        // Denormalisiere das Weltobjekt für die Anzeige im YAML-Editor
        console.log('🔄 [Integrationstest] Denormalisiere Weltobjekt');
        const denormalized = this.denormalizeUserYaml(worldObj);
        const text = this.serializeYaml(denormalized);
        console.log('📝 [Integrationstest] YAML-Text generiert, Länge:', text.length);
        this.setYamlText(text);
        this._setStatus('World geladen und in YAML eingefügt.', 'success');
        
        console.log('🎬 [Integrationstest] Aktualisiere Vorschau');
        await this.updatePreviewFromObject(worldObj);
      }
    } catch (e) {
      console.error('❌ [Integrationstest] Fehler beim Laden der Welt:', e);
      this._setStatus('Fehler beim Laden: ' + e.message, 'error');
    }
  }

  async createNewWorld() {
    console.log('🌍 [Integrationstest] createNewWorld aufgerufen');
    
    try {
      // Ermittle author_npub aus aktiver Identität
      console.log('🔍 [Integrationstest] Ermittle author_npub aus aktiver Identität');
      let author_npub = 'npub0';
      try {
        // Versuche 1: Über den nostrService des Editors
        if (this.nostrService && typeof this.nostrService.getIdentity === 'function') {
          console.log('🔑 [Integrationstest] Versuche Identität über nostrService zu erhalten');
          const ident = await this.nostrService.getIdentity();
          if (ident?.pubkey) {
            author_npub = ident.pubkey;
            console.log('✅ [Integrationstest] Identität über nostrService erhalten:', author_npub);
          }
        }
        
        // Versuche 2: Über die NostrServiceFactory, falls der erste Versuch fehlschlägt
        if (author_npub === 'npub0' && window.NostrServiceFactory) {
          console.log('🔑 [Integrationstest] Versuche Identität über NostrServiceFactory zu erhalten');
          try {
            const factoryService = await window.NostrServiceFactory.getNostrService();
            if (factoryService && typeof factoryService.getIdentity === 'function') {
              const ident = await factoryService.getIdentity();
              if (ident?.pubkey) {
                author_npub = ident.pubkey;
                console.log('✅ [Integrationstest] Identität über NostrServiceFactory erhalten:', author_npub);
              }
            }
          } catch (e) {
            console.warn('Fehler bei der Identitätsabfrage über NostrServiceFactory:', e);
          }
        }
      } catch (e) {
        console.error('Fehler bei der Autor-Identifikation:', e);
      }
      
      console.log('📝 [Integrationstest] Erstelle neue Genesis mit author_npub:', author_npub);
      const g = await this.patchKit.genesis.create({
        name: 'Neue Welt',
        author_npub,
        initialEntities: {},
        rules: {}
      });
      console.log('✅ [Integrationstest] Genesis erstellt:', g);
      
      // Füge ein leeres originalYaml-Feld für neue Welten hinzu
      g.originalYaml = '';
      
      console.log('🔐 [Integrationstest] Signiere Genesis');
      const signed = await this.patchKit.genesis.sign(g);
      console.log('✅ [Integrationstest] Genesis signiert:', signed);
      
      console.log('💾 [Integrationstest] Speichere Genesis');
      const saved = await this.patchKit.io.genesisPort.save(signed);
      console.log('✅ [Integrationstest] Genesis gespeichert:', saved);
      
      this.worldId = saved?.worldId || g?.metadata?.id || null;
      console.log('🏷️ [Integrationstest] World-ID gesetzt:', this.worldId);
      
      const wInput = document.getElementById('worldIdInput');
      if (wInput) {
        wInput.value = this.worldId || '';
        console.log('📝 [Integrationstest] World-ID im Input-Feld gesetzt');
      }
      
      // Setze einen leeren YAML-Content im Editor
      console.log('📝 [Integrationstest] Setze Standard-YAML im Editor');
      const yamlEditor = document.getElementById('world-yaml-editor');
      if (yamlEditor) {
        const defaultYaml = `# Neue Welt
name: "Neue Welt"
description: "Beschreibung hier einfügen"

environment:
  skybox: "sunset"
  ambient_light: 0.6
  sun_intensity: 0.8

terrain:
  type: "flat"
  size: [20, 20]
  color: "#4a4a4a"

objects:
  - type: "tree"
    position: [0, 0, 0]
    scale: [1, 1.5, 1]
    color: "#1a4a1a"
`;
        yamlEditor.value = defaultYaml;
        console.log('📝 [Integrationstest] YAML-Editor mit Standard-YAML befüllt');
        
        // Aktualisiere die Vorschau mit dem neuen Inhalt
        console.log('🎬 [Integrationstest] Aktualisiere Vorschau mit neuem Inhalt');
        try {
          const worldObj = this.parseYaml();
          if (worldObj) {
            console.log('✅ [Integrationstest] YAML geparst:', worldObj);
            await this.updatePreviewFromObject(this.normalizeUserYaml(worldObj));
          } else {
            console.error('❌ [Integrationstest] YAML-Parsing fehlgeschlagen');
          }
        } catch (previewError) {
          console.error('❌ [Integrationstest] Fehler beim Aktualisieren der Vorschau:', previewError);
        }
      } else {
        console.error('❌ [Integrationstest] YAML-Editor nicht gefunden');
      }
      
      if (window.showToast) window.showToast('success', 'Neue Welt erstellt: ' + (this.worldId || 'unbekannt'));
      this._setStatus('Neue Welt erstellt: ' + (this.worldId || 'unbekannt'), 'success');
      console.log('🎉 [Integrationstest] Neue Welt erfolgreich erstellt');
    } catch (e) {
      console.error('❌ [Integrationstest] Fehler beim Erstellen der neuen Welt:', e);
      if (window.showToast) window.showToast('error', 'Neu-Erstellung fehlgeschlagen: ' + e.message);
      this._setStatus('Neu-Erstellung fehlgeschlagen: ' + e.message, 'error');
    }
  }

  async loadWorldByIdFromInput() {
    const w = document.getElementById('worldIdInput')?.value?.trim();
    if (w) {
      await this.loadWorldById(w);
    } else {
      if (window.showToast) window.showToast('info', 'Bitte eine World ID eingeben.');
      this._setStatus('Bitte eine World ID eingeben.', 'info');
    }
  }

  async saveAsPatch() {
    try {
      if (!this.worldId) {
        if (window.showToast) window.showToast('info', 'Keine World ID gesetzt. Speichere zunächst eine Genesis.');
        this._setStatus('Keine World ID gesetzt. Speichere zunächst eine Genesis.', 'info');
        return;
      }
      
      // Ermittle author_npub aus aktiver Identität
      let author_npub = 'npub0';
      try {
        // Versuche 1: Über den nostrService des Editors
        if (this.nostrService && typeof this.nostrService.getIdentity === 'function') {
          const ident = await this.nostrService.getIdentity();
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
      
      // Parse den aktuellen YAML-Text
      const yamlText = this.getYamlText();
      const parsedYaml = this.parseYaml();
      
      if (!parsedYaml) {
        if (window.showToast) window.showToast('info', 'Kein YAML-Inhalt zum Speichern.');
        this._setStatus('Kein YAML-Inhalt zum Speichern.', 'info');
        return;
      }
      
      // Normalisiere das YAML-Objekt für die Patch-Erstellung
      const normalizedPatch = this.normalizePatchYaml(parsedYaml);
      
      // Erstelle das Patch-Objekt
      const p = await this.patchKit.patch.create({
        name: normalizedPatch.metadata.name,
        description: normalizedPatch.metadata.description,
        author_npub,
        targets_world: this.worldId,
        operations: normalizedPatch.operations
      });
      
      // Speichere den ursprünglichen YAML-Text im Patch-Objekt
      p.originalYaml = yamlText;
      
      const res = await this.patchKit.patch.validate(p);
      if (!(res?.valid === true || res === true)) {
        const errors = Array.isArray(res?.errors) ? res.errors : [];
        throw new Error('Patch ungültig: ' + JSON.stringify(errors));
      }
      const signed = await this.patchKit.patch.sign(p);
      await this.patchKit.io.patchPort.save(signed);
      
      // Aktualisiere die Patch-ID
      this.currentPatchId = signed?.patchId || p?.metadata?.id || this.currentPatchId;
      
      // Aktualisiere den Tab-Namen
      this._updatePatchTabName(normalizedPatch.metadata.name || 'Patch');
      
      if (window.showToast) window.showToast('success', 'Patch gespeichert.');
      this._setStatus('Patch gespeichert.', 'success');
    } catch (e) {
      console.error(e);
      if (window.showToast) window.showToast('error', 'Speichern (Patch) fehlgeschlagen: ' + e.message);
      this._setStatus('Speichern (Patch) fehlgeschlagen: ' + e.message, 'error');
    }
  }
  
  _updatePatchTabName(patchName) {
    const patchTabBtn = document.getElementById('patchTabBtn');
    if (patchTabBtn) {
      patchTabBtn.textContent = `Patch: ${patchName}`;
    }
  }
 
  async saveCurrent() {
    if (!this.patchKit) {
      this._setStatus('PatchKit noch nicht initialisiert.', 'error');
      return;
    }
    
    // Je nach aktivem Tab speichern
    if (this.activeTab === 'world') {
      await this._saveWorld();
    } else if (this.activeTab === 'patch') {
      await this._savePatch();
    }
  }
  
  async _saveWorld() {
    try {
      const yamlText = this.getYamlText();
      const parsedBeforeSave = this.parseYaml();
      if (!parsedBeforeSave) {
        this._setStatus('Kein YAML vorhanden.', 'info');
        return;
      }
      // Vor einer Operation immer auf Genesis-Form normalisieren
      const stripped = this.stripWorldId(parsedBeforeSave);
      // Ermittle author_npub aus aktiver Identität
      let author_npub = 'npub0';
      try {
        // Versuche 1: Über den nostrService des Editors
        if (this.nostrService && typeof this.nostrService.getIdentity === 'function') {
          const ident = await this.nostrService.getIdentity();
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
        
        // Debug-Informationen
        console.log('Autor-Identifikation:', {
          currentAuthorNpub: author_npub,
          nostrServiceAvailable: !!this.nostrService,
          nostrServiceFactoryAvailable: !!window.NostrServiceFactory
        });
      } catch (e) {
        console.error('Fehler bei der Autor-Identifikation:', e);
      }
      
      // Prüfe, ob wir eine vorhandene Welt aktualisieren oder eine neue erstellen
      if (this.worldId) {
        // Versuche zuerst, die vorhandene Genesis zu laden und zu aktualisieren
        try {
          const existingGenesis = await this.patchKit.io.genesisPort.getById(this.worldId);
          
          if (existingGenesis) {
            // Prüfe, ob der aktuelle Benutzer der Autor ist
            // Versuche verschiedene mögliche Speicherorte der Autoreninformation
            const existingAuthor =
              existingGenesis.metadata?.author_npub ||
              existingGenesis.author_npub ||
              existingGenesis.author ||
              existingGenesis.pubkey;
              
            const isAuthor = existingAuthor === author_npub;
            
            // Debug-Informationen
            console.log('Autorenschaft-Prüfung:', {
              existingAuthor,
              currentAuthor: author_npub,
              isAuthor,
              worldId: this.worldId,
              genesisMetadata: existingGenesis.metadata,
              genesisKeys: Object.keys(existingGenesis),
              fullGenesis: existingGenesis
            });
            
            if (isAuthor) {
              // Aktualisiere die vorhandene Genesis
              const normalized = this.normalizeUserYaml(stripped);
              const updatedGenesis = await this.patchKit.genesis.create({
                id: this.worldId, // Behalte die vorhandene ID bei
                name: normalized?.name || stripped?.name || existingGenesis.metadata?.name || 'Unbenannte Welt',
                description: normalized?.description || stripped?.description || existingGenesis.metadata?.description || '',
                author_npub,
                initialEntities: normalized?.entities || stripped?.entities || {},
                rules: normalized?.rules || stripped?.rules || {}
              });
              
              // Behalte created_at von der ursprünglichen Genesis bei
              if (existingGenesis.metadata?.created_at) {
                updatedGenesis.metadata.created_at = existingGenesis.metadata.created_at;
              }
              
              // Speichere den ursprünglichen YAML-Text im Genesis-Objekt
              updatedGenesis.originalYaml = yamlText;
              
              // Erstelle eine Kopie für die Validierung, ohne das originalYaml-Feld
              const gForValidation = { ...updatedGenesis };
              delete gForValidation.originalYaml;
              
              const res = await this.patchKit.genesis.validate(gForValidation);
              const valid = res?.valid === true || res === true;
              if (!valid) {
                const errors = Array.isArray(res?.errors) ? res.errors : [];
                throw new Error('Genesis ungültig: ' + JSON.stringify(errors));
              }
              const signed = await this.patchKit.genesis.sign(updatedGenesis);
              await this.patchKit.io.genesisPort.save(signed);
              // toast
              window.showToast('success', 'Genesis erfolgreich aktualisiert');
        
              this._setStatus('Genesis aktualisiert.', 'success');
              
              // Aktualisiere den Tab-Namen
              this._updateWorldTabName(normalized?.name || stripped?.name || 'Welt');
            } else {
              // Nicht der Autor - frage, ob eine Kopie erstellt werden soll
              const confirmCopy = window.confirm('Sie sind nicht der Autor dieser Welt. Möchten Sie eine Kopie als neue Welt erstellen?');
              if (!confirmCopy) {
                this._setStatus('Speichern abgebrochen.', 'info');
                return;
              }
              
              // Erstelle eine neue Genesis mit neuer ID
              const normalized = this.normalizeUserYaml(stripped);
              const g = await this.patchKit.genesis.create({
                name: normalized?.name || stripped?.name || 'Unbenannte Welt (Kopie)',
                description: normalized?.description || stripped?.description || '',
                author_npub,
                initialEntities: normalized?.entities || stripped?.entities || {},
                rules: normalized?.rules || stripped?.rules || {}
              });
              
              // Speichere den ursprünglichen YAML-Text im Genesis-Objekt
              g.originalYaml = yamlText;
              
              // Erstelle eine Kopie für die Validierung, ohne das originalYaml-Feld
              const gForValidation = { ...g };
              delete gForValidation.originalYaml;
              
              const res = await this.patchKit.genesis.validate(gForValidation);
              const valid = res?.valid === true || res === true;
              if (!valid) {
                const errors = Array.isArray(res?.errors) ? res.errors : [];
                throw new Error('Genesis ungültig: ' + JSON.stringify(errors));
              }
              const signed = await this.patchKit.genesis.sign(g);
              const saved = await this.patchKit.io.genesisPort.save(signed);
              this.worldId = saved?.worldId || g?.metadata?.id || null;
              this._setStatus('Kopie als neue Genesis gespeichert. World ID gesetzt.', 'success');
              
              // Aktualisiere den Tab-Namen
              this._updateWorldTabName(normalized?.name || stripped?.name || 'Welt (Kopie)');
            }
          } else {
            // Genesis nicht gefunden - erstelle eine neue
            const normalized = this.normalizeUserYaml(stripped);
            const g = await this.patchKit.genesis.create({
              name: normalized?.name || stripped?.name || 'Unbenannte Welt',
              description: normalized?.description || stripped?.description || '',
              author_npub,
              initialEntities: normalized?.entities || stripped?.entities || {},
              rules: normalized?.rules || stripped?.rules || {}
            });
            
            // Speichere den ursprünglichen YAML-Text im Genesis-Objekt
            g.originalYaml = yamlText;
            
            // Erstelle eine Kopie für die Validierung, ohne das originalYaml-Feld
            const gForValidation = { ...g };
            delete gForValidation.originalYaml;
            
            const res = await this.patchKit.genesis.validate(gForValidation);
            const valid = res?.valid === true || res === true;
            if (!valid) {
              const errors = Array.isArray(res?.errors) ? res.errors : [];
              throw new Error('Genesis ungültig: ' + JSON.stringify(errors));
            }
            const signed = await this.patchKit.genesis.sign(g);
            const saved = await this.patchKit.io.genesisPort.save(signed);
            this.worldId = saved?.worldId || g?.metadata?.id || null;
            this._setStatus('Neue Genesis gespeichert. World ID gesetzt.', 'success');
            
            // Aktualisiere den Tab-Namen
            this._updateWorldTabName(normalized?.name || stripped?.name || 'Welt');
          }
        } catch (error) {
          // Fehler beim Laden der Genesis - erstelle einen Patch als Fallback
          console.warn('Fehler beim Aktualisieren der Genesis, erstelle Patch:', error);
          
          // Lade die aktuelle Genesis, um die Änderungen zu vergleichen
          let originalYaml = '';
          try {
            const currentGenesis = await this.patchKit.io.genesisPort.getById(this.worldId);
            originalYaml = currentGenesis.originalYaml || this.serializeYaml(this.denormalizeUserYaml(currentGenesis));
          } catch (e) {
            console.warn('Konnte aktuelle Genesis nicht laden, erstelle Patch aus vollen YAML:', e);
            originalYaml = '';
          }
          
          // Erstelle einen Patch aus den Änderungen
          const patchUI = new PatchUI({ patchKit: this.patchKit, worldId: this.worldId });
          const patch = await patchUI.createPatchFromYamlChanges(originalYaml, yamlText, this.worldId);
          
          this._setStatus('Patch gespeichert.', 'success');
        }
      } else {
        // Keine worldId - erstelle eine neue Genesis
        const normalized = this.normalizeUserYaml(stripped);
        const g = await this.patchKit.genesis.create({
          name: normalized?.name || stripped?.name || 'Unbenannte Welt',
          description: normalized?.description || stripped?.description || '',
          author_npub,
          initialEntities: normalized?.entities || stripped?.entities || {},
          rules: normalized?.rules || stripped?.rules || {}
        });
        
        // Speichere den ursprünglichen YAML-Text im Genesis-Objekt
        g.originalYaml = yamlText;
        
        // Erstelle eine Kopie für die Validierung, ohne das originalYaml-Feld
        const gForValidation = { ...g };
        delete gForValidation.originalYaml;
        
        const res = await this.patchKit.genesis.validate(gForValidation);
        const valid = res?.valid === true || res === true;
        if (!valid) {
          const errors = Array.isArray(res?.errors) ? res.errors : [];
          throw new Error('Genesis ungültig: ' + JSON.stringify(errors));
        }
        const signed = await this.patchKit.genesis.sign(g);
        const saved = await this.patchKit.io.genesisPort.save(signed);
        this.worldId = saved?.worldId || g?.metadata?.id || null;
        this._setStatus('Genesis gespeichert. World ID gesetzt.', 'success');
        
        // Aktualisiere den Tab-Namen
        this._updateWorldTabName(normalized?.name || stripped?.name || 'Welt');
      }
      
      // Nach Speichern Vorschau neu aufbauen
      const parsedAfterSave = this.parseYaml();
      if (parsedAfterSave) await this.updatePreviewFromObject(this.normalizeUserYaml(parsedAfterSave));
    } catch (e) {
      this._setStatus('Speichern fehlgeschlagen: ' + e.message, 'error');
    }
  }
  
  async _savePatch() {
    try {
      if (!this.worldId) {
        if (window.showToast) window.showToast('info', 'Keine World ID gesetzt. Speichere zunächst eine Genesis.');
        this._setStatus('Keine World ID gesetzt. Speichere zunächst eine Genesis.', 'info');
        return;
      }
      
      // Ermittle author_npub aus aktiver Identität
      let author_npub = 'npub0';
      try {
        // Versuche 1: Über den nostrService des Editors
        if (this.nostrService && typeof this.nostrService.getIdentity === 'function') {
          const ident = await this.nostrService.getIdentity();
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
      
      // Parse den aktuellen YAML-Text
      const yamlText = this.getYamlText();
      const parsedYaml = this.parseYaml();
      
      if (!parsedYaml) {
        if (window.showToast) window.showToast('info', 'Kein YAML-Inhalt zum Speichern.');
        this._setStatus('Kein YAML-Inhalt zum Speichern.', 'info');
        return;
      }
      
      // Normalisiere das YAML-Objekt für die Patch-Erstellung
      const normalizedPatch = this.normalizePatchYaml(parsedYaml);
      
      // Erstelle das Patch-Objekt
      const p = await this.patchKit.patch.create({
        name: normalizedPatch.metadata.name,
        description: normalizedPatch.metadata.description,
        author_npub,
        targets_world: this.worldId,
        operations: normalizedPatch.operations
      });
      
      // Speichere den ursprünglichen YAML-Text im Patch-Objekt
      p.originalYaml = yamlText;
      
      const res = await this.patchKit.patch.validate(p);
      if (!(res?.valid === true || res === true)) {
        const errors = Array.isArray(res?.errors) ? res.errors : [];
        throw new Error('Patch ungültig: ' + JSON.stringify(errors));
      }
      const signed = await this.patchKit.patch.sign(p);
      await this.patchKit.io.patchPort.save(signed);
      
      // Aktualisiere die Patch-ID
      this.currentPatchId = signed?.patchId || p?.metadata?.id || this.currentPatchId;
      
      // Aktualisiere den Tab-Namen
      this._updatePatchTabName(normalizedPatch.metadata.name || 'Patch');
      
      // Aktualisiere die Patch-UI, falls vorhanden
      if (this.patchUI) {
        try {
          await this.patchUI.load(this.worldId);
        } catch (error) {
          console.warn('Konnte Patch-Liste nicht aktualisieren:', error);
        }
      }
      
      // Visualisiere den gespeicherten Patch, falls der Patch-Visualizer verfügbar ist
      if (this.patchVisualizer) {
        try {
          // Erstelle ein Patch-Objekt für die Visualisierung
          const patchForVisualization = {
            metadata: normalizedPatch.metadata,
            operations: normalizedPatch.operations
          };
          
          // Visualisiere den Patch
          await this.visualizePatch(patchForVisualization, {
            highlightChanges: true,
            showConflicts: false
          });
        } catch (error) {
          console.warn('Konnte gespeicherten Patch nicht visualisieren:', error);
        }
      }
      
      if (window.showToast) window.showToast('success', 'Patch gespeichert.');
      this._setStatus('Patch gespeichert.', 'success');
    } catch (e) {
      console.error(e);
      if (window.showToast) window.showToast('error', 'Speichern (Patch) fehlgeschlagen: ' + e.message);
      this._setStatus('Speichern (Patch) fehlgeschlagen: ' + e.message, 'error');
    }
  }
  
  _updateWorldTabName(worldName) {
    const worldTabBtn = document.getElementById('worldTabBtn');
    if (worldTabBtn) {
      worldTabBtn.textContent = `Welt: ${worldName}`;
    }
  }

  // ---------- Normalisierung / Preview / THREE.js (leichtgewichtige Platzhalter) ----------

 _setValidationErrorsUI(errors = [], rawText = '') {
   try {
     const container = document.getElementById('preview-errors');
     if (!container) return;
     if (!errors.length) {
       container.textContent = '';
       container.style.display = 'none';
       return;
     }
     const lines = typeof rawText === 'string' ? rawText.split(/\r?\n/) : [];
     const body = errors.map((e, i) => {
       const path = e.instancePath || e.path || '';
       const msg = e.message || e.msg || '';
       let ctx = '';
       const m = String(path).match(/\/([a-zA-Z0-9_:-]+)/);
       if (lines.length && m && m[1]) {
         const key = m[1];
         const idx = lines.findIndex(l => l.trimStart().startsWith(key + ':') || l.includes(key + ' '));
         if (idx >= 0) {
           const context = lines.slice(Math.max(0, idx - 1), Math.min(lines.length, idx + 2));
           ctx = ` (Zeile ~${idx + 1})\n${context.join('\n')}`;
         }
       }
       return `#${i + 1} ${path} ${msg}${ctx}`;
     }).join('\n\n');
     container.textContent = body;
     container.style.display = 'block';
   } catch {}
 }


  // Nutzerfreundliche YAML-Normalisierung:
  // - Unterstützt vereinfachtes Format wie:
  //   objects:
  //     - type: tree
  //     - type: rock
  //   → wird nach PatchKit-Genesis-Struktur überführt:
  //   {
  //     metadata: {... Minimalfelder werden später beim Speichern ergänzt ...}
  //     entities: { object: { obj1: { type: 'tree' }, obj2: { type: 'rock' } } },
  //     rules: {}
  //   }
  normalizeUserYaml(obj) {
    if (!obj || typeof obj !== 'object') return { entities: {}, rules: {} };

    // Bereits Genesis-ähnlich?
    if (obj.entities && typeof obj.entities === 'object') {
      return { ...obj, rules: obj.rules || {} };
    }

    // Stelle Basisknoten sicher
    const entities = {};
    const out = {
      metadata: {
        // Minimal required Felder werden beim echten Speichern über create() ergänzt
        schema_version: 'patchkit/1.0',
        id: obj.id || 'tmp_' + Math.random().toString(36).slice(2, 10),
        name: obj.name || 'World',
        author_npub: obj.author_npub || 'npub0',
        created_at: Math.floor(Date.now() / 1000)
      },
      entities,
      rules: obj.rules || {}
    };

    // environment → entities.environment.env1
    if (obj.environment && typeof obj.environment === 'object') {
      entities.environment = entities.environment || {};
      entities.environment.env1 = { ...obj.environment };
    }

    // terrain → entities.terrain.t1
    if (obj.terrain && typeof obj.terrain === 'object') {
      entities.terrain = entities.terrain || {};
      const t = { ...obj.terrain };
      if (t.preset && !t.kind) {
        // einfache Heuristik
        t.kind = String(t.preset).includes('forest') ? 'forest' : String(t.preset).replace(/_.*/, '');
      }
      delete t.preset;
      entities.terrain.t1 = t;
    }

    // objects → entities.object.objN
    if (Array.isArray(obj.objects)) {
      entities.object = entities.object || {};
      let i = 1;
      for (const item of obj.objects) {
        const id = 'obj' + (i++);
        if (item && typeof item === 'object') {
          // Vereinheitliche Attributnamen: type/preset → kind
          const copy = { ...item };
          if (copy.type && !copy.kind) copy.kind = copy.type;
          delete copy.type;
          entities.object[id] = copy;
        } else if (typeof item === 'string') {
          entities.object[id] = { kind: item };
        }
      }
    }

    // portals → entities.portal.portalN
    if (Array.isArray(obj.portals)) {
      entities.portal = entities.portal || {};
      let i = 1;
      for (const item of obj.portals) {
        const id = 'portal' + (i++);
        if (item && typeof item === 'object') {
          // Vereinheitliche Attributnamen: type/preset → kind
          const copy = { ...item };
          if (copy.type && !copy.kind) copy.kind = copy.type;
          delete copy.type;
          entities.portal[id] = copy;
        } else if (typeof item === 'string') {
          entities.portal[id] = { kind: item };
        }
      }
    }

    // personas → entities.persona.personaN
    if (Array.isArray(obj.personas)) {
      entities.persona = entities.persona || {};
      let i = 1;
      for (const item of obj.personas) {
        const id = 'persona' + (i++);
        if (item && typeof item === 'object') {
          // Vereinheitliche Attributnamen: type/preset → kind
          const copy = { ...item };
          if (copy.type && !copy.kind) copy.kind = copy.type;
          delete copy.type;
          entities.persona[id] = copy;
        } else if (typeof item === 'string') {
          entities.persona[id] = { kind: item };
        }
      }
    }

    // extensions → entities.extension.extensionN
    if (obj.extensions && typeof obj.extensions === 'object') {
      entities.extension = entities.extension || {};
      let i = 1;
      for (const [key, value] of Object.entries(obj.extensions)) {
        const id = 'extension' + (i++);
        if (typeof value === 'object') {
          entities.extension[id] = { ...value, name: key };
        } else {
          entities.extension[id] = { name: key, value };
        }
      }
    }

    // camera → entities.camera.cam1
    if (obj.camera && typeof obj.camera === 'object') {
      entities.camera = entities.camera || {};
      entities.camera.cam1 = { ...obj.camera };
    }

    // Fallback, falls leer
    if (!Object.keys(entities).length) {
      out.entities = { misc: { item1: obj } };
    }

    // Name/Description auf metadata spiegeln
    out.metadata.name = obj.name || out.metadata.name;
    if (obj.description) out.metadata.description = obj.description;

    return out;
  }

  // Denormalisiert das interne PatchKit-Format zurück in das benutzerfreundliche YAML-Format
  denormalizeUserYaml(normalized) {
    if (!normalized || typeof normalized !== 'object') return {};

    const out = {};

    // Metadaten übernehmen
    if (normalized.metadata) {
      if (normalized.metadata.name) out.name = normalized.metadata.name;
      if (normalized.metadata.description) out.description = normalized.metadata.description;
      if (normalized.metadata.id) out.id = normalized.metadata.id;
    }

    // Entities verarbeiten
    if (normalized.entities && typeof normalized.entities === 'object') {
      // environment ← entities.environment.env1
      if (normalized.entities.environment) {
        const envKeys = Object.keys(normalized.entities.environment);
        if (envKeys.length > 0) {
          out.environment = { ...normalized.entities.environment[envKeys[0]] };
        }
      }

      // terrain ← entities.terrain.t1
      if (normalized.entities.terrain) {
        const terrainKeys = Object.keys(normalized.entities.terrain);
        if (terrainKeys.length > 0) {
          out.terrain = { ...normalized.entities.terrain[terrainKeys[0]] };
        }
      }

      // objects ← entities.object.objN
      if (normalized.entities.object) {
        out.objects = [];
        for (const [id, obj] of Object.entries(normalized.entities.object)) {
          if (obj && typeof obj === 'object') {
            // Vereinheitliche Attributnamen: kind → type
            const copy = { ...obj };
            if (copy.kind && !copy.type) copy.type = copy.kind;
            delete copy.kind;
            out.objects.push(copy);
          }
        }
      }

      // portals ← entities.portal.portalN
      if (normalized.entities.portal) {
        out.portals = [];
        for (const [id, portal] of Object.entries(normalized.entities.portal)) {
          if (portal && typeof portal === 'object') {
            // Vereinheitliche Attributnamen: kind → type
            const copy = { ...portal };
            if (copy.kind && !copy.type) copy.type = copy.kind;
            delete copy.kind;
            out.portals.push(copy);
          }
        }
      }

      // personas ← entities.persona.personaN
      if (normalized.entities.persona) {
        out.personas = [];
        for (const [id, persona] of Object.entries(normalized.entities.persona)) {
          if (persona && typeof persona === 'object') {
            // Vereinheitliche Attributnamen: kind → type
            const copy = { ...persona };
            if (copy.kind && !copy.type) copy.type = copy.kind;
            delete copy.kind;
            out.personas.push(copy);
          }
        }
      }

      // extensions ← entities.extension.extensionN
      if (normalized.entities.extension) {
        out.extensions = {};
        for (const [id, extension] of Object.entries(normalized.entities.extension)) {
          if (extension && typeof extension === 'object') {
            if (extension.name) {
              const name = extension.name;
              const copy = { ...extension };
              delete copy.name;
              out.extensions[name] = copy.value !== undefined ? copy.value : copy;
            }
          }
        }
      }

      // camera ← entities.camera.cam1
      if (normalized.entities.camera) {
        const cameraKeys = Object.keys(normalized.entities.camera);
        if (cameraKeys.length > 0) {
          out.camera = { ...normalized.entities.camera[cameraKeys[0]] };
        }
      }
    }

    // Rules übernehmen
    if (normalized.rules && typeof normalized.rules === 'object') {
      out.rules = { ...normalized.rules };
    }

    return out;
  }

  // Normalisiert ein YAML-Objekt für die Patch-Erstellung
  normalizePatchYaml(obj) {
    if (!obj || typeof obj !== 'object') return { metadata: {}, operations: [] };

    // Bereits Patch-ähnlich?
    if (obj.operations && Array.isArray(obj.operations)) {
      return { ...obj };
    }

    const operations = [];
    const metadata = {
      schema_version: 'patchkit/1.0',
      id: obj.id || 'patch_' + Math.random().toString(36).slice(2, 10),
      name: obj.name || 'Patch',
      description: obj.description || '',
      author_npub: obj.author_npub || 'npub0',
      created_at: Math.floor(Date.now() / 1000),
      targets_world: obj.targets_world || this.worldId || ''
    };

    // Konvertiere die flache YAML-Struktur in Operationen
    const entityTypes = ['objects', 'portals', 'personas'];
    
    for (const entityType of entityTypes) {
      if (Array.isArray(obj[entityType])) {
        let i = 1;
        for (const item of obj[entityType]) {
          const entityTypeName = entityType.slice(0, -1); // Entferne das 's' am Ende
          const entityId = entityTypeName + (i++);
          
          // Vereinheitliche Attributnamen: type → kind
          const payload = { ...item };
          if (payload.type && !payload.kind) payload.kind = payload.type;
          delete payload.type;
          
          operations.push({
            type: 'add',
            entity_type: entityTypeName,
            entity_id: entityId,
            payload
          });
        }
      }
    }

    // Behandele environment als Update-Operation
    if (obj.environment && typeof obj.environment === 'object') {
      operations.push({
        type: 'update',
        entity_type: 'environment',
        entity_id: 'env1',
        changes: obj.environment
      });
    }

    // Behandele terrain als Update-Operation
    if (obj.terrain && typeof obj.terrain === 'object') {
      operations.push({
        type: 'update',
        entity_type: 'terrain',
        entity_id: 't1',
        changes: obj.terrain
      });
    }

    // Behandele extensions als Add-Operationen
    if (obj.extensions && typeof obj.extensions === 'object') {
      let i = 1;
      for (const [key, value] of Object.entries(obj.extensions)) {
        const entityId = 'extension' + (i++);
        const payload = typeof value === 'object' ? { ...value, name: key } : { name: key, value };
        
        operations.push({
          type: 'add',
          entity_type: 'extension',
          entity_id: entityId,
          payload
        });
      }
    }

    // Behandele camera als Update-Operation
    if (obj.camera && typeof obj.camera === 'object') {
      operations.push({
        type: 'update',
        entity_type: 'camera',
        entity_id: 'cam1',
        changes: obj.camera
      });
    }

    return { metadata, operations };
  }

  async _initThreePreview() {
    try {
      const canvas = this.canvas;
      if (!canvas) return;
      
      // Erstelle den Three.js Manager
      this.threeJSManager = new ThreeJSManager(canvas);
      
      // Initialisiere Three.js
      const initialized = await this.threeJSManager.init();
      if (!initialized) {
        console.error('Three.js Manager konnte nicht initialisiert werden');
        return;
      }
      
      // Verstecke den Ladeindikator
      const loading = document.getElementById('loadingIndicator');
      if (loading) loading.style.display = 'none';
      
      this._setStatus('Three.js initialisiert - Bereit zum Visualisieren', 'success');
    } catch (error) {
      console.error('Fehler bei der Three.js Initialisierung:', error);
      this._setStatus('Three.js Initialisierung fehlgeschlagen: ' + error.message, 'error');
    }
  }

  async _initPatchVisualizer() {
    try {
      // Initialisiere den Patch-Visualizer nur, wenn der Three.js Manager verfügbar ist
      if (this.threeJSManager && this.threeJSManager.initialized) {
        this.patchVisualizer = new PatchVisualizer(this.threeJSManager);
        this._setStatus('Patch-Visualizer initialisiert', 'success');
      } else {
        console.warn('Patch-Visualizer konnte nicht initialisiert werden: Three.js Manager nicht verfügbar');
        this._setStatus('Patch-Visualizer nicht verfügbar', 'info');
      }
    } catch (error) {
      console.error('Fehler bei der Initialisierung des Patch-Visualizers:', error);
      this._setStatus('Patch-Visualizer Initialisierung fehlgeschlagen: ' + error.message, 'error');
    }
  }

  async updatePreviewFromYaml() {
    try {
      const obj = this.parseYaml();
      if (!obj) return;
      await this.updatePreviewFromObject(this.normalizeUserYaml(obj));
    } catch {}
  }

  async updatePreviewFromObject(genesisLike) {
    console.log('🎬 [Integrationstest] updatePreviewFromObject aufgerufen mit genesisLike:', genesisLike);
    
    try {
      const entities = genesisLike?.entities || {};
      let count = 0;
      for (const k of Object.keys(entities)) {
        const bucket = entities[k] || {};
        count += Object.keys(bucket).length;
      }
      const oc = document.getElementById('objectCount');
      if (oc) oc.textContent = count + ' Objekte';
      
      console.log('📊 [Integrationstest] Objektanzahl berechnet:', count);
      console.log('🔍 [Integrationstest] Three.js Manager Status:', {
        available: !!this.threeJSManager,
        initialized: this.threeJSManager?.initialized || false
      });

      // Wenn der Three.js Manager verfügbar ist, verwende ihn für die 3D-Visualisierung
      if (this.threeJSManager && this.threeJSManager.initialized) {
        console.log('✅ [Integrationstest] Three.js Manager ist verfügbar und initialisiert');
        // Setze die Szene für den Three.js Manager
        this.scene = this.threeJSManager.scene;
        
        try {
          console.log('🚀 [Integrationstest] Starte 3D-Rendering mit threeJSManager.renderWorld');
          // Rendere die Welt mit dem Three.js Manager
          const renderResult = await this.threeJSManager.renderWorld(genesisLike);
          console.log('✅ [Integrationstest] 3D-Rendering erfolgreich, Ergebnis:', renderResult);
          this._setStatus('3D-Visualisierung aktualisiert', 'success');
        } catch (renderError) {
          console.error('❌ [Integrationstest] Fehler beim 3D-Rendering:', renderError);
          console.log('🔄 [Integrationstest] Fallback auf 2D-Rendering');
          this._setStatus('3D-Rendering fehlgeschlagen, verwende 2D-Fallback: ' + renderError.message, 'error');
          
          // Fallback auf 2D-Canvas bei 3D-Fehlern
          this._render2DFallback(entities, count);
        }
      } else {
        console.warn('⚠️ [Integrationstest] Three.js Manager nicht initialisiert, verwende 2D-Fallback');
        // Fallback auf 2D-Canvas, wenn Three.js nicht verfügbar ist
        this._render2DFallback(entities, count);
      }
    } catch (error) {
      console.error('❌ [Integrationstest] Fehler bei der Vorschau-Aktualisierung:', error);
      this._setStatus('Vorschau-Aktualisierung fehlgeschlagen: ' + error.message, 'error');
    }
  }
  
  // Hilfsmethode für 2D-Fallback-Rendering
  _render2DFallback(entities, count) {
    if (!this.canvas) return;
    
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    
    // Hintergrund
    ctx.clearRect(0, 0, this.canvas.width || 400, this.canvas.height || 300);
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, this.canvas.width || 400, this.canvas.height || 300);

    // Gültigkeit für Preview: Entities vorhanden?
    const isValid = Object.keys(entities).some(k => Object.keys(entities[k] || {}).length > 0);
    ctx.fillStyle = isValid ? '#00e676' : '#ff5252';
    ctx.font = 'bold 14px monospace';
    ctx.fillText((isValid ? 'Objekte: ' + count : 'YAML ungültig'), 10, 20);

    if (isValid) {
      // sehr einfache "Renderpunkte" pro Objekt
      ctx.fillStyle = '#40c4ff';
      ctx.font = '12px monospace';
      let x = 10, y = 40;
      for (const typeName of Object.keys(entities)) {
        const bucket = entities[typeName] || {};
        for (const id of Object.keys(bucket)) {
          ctx.fillRect(x, y, 6, 6);
          ctx.fillStyle = '#ddd';
          ctx.fillText(typeName + ':' + id, x + 10, y + 6);
          y += 14;
          ctx.fillStyle = '#40c4ff';
          if (y > (this.canvas.height || 300) - 20) { y = 40; x += 140; }
        }
      }
    }
  }

  // Methoden für die Patch-Visualisierung
  async renderWorld() {
    try {
      const obj = this.parseYaml();
      if (!obj) {
        this._setStatus('Kein YAML-Inhalt zum Rendern.', 'error');
        return;
      }
      
      const normalized = this.normalizeUserYaml(obj);
      await this.updatePreviewFromObject(normalized);
      this._setStatus('Welt gerendert', 'success');
    } catch (error) {
      console.error('Fehler beim Rendern der Welt:', error);
      this._setStatus('Fehler beim Rendern: ' + error.message, 'error');
    }
  }

  async resetWorld() {
    try {
      if (this.threeJSManager && this.threeJSManager.initialized) {
        await this.threeJSManager.resetScene();
        this._setStatus('Szene zurückgesetzt', 'success');
      } else {
        this._setStatus('Three.js nicht initialisiert', 'error');
      }
    } catch (error) {
      console.error('Fehler beim Zurücksetzen der Szene:', error);
      this._setStatus('Fehler beim Zurücksetzen: ' + error.message, 'error');
    }
  }

  async _togglePatchVisualization() {
    try {
      const toggleBtn = document.getElementById('togglePatchVisualization');
      if (!toggleBtn) return;
      
      const isEnabled = toggleBtn.checked;
      
      if (isEnabled) {
        await this._visualizeCurrentPatch();
        this._setStatus('Patch-Visualisierung aktiviert', 'success');
      } else {
        if (this.threeJSManager && this.threeJSManager.initialized) {
          await this.threeJSManager.clearHighlights();
          this._setStatus('Patch-Visualisierung deaktiviert', 'info');
        }
      }
    } catch (error) {
      console.error('Fehler beim Umschalten der Patch-Visualisierung:', error);
      this._setStatus('Fehler: ' + error.message, 'error');
    }
  }

  async _visualizeCurrentPatch() {
    try {
      if (!this.worldId) {
        this._setStatus('Keine World ID für Patch-Visualisierung', 'error');
        return;
      }
      
      const yamlText = this.getYamlText();
      const parsedYaml = this.parseYaml();
      
      if (!parsedYaml) {
        this._setStatus('Kein YAML-Inhalt für Patch-Visualisierung', 'error');
        return;
      }
      
      // Normalisiere das YAML-Objekt für die Patch-Erstellung
      const normalizedPatch = this.normalizePatchYaml(parsedYaml);
      
      if (this.threeJSManager && this.threeJSManager.initialized) {
        // Erstelle ein Patch-Objekt für die Visualisierung
        const patch = {
          metadata: normalizedPatch.metadata,
          operations: normalizedPatch.operations
        };
        
        // Visualisiere den Patch
        await this.threeJSManager.visualizePatch(patch);
        this._setStatus('Patch visualisiert', 'success');
      }
    } catch (error) {
      console.error('Fehler bei der Patch-Visualisierung:', error);
      this._setStatus('Fehler bei der Visualisierung: ' + error.message, 'error');
    }
  }

  _updateVisualizationMode() {
    try {
      const modeSelect = document.getElementById('visualizationMode');
      if (!modeSelect || !this.threeJSManager) return;
      
      const mode = modeSelect.value;
      this.threeJSManager.setVisualizationMode(mode);
      this._setStatus('Visualisierungsmodus geändert: ' + mode, 'info');
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Visualisierungsmodus:', error);
      this._setStatus('Fehler: ' + error.message, 'error');
    }
  }

  _updateAnimationMode() {
    try {
      const modeSelect = document.getElementById('animationMode');
      if (!modeSelect || !this.threeJSManager) return;
      
      const mode = modeSelect.value;
      this.threeJSManager.setAnimationMode(mode);
      this._setStatus('Animationsmodus geändert: ' + mode, 'info');
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Animationsmodus:', error);
      this._setStatus('Fehler: ' + error.message, 'error');
    }
  }

  _updateAnimationSpeed() {
    try {
      const speedSlider = document.getElementById('animationSpeed');
      if (!speedSlider || !this.threeJSManager) return;
      
      const speed = parseFloat(speedSlider.value);
      this.threeJSManager.setAnimationSpeed(speed);
      this._setStatus('Animationsgeschwindigkeit geändert: ' + speed, 'info');
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Animationsgeschwindigkeit:', error);
      this._setStatus('Fehler: ' + error.message, 'error');
    }
  }

  _updateTransparency() {
    try {
      const transparencySlider = document.getElementById('transparency');
      if (!transparencySlider || !this.threeJSManager) return;
      
      const transparency = parseFloat(transparencySlider.value);
      this.threeJSManager.setTransparency(transparency);
      this._setStatus('Transparenz geändert: ' + transparency, 'info');
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Transparenz:', error);
      this._setStatus('Fehler: ' + error.message, 'error');
    }
  }

  async _startVisualizationAnimation() {
    try {
      if (this.threeJSManager && this.threeJSManager.initialized) {
        await this.threeJSManager.startAnimation();
        this._setStatus('Animation gestartet', 'success');
      } else {
        this._setStatus('Three.js nicht initialisiert', 'error');
      }
    } catch (error) {
      console.error('Fehler beim Starten der Animation:', error);
      this._setStatus('Fehler: ' + error.message, 'error');
    }
  }

  async _resetVisualization() {
    try {
      if (this.threeJSManager && this.threeJSManager.initialized) {
        await this.threeJSManager.resetVisualization();
        this._setStatus('Visualisierung zurückgesetzt', 'success');
      } else {
        this._setStatus('Three.js nicht initialisiert', 'error');
      }
    } catch (error) {
      console.error('Fehler beim Zurücksetzen der Visualisierung:', error);
      this._setStatus('Fehler: ' + error.message, 'error');
    }
  }

  async _focusOnChanges() {
    try {
      if (this.threeJSManager && this.threeJSManager.initialized) {
        await this.threeJSManager.focusOnChanges();
        this._setStatus('Fokus auf Änderungen', 'success');
      } else {
        this._setStatus('Three.js nicht initialisiert', 'error');
      }
    } catch (error) {
      console.error('Fehler beim Fokussieren auf Änderungen:', error);
      this._setStatus('Fehler: ' + error.message, 'error');
    }
  }

  _handleWindowResize() {
    try {
      if (this.threeJSManager && this.threeJSManager.initialized) {
        this.threeJSManager.handleResize();
      }
    } catch (error) {
      console.error('Fehler bei der Fenstergrößenänderung:', error);
    }
  }

  // Konvertiert Patch-Operationen in das für die Visualisierung erwartete Format
  convertOperationsToPatchFormat(operations) {
    if (!Array.isArray(operations)) {
      console.warn('Keine gültigen Operationen zur Konvertierung:', operations);
      return { metadata: {}, operations: [] };
    }
    
    const convertedOperations = operations.map(op => {
      // Stelle sicher, dass jede Operation die erforderlichen Felder hat
      const convertedOp = {
        type: op.type || 'add',
        entity_type: op.entity_type || op.entityType || 'object',
        entity_id: op.entity_id || op.entityId || 'unknown',
        payload: op.payload || op.changes || {}
      };
      
      // Wenn es Changes statt Payload gibt, konvertiere sie
      if (op.changes && !op.payload) {
        convertedOp.payload = { ...op.changes };
      }
      
      return convertedOp;
    });
    
    return {
      metadata: {
        schema_version: 'patchkit/1.0',
        id: 'patch_' + Math.random().toString(36).slice(2, 10),
        name: 'Konvertierter Patch',
        description: 'Aus Operationen konvertierter Patch',
        author_npub: 'npub0',
        created_at: Math.floor(Date.now() / 1000),
        targets_world: this.worldId || ''
      },
      operations: convertedOperations
    };
  }

  // Initialisiert die Patch-UI-Komponente
  async _initPatchUI() {
    try {
      // Erstelle die Patch-UI-Komponente
      this.patchUI = new PatchUI({
        patchKit: this.patchKit,
        worldId: this.worldId,
        container: document.getElementById('patchUIContainer')
      });
      
      // Übergebe den Editor-Verweis an die Patch-UI
      this.patchUI.setEditor(this);
      
      // Übergebe den PatchVisualizer an die Patch-UI
      if (this.patchVisualizer) {
        this.patchUI.setPatchVisualizer(this.patchVisualizer);
      }
      
      // Übergebe die aktuellen Genesis-Daten an die Patch-UI
      const genesisData = await this._getCurrentGenesisData();
      if (genesisData) {
        this.patchUI.setGenesisData(genesisData);
      }
      
      // Lade die Patches für die Patch-UI
      if (this.worldId) {
        await this.patchUI.load(this.worldId);
      }
      
      // Verbessere die Sichtbarkeit des #patchUIContainer
      const patchUIContainer = document.getElementById('patchUIContainer');
      if (patchUIContainer) {
        // Stelle sicher, dass der Container sichtbar ist, wenn der Patch-Tab aktiv ist
        patchUIContainer.style.display = this.activeTab === 'patch' ? 'block' : 'none';
        
        // Füge einen Header hinzu, falls nicht vorhanden
        if (!patchUIContainer.querySelector('.patch-ui-header')) {
          const header = document.createElement('div');
          header.className = 'patch-ui-header';
          header.innerHTML = `
            <h3>Patch-Verwaltung</h3>
            <p>Erstellen und verwalten Sie Patches für diese Welt</p>
          `;
          patchUIContainer.insertBefore(header, patchUIContainer.firstChild);
        }
        
        // Füge einen Bereich für die Patch-Liste hinzu, falls nicht vorhanden
        if (!patchUIContainer.querySelector('.patch-list-container')) {
          const listContainer = document.createElement('div');
          listContainer.className = 'patch-list-container';
          listContainer.innerHTML = `
            <div class="patch-list-header">
              <h4>Verfügbare Patches</h4>
              <button id="refreshPatchListBtn" class="btn btn-sm">Aktualisieren</button>
            </div>
            <div id="patchList" class="patch-list">
              <!-- Patch-Liste wird hier dynamisch geladen -->
            </div>
          `;
          patchUIContainer.appendChild(listContainer);
          
          // Füge Event-Listener für den Aktualisieren-Button hinzu
          const refreshBtn = document.getElementById('refreshPatchListBtn');
          if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this._refreshPatchList());
          }
        }
        
        // Füge einen Bereich für die Patch-Details hinzu, falls nicht vorhanden
        if (!patchUIContainer.querySelector('.patch-details-container')) {
          const detailsContainer = document.createElement('div');
          detailsContainer.className = 'patch-details-container';
          detailsContainer.innerHTML = `
            <div class="patch-details-header">
              <h4>Patch-Details</h4>
              <button id="closePatchDetailsBtn" class="btn btn-sm">Schließen</button>
            </div>
            <div id="patchDetails" class="patch-details">
              <!-- Patch-Details werden hier dynamisch geladen -->
            </div>
          `;
          patchUIContainer.appendChild(detailsContainer);
          
          // Füge Event-Listener für den Schließen-Button hinzu
          const closeBtn = document.getElementById('closePatchDetailsBtn');
          if (closeBtn) {
            closeBtn.addEventListener('click', () => this._closePatchDetails());
          }
        }
      }
      
      this._setStatus('Patch-UI initialisiert', 'success');
    } catch (error) {
      console.error('Fehler bei der Initialisierung der Patch-UI:', error);
      this._setStatus('Patch-UI Initialisierung fehlgeschlagen: ' + error.message, 'error');
    }
  }
  
  // Aktualisiert die Patch-Liste
  async _refreshPatchList() {
    try {
      if (!this.patchUI) {
        this._setStatus('Patch-UI nicht initialisiert', 'error');
        return;
      }
      
      await this.patchUI.loadPatches();
      this._setStatus('Patch-Liste aktualisiert', 'success');
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Patch-Liste:', error);
      this._setStatus('Fehler beim Aktualisieren: ' + error.message, 'error');
    }
  }
  
  // Schließt die Patch-Details-Ansicht
  _closePatchDetails() {
    try {
      const detailsContainer = document.querySelector('.patch-details-container');
      if (detailsContainer) {
        detailsContainer.style.display = 'none';
      }
      
      const listContainer = document.querySelector('.patch-list-container');
      if (listContainer) {
        listContainer.style.display = 'block';
      }
      
      this._setStatus('Patch-Details geschlossen', 'info');
    } catch (error) {
      console.error('Fehler beim Schließen der Patch-Details:', error);
      this._setStatus('Fehler: ' + error.message, 'error');
    }
  }

  // Methoden für die Patch-Visualisierung
  
  /**
   * Visualisiert einen einzelnen Patch
   * @param {Object} patch - Der zu visualisierende Patch
   * @param {Object} options - Optionen für die Visualisierung
   */
  async visualizePatch(patch, options = {}) {
    try {
      if (!this.patchVisualizer) {
        this._setStatus('Patch-Visualizer nicht initialisiert', 'error');
        return;
      }
      
      if (!this.worldId) {
        this._setStatus('Keine World ID für Patch-Visualisierung', 'error');
        return;
      }
      
      // Lade die Genesis-Welt
      const genesisData = await this._getCurrentGenesisData();
      if (!genesisData) {
        this._setStatus('Konnte Genesis-Daten nicht laden', 'error');
        return;
      }
      
      // Visualisiere den Patch
      const result = await this.patchVisualizer.visualizePatches(
        genesisData,
        [patch],
        options
      );
      
      this._setStatus(`Patch visualisiert: ${result.appliedPatches} Patches angewendet`, 'success');
      return result;
    } catch (error) {
      console.error('Fehler bei der Patch-Visualisierung:', error);
      this._setStatus('Fehler bei der Visualisierung: ' + error.message, 'error');
    }
  }
  
  /**
   * Visualisiert mehrere Patches
   * @param {Array} patches - Die zu visualisierenden Patches
   * @param {Object} options - Optionen für die Visualisierung
   */
  async visualizePatches(patches, options = {}) {
    try {
      if (!this.patchVisualizer) {
        this._setStatus('Patch-Visualizer nicht initialisiert', 'error');
        return;
      }
      
      if (!this.worldId) {
        this._setStatus('Keine World ID für Patch-Visualisierung', 'error');
        return;
      }
      
      // Lade die Genesis-Welt
      const genesisData = await this._getCurrentGenesisData();
      if (!genesisData) {
        this._setStatus('Konnte Genesis-Daten nicht laden', 'error');
        return;
      }
      
      // Visualisiere die Patches
      const result = await this.patchVisualizer.visualizePatches(
        genesisData,
        patches,
        options
      );
      
      this._setStatus(`${result.appliedPatches} Patches visualisiert`, 'success');
      return result;
    } catch (error) {
      console.error('Fehler bei der Patch-Visualisierung:', error);
      this._setStatus('Fehler bei der Visualisierung: ' + error.message, 'error');
    }
  }
  
  /**
   * Setzt die Patch-Visualisierung zurück
   */
  async resetPatchVisualization() {
    try {
      if (!this.patchVisualizer) {
        this._setStatus('Patch-Visualizer nicht initialisiert', 'error');
        return;
      }
      
      this.patchVisualizer.resetVisualization();
      this._setStatus('Patch-Visualisierung zurückgesetzt', 'success');
    } catch (error) {
      console.error('Fehler beim Zurücksetzen der Patch-Visualisierung:', error);
      this._setStatus('Fehler: ' + error.message, 'error');
    }
  }
  
  /**
   * Lädt die aktuellen Genesis-Daten
   * @returns {Object|null} - Die Genesis-Daten oder null bei Fehler
   */
  async _getCurrentGenesisData() {
    try {
      if (!this.worldId) {
        return null;
      }
      
      // Versuche, die Genesis aus dem aktuellen YAML-Text zu laden
      const yamlText = this.getYamlText();
      if (yamlText) {
        const parsedYaml = this.parseYaml();
        if (parsedYaml) {
          return this.normalizeUserYaml(parsedYaml);
        }
      }
      
      // Fallback: Lade die Genesis vom Server
      const genesisEvt = await this.patchKit.io?.genesisPort?.getById
        ? this.patchKit.io.genesisPort.getById(this.worldId)
        : null;
      
      if (genesisEvt) {
        return this.patchKit.genesis.parse(genesisEvt?.yaml || genesisEvt);
      }
      
      return null;
    } catch (error) {
      console.error('Fehler beim Laden der Genesis-Daten:', error);
      return null;
    }
  }
  
  /**
   * Aktualisiert die Pulsier-Animationen für Konflikt-Materialien
   */
  updatePatchVisualizationAnimations() {
    try {
      if (this.patchVisualizer) {
        this.patchVisualizer.updatePulsingAnimations();
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
      if (this.patchVisualizer) {
        return this.patchVisualizer.getPatchInfo();
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

// Optionaler Bootstrap für die Seite
export async function bootstrapPresetEditor() {
  const editor = new PresetEditor({});
  await editor.init();
  return editor;
}
 
try {
  window.bootstrapPresetEditor = bootstrapPresetEditor;
} catch {}