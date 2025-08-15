/**
 * PresetEditor Core Module
 * Hauptklasse und grundlegende Initialisierung
 *
 * Diese Klasse ist das Herzstück des PresetEditor-Systems und koordiniert alle anderen Module.
 * Sie initialisiert die Submodule, bindet Events und stellt die zentrale API für die Interaktion
 * mit dem Editor zur Verfügung.
 *
 * @example
 * // Neuen Editor erstellen
 * const editor = new PresetEditor({
 *   textarea: document.getElementById('world-yaml-editor'),
 *   statusEl: document.getElementById('status-bar'),
 *   canvas: document.getElementById('preview-canvas')
 * });
 *
 * // Editor initialisieren
 * await editor.init();
 */
import { YamlProcessor } from './yaml-processor.js';
import { WorldManager } from './world-manager.js';
import { PatchManager } from './patch-manager.js';
import { PreviewRenderer } from './preview-renderer.js';
import { UIManager } from './ui-manager.js';

export class PresetEditor {
  /**
   * Erstellt eine neue PresetEditor-Instanz
   * @param {Object} opts - Konfigurationsoptionen
   * @param {HTMLTextAreaElement} [opts.textarea] - Textarea für den World-Editor
   * @param {HTMLElement} [opts.statusEl] - Statusanzeige-Element
   * @param {HTMLCanvasElement} [opts.canvas] - Canvas für die 3D-Vorschau
   * @param {Object} [opts.nostrFactory] - NostrServiceFactory für die Kommunikation
   */
  constructor(opts = {}) {
    console.log('[DEBUG] PresetEditor Konstruktor aufgerufen mit opts:', opts);
    // Grundlegende DOM-Elemente
    this.worldTextarea = opts.textarea || document.getElementById('world-yaml-editor');
    this.patchTextarea = document.getElementById('patch-yaml-editor');
    this.textarea = this.worldTextarea; // Standardmäßig den World-Editor verwenden
    this.statusEl = opts.statusEl || document.getElementById('status-bar');
    this.canvas = opts.canvas || document.getElementById('preview-canvas');
    
    // Debug: Überprüfe das Canvas-Element
    console.log('[DEBUG] Canvas-Element:', this.canvas);
    console.log('[DEBUG] Canvas-Typ:', typeof this.canvas);
    if (this.canvas) {
      console.log('[DEBUG] Canvas-Tag-Name:', this.canvas.tagName);
      console.log('[DEBUG] Canvas-Client-Width:', this.canvas.clientWidth);
      console.log('[DEBUG] Canvas-Client-Height:', this.canvas.clientHeight);
    }
    
    this.nostrFactory = opts.nostrFactory || window.NostrServiceFactory;
    
    // Zustandsvariablen
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

    // Interaktions-Status (Preview-Canvas)
    this.interactionMode = 'none';
    this.selectedObjectType = 'tree_simple';
    this.tmpPathPoints = [];
    
    // Submodule initialisieren
    console.log('[DEBUG] Initialisiere Submodule');
    this.yamlProcessor = new YamlProcessor(this);
    this.worldManager = new WorldManager(this);
    this.patchManager = new PatchManager(this);
    this.previewRenderer = new PreviewRenderer(this);
    this.uiManager = new UIManager(this);
    
    // Event-Bindings
    this._bindBasicEvents();
    this._bindInputEvents();
    console.log('[DEBUG] PresetEditor Konstruktor abgeschlossen');
  }
  
  /**
   * Bindet die Input-Events für die YAML-Editoren mit Debouncing
   * @private
   */
  _bindInputEvents() {
    // Live-Validierung bei Eingabe + Preview-Update für beide Editoren
    let vTimer = null;
    
    // Event-Listener für World-Editor
    this.worldTextarea?.addEventListener('input', () => {
      clearTimeout(vTimer);
      vTimer = setTimeout(async () => {
        if (this.activeTab === 'world') {
          await this._processYamlInput();
        }
      }, 300);
    });
    
    // Event-Listener für Patch-Editor
    this.patchTextarea?.addEventListener('input', () => {
      clearTimeout(vTimer);
      vTimer = setTimeout(async () => {
        if (this.activeTab === 'patch') {
          await this._processYamlInput();
        }
      }, 300);
    });
  }
  
