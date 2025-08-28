/**
 * Load-Funktionalität für den World Editor
 * Extrahiert aus preset-editor.html:
 * - Suche in gespeicherten Welten über #worldSearchInput
 * - Laden von Vorlagen über #presetSelect
 */

import { YamlProcessor } from './preset-editor/yaml-processor.js';
import { createPatchKitAPI } from './patchkit-wiring.js';
import PatchKit from '../../libs/patchkit/index.js';
import { bootstrapPatchUI } from './patch-ui.js'; // PATCH-UI: Import korrigiert

/**
 * Heuristiken für Anzeige-Name und YAML-Extraktion
 */
function extractYamlFromContentString(str) {
  return YamlProcessor.processStringToYaml(str);
}


function parseNameFromYamlString(yaml) {
  try {
    const spec = YamlProcessor.safeYamlParse(yaml);
    return spec?.name || spec?.metadata?.name || '';
  } catch {
    return '';
  }
}

function getDisplayNameFromItem(it) {
  return (
    it?.name ||
    it?.metadata?.name ||
    (typeof it?.originalYaml === 'string' ? parseNameFromYamlString(YamlProcessor.processStringToYaml(it.originalYaml) || it.originalYaml) : '') ||
    (typeof it?.yaml === 'string' ? parseNameFromYamlString(YamlProcessor.processStringToYaml(it.yaml) || it.yaml) : '') ||
    (typeof it?.content === 'string' ? parseNameFromYamlString(extractYamlFromContentString(it.content)) : '')
  );
}

/**
 * Wählt den bestmöglichen YAML-Text aus einem Such-/Lade-Resultat.
 * Bevorzugt: originalYaml > yaml > content(payload) > Objekt (mit Factory‑Mapping)
 */
export function chooseYamlFromData(data) {

  // Explizite String-Felder bevorzugen und ggf. konvertieren
  if (data && typeof data === 'object') {
    if (typeof data.originalYaml === 'string') {
      const s = YamlProcessor.processStringToYaml(data.originalYaml);
      if (s) return s;
    }
    if (typeof data.yaml === 'string') {
      const s = YamlProcessor.processStringToYaml(data.yaml);
      if (s) return s;
    }
  }
  // content als String: Genesis (YAML) oder Patch (JSON mit payload)
  if (data && typeof data?.content === 'string') {
    const maybe = extractYamlFromContentString(data.content);
    if (typeof maybe === 'string') return maybe;
    else return '';
  }
  // Bereits geparstes Objekt: Factory-Objekt mappen, sonst normal dumpen
  if (data && typeof data === 'object') {
    const mapped = YamlProcessor.factoryToAuthorSpec(data);
    if (mapped) {
      try { return YamlProcessor.safeYamlDump(YamlProcessor.stripRootId(mapped)); } catch {}
    } else {
      try { return YamlProcessor.safeYamlDump(YamlProcessor.stripRootId(data)); } catch {}
    }
  }
  throw new Error('Kein YAML-Inhalt verfügbar');
}

window.chooseYamlFromData = chooseYamlFromData;

// Funktion zum Simulieren eines Input-Events, welches das Rendern des ThreeJS Canvas auslöst
export async function simulateInputEvent(element) {
  console.warn('[DEBUG] Simuliere Input-Event für Element abgeschaltet:', element);
  console.warn('[DEBUG] wir nutzen nun render currentYaml');
  await window.presetEditor.worldManager.loadWorldCurrentYaml();
  return;
  // if (!element) return;

  
  // // Erstelle ein neues Input-Event
  // const inputEvent = new Event('input', {
  //   bubbles: true,
  //   cancelable: true,
  // });

  // // Löse das Event aus
  // element.dispatchEvent(inputEvent);
}

