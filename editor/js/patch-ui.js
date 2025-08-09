/**
 * Patch-UI v1
 * - Listet Patches, Filter
 * - Preview-Slider: "bis Patch X"
 * - Detail-Karte mit Include-Toggle
 * - computeOrder mit Cycle-Markierung und Konfliktanzeige
 * Voraussetzungen:
 * - PatchKit API-Objekt: { genesis, patch, world }
 * - showToast/escapeHtml
 */

import { PatchVisualizer } from './patch-visualizer.js';

export class PatchUI {
  constructor(opts = {}) {
    this.patchKit = opts.patchKit; // erwartet createPatchKitAPI(...) Ergebnis
    this.worldId = opts.worldId || null;
    this.patchVisualizer = opts.patchVisualizer || null;
    this.genesisData = opts.genesisData || null;

    // UI-Refs (IDs aus world-editor.html)
    this.listEl = opts.listEl || document.getElementById('patch-list');
    // robust: akzeptiere sowohl "patchFilter" (HTML) als auch "patch-filter" (älterer Code)
    this.filterEl = opts.filterEl || document.getElementById('patchFilter') || document.getElementById('patch-filter');
    this.rangeEl = opts.rangeEl || document.getElementById('preview-range');
    this.detailEl = opts.detailEl || document.getElementById('patch-detail');
    this.conflictsEl = opts.conflictsEl || document.getElementById('conflicts-panel');
    this.applyUntilValueEl = document.getElementById('applyUntilValue');

    // interner Zustand
    this.patches = [];         // rohe Patches
    this.filtered = [];        // gefilterte Anzeige
    this.selectedId = null;    // ausgewählter Patch
    this.includes = new Map(); // id -> boolean (für Preview)
    this.order = [];           // anzuzeigende Reihenfolge (nach computeOrder)

    this._bindEvents();
  }

  _bindEvents() {
    if (this.filterEl) {
      this.filterEl.addEventListener('input', () => this._applyFilter());
    }
    if (this.rangeEl) {
      this.rangeEl.addEventListener('input', () => {
        if (this.applyUntilValueEl) {
          const n = Number(this.rangeEl.value || 0);
          this.applyUntilValueEl.textContent = `${n}/${this.order.length}`;
        }
        this.renderPreview();
      });
    }
  }

  async load(worldId) {
    if (!this.patchKit) throw new Error('PatchKit nicht initialisiert');
    if (!worldId && !this.worldId) throw new Error('World ID fehlt');
    this.worldId = worldId || this.worldId;

    try {
      const list = await this.patchKit.io.patchPort.listPatchesByWorld(this.worldId);
      // Normalisieren/Parsen falls nötig
      this.patches = Array.isArray(list) ? list.map(x => this._ensurePatchObject(x)) : [];
      // Initial: alle included
      this.includes = new Map(this.patches.map(p => [p.id, true]));
      await this._computeOrderMarkCycles();
      this._applyFilter();
      this._setupRange();
      this.renderList();
      this.renderDetail();
      this.renderConflicts();
      this.renderPreview();
      if (window.showToast) window.showToast('success', 'Patches geladen.');
    } catch (e) {
      if (window.showToast) window.showToast('error', 'Fehler beim Laden der Patches: ' + e.message);
    }
  }

  _ensurePatchObject(raw) {
    try {
      // PatchKit.patch.parse kann Events in Objekte überführen; wenn vorhanden nutzen
      if (this.patchKit?.patch?.parse) {
        const parsed = this.patchKit.patch.parse(raw);
        if (parsed && !parsed.id) {
          parsed.id = parsed?.metadata?.id || parsed?.metadata?.patch_id || null;
        }
        return parsed;
      }
    } catch {}
    // Fallback: sicherstellen, dass eine id vorhanden ist
    const p = { ...raw };
    if (!p.id) p.id = p?.metadata?.id || p?.metadata?.patch_id || null;
    return p;
  }

  // Erstellt einen Patch aus YAML-Änderungen
  async createPatchFromYamlChanges(originalYaml, modifiedYaml, worldId) {
    try {
      // Parse beide YAML-Dateien
      const original = this.parseYaml(originalYaml);
      const modified = this.parseYaml(modifiedYaml);
      
      // Erstelle Operationen aus den Änderungen
      const operations = this.createPatchOperations(original, modified);
      
      // Erstelle das Patch-Objekt
      const patch = await this.patchKit.patch.create({
        name: "Editor-Änderungen",
        description: "Änderungen aus dem YAML-Editor",
        author_npub: await this.getAuthorNpub(),
        targets_world: worldId,
        operations
      });
      
      // Speichere den ursprünglichen YAML-Text
      patch.originalYaml = modifiedYaml;
      
      // Validiere und speichere
      const res = await this.patchKit.patch.validate(patch);
      if (!res.valid) throw new Error('Patch ungültig');
      
      const signed = await this.patchKit.patch.sign(patch);
      await this.patchKit.io.patchPort.save(signed);
      
      return patch;
    } catch (e) {
      console.error('Fehler beim Erstellen des Patches aus YAML-Änderungen:', e);
      throw e;
    }
  }

