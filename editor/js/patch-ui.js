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
    this.editor = opts.editor || null; // Referenz zum PresetEditor für Bearbeitungs- und Löschfunktionen

    // Container-Panel (world-editor.html: #patch-list-container)
    this.container = opts.container || document.getElementById('patch-list-container');

    // UI-Refs
    // Liste: bevorzugt .patch-list-content innerhalb des Containers
    this.listEl =
      opts.listEl ||
        (this.container ? this.container.querySelector('.patch-list-content') : null);

    // Filter / Range sind im aktuellen Layout optional/nicht vorhanden
    this.filterEl = opts.filterEl || null;
    this.rangeEl = opts.rangeEl || null;

    // Detail-/Konflikt-Panels werden bei Bedarf dynamisch erzeugt
    this.detailEl = opts.detailEl || null;
    this.conflictsEl = opts.conflictsEl || null;

    this.applyUntilValueEl = document.getElementById('applyUntilValue');

    // interner Zustand
    this.patches = [];       // rohe Patches
    this.filtered = [];       // gefilterte Anzeige
    this.selectedId = null;    // ausgewählter Patch
    this.includes = new Map(); // id -> boolean (für Preview)
    this.order = [];           // anzuzeigende Reihenfolge (nach computeOrder)

    this._bindEvents();
  }

  _bindEvents() {
    if (this.filterEl) this.filterEl.addEventListener('input', () => this._applyFilter());
    if (this.rangeEl) this.rangeEl.addEventListener('input', async () => {
        if (this.applyUntilValueEl) {
          const n = Number(this.rangeEl.value || 0);
          this.applyUntilValueEl.textContent = `${n}/${this.order.length}`;
        }
        // HINWEIS: Hier wurde await hinzugefügt, da renderPreview async ist.
        // await this.renderPreview();
      });
  }

  async load(worldId, genesisData=null, patches=null) {
    if (!this.patchKit) throw new Error('PatchKit nicht initialisiert');
    if (!worldId && !this.worldId) throw new Error('World ID fehlt');
    this.worldId = worldId || this.worldId;

    this.genesisData = genesisData || this.genesisData;
    this.patches = patches || this.patches;

    try {
      if(!this.genesisData) {
        const genesisEvt = await this.editor.patchKit.io.genesisPort.getById(worldId);
        if (!genesisEvt) {
          throw new Error('Welt nicht gefunden');
        }
        this.genesisData = genesisEvt? this.editor.patchKit.genesis.parse(genesisEvt?.yaml) : null;
        
      }
      this.genesisData = this.editor.yamlProcessor.normalizeUserYaml(this.genesisData);
      
      const list = await this.patchKit.io.patchPort.listPatchesByWorld(this.worldId);
      console.log('[DEBUG ORDER PATCHES] PatchUI.load:', list);
      // Normalisieren; Parsen falls nötig. Verwende zentrale Normalizer wenn verfügbar.
      if(!this.patches){
        this.patches = [];
        if (Array.isArray(list)) {
          for (const raw of list) {
            let p = null;
            try {
              // Prefer editor-provided synchronous normalizer for UI performance
              if (this.editor && typeof this.editor.ensureNormalizedPatchSync === 'function') {
                p = this.editor.ensureNormalizedPatchSync(raw) || null;
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
            this.patches.push(p);
          }
        }
      }
      // Initial: alle included
      this.includes = new Map(this.patches.map(p => [p.metadata.id, true]));
      await this._computeOrderMarkCycles();
      this._applyFilter();
      this._setupRange();
      // Liste rendern ------------------------------
      this.renderList();
      // Detail- und Konflikt-Panels werden nicht mehr gerendert

      // Vorschau rendern ------------------------------
      await this.renderPreview();
        
      // -----------------------------------------------

      // Container-Panel ein-/ausblenden je nach Datenlage.
      if (this.container) {
        if (this.patches.length > 0) {
          this.container.classList.remove('hidden');
        } else {
          this.container.classList.add('hidden');
          if (this.listEl) {
            this.listEl.innerHTML = '<div class="empty">Keine Patches gefunden.</div>';

          }
        }
      }

      if (window.showToast) window.showToast('success', 'Patches geladen.');
      
    } catch (e) {
      if (window.showToast) window.showToast(
          'error',
          'Fehler beim Laden der Patches: ' + e.message,
        );
    }
  }

  _ensurePatchObject(raw) {
    try {
      // PatchKit.patch.parse kann Events in Objekte überführen; wenn vorhanden nutzen
      if (this.patchKit?.patch?.parse) {
        const parsed = this.patchKit.patch.parse(raw);
        // Robust: originalYaml auswerten und korrekte IDs/Namen übernehmen
        try {
          const oy = parsed?.originalYaml;
          if (oy) {
            let metaFromOY = null;
            // Zuerst als JSON versuchen
            try {
              const asObj = typeof oy === 'string' ? JSON.parse(oy) : oy;
              if (asObj && asObj.metadata) metaFromOY = asObj.metadata;

              // Falls operations leer, ggf. übernehmen
              if (asObj && Array.isArray(asObj.operations) && (!parsed.operations || parsed.operations.length === 0)) {
                parsed.operations = asObj.operations;
              }
            } catch {
              // Fallback: YAML
              try {
                const asObj = typeof oy === 'string' ? (window.jsyaml ? window.jsyaml.load(oy) : jsyaml.load(oy)) : oy;
                if (asObj && asObj.metadata) metaFromOY = asObj.metadata;
                if (asObj && Array.isArray(asObj.operations) && (!parsed.operations || parsed.operations.length === 0)) {
                  parsed.operations = asObj.operations;
                }
              } catch {}
            }
            if (metaFromOY) {
              if (!parsed.metadata) parsed.metadata = {};
              // Übernehme korrekte Patch-ID/Name/created_at/targets_world
              const patchId = metaFromOY.id || metaFromOY.patch_id || parsed?.metadata?.patch_id || parsed?.metadata?.id || parsed.id || null;
              if (patchId) {
                parsed.id = patchId;
                parsed.metadata.id = patchId;
              }
              if (metaFromOY.name) parsed.metadata.name = metaFromOY.name;
              if (metaFromOY.created_at) parsed.metadata.created_at = metaFromOY.created_at;
              if (metaFromOY.targets_world) parsed.metadata.targets_world = metaFromOY.targets_world;
            }
          }
        } catch {}
        if (parsed && !parsed.id) {
          parsed.id = parsed?.metadata?.id || parsed?.metadata?.patch_id || null;
        }
        return parsed;
      }
    } catch {
    } // Fallback: sicherstellen, dass eine id vorhanden ist
    const p = { ...raw };
    try {
      // Auch im Fallback versuchen, originalYaml zu verwerten
      const oy = p?.originalYaml;
      if (oy) {
        let metaFromOY = null;
        try {
          const asObj = typeof oy === 'string' ? JSON.parse(oy) : oy;
          if (asObj && asObj.metadata) metaFromOY = asObj.metadata;
          if (asObj && Array.isArray(asObj.operations) && (!p.operations || p.operations.length === 0)) {
            p.operations = asObj.operations;
          }
        } catch {
          try {
            const asObj = typeof oy === 'string' ? (window.jsyaml ? window.jsyaml.load(oy) : jsyaml.load(oy)) : oy;
            if (asObj && asObj.metadata) metaFromOY = asObj.metadata;
            if (asObj && Array.isArray(asObj.operations) && (!p.operations || p.operations.length === 0)) {
              p.operations = asObj.operations;
            }
          } catch {}
        }
        if (metaFromOY) {
          if (!p.metadata) p.metadata = {};
          const patchId = metaFromOY.id || metaFromOY.patch_id || null;
          if (patchId) {
            p.id = patchId;
            p.metadata.id = patchId;
          }
          if (metaFromOY.name) p.metadata.name = metaFromOY.name;
          if (metaFromOY.created_at) p.metadata.created_at = metaFromOY.created_at;
          if (metaFromOY.targets_world) p.metadata.targets_world = metaFromOY.targets_world;
        }
      }
    } catch {
    }
    if (!p.id) p.id = p?.metadata?.id || p?.metadata?.patch_id || null;
    return p;
  }
  async _computeOrderMarkCycles() {
    // computeOrder erwartet vollständige Patch-Objekte (mit metadata.id/depends_on)
    const { ordered, cycles } = await this.patchKit.world.computeOrder(
      this.patches,
      {
        onCycle: 'mark',
      },
    );

    // Liste der angezeigten IDs extrahieren (metadata.id bevorzugt, Fallback p.id)
    this.order = (ordered || []).map((p) => p?.metadata?.id || p.id).filter(Boolean);

    // Cycle-Markierung auf Patches spiegeln
    const cycleNodes = new Set();
    if (Array.isArray(cycles)) {
      for (const c of cycles) {
        const nodes =
          Array.isArray(c?.nodes) ? c.nodes : (Array.isArray(c) ? c : []);
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
      this.filtered = this.patches.filter((p) => {
        const name = (p?.metadata?.name || '').toLowerCase();
        const auth = (p?.metadata?.author || '').toLowerCase();
        return (
          name.includes(q) || auth.includes(q) || String(p.id).includes(q)
        );
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
    if (
      (!this.rangeEl.value || this.rangeEl.value === '0') &&
      this.order.length > 0
    ) {
      this.rangeEl.value = String(this.order.length);
    }

    if (this.applyUntilValueEl) {
      const n = Number(this.rangeEl.value || 0);
      this.applyUntilValueEl.textContent = `${n}/${this.order.length}`;
    }
  }

  // HINWEIS: Diese Methode wurde zu async gemacht
  async toggleInclude(id, value) {
    // Wert wird direkt übernommen (keine Invertierung mehr nötig)
    this.includes.set(id, !!value);
    this.renderList();   // aktualisiere Toggle-Status
    // HINWEIS: await hinzugefügt
    await this.renderPreview();
  }

  selectPatch(id) {
    this.selectedId = id;
    this.renderList();
    this.renderDetail(); // Nicht mehr aufrufen
    // FALSCH: const patch = this.patches.find(p => p.id === id); findet nur den ersten patch

    // Finde alle Patches mit derselben Patch ID
    const patchesWithSameId = this.patches.filter(p => p.id === id);
    // console.log('[DEBUG PATCHES] selectPatch: Alle Patches mit ID', id, ':', patchesWithSameId.map(p => ({
    //   id: p.id,
    //   created_at: p.metadata?.created_at,
    //   name: p.metadata?.name,
    //   hasOriginalYaml: !!p.originalYaml
    // })));

    // Finde die letzte Bearbeitung (höchster created_at Wert)
    const patch = patchesWithSameId.sort((a, b) => {
      const aTime = a.metadata?.created_at || 0;
      const bTime = b.metadata?.created_at || 0;
      return bTime - aTime; // Absteigend sortieren für neueste zuerst
    })[0];

    // console.log('[DEBUG PATCHES] selectPatch: Ausgewählter Patch (neueste Revision):', patch ? {
    //   id: patch.id,
    //   created_at: patch.metadata?.created_at,
    //   name: patch.metadata?.name
    // } : 'Kein Patch gefunden');

    if (patch && this.editor && this.editor.patchTextarea) {
      const yamlContent = this.editor.yamlProcessor.readWorldYAMLFromString(patch.originalYaml);
      // Setze den Inhalt des Patch-Editors
      this.editor.patchTextarea.value = yamlContent;

      // Wechsle zum Patch-Tab
      this.editor.uiManager.switchTab('patch');
      this.editor.currentPatchId = id;

    }
  }

  renderList() {
    if (!this.listEl) return;
    this.listEl.innerHTML = '';
    // console.log('[DEBUG PATCHES] call PatchUI.renderList', this.patches);

    const byId = new Map(this.patches.map(p => [p.id, p]));
    // console.log('[DEBUG PATCHES] Patches nach ID:', byId);
    for (const id of this.order) {
      const p = byId.get(id);
      if (!p) continue;
      if (!this.filtered.includes(p)) continue;
      const li = document.createElement('li');
      li.className = 'patch-item' + (this.selectedId === p.id ? ' selected' : '') ;
      li.dataset.id = p.id;
      li.dataset.world = p.metadata?.targets_world || '';
      li.dataset.createdAt = p.metadata?.created_at || '';

      // Standard: alle sichtbar (nicht ausgeblendet) - Checkbox ist UNCHECKED wenn included=true
      const checked = this.includes.get(p.id) ? '' : 'checked';

      // Buttons
      const deleteButtonId = `delete-patch-${p.id}`;

      // Anzeige von Name und ID (Name (Patch-ID))
      const displayName = this._esc(p?.metadata?.name || '') ;
      const displayId = this._esc(p.id);
      const nameHtml = displayName ? `${displayName} <span class="patch-id">(${displayId})</span>` : `<span class="id">${displayId}</span>`;

      // Schlanke Zeile wie gefordert (keine weiteren Details/Meta/Badges)
      li.innerHTML =
        '<div class="patches row">' +
          `<span class="name">${nameHtml}</span>` +
          `<div class="patch-actions">` +
            `<label class="exclude-toggle"><input type="checkbox" title="ausblenden" data-inc="${p.id}" ${checked}></label>` +
            `<button id="${deleteButtonId}" class="btn-danger btn-delete" title="Patch löschen">❌</button>` +
          `</div>` +
        '</div>';

      // Event-Listener um einenPatch auszuwählen und zu bearbeiten
      li.addEventListener('click', (ev) => {
        // Checkbox-Klick nicht doppel-behandeln
        if (ev.target && ev.target.matches('input[type="checkbox"]')) return;
        // Button-Klick nicht doppel-behandeln
        if (ev.target && ev.target.matches('button')) return;
        this.selectPatch(p.id);
        // PATCH-UI: Wechsel zum Patch-Tab beim Klick.
        if (this.editor && this.editor.uiManager) {
          this.editor.uiManager.switchTab('patch');
        }
      });

      {
        const cb = li.querySelector('input[type="checkbox"]');
        if (cb) {
          cb.addEventListener('change', (ev) => {
            // checked = ausblenden => include = !checked
            this.toggleInclude(p.id, !ev.target.checked);
          });
        }
      }
      
      // Event-Listener für den Löschen-Button
      const deleteButton = li.querySelector(`#${deleteButtonId}`);
      if (deleteButton) {
        deleteButton.addEventListener('click', async (ev) => {
          ev.stopPropagation();
          // HINWEIS: await hinzugefügt
          await this._deletePatch(p.id);
        })
      }

      this.listEl.appendChild(li);
    }
  }

  // Detail- und Konflikt-Panels werden nicht mehr gerendert
  renderDetail() {}
  renderConflicts() {}

  async renderPreview() {
    // Erzeuge Vorschau der Anwendung bis zum N-ten Patch unter Berücksichtigung includes
    console.info('[DEBUG ORDER PATCHES] PatchUI.renderPreview:', this.order.length);
    if (!this.patchKit) return;
    const n = this.rangeEl ? Number(this.rangeEl.value || 0) : this.order.length;
    const upTo = this.order.slice(0, n);

    const byId = new Map(this.patches.map(p => [p.id, p]) ) ;
    const selectedPatches = [];
    for (const id of upTo) {
      if (this.includes.get(id)) {
        const p = byId.get(id);
        if (p) selectedPatches.push(p);
      }
    }

    console.log('[DEBUG PATCHES] PatchUI.renderPreview:', n, 'von', this.order.length, 'Patches:', selectedPatches);
    try {
      let results = {};
      // Sicherstellen: Genesis und Visualizer verfügbar (verhindert Fallback, der die Welt ersetzt)
      if (!this.genesisData && this.editor?.previewRenderer?._getCurrentGenesisData) {
        try {
          
          const g = await this.editor.previewRenderer._getCurrentGenesisData();
          if (g) this.genesisData = g;
        } catch {
          console.error('Fehler beim Laden der Genesis-Daten:', error);
        }
      }
      if (!this.patchVisualizer && this.editor?.patchVisualizer) {
        this.setPatchVisualizer(this.editor.patchVisualizer);
      }

      // Wenn Genesis-Daten und PatchVisualizer vorhanden sind, visualisiere die Patches
      if (this.genesisData && this.patchVisualizer) {
        console.log('[DEBUG PATCHES] call PatchUI.visualizePatches:', n, 'von', this.order.length);
          await this.patchVisualizer.visualizePatches(this.genesisData, selectedPatches, {
          showConflicts: true,
          highlightIntensity: 0.7,
        });
      } else {
        // Fallback: Nur die Patch-Anwendung ohne Visualisierung (keine 3D-Darstellung)
        const base = { entities: {} }; // minimale Basis-Welt
        console.warn('[DEBUG PATCHES] Fallback: Genesis-Daten oder PatchVisualizer fehlen, wende Patches ohne Visualisierung an.');
        await this.patchKit.world.applyPatches(base, selectedPatches);
      }

      if (this.applyUntilValueEl && this.rangeEl) this.applyUntilValueEl.textContent = `${n}/${this.order.length}`;
      

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
   * @param {PatchVisualizer} patchVisualizer - Der PatchVisualizer.
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
      await this.patchVisualizer.visualizePatches(
        this.genesisData,
        selectedPatches,
        {
          showConflicts: true,
          highlightIntensity: 0.7,
        },
      );
    } catch (e) {
      if (window.showToast) {
        window.showToast(
          'error',
          'Patch-Visualisierung fehlgeschlagen: ' + e.message,
        );
      }
    }
  }


  /**
   * Setzt die Visualisierung zurück.
   */
  resetVisualization() {
    if (this.patchVisualizer) {
      this.patchVisualizer.resetVisualization();
    }
  }


  /**
   * Aktualisiert die Pulsier-Animationen für Konflikt-Materialien.
   */
  updateAnimations() {
    if (this.patchVisualizer) {
      this.patchVisualizer.updatePulsingAnimations();
    }
  }

  /**
   * Läd einen Patch zum bearbeiten
   * @param {string} patchId - Die ID des zu bearbeitenden Patches
   */
  async _selectPatch(patchId) {
    try {
      if (!this.editor) {
        console.warn('Kein Editor-Referenz für Patch-Bearbeitung verfügbar');
        if (window.showToast) {
          window.showToast('error', 'Patch-Bearbeitung nicht möglich: Kein Editor verfügbar.');
        }
        return;
      }
      this.editor.PatchUI.selectPatch(patchId);

    } catch (error) {
      console.error('Fehler bei der Patch-Bearbeitung:', error);
      if (window.showToast) {
        window.showToast('error', 'Fehler bei der Patch-Bearbeitung: ' + error.message);
      }
    }
  }


  /**
   * Löscht einen Patch
   * @param {string} patchId - Die ID des zu löschenden Patches
   */
  async _deletePatch(patchId) {
    try {
      if (!this.editor) {
        console.warn('Kein Editor-Referenz für Patch-Löschung verfügbar');
        return;
      }

      // Überprüfe, ob der PatchManager verfügbar ist
      if (!this.editor.patchManager || typeof this.editor.patchManager.deletePatch !== 'function') {
        console.error('PatchManager oder deletePatch-Methode nicht verfügbar.');
        if (window.showToast) {
          window.showToast('error', 'Patch-Löschung nicht möglich: PatchManager nicht verfügbar.');
        }
        return;
      }

      // Rufe die deletePatch-Methode des PatchManagers auf
      await this.editor.patchManager.deletePatch(patchId);
    } catch (error) {
      console.error('Fehler bei der Patch-Löschung:', error);
      if (window.showToast) {
        window.showToast('error', 'Fehler bei der Patch-Löschung: ' + error.message);
      }
    }
  }

  /**
   * Setzt die Editor-Referenz
   * @param {PresetEditor} editor - Der PresetEditor
   */
  setEditor(editor) {
    this.editor = editor;
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