// Hilfsfunktion zum Aktualisieren/Entfernen des URL‑Parameters „world“
export function updateUrlParam(worldId) {
  console.log('[DEBUG] Update URL Parameter: worldId=', worldId);
  const url = new URL(window.location);
  if (worldId) {
    url.searchParams.set('world', worldId);
  } else {
    url.searchParams.delete('world');
  }
  window.history.replaceState({}, '', url);
}

// Vorlagen-Definitionen werden aus YAML-Dateien geladen
export const templates = {};

// Lade Templates aus YAML-Dateien
export async function loadTemplates() {
  try {
    const templateFiles = [
      'worlds/presets/simple_world.yaml',
      'worlds/presets/forest.yaml',
      'worlds/presets/library.yaml',
      'worlds/presets/collision_test.yaml',
      'worlds/presets/skybox_test.yaml',
      'worlds/presets/player_test.yaml',
      'worlds/presets/single_terrain.yaml',
      'worlds/presets/single_object.yaml',
      'worlds/presets/single_persona.yaml',
    ];

    for (const file of templateFiles) {
      try {
        const response = await fetch(file, { cache: 'no-cache' });
        if (!response.ok) continue;
        
        const content = await response.text();
        const templateName = file.replace('worlds/presets/', '').replace('.yaml', '');
        templates[templateName] = content;
      } catch (e) {
        console.warn(`Konnte Template ${file} nicht laden:`, e);
      }
    }
  } catch (e) {
    console.error('Fehler beim Laden der Templates:', e);
  }
}

// Welt-Dateien auflisten
export async function listWorldFiles() {
  return [
    'worlds/night-test.yaml',
    'worlds/skybox-test.yaml',
    'worlds/storm-test.yaml',
    'worlds/sunset-test.yaml',
    'worlds/zone_village_center.yaml',
    'worlds/zone-archive.yaml',
    'worlds/zone-buildings-demo.yaml',
    'worlds/zone-collections-demo.yaml',
    'worlds/zone-collision-test.yaml',
    'worlds/zone-deterministic-test.yaml',
    'worlds/zone-forest.yaml',
    'worlds/zone-gates-demo.yaml',
    'worlds/zone-path-demo.yaml',
    'worlds/zone-path-test.yaml',
    'worlds/zone-player-test.yaml',
    'worlds/zone-preset-test.yaml',
    'worlds/zone-rock-test.yaml',
    'worlds/zone-seed-demo.yaml',
    'worlds/zone-seed-variant.yaml',
    'worlds/zone-simple-seed-test.yaml',
    'worlds/zone-start.yaml',
    'worlds/zone-terrain-height-test.yaml',
    'worlds/zone-village-demo.yaml',
    'worlds/zone-welcome.yaml'
  ];
}

