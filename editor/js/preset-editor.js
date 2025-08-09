/**
 * PresetEditor: YAML-Handling, Status-Updates, einfache Render-Hooks
 * Voraussetzungen:
 * - js-yaml via CDN (global jsyaml)
 * - Ajv via CDN (global ajv2020)
 * - PatchKit: ESM-Factory (createApi) ODER bereits fertiges API-Objekt
 * - showToast/escapeHtml aus ./toast.js
 */
 
import { createPatchKitAPI } from './patchkit-wiring.js';
 
export class PresetEditor {
  constructor(opts = {}) {
    this.textarea = opts.textarea || document.getElementById('yaml-editor');
    this.statusEl = opts.statusEl || document.getElementById('status-bar');
    this.canvas = opts.canvas || document.getElementById('preview-canvas');
    this.nostrFactory = opts.nostrFactory || window.NostrServiceFactory;
    this.worldId = null;
    this.patchKit = null;
    this.scene = null; // Platzhalter für Three.js-Szene

    // einfache 3D-Preview-Platzhalterzustände
    this._three = { initialized: false };
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
      // Factory kann create() oder getNostrService() anbieten; unterstütze beides
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

      // 5) Three.js Preview initialisieren (Platzhalter)
      this._initThreePreview();

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
      const resMaybe = this.patchKit?.genesis?.validate
        ? this.patchKit.genesis.validate(normalized)
        : { valid: true, errors: [] };

      const handle = (res) => {
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
      };
 
      if (resMaybe && typeof resMaybe.then === 'function') {
        resMaybe.then(handle).catch(e => {
          console.error('[Validator] Exception:', e);
        });
      } else {
        handle(resMaybe);
      }
    } catch (e) {
      console.error('[Validator] Parse/Normalize Exception:', e);
    }
  }
 
  async loadByWorldIdPrompt() {
    const id = prompt('World ID eingeben:');
    if (!id) return;
    this.worldId = id;
    await this.loadWorldById(id);
  }
 
  async loadWorldById(id) {
    if (!this.patchKit) {
      this._setStatus('PatchKit noch nicht initialisiert.', 'error');
      return;
    }
    try {
      // libs/patchkit/io facade: loadGenesis(id, genesisPort)
      const genesisEvt = await this.patchKit.io?.genesisPort?.getById
        ? this.patchKit.io.genesisPort.getById(id)
        : null;
      if (!genesisEvt) {
        this._setStatus('Keine Genesis für World ID gefunden.', 'info');
        return;
      }
      
      // Prüfe, ob originalYaml vorhanden ist (ursprünglicher YAML-Content)
      if (genesisEvt.originalYaml) {
        // Wenn originalYaml vorhanden ist, verwende es direkt
        this.setYamlText(genesisEvt.originalYaml);
        this._setStatus('World geladen und in YAML eingefügt.', 'success');
        // Parse für die Vorschau
        const worldObj = this.parseYaml();
        await this.updatePreviewFromObject(this.normalizeUserYaml(worldObj));
      } else {
        // Andernfalls parse den YAML-Inhalt wie bisher
        const worldObj = this.patchKit.genesis.parse(genesisEvt?.yaml || genesisEvt);
        const text = this.serializeYaml(this.stripWorldId(worldObj));
        this.setYamlText(text);
        this._setStatus('World geladen und in YAML eingefügt.', 'success');
        await this.updatePreviewFromObject(worldObj);
      }
    } catch (e) {
      this._setStatus('Fehler beim Laden: ' + e.message, 'error');
    }
  }

  async createNewWorld() {
    try {
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
      
      const g = await this.patchKit.genesis.create({
        name: 'Neue Welt',
        author_npub,
        initialEntities: {},
        rules: {}
      });
      
      // Füge ein leeres originalYaml-Feld für neue Welten hinzu
      g.originalYaml = '';
      
      const signed = await this.patchKit.genesis.sign(g);
      const saved = await this.patchKit.io.genesisPort.save(signed);
      this.worldId = saved?.worldId || g?.metadata?.id || null;
      const wInput = document.getElementById('worldIdInput');
      if (wInput) wInput.value = this.worldId || '';
      
      // Setze einen leeren YAML-Content im Editor
      const yamlEditor = document.getElementById('yaml-editor');
      if (yamlEditor) {
        yamlEditor.value = `# Neue Welt
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
      }
      
      if (window.showToast) window.showToast('success', 'Neue Welt erstellt: ' + (this.worldId || 'unbekannt'));
      this._setStatus('Neue Welt erstellt: ' + (this.worldId || 'unbekannt'), 'success');
    } catch (e) {
      console.error(e);
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
      
      const p = await this.patchKit.patch.create({
        targets_world: this.worldId,
        author_npub,
        operations: []
      });
      
      // Speichere den aktuellen YAML-Text im Patch-Objekt
      p.originalYaml = this.getYamlText();
      
      const res = await this.patchKit.patch.validate(p);
      if (!(res?.valid === true || res === true)) {
        const errors = Array.isArray(res?.errors) ? res.errors : [];
        throw new Error('Patch ungültig: ' + JSON.stringify(errors));
      }
      const signed = await this.patchKit.patch.sign(p);
      await this.patchKit.io.patchPort.save(signed);
      if (window.showToast) window.showToast('success', 'Patch gespeichert.');
      this._setStatus('Patch gespeichert.', 'success');
    } catch (e) {
      console.error(e);
      if (window.showToast) window.showToast('error', 'Speichern (Patch) fehlgeschlagen: ' + e.message);
      this._setStatus('Speichern (Patch) fehlgeschlagen: ' + e.message, 'error');
    }
  }
 
  async saveCurrent() {
    if (!this.patchKit) {
      this._setStatus('PatchKit noch nicht initialisiert.', 'error');
      return;
    }
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
          }
        } catch (error) {
          // Fehler beim Laden der Genesis - erstelle einen Patch als Fallback
          console.warn('Fehler beim Aktualisieren der Genesis, erstelle Patch:', error);
          
          const p = await this.patchKit.patch.create({
            targets_world: this.worldId,
            author_npub,
            operations: []
          });
          
          // Speichere den ursprünglichen YAML-Text im Patch-Objekt
          p.originalYaml = yamlText;
          
          const res = await this.patchKit.patch.validate(p);
          const valid = res?.valid === true || res === true;
          if (!valid) {
            const errors = Array.isArray(res?.errors) ? res.errors : [];
            throw new Error('Patch ungültig: ' + JSON.stringify(errors));
          }
          const signed = await this.patchKit.patch.sign(p);
          await this.patchKit.io.patchPort.save(signed);
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
      }
      
      // Nach Speichern Vorschau neu aufbauen
      const parsedAfterSave = this.parseYaml();
      if (parsedAfterSave) await this.updatePreviewFromObject(this.normalizeUserYaml(parsedAfterSave));
    } catch (e) {
      this._setStatus('Speichern fehlgeschlagen: ' + e.message, 'error');
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

    // Fallback, falls leer
    if (!Object.keys(entities).length) {
      out.entities = { misc: { item1: obj } };
    }

    // Name/Description auf metadata spiegeln
    out.metadata.name = obj.name || out.metadata.name;
    if (obj.description) out.metadata.description = obj.description;

    return out;
  }

  _initThreePreview() {
    try {
      const canvas = this.canvas;
      if (!canvas) return;
      this._three.initialized = true;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width || 400, canvas.height || 300);
        ctx.fillStyle = '#0f0';
        ctx.font = '14px monospace';
        ctx.fillText('Preview bereit', 10, 20);
      }
      const loading = document.getElementById('loadingIndicator');
      if (loading) loading.style.display = 'none';
    } catch {}
  }

  async updatePreviewFromYaml() {
    try {
      const obj = this.parseYaml();
      if (!obj) return;
      await this.updatePreviewFromObject(this.normalizeUserYaml(obj));
    } catch {}
  }

  async updatePreviewFromObject(genesisLike) {
    try {
      const entities = genesisLike?.entities || {};
      let count = 0;
      for (const k of Object.keys(entities)) {
        const bucket = entities[k] || {};
        count += Object.keys(bucket).length;
      }
      const oc = document.getElementById('objectCount');
      if (oc) oc.textContent = count + ' Objekte';

      if (this.canvas) {
        const ctx = this.canvas.getContext('2d');
        if (ctx) {
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
      }
    } catch {}
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