  // Parse YAML-Text
  parseYaml(yamlText) {
    if (!yamlText) return {};
    try {
      return jsyaml.load(yamlText) || {};
    } catch (e) {
      console.error('YAML Parse-Fehler:', e);
      return {};
    }
  }

  // Erstellt Operationen aus den Änderungen zwischen zwei YAML-Objekten
  createPatchOperations(original, modified) {
    const operations = [];
    
    // Vergleiche Arrays von Objekten
    const compareArrays = (originalArray, modifiedArray, entityType) => {
      const originalMap = new Map();
      const modifiedMap = new Map();
      
      // Erstelle Maps für einfachen Vergleich
      if (Array.isArray(originalArray)) {
        originalArray.forEach((item, index) => {
          const key = item.id || `${entityType}_${index}`;
          originalMap.set(key, item);
        });
      }
      
      if (Array.isArray(modifiedArray)) {
        modifiedArray.forEach((item, index) => {
          const key = item.id || `${entityType}_${index}`;
          modifiedMap.set(key, item);
        });
      }
      
      // Finde hinzugefügte Objekte
      for (const [key, item] of modifiedMap) {
        if (!originalMap.has(key)) {
          // Vereinheitliche Attributnamen: type → kind
          const payload = { ...item };
          if (payload.type && !payload.kind) payload.kind = payload.type;
          delete payload.type;
          
          operations.push({
            type: 'add',
            entity_type: entityType.slice(0, -1), // Entferne das 's' am Ende
            entity_id: key,
            payload
          });
        }
      }
      
      // Finde gelöschte Objekte
      for (const [key, item] of originalMap) {
        if (!modifiedMap.has(key)) {
          operations.push({
            type: 'delete',
            entity_type: entityType.slice(0, -1), // Entferne das 's' am Ende
            entity_id: key
          });
        }
      }
      
      // Finde aktualisierte Objekte
      for (const [key, originalItem] of originalMap) {
        if (modifiedMap.has(key)) {
          const modifiedItem = modifiedMap.get(key);
          const changes = {};
          
          // Vergleiche Eigenschaften
          for (const [prop, value] of Object.entries(modifiedItem)) {
            if (originalItem[prop] !== value) {
              changes[prop] = value;
            }
          }
          
          if (Object.keys(changes).length > 0) {
            operations.push({
              type: 'update',
              entity_type: entityType.slice(0, -1), // Entferne das 's' am Ende
              entity_id: key,
              changes
            });
          }
        }
      }
    };
    
    // Vergleiche Objekte
    const compareObjects = (originalObj, modifiedObj, entityType, entityId) => {
      const changes = {};
      
      for (const [prop, value] of Object.entries(modifiedObj || {})) {
        if (originalObj?.[prop] !== value) {
          changes[prop] = value;
        }
      }
      
      if (Object.keys(changes).length > 0) {
        operations.push({
          type: 'update',
          entity_type: entityType,
          entity_id: entityId,
          changes
        });
      }
    };
    
    // Vergleiche die verschiedenen Entity-Typen
    compareArrays(original.objects, modified.objects, 'objects');
    compareArrays(original.portals, modified.portals, 'portals');
    compareArrays(original.personas, modified.personas, 'personas');
    
    compareObjects(original.environment, modified.environment, 'environment', 'env1');
    compareObjects(original.terrain, modified.terrain, 'terrain', 't1');
    compareObjects(original.camera, modified.camera, 'camera', 'cam1');
    
    // Vergleiche Extensions
    if (original.extensions || modified.extensions) {
      const originalExtensions = original.extensions || {};
      const modifiedExtensions = modified.extensions || {};
      
      // Finde hinzugefügte oder aktualisierte Extensions
      for (const [key, value] of Object.entries(modifiedExtensions)) {
        if (originalExtensions[key] !== value) {
          const payload = typeof value === 'object' ? { ...value, name: key } : { name: key, value };
          
          operations.push({
            type: originalExtensions[key] ? 'update' : 'add',
            entity_type: 'extension',
            entity_id: `extension_${key}`,
            payload
          });
        }
      }
      
      // Finde gelöschte Extensions
      for (const key of Object.keys(originalExtensions)) {
        if (!modifiedExtensions[key]) {
          operations.push({
            type: 'delete',
            entity_type: 'extension',
            entity_id: `extension_${key}`
          });
        }
      }
    }
    
    return operations;
  }