// Setup für die Suche in gespeicherten Welten
export function setupWorldSearch(editor, nostrService) {
  const worldSearchInput = document.getElementById('worldSearchInput');
  const worldSearchResults = document.getElementById('worldSearchResults');
  const yamlEditor = document.getElementById('world-yaml-editor');
  const worldIdInput = document.getElementById('worldIdInput');
  
  if (!worldSearchInput || !worldSearchResults) return;
  
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const hideResults = () => { 
    worldSearchResults.style.display = 'none'; 
    worldSearchResults.innerHTML = ''; 
    worldSearchResults.removeAttribute('aria-activedescendant'); 
  };
  let searchToken = 0;

  // ARIA für Listbox
  worldSearchResults.setAttribute('role', 'listbox');
  
  worldSearchInput.addEventListener('input', debounce(async () => {
    const q = worldSearchInput.value.trim();
    const myToken = ++searchToken;
    if (!q) { hideResults(); return; }

    try {
      const nostr = nostrService || await window.NostrServiceFactory.getNostrService();
      const items = await nostr.searchWorlds(q);
      
      if (myToken !== searchToken) return; // veraltete Antwort ignorieren
      worldSearchResults.innerHTML = '';
      if (!items || !items.length) { hideResults(); return; }

      worldSearchResults.style.display = 'block';
      worldSearchResults.style.minWidth = (worldSearchInput.offsetWidth + 'px');

      items.slice(0, 30).forEach((it, idx) => {
        const div = document.createElement('div');
        div.setAttribute('role', 'option');
        div.id = `wsr-${idx}`;
        div.style.padding = '6px 10px';
        div.style.cursor = 'pointer';
        const badge = it.type === 'patch' ? '🧩 Patch' : '🌱 Genesis';
        const displayName = getDisplayNameFromItem(it) || '(ohne Name)';
        div.textContent = `${it.id || '(ohne id)'} — ${displayName}  [${badge}]`;


        div.addEventListener('click', async () => {
          window.render_world(it.id);
          worldSearchInput.value = '';
        });

        
        div.addEventListener('mouseover', () => div.style.background = '#094771');
        div.addEventListener('mouseout', () => div.style.background = 'transparent');
        worldSearchResults.appendChild(div);
      });

      // Tastatursteuerung
      let activeIndex = -1;
      const setActive = (i) => {
        const children = Array.from(worldSearchResults.children);
        children.forEach((c, idx) => c.style.background = idx === i ? '#094771' : 'transparent');
        if (i >= 0) worldSearchResults.setAttribute('aria-activedescendant', `wsr-${i}`);
      };
      
      worldSearchInput.onkeydown = (ev) => { 
        const children = Array.from(worldSearchResults.children);
        if (ev.key === 'ArrowDown') { 
          ev.preventDefault(); 
          activeIndex = Math.min(children.length - 1, activeIndex + 1); 
          setActive(activeIndex); 
        }
        else if (ev.key === 'ArrowUp') { 
          ev.preventDefault(); 
          activeIndex = Math.max(0, activeIndex - 1); 
          setActive(activeIndex); 
        }
        else if (ev.key === 'Enter') {
          if (activeIndex >= 0 && children[activeIndex]) { 
            children[activeIndex].click(); 
          }
        } else if (ev.key === 'Escape') {
          hideResults();
        }
      };
    } catch (e) {
      hideResults();
      if (window.showToast) window.showToast('error', 'Suche fehlgeschlagen: ' + (e?.message || e));
    }
  }, 300));

  // Verstecken bei Blur
  worldSearchInput.addEventListener('blur', () => setTimeout(hideResults, 200));
}