  /**
   * Verarbeitet die YAML-Eingabe mit Debouncing und Validierung
   * @private
   */
  async _processYamlInput() {
    try {
      
      const raw = this.getYamlText();
      
      const obj = this.yamlProcessor.parseYaml();
      
      if (!obj) {
        return;
      }
      
      // Unterschiedliche Verarbeitung je nach aktiven Tab
      if (this.activeTab === 'world') {
        const normalized = this.yamlProcessor.normalizeUserYaml(obj);
        console.log('[DEBUG] Normalisierte Welt-Daten:', normalized);
        
        const res = this.patchKit?.genesis?.validate
          ? await this.patchKit.genesis.validate(normalized)
          : { valid: true, errors: [] };
        const valid = res?.valid === true || res === true;
        
        if (valid) {
          this._setStatus('YAML gültig', 'success');
          this.uiManager._setValidationErrorsUI([]);
          await this.previewRenderer.updatePreviewFromObject(normalized);
        } else {
          const errors = Array.isArray(res?.errors) ? res.errors : [];
          this._setStatus('YAML ungültig – Details unten.', 'error');
          this.uiManager._setValidationErrorsUI(errors, raw);
        }
      } else if (this.activeTab === 'patch') {
        // Prüfe zuerst, ob eine World ID verfügbar ist
        if (!this.worldId) {
          this._setStatus('Keine World ID gesetzt. Bitte laden oder erstellen Sie zuerst eine Welt.', 'error');
          return;
        }

        const normalizedPatch = this.yamlProcessor.normalizePatchYaml(obj);

        // Stelle sicher, dass targets_world gesetzt ist (sonst schlägt die Schema-Validierung fehl)
        if (normalizedPatch && normalizedPatch.metadata) {
          normalizedPatch.metadata.targets_world = this.worldId;
        }

        // Validiere den Patch
        if (this.patchKit && this.patchKit.patch && typeof this.patchKit.patch.validate === 'function') {
          try {
            const patchValidation = await this.patchKit.patch.validate(normalizedPatch);
            console.log('[DEBUG] Patch-Validierungsergebnis:', patchValidation);
            
            if (patchValidation?.valid === true || patchValidation === true) {
              this._setStatus('Patch gültig', 'success');
              this.uiManager._setValidationErrorsUI([]);
              
              // Aktualisiere die Patch-Vorschau
              await this.patchManager._updatePatchPreview(normalizedPatch);
            } else {
              const errors = Array.isArray(patchValidation?.errors) ? patchValidation.errors : [];
              this._setStatus('Patch ungültig – Details unten.', 'error');
              this.uiManager._setValidationErrorsUI(errors, raw);
              
              // Aktualisiere trotzdem die Vorschau auch bei ungültigen Patches
              try {
                await this.patchManager._updatePatchPreview(normalizedPatch);
              } catch (previewError) {
                console.warn('[DEBUG] Konnte Vorschau für ungültigen Patch nicht aktualisieren:', previewError);
              }
            }
          } catch (validationError) {
            console.error('[DEBUG] Fehler bei der Patch-Validierung:', validationError);
            this._setStatus('Patch-Validierungsfehler: ' + validationError.message, 'error');
            
            // Versuche trotzdem eine Vorschau zu zeigen
            try {
              await this.patchManager._updatePatchPreview(normalizedPatch);
            } catch (previewError) {
              console.warn('[DEBUG] Konnte Vorschau nach Validierungsfehler nicht aktualisieren:', previewError);
            }
          }
        } else {
          console.warn('[DEBUG] Keine Patch-Validierungsfunktion verfügbar');
          this._setStatus('Patch-Validierung nicht verfügbar', 'info');
          
          // Aktualisiere trotzdem die Vorschau
          await this.patchManager._updatePatchPreview(normalizedPatch);
        }
      }
    } catch (e) {
      console.error('[DEBUG] Fehler bei der YAML-Verarbeitung:', e);
      this._setStatus('YAML ungültig – Details unten.', 'error');
    }
  }