  // Ermittelt die aktuelle Autor-Npub
  async getAuthorNpub() {
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
    
    return author_npub;
  }

  async _computeOrderMarkCycles() {
    // computeOrder erwartet vollständige Patch-Objekte (mit metadata.id/depends_on)
    const { ordered, cycles } = await this.patchKit.world.computeOrder(this.patches, { onCycle: 'mark' });

    // Liste der angezeigten IDs extrahieren (metadata.id bevorzugt, Fallback p.id)
    this.order = (ordered || [])
      .map(p => p?.metadata?.id || p?.id)
      .filter(Boolean);

    // Cycle-Markierung auf Patches spiegeln
    const cycleNodes = new Set();
    if (Array.isArray(cycles)) {
      for (const c of cycles) {
        const nodes = Array.isArray(c?.nodes) ? c.nodes : (Array.isArray(c) ? c : []);
        for (const nid of nodes) cycleNodes.add(nid);
      }
    }
    for (const p of this.patches) {
      const pid = p?.metadata?.id || p?.id;
      p._inCycle = pid ? cycleNodes.has(pid) : false;
    }

    if (cycleNodes.size && window.showToast) {
      window.showToast('error', `Zyklen erkannt (${cycleNodes.size}). Reihenfolge ggf. unvollständig.`);
    }

    // Konfliktliste optional, falls computeOrder diese liefert (MVP liefert nur cycles)
    this._conflicts = [];
  }

  _applyFilter() {
    const q = (this.filterEl?.value || '').toLowerCase().trim();
    if (!q) {
      this.filtered = [...this.patches];
    } else {
      this.filtered = this.patches.filter(p => {
        const name = (p?.metadata?.name || '').toLowerCase();
        const auth = (p?.metadata?.author || '').toLowerCase();
        return name.includes(q) || auth.includes(q) || String(p.id).includes(q);
      });
    }
    this.renderList();
  }

  _setupRange() {
    if (!this.rangeEl) return;
    this.rangeEl.min = '0';
    this.rangeEl.max = String(Math.max(0, this.order.length));
    if (Number(this.rangeEl.value) > this.order.length) {
      this.rangeEl.value = String(this.order.length);
    }
    // Standard: bis zum Ende previewen, wenn kein Wert gesetzt ist
    if ((!this.rangeEl.value || this.rangeEl.value === '0') && this.order.length > 0) {
      this.rangeEl.value = String(this.order.length);
    }
    if (this.applyUntilValueEl) {
      const n = Number(this.rangeEl.value || 0);
      this.applyUntilValueEl.textContent = `${n}/${this.order.length}`;
    }
  }

  toggleInclude(id, value) {
    this.includes.set(id, !!value);
    this.renderList();   // aktualisiere Toggle-Status
    this.renderPreview(); 
  }

  selectPatch(id) {
    this.selectedId = id;
    this.renderList();
    this.renderDetail();
  }

  renderList() {
    if (!this.listEl) return;
    this.listEl.innerHTML = '';

    const byId = new Map(this.patches.map(p => [p.id, p]));
    for (const id of this.order) {
      const p = byId.get(id);
      if (!p) continue;
      if (!this.filtered.includes(p)) continue;
      const li = document.createElement('li');
      li.className = 'patch-item' + (this.selectedId === p.id ? ' selected' : '');
      li.dataset.id = p.id;

      const inCycle = p._inCycle ? '<span class="cycle-badge">cycle</span>' : '';
      const checked = this.includes.get(p.id) ? 'checked' : '';
      li.innerHTML =
        '<div class="row">' +
          `<label class="include-toggle"><input type="checkbox" data-inc="${p.id}" ${checked}> include</label>` +
          `<span class="name">${this._esc(p?.metadata?.name || p.id)}</span>` +
          inCycle +
        '</div>' +
        `<div class="meta">by ${this._esc(p?.metadata?.author || p?.metadata?.author_npub || 'unknown')} · ${this._esc(p?.metadata?.date || '')}</div>`;

      li.addEventListener('click', (ev) => {
        // Checkbox-Klick nicht Doppel-behandeln
        if (ev.target && ev.target.matches('input[type="checkbox"]')) return;
        this.selectPatch(p.id);
      });
      {
        const cb = li.querySelector('input[type="checkbox"]');
        if (cb) {
          cb.addEventListener('change', (ev) => {
            this.toggleInclude(p.id, ev.target.checked);
          });
        }
      }

      this.listEl.appendChild(li);
    }
  }