// Setup für das Preset-Dropdown
export async function setupPresetSelect(editor) {
  const presetSelect = document.getElementById('presetSelect');
  const yamlEditor = document.getElementById('world-yaml-editor');
  const worldIdInput = document.getElementById('worldIdInput');
  
  if (!presetSelect || !yamlEditor) {
    console.warn('Preset-Select oder YAML-Editor nicht gefunden');
    return;
  }
  // Prüfe, ob die Optionsgruppen bereits existieren
  let localPresetsGroup = document.getElementById('localPresetsGroup');
  let worldFilesGroup = document.getElementById('worldFilesGroup');
  
  // Erstelle die Optionsgruppen, falls sie nicht existieren
  if (!localPresetsGroup) {
    localPresetsGroup = document.createElement('optgroup');
    localPresetsGroup.id = 'localPresetsGroup';
    localPresetsGroup.label = 'Lokale Vorlagen';
    presetSelect.appendChild(localPresetsGroup);
  }
  
  if (!worldFilesGroup) {
    worldFilesGroup = document.createElement('optgroup');
    worldFilesGroup.id = 'worldFilesGroup';
    worldFilesGroup.label = 'Welt-Dateien';
    presetSelect.appendChild(worldFilesGroup);
  }
  
  // Lokale Presets befüllen
  localPresetsGroup.innerHTML = '';
  if (Object.keys(templates).length === 0) {
    const opt = document.createElement('option');
    opt.disabled = true;
    opt.textContent = '(keine Vorlagen gefunden)';
    localPresetsGroup.appendChild(opt);
  } else {
    Object.keys(templates).forEach(id => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = templates[id].match(/name:\s*"([^"]+)"/)?.[1] || id;
      localPresetsGroup.appendChild(opt);
    });
  }
  // Remote Presets via nostr (optional)
  let remotePresetsGroup = document.getElementById('remotePresetsGroup');
  if (!remotePresetsGroup) {
    remotePresetsGroup = document.createElement('optgroup');
    remotePresetsGroup.id = 'remotePresetsGroup';
    remotePresetsGroup.label = 'Remote Presets';
    presetSelect.appendChild(remotePresetsGroup);
  }
  remotePresetsGroup.innerHTML = '';
  try {
    // Resolve nostr service from possible globals
    const resolveNostrService = async () => {
      if (typeof window.getNostrService === 'function') return await window.getNostrService();
      if (window.NostrServiceFactory && typeof window.NostrServiceFactory.getNostrService === 'function') return await window.NostrServiceFactory.getNostrService();
      return null;
    };

    const svc = await resolveNostrService();
    if (svc) {
      if (svc && typeof svc.listPresets === 'function') {
        const presets = await svc.listPresets({ limit: 200 });
        if (!presets || !presets.length) {
          const opt = document.createElement('option'); opt.disabled = true; opt.textContent = '(keine Remote-Presets)'; remotePresetsGroup.appendChild(opt);
        } else {
          for (const p of presets) {
            const opt = document.createElement('option');
            opt.value = `nostr:${p.id}`;
            opt.textContent = (p.displayName || p.name || p.id) + (p.category ? ` — ${p.category}` : '');
            opt.dataset.presetYaml = p.yaml || '';
            remotePresetsGroup.appendChild(opt);
          }
        }
      }
  }
  } catch (e) {
    console.warn('Remote Presets konnten nicht geladen werden:', e);
    const opt = document.createElement('option'); opt.disabled = true; opt.textContent = '(Fehler beim Laden)'; remotePresetsGroup.appendChild(opt);
  }
  
  // Welt-Dateien befüllen
  worldFilesGroup.innerHTML = '';
  listWorldFiles().then(files => {
    if (!files || !files.length) {
      const opt = document.createElement('option');
      opt.disabled = true;
      opt.textContent = '(keine YAMLs gefunden)';
      worldFilesGroup.appendChild(opt);
      return;
    }
    for (const path of files) {
      const opt = document.createElement('option');
      opt.value = `file:${path}`;
      opt.textContent = path.replace('worlds/', '');
      worldFilesGroup.appendChild(opt);
    }
  }).catch(e => {
    console.error('Fehler beim Laden der welt-Dateien:', e);
    const opt = document.createElement('option');
    opt.disabled = true;
    opt.textContent = '(Fehler beim Laden der Liste)';
    worldFilesGroup.appendChild(opt);
  });
  
  // Event-Listener für Änderungen
  presetSelect.addEventListener('change', async () => {
    const v = presetSelect.value;
    
    // Eingebaute Templates
    if (v && templates[v]) {
      try {
        const raw = templates[v];
        let spec = YamlProcessor.safeYamlParse(raw);
        
        // Single Source of Truth: root.id entfernen
        spec = YamlProcessor.stripRootId(spec);
        
        // Neue systemseitige ID generieren
        const uniqueId = YamlProcessor.deriveCopyId(v);
        if (worldIdInput) worldIdInput.value = uniqueId;
        
        // In den Editor schreiben wir YAML OHNE id
        const yamlContent = YamlProcessor.safeYamlDump(spec);
        yamlEditor.value = yamlContent;
        // Aktualisiere die Welt-ID im Editor
        if (editor) editor.worldId = uniqueId;
        
        // URL-Parameter aktualisieren
        updateUrlParam(uniqueId);
        
        // Wert setzen
        if (editor) editor.worldId = uniqueId;

        if (window.showToast) window.showToast('success', 'Auswahl geladen.');
      } catch (e) {
        console.error('Fehler beim Laden des lokalen Templates:', e);
        if (window.showToast) window.showToast('error', 'Preset konnte nicht geladen werden: ' + (e?.message || e));
      }
      return;
    }
    
    // worlds/*.yaml-Dateien
    if (v && v.startsWith('file:')) {
      const path = v.substring(5);
      try {
        const res = await fetch(path, { cache: 'no-cache' });
        if (!res.ok) throw new Error('Konnte Datei nicht laden: ' + path);
        const raw = await res.text();
        let spec = YamlProcessor.safeYamlParse(raw);
        
        // zone_id bereinigen wie bisher
        if (spec && Object.prototype.hasOwnProperty.call(spec, 'zone_id')) {
          try { delete spec.zone_id; } catch {}
        }
        
        // Single Source of Truth: root.id entfernen
        spec = YamlProcessor.stripRootId(spec);
        
        // Neue systemseitige ID generieren
        const uniqueId = YamlProcessor.deriveCopyId(path.replace('worlds/', '').replace('.yaml', ''));
        if (worldIdInput) worldIdInput.value = uniqueId;
        
        // In den Editor schreiben wir YAML OHNE id
        const yamlContent = YamlProcessor.safeYamlDump(spec);
        yamlEditor.value = yamlContent;
        // Aktualisiere die Welt-ID im Editor
        if (editor) editor.worldId = uniqueId;
        
        // URL-Parameter aktualisieren
        updateUrlParam(uniqueId);
        
        // Aktualisiere die Vorschau - verwende die gleiche Methode wie in setupWorldSearch
        if (editor) {
          editor.worldId = uniqueId;

          // Now that the editor has the correct YAML, trigger the processing pipeline
          yamlEditor.value = yamlContent;
          simulateInputEvent(yamlEditor);
        } else {
          console.error('Editor nicht verfügbar');
        }

        if (window.showToast) window.showToast('success', 'Auswahl geladen.');
      } catch (e) {
        console.error('Fehler beim Laden der Welt-Datei:', e);
        if (window.showToast) window.showToast('error', 'Preset konnte nicht geladen werden: ' + (e?.message || e));
      }
    }
  });
  
  // New-Button Dropdown Verhalten und Aktionen
  try {
    const newBtn = document.getElementById('newBtn');
    const newMenu = document.getElementById('newDropdownMenu');
    if (newBtn && newMenu) {
      newBtn.addEventListener('click', () => {
        newMenu.classList.toggle('hidden');
      });

      // Klick auf Menüelemente
      newMenu.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', async (ev) => {
          const action = item.dataset.action;
          newMenu.classList.add('hidden');
          if (action === 'new-world') {
            // Erzeuge neue leere Welt aus Template
            const tpl = templates['simple_world'] || 'name: "Neue Welt"\n';
            const yaml = YamlProcessor.processStringToYaml(tpl) || tpl;
            yamlEditor.value = yaml;
            if (document.getElementById('presetCategorySelect')) document.getElementById('presetCategorySelect').value = '';
            if (window.showToast) window.showToast('info', 'Neue Welt geladen');
          } else if (action === 'new-preset-lib') {
            // Lade Preset-Library Template
            const tpl = templates['library'] || 'name: "Neue Preset-Bibliothek"\npresets: []\n';
            const yaml = YamlProcessor.processStringToYaml(tpl) || tpl;
            yamlEditor.value = yaml;
            // Setze Kategorie default auf 'misc'
            if (document.getElementById('presetCategorySelect')) document.getElementById('presetCategorySelect').value = 'misc';
            if (window.showToast) window.showToast('info', 'Neue Preset-Bibliothek geladen');
          }
        });
      });
    }
  } catch (e) {
    console.warn('Fehler beim Initialisieren des New-Dropdowns:', e);
  }
}