  /**
   * Initialisiert den PresetEditor mit allen Submodulen
   * @returns {Promise<void>}
   */
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
      const { createPatchKitAPI } = await import('../patchkit-wiring.js');
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
        console.log('[DEBUG] Versuche PatchKit-Import über Importmap');
        const mod = await import('patchkit');
        console.log('[DEBUG] PatchKit-Modul erfolgreich geladen:', mod);
        PK = mod?.default ?? mod;
        console.log('[DEBUG] PatchKit-API:', PK);
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
      await this.previewRenderer._initThreePreview();
      
      // 6) Patch-Visualizer initialisieren
      await this.patchManager._initPatchVisualizer();
      
      // 7) Patch-UI initialisieren
      await this.uiManager._initPatchUI();

      // 8) Interaktions-Controls (Modus/Objekt-Typ) im Preview-Header
      if (typeof this.uiManager.initInteractionControls === 'function') {
        this.uiManager.initInteractionControls();
      }

      this._setStatus('Bereit.', 'info');
    } catch (err) {
      this._setStatus('Fehler bei Initialisierung: ' + err.message, 'error');
    }
  }

  /**
   * Bindet grundlegende UI-Events
   * @private
   */
  _bindBasicEvents() {
    if (this._basicEventsBound) return;
    const btnValidate = document.getElementById('btn-validate');
    if (btnValidate) btnValidate.addEventListener('click', () => this.yamlProcessor.validateYaml());

    // Entfernt: Der Button 'btn-save' existiert nicht im HTML und führt zu
    // einem unnötigen zweiten Aufruf von saveCurrent().

    const btnLoad = document.getElementById('btn-load');
    if (btnLoad) btnLoad.addEventListener('click', () => this.worldManager.loadByWorldIdPrompt());
    
    // Buttons aus world-editor.html
    const newWorldBtn = document.getElementById('newWorldBtn');
    if (newWorldBtn) newWorldBtn.addEventListener('click', () => this.worldManager.createNewWorld());
    
    const loadWorldBtn = document.getElementById('loadWorldBtn');
    if (loadWorldBtn) loadWorldBtn.addEventListener('click', () => this.worldManager.loadWorldByIdFromInput());
    
    // Idempotente Bindung des Save-Buttons (nur einmal)
    this._bindSaveButton();
    
    const savePatchBtn = document.getElementById('savePatchBtn');
    if (savePatchBtn && !savePatchBtn._listenerAdded) {
      savePatchBtn.addEventListener('click', () => this.patchManager.saveAsPatch());
      savePatchBtn._listenerAdded = true;
    }
    
    // Render-Button
    const renderBtn = document.getElementById('renderBtn');
    if (renderBtn) renderBtn.addEventListener('click', () => this.previewRenderer.renderWorld());
    
    // Reset-Button
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) resetBtn.addEventListener('click', () => this.previewRenderer.resetWorld());
    
    // Tab-System Event-Listener
    this.uiManager._bindTabEvents();
    
    // Patch-Visualisierungs-Event-Listener
    this.uiManager._bindPatchVisualizationEvents();
    
    // Fenstergrößenänderung behandeln
    window.addEventListener('resize', () => this.previewRenderer._handleWindowResize());
  }

  /**
   * Setzt eine Statusmeldung in der Statusleiste
   * @param {string} msg - Die anzuzeigende Nachricht
   * @param {string} [type='info'] - Der Typ der Nachricht ('info', 'success', 'error')
   * @private
   */
  // -------------------------------------------------------------------------
  // Bindet den Save-Button nur einmalig
  // -------------------------------------------------------------------------
  _bindSaveButton() {
    const saveGenesisBtn = document.getElementById('saveGenesisBtn');
    if (saveGenesisBtn && !saveGenesisBtn._listenerAdded) {
      saveGenesisBtn.addEventListener('click', async () => {
        try {
          // Wenn der Patch-Tab aktiv ist, speichere als Patch – NICHT als Genesis!
          if (this.activeTab === 'patch') {
            await this.patchManager.saveAsPatch();
          } else {
            // sonst aktuelle Welt (Genesis) speichern
            await this.worldManager.saveCurrent?.() ?? await this.worldManager.saveGenesis?.();
          }
        } catch (e) {
          console.error('[Core] Fehler beim Speichern:', e);
          this._setStatus('Speichern fehlgeschlagen: ' + e.message, 'error');
        }
      });
      // Flag setzen, damit nicht erneut gebunden wird
      saveGenesisBtn._listenerAdded = true;
    }
  }

  _setStatus(msg, type = 'info') {
    // zentrale Statusbar
    if (this.statusEl) this.statusEl.textContent = msg;
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

  /**
   * Gibt den aktuellen YAML-Text des aktiven Editors zurück
   * @returns {string} Der YAML-Text
   */
  getYamlText() {
    // Verwende den richtigen Editor basierend auf dem aktiven Tab
    if (this.activeTab === 'world') {
      return this.worldTextarea ? this.worldTextarea.value : '';
    } else if (this.activeTab === 'patch') {
      return this.patchTextarea ? this.patchTextarea.value : '';
    }
    return '';
  }

  /**
   * Setzt den YAML-Text des aktiven Editors
   * @param {string} text - Der zu setzende YAML-Text
   */
  setYamlText(text) {
    // Verwende den richtigen Editor basierend auf dem aktiven Tab
    if (this.activeTab === 'world') {
      if (this.worldTextarea) this.worldTextarea.value = text;
    } else if (this.activeTab === 'patch') {
      if (this.patchTextarea) this.patchTextarea.value = text;
    }
  }

  // === Interaktionslogik: Klick auf Terrain verarbeitet YAML-Änderungen ===

  /**
   * Wird vom ThreeJSManager aufgerufen, wenn auf das Terrain geklickt wurde.
   * @param {{ point: {x:number,y:number,z:number}, object: any, event: MouseEvent }} hitInfo
   * @private
   */
  async _handleTerrainClick(hitInfo) {
    try {
      const mode = this.interactionMode || 'none';
      if (mode === 'place_object') {
        await this._placeObjectAt(hitInfo.point);
      } else if (mode === 'path_add') {
        this._addPathPoint(hitInfo.point);
      }
      // path_finish / path_cancel werden über UI-Select sofort behandelt
    } catch (e) {
      console.error('[Editor] Fehler bei _handleTerrainClick:', e);
      this._setStatus('Interaktionsfehler: ' + e.message, 'error');
    }
  }

  /**
   * Fügt einen Punkt zur temporären Pfadliste hinzu.
   * @param {{x:number,y:number,z:number}} point
   * @private
   */
  _addPathPoint(point) {
    const p = this._roundPoint(point);
    this.tmpPathPoints.push([p.x, p.y, p.z]);
    if (window.showToast) window.showToast('info', `Path-Punkt hinzugefügt: [${p.x}, ${p.y}, ${p.z}]`);
  }

  /**
   * UI-Aktion "Path (Finish)": schreibt gesammelte Punkte als Pfad ins YAML.
   * @private
   */
  async _finishPathFromUI() {
try {
  if (!Array.isArray(this.tmpPathPoints) || this.tmpPathPoints.length < 2) {
    if (window.showToast) window.showToast('warning', 'Mindestens 2 Punkte für einen Pfad benötigt.');
    return;
  }
  let obj = this.yamlProcessor.parseYaml();
  if (!obj || typeof obj !== 'object') obj = {};

  // Pfade sind Teil von terrain: terrain.paths: [...]
  if (!obj.terrain || typeof obj.terrain !== 'object') obj.terrain = {};
  if (!Array.isArray(obj.terrain.paths)) obj.terrain.paths = [];
  obj.terrain.paths.push({ points: this.tmpPathPoints.slice(), smooth: true });

  const yaml = YamlProcessor.safeYamlDump(obj);
  await this._applyYamlChange(yaml);

  // Aufräumen
  this.tmpPathPoints = [];
  if (window.showToast) window.showToast('success', 'Pfad eingefügt.');
} catch (e) {
  console.error('[Editor] Fehler bei Path-Finish:', e);
  if (window.showToast) window.showToast('error', 'Pfad konnte nicht eingefügt werden: ' + e.message);
}
}

  /**
   * UI-Aktion "Path (Cancel)": leert temporäre Punkte.
   * @private
   */
  _cancelPathFromUI() {
    this.tmpPathPoints = [];
    if (window.showToast) window.showToast('info', 'Path-Aufnahme abgebrochen.');
  }

  /**
   * Fügt ein Objekt an der gegebenen Position in das YAML (Autorenformat) ein.
   * @param {{x:number,y:number,z:number}} point
   * @private
   */
  async _placeObjectAt(point) {
    const p = this._roundPoint(point);
    try {
      let obj = this.yamlProcessor.parseYaml();
      if (!obj || typeof obj !== 'object') obj = {};

      // Autorenformat: objects als Array
      if (!Array.isArray(obj.objects)) obj.objects = Array.isArray(obj.objects) ? obj.objects : [];

      const type = this.selectedObjectType || 'tree_simple';
      obj.objects.push({
        type,
        position: [p.x, p.y, p.z]
      });

      const yaml = YamlProcessor.safeYamlDump(obj);
      await this._applyYamlChange(yaml);
      if (window.showToast) window.showToast('success', `Objekt eingefügt: ${type} @ [${p.x}, ${p.y}, ${p.z}]`);
    } catch (e) {
      console.error('[Editor] Fehler beim Einfügen des Objekts:', e);
      if (window.showToast) window.showToast('error', 'Objekt konnte nicht eingefügt werden: ' + e.message);
    }
  }

  /**
   * Setzt YAML-Text und triggert die Verarbeitungspipeline sofort.
   * @param {string} yaml
   * @private
   */
  async _applyYamlChange(yaml) {
    // Immer in den World-Editor schreiben
    if (this.worldTextarea) {
      this.worldTextarea.value = yaml;
      // Direktes Processing statt auf Debounce zu warten
      const prevTab = this.activeTab;
      this.activeTab = 'world';
      await this._processYamlInput();
      this.activeTab = prevTab;
      // Zusätzlich ein Input-Event dispatchen (für Listener anderer Teile)
      try {
        const ev = new Event('input', { bubbles: true, cancelable: true });
        this.worldTextarea.dispatchEvent(ev);
      } catch {}
    }
  }

  /**
   * Rundet eine THREE.Vector3-ähnliche Position auf 2 Dezimalstellen.
   * @param {{x:number,y:number,z:number}} v
   * @returns {{x:number,y:number,z:number}}
   * @private
   */
  _roundPoint(v) {
    const r = (n) => Math.round(n * 100) / 100;
    return { x: r(v.x), y: r(v.y), z: r(v.z) };
  }
}

/**
 * Bootstrap-Funktion für die Initialisierung des PresetEditors
 * @returns {Promise<PresetEditor>} Die initialisierte PresetEditor-Instanz
 */
export async function bootstrapPresetEditor() {
  const editor = new PresetEditor({});
  await editor.init();
  return editor;
}
 
// Mache den PresetEditor global verfügbar, damit andere Module darauf zugreifen können
try {
  window.bootstrapPresetEditor = bootstrapPresetEditor;
  
  window.addEventListener('load', () => {
    if (window.bootstrapPresetEditor) {
      window.bootstrapPresetEditor().then(editor => {
        window.presetEditor = editor;
        console.log('[DEBUG] PresetEditor global verfügbar gemacht');
      }).catch(err => {
        console.error('[DEBUG] Fehler beim globalen Verfügbar machen des PresetEditors:', err);
      });
    }
  });
} catch {}