  renderDetail() {
    if (!this.detailEl) return;
    this.detailEl.innerHTML = '';
    const p = this.patches.find(x => x.id === this.selectedId);
    if (!p) {
      this.detailEl.innerHTML = '<div class="empty">Kein Patch ausgewählt.</div>';
      return;
    }
    const deps = (p?.metadata?.depends_on || []).map(d => this._esc(d)).join(', ');
    this.detailEl.innerHTML =
      `<div class="card">
         <div class="title">${this._esc(p?.metadata?.name || p.id)}</div>
         <div class="row">Author: ${this._esc(p?.metadata?.author || 'unknown')}</div>
         <div class="row">Date: ${this._esc(p?.metadata?.date || '')}</div>
         <div class="row">depends_on: ${deps || '–'}</div>
       </div>`;
  }

  renderConflicts() {
    if (!this.conflictsEl) return;
    const conflicts = this._conflicts || [];
    if (!conflicts.length) {
      this.conflictsEl.innerHTML = '<div class="empty">Keine Konflikte erkannt.</div>';
      return;
    }
    const ul = document.createElement('ul');
    for (const c of conflicts) {
      const li = document.createElement('li');
      li.textContent = typeof c === 'string' ? c : JSON.stringify(c);
      ul.appendChild(li);
    }
    this.conflictsEl.innerHTML = '';
    this.conflictsEl.appendChild(ul);
  }

  async renderPreview() {
    // Erzeuge Vorschau der Anwendung bis zum N-ten Patch unter Berücksichtigung includes
    if (!this.patchKit) return;
    const n = this.rangeEl ? Number(this.rangeEl.value || 0) : this.order.length;
    const upTo = this.order.slice(0, n);
 
    const byId = new Map(this.patches.map(p => [p.id, p]));
    const selectedPatches = [];
    for (const id of upTo) {
      if (this.includes.get(id)) {
        const p = byId.get(id);
        if (p) selectedPatches.push(p);
      }
    }
 
    try {
      // Wenn Genesis-Daten und PatchVisualizer vorhanden sind, visualisiere die Patches
      if (this.genesisData && this.patchVisualizer) {
        await this.patchVisualizer.visualizePatches(this.genesisData, selectedPatches, {
          showConflicts: true,
          highlightIntensity: 0.7
        });
      } else {
        // Fallback: Nur die Patch-Anwendung ohne Visualisierung
        const base = { entities: {} }; // minimale Basis-Welt
        await this.patchKit.world.applyPatches(base, selectedPatches);
      }
      
      if (this.applyUntilValueEl) this.applyUntilValueEl.textContent = `${n}/${this.order.length}`;
    } catch (e) {
      if (window.showToast) window.showToast('error', 'Preview fehlgeschlagen: ' + e.message);
    }
  }

  /**
   * Setzt die Genesis-Daten für die Patch-Visualisierung
   * @param {Object} genesisData - Die Genesis-Welt
   */
  setGenesisData(genesisData) {
    this.genesisData = genesisData;
  }

  /**
   * Setzt den PatchVisualizer für die 3D-Visualisierung
   * @param {PatchVisualizer} patchVisualizer - Der PatchVisualizer
   */
  setPatchVisualizer(patchVisualizer) {
    this.patchVisualizer = patchVisualizer;
  }

  /**
   * Setzt die aktuelle Patch-Auswahl und visualisiert sie
   * @param {Array} selectedPatches - Die ausgewählten Patches
   */
  async setSelectedPatches(selectedPatches) {
    if (!this.genesisData || !this.patchVisualizer) return;
    
    try {
      await this.patchVisualizer.visualizePatches(this.genesisData, selectedPatches, {
        showConflicts: true,
        highlightIntensity: 0.7
      });
    } catch (e) {
      if (window.showToast) window.showToast('error', 'Patch-Visualisierung fehlgeschlagen: ' + e.message);
    }
  }

  /**
   * Setzt die Visualisierung zurück
   */
  resetVisualization() {
    if (this.patchVisualizer) {
      this.patchVisualizer.resetVisualization();
    }
  }

  /**
   * Aktualisiert die Pulsier-Animationen für Konflikt-Materialien
   */
  updateAnimations() {
    if (this.patchVisualizer) {
      this.patchVisualizer.updatePulsingAnimations();
    }
  }

  _esc(s) {
    return window.escapeHtml ? window.escapeHtml(s) : String(s);
  }
}

// Bootstrap-Funktion optional
export function bootstrapPatchUI(api, worldId) {
  const ui = new PatchUI({ patchKit: api, worldId });
  return ui;
}

try {
  window.bootstrapPatchUI = bootstrapPatchUI;
} catch {}