// Setup für die Render- und Reset-Buttons
export function setupRenderResetButtons(editor) {
  const renderBtn = document.getElementById('renderBtn');
  const resetBtn = document.getElementById('resetBtn');

  if (renderBtn) {
    renderBtn.addEventListener('click', async () => {
      try {
        if (editor && typeof editor.updatePreviewFromYaml === 'function') {
          await editor.updatePreviewFromYaml();
          if (window.showToast) window.showToast('success', 'Vorschau aktualisiert.');
        }
      } catch (e) {
        console.error('Fehler beim Rendern:', e);
        if (window.showToast) window.showToast('error', 'Rendern fehlgeschlagen: ' + e.message);
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      try {
        const yamlEditor = document.getElementById('world-yaml-editor');
        const worldIdInput = document.getElementById('worldIdInput');
        
        if (yamlEditor) yamlEditor.value = '';
        if (worldIdInput) worldIdInput.value = '';
        
        if (editor) {
          editor.worldId = null;
          // URL-Parameter entfernen
          updateUrlParam(null);
          if (typeof editor.updatePreviewFromYaml === 'function') {
            editor.updatePreviewFromYaml();
          }
        }

        if (window.showToast) window.showToast('info', 'Editor zurückgesetzt.');
      } catch (e) {
        console.error('Fehler beim Zurücksetzen:', e);
        if (window.showToast) window.showToast('error', 'Zurücksetzen fehlgeschlagen: ' + e.message);
      }
    });
  }
}

// Funktion zum Laden einer Welt anhand ihrer ID
export async function setupFromId(world_id, editor, nostrService) {
  if (!world_id) {
    console.warn('setupFromId: Keine Welt-ID angegeben');
    if (window.showToast) window.showToast('error', 'Keine Welt-ID angegeben');
    return;
  }
  try {
    await window.presetEditor.worldManager.loadWorldById(worldId);
    if (window.showToast) window.showToast('success', 'Welt erfolgreich geladen.');
    
  } catch (e) {
    console.error('Fehler beim Laden der Welt:', e);
    if (window.showToast) window.showToast('error', 'Welt konnte nicht geladen werden: ' + (e?.message || e));
  }
}

// Funktion zum Prüfen und Verarbeiten des URL-Query-Parameters
export async function setupUrlParameterHandler(editor, nostrService) {
  const urlParams = new URLSearchParams(window.location.search);
  const worldId = urlParams.get('world');
  if (!worldId) {
    return;
  }
  await window.presetEditor.worldManager.loadWorldById(worldId);
  
}

// Hauptfunktion zum Initialisieren der Load-Funktionalität
export async function initLoadFunctionality(editor, nostrService) {
  // Lade Templates aus YAML-Dateien
  await loadTemplates();
  const patchKitAPI = await createPatchKitAPI(nostrService);
  editor.patchKitAPI = patchKitAPI;
  
  // PATCH-UI: Initialisierung
  editor.patchUI = bootstrapPatchUI(patchKitAPI, editor.worldId);
  
  // FIX: Editor-Referenz nach der Initialisierung setzen
  if (editor.patchUI && editor) {
    editor.patchUI.setEditor(editor);
  }
  
  setupWorldSearch(editor, nostrService);
  
  // Überprüfen, ob das presetSelect-Element existiert
  const presetSelect = document.getElementById('presetSelect');
  
  if (presetSelect) {
    await setupPresetSelect(editor);
  } else {
    console.warn('presetSelect-Element nicht gefunden, setupPresetSelect wird nicht aufgerufen');
  }

  // Init Preset Library Sidebar
  try {
    renderPresetLibraryPanel(editor);
  } catch (e) {
    console.warn('Preset-Library Panel konnte nicht initialisiert werden:', e);
  }

  // URL-Parameter-Handler einrichten
  return await setupUrlParameterHandler(editor, nostrService);
}
// Globale Funktion: Aktualisiert die Patch-Vorschau analog zur internen Logik,
// berücksichtigt dabei dependencies (yamlProcessor, patchManager, worldId).
window.render_world = async function(worldId=null) {
  try {
    const editor = window.presetEditor;
    if (!editor) {
      console.error('[render_world] Kein presetEditor verfügbar. Warten Sie auf die Initialisierung (window.load) oder prüfen Sie Fehler in der Konsole.');
      return;
    }
    editor.uiManager.switchTab('world');
    if (worldId) {
      if(worldId === 'auto' || worldId === 'input'){
        // verwende die aktuelle World ID des Inputfelds
        worldId = editor._getWorldId();
      }
      editor.worldId = worldId; // Setze die World ID, falls angegeben
      await editor.worldManager.loadWorldById(worldId);

    } else if (!editor.worldId) {
      console.warn('[render_world] Keine World ID gesetzt, verwende die aktuelle YAML des Editors.');
      await editor.worldManager.loadWorldCurrentYaml();
    }
    
    
    // Ladeindikator ausblenden
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
      loadingIndicator.style.display = 'none';
    }
    updateUrlParam(editor.worldId)

  } catch (e) {
    console.error('[render_world] Fehler beim Aktualisieren der Patch-Vorschau:', e);
  }
};

/**
 * Rendert die Preset-Bibliotheken in der Sidebar, gruppiert nach preset_category.
 * Klick auf ein Preset lädt dessen YAML in den Editor.
 */
export async function renderPresetLibraryPanel(editor) {
  const panel = document.getElementById('presetLibraryPanel');
  const content = document.getElementById('preset-library-content');
  if (!panel || !content) return;
  content.innerHTML = '(lädt…)';

  try {
    // ensure worldManager has loaded remote presets (async)
    if (editor && editor.worldManager && typeof editor.worldManager.loadRemotePresets === 'function') {
      await editor.worldManager.loadRemotePresets().catch(() => {});
    }
    const grouped = (editor && editor.worldManager && typeof editor.worldManager.listPresetsByCategory === 'function') ? editor.worldManager.listPresetsByCategory() : {};
    content.innerHTML = '';
    const keys = Object.keys(grouped || {});
    if (!keys.length) {
      content.textContent = '(keine Preset-Bibliotheken gefunden)';
      return;
    }

    for (const cat of keys) {
      const groupWrap = document.createElement('div');
      groupWrap.className = 'preset-category-group';
      const header = document.createElement('div');
      header.className = 'preset-category-header';
      header.textContent = cat;
      header.style.fontWeight = '600';
      header.style.marginTop = '8px';
      groupWrap.appendChild(header);

      const list = document.createElement('div');
      list.className = 'preset-category-list';
      for (const p of grouped[cat]) {
        const item = document.createElement('div');
        item.className = 'preset-item';
        item.textContent = p.displayName || p.name || p.id || '(ohne Name)';
        item.style.cursor = 'pointer';
        item.style.padding = '4px 6px';
        item.dataset.presetId = p.id || '';
        item.addEventListener('click', async () => {
          try {
            // Load YAML into editor
            const yaml = p.yaml || p.payload || '';
            const yamlEditor = document.getElementById('world-yaml-editor');
            if (yamlEditor && yaml) {
              yamlEditor.value = yaml;
              if (editor) {
                // try to set world id if present in metadata
                const nameGuess = getDisplayNameFromItem(p) || '';
                if (window.showToast) window.showToast('info', 'Preset geladen: ' + nameGuess);
                // trigger pipeline
                await simulateInputEvent(yamlEditor);
              }
            } else {
              if (window.showToast) window.showToast('error', 'Kein YAML im Preset vorhanden');
            }
          } catch (e) {
            console.error('Fehler beim Laden des Presets:', e);
            if (window.showToast) window.showToast('error', 'Preset konnte nicht geladen werden: ' + (e?.message || e));
          }
        });
        list.appendChild(item);
      }
      groupWrap.appendChild(list);
      content.appendChild(groupWrap);
    }

  } catch (e) {
    console.error('renderPresetLibraryPanel failed:', e);
    content.textContent = '(Fehler beim Laden)';
  }
}
