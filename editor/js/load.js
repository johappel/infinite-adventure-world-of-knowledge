/**
 * Load-Funktionalität für den World Editor
 * Extrahiert aus preset-editor.html:
 * - Suche in gespeicherten Welten über #worldSearchInput
 * - Laden von Vorlagen über #presetSelect
 */


// Hilfsfunktionen
export function stripRootId(obj) {
  if (obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, 'id')) {
    try { delete obj.id; } catch {}
  }
  return obj;
}

export function safeYamlParse(str) {
  try { return window.jsyaml.load(str); } catch (e) { throw new Error('YAML-Fehler: ' + e.message); }
}

export function safeYamlDump(obj) {
  try { return window.jsyaml.dump(obj, { lineWidth: 120 }); } catch (e) { throw new Error('YAML-Serialize-Fehler: ' + e.message); }
}

export function deriveCopyId(baseId) {
  const short = crypto.randomUUID().split('-')[0];
  const sanitized = String(baseId || 'world').toLowerCase().replace(/[^a-z0-9-_]/g,'-');
  return `${sanitized}-${short}`;
}

// Funktion zum Simulieren eines Input-Events, welches das Rendern des ThreeJS Canvas auslöst
export function simulateInputEvent(element) {
  if (!element) return;
  
  // Erstelle ein neues Input-Event
  const inputEvent = new Event('input', {
    bubbles: true,
    cancelable: true,
  });
 
  
  // Löse die Events in der richtigen Reihenfolge aus
  element.dispatchEvent(inputEvent);
  
}

// Vorlagen-Definitionen
export const templates = {
  simple_world: `# Einfache Test-Welt
name: "Einfache Welt"
description: "Zum Testen der Presets"
id: "test-simple"

environment:
  skybox: "sunset"
  ambient_light: 0.6
  sun_intensity: 0.8

terrain:
  preset: "grass_flat"

objects:
  - preset: "tree_simple"
    position: [3, 0, 0]
  
  - preset: "rock_small"
    position: [-3, 0, 0]

personas:
  - preset: "npc_plain"
    name: "Test NPC"
    position: [0, 0, 5]`,

  forest: `# Wald-Zone mit Presets
name: "Preset Wald"
description: "Wald mit allen Preset-Features"
id: "test-forest"

environment:
  skybox: "night"
  ambient_light: 0.4
  sun_intensity: 0.3

terrain:
  preset: "forest_floor"

objects:
  - preset: "tree_simple"
    position: [5, 0, 5]
    scale: [2, 2.5, 2]
    
  - preset: "mushroom_small"
    position: [2, 0, -3]
    interactive: true
    
  - preset: "stone_circle_thin"
    position: [0, 0, 0]

personas:
  - preset: "npc_guardian"
    name: "Waldwächter"
    position: [-3, 0, 8]
    
  - preset: "npc_fairy"
    name: "Waldfee"
    position: [3, 0, -5]`,

  library: `# Bibliotheks-Zone
name: "Preset Bibliothek"
description: "Bibliothek mit Scholar NPCs"
id: "test-library"

environment:
  ambient_light: 0.8
  sun_intensity: 0.0

terrain:
  preset: "marble_flat"

objects:
  - preset: "bookshelf"
    position: [5, 0, 5]
    
  - preset: "bookshelf"
    position: [-5, 0, 5]
    
  - preset: "crystal"
    position: [0, 0, 0]

personas:
  - preset: "npc_scholar"
    name: "Bibliothekar"
    position: [0, 0, 8]`,

  collision_test: `# Kollisions-Test Zone
name: "Kollisions-Test"
description: "Testet Collections mit Kollisionserkennung"
id: "collision-test"

environment:
  ambient_light: 0.6
  sun_intensity: 0.8

terrain:
  preset: "grass_flat"
  size: [40, 40]

# NPCs werden zuerst platziert
personas:
  - preset: "npc_guardian"
    name: "Dorfwächter"
    position: [0, 0, 0]
    
  - preset: "npc_plain"
    name: "Dorfbewohner"
    position: [8, 0, 8]

# Collections mit Kollisionserkennung
objects:
  # Village Collection mit Kollisionserkennung
  - collections: ["village"]
    count: 12
    enable_collision_detection: true
    npc_buffer_distance: 4
    object_buffer_distance: 2
    
  # Forest Objects
  - collections: ["forest_objects"]
    count: 8
    enable_collision_detection: true
    npc_buffer_distance: 2
    object_buffer_distance: 1`,

  skybox_test: `# Skybox Test Zone
name: "Skybox Demo"
description: "Testet verschiedene Skybox-Presets"
id: "skybox-test"

environment:
  skybox: "sunset"
  time_of_day: 0.8
  ambient_light: 0.4
  sun_intensity: 0.6

terrain:
  type: "flat"
  size: [20, 20]
  color: "#4a4a3a"

objects:
  - type: "crystal"
    position: [0, 0, 0]
    scale: [1, 1.5, 1]
    color: "#ffaa00"
    
  - type: "tree"
    position: [5, 0, 2]
    scale: [1, 2, 1]
    color: "#1a3a1a"

# Andere Skybox-Presets zum Testen:
# sunset, night, storm, mystery_dark, 
# skyline, ocean, bay, clear_day`,

  player_test: `# YAML Player Test Zone
name: "Player Avatar Test"
description: "Testet den konfigurierbaren YAML Player"
id: "player-test"

environment:
  ambient_light: 0.7
  sun_intensity: 0.9

terrain:
  preset: "grass_flat"
  size: [30, 30]

# YAML Player Konfiguration
player:
  appearance:
    body_color: "#ff6b6b"
    skin_color: "#f4c2a1"
    hair_color: "#8b4513"
    height: 1.2
    proportions:
      head_size: 0.45
  
  style:
    hair_type: "spikes"
    accessories: ["cape"]
  
  animations:
    walking:
      arm_swing: 1.0
      leg_swing: 0.9
      speed: 12

# NPCs zum Vergleich
personas:
  - preset: "npc_plain"
    name: "Standard NPC"
    position: [5, 0, 5]

# Orientierungsobjekte
objects:
  - preset: "tree_simple"
    position: [0, 0, 8]
  - preset: "crystal"
    position: [8, 0, 0]`,

  single_terrain: `# Nur Terrain Test
name: "Terrain Test"
id: "test-terrain"

environment:
  ambient_light: 0.6

terrain:
  preset: "forest_floor"
  size: [40, 40]`,

  single_object: `# Nur Objekt Test
name: "Objekt Test"
id: "test-object"

environment:
  ambient_light: 0.6

terrain:
  preset: "grass_flat"
  size: [20, 20]

objects:
  - preset: "tree_simple"
    position: [0, 0, 0]
    scale: [2, 3, 2]`,

  single_persona: `# Nur NPC Test
name: "NPC Test"
id: "test-npc"

environment:
  ambient_light: 0.6

terrain:
  preset: "grass_flat"
  size: [20, 20]

personas:
  - preset: "npc_plain"
  name: "Test Character"
  position: [0, 0, 3]`
};

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
        div.textContent = `${it.id || '(ohne id)'} — ${it.name || '(ohne Name)'}  [${badge}]`;
        
        div.addEventListener('click', async () => {
          try {
            let data = it;
            // If the search result is just a stub, fetch the full event
            if (!it.yaml && !it.originalYaml && !it.content) {
              data = await nostr.getById(it.id);
            }

            if (!data) throw new Error('Welt nicht gefunden');

            let yamlText;
            // The best source is originalYaml, if it exists
            if (data.originalYaml) {
              yamlText = data.originalYaml;
            }
            // The next best is a 'yaml' property
            else if (data.yaml) {
              yamlText = data.yaml;
            }
            // The next best is the nostr event 'content' field
            else if (data.content && typeof data.content === 'string') {
              try {
                // Check if content is JSON or YAML, and dump it back to clean YAML
                const parsed = safeYamlParse(data.content);
                yamlText = safeYamlDump(stripRootId(parsed));
              } catch {
                // Assume it's already YAML if parsing fails
                yamlText = data.content;
              }
            }
            // Fallback for objects that are already parsed
            else if (typeof data === 'object') {
              const spec = stripRootId(data);
              yamlText = safeYamlDump(spec);
            } else {
              throw new Error("Konnte keinen YAML-Inhalt aus den Daten extrahieren.");
            }

            if (yamlEditor) {
              yamlEditor.value = yamlText;
              simulateInputEvent(yamlEditor);
            }

            if (worldIdInput && data.id) {
              worldIdInput.value = data.id;
            }
            if (editor) {
              console.log('[DIAGNOSE] Lade.js - Setze Welt-ID und starte Verarbeitung');
              editor.worldId = data.id;
              console.log('[DIAGNOSE] Lade.js - Editor-Status vor _processYamlInput:', {
                hasPreviewRenderer: !!editor.previewRenderer,
                hasThreeJSManager: !!editor.threeJSManager,
                threeJSManagerInitialized: editor.threeJSManager?.initialized,
                worldId: editor.worldId
              });
              
              // Now that the editor has the correct YAML, trigger the processing pipeline
              await editor._processYamlInput();
              console.log('[DIAGNOSE] Lade.js - _processYamlInput abgeschlossen');
            }

            hideResults();
            if (window.showToast) window.showToast('success', 'Auswahl geladen.');
          } catch (e) {
            if (window.showToast) window.showToast('error', 'Konnte Ergebnis nicht laden: ' + (e?.message || e));
            console.error(e);
          }
        });
        
        div.addEventListener('mouseover', () => div.style.background = '#2d2d30');
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
export function setupPresetSelect(editor) {
  console.log('🔧 [Integrationstest] setupPresetSelect aufgerufen');
  
  const presetSelect = document.getElementById('presetSelect');
  const yamlEditor = document.getElementById('world-yaml-editor');
  const worldIdInput = document.getElementById('worldIdInput');
  
  console.log('🔍 [Integrationstest] UI-Elemente gefunden:', {
    presetSelect: !!presetSelect,
    yamlEditor: !!yamlEditor,
    worldIdInput: !!worldIdInput
  });
  
  if (!presetSelect || !yamlEditor) {
    console.warn('❌ [Integrationstest] Preset-Select oder YAML-Editor nicht gefunden');
    return;
  }
  
  // Prüfe, ob die Optionsgruppen bereits existieren
  let localPresetsGroup = document.getElementById('localPresetsGroup');
  let worldFilesGroup = document.getElementById('worldFilesGroup');
  
  console.log('🔍 [Integrationstest] Optionsgruppen gefunden:', {
    localPresetsGroup: !!localPresetsGroup,
    worldFilesGroup: !!worldFilesGroup
  });
  
  // Erstelle die Optionsgruppen, falls sie nicht existieren
  if (!localPresetsGroup) {
    console.log('📝 [Integrationstest] Erstelle lokale Presets-Gruppe');
    localPresetsGroup = document.createElement('optgroup');
    localPresetsGroup.id = 'localPresetsGroup';
    localPresetsGroup.label = 'Lokale Vorlagen';
    presetSelect.appendChild(localPresetsGroup);
  }
  
  if (!worldFilesGroup) {
    console.log('📝 [Integrationstest] Erstelle Welt-Dateien-Gruppe');
    worldFilesGroup = document.createElement('optgroup');
    worldFilesGroup.id = 'worldFilesGroup';
    worldFilesGroup.label = 'Welt-Dateien';
    presetSelect.appendChild(worldFilesGroup);
  }
  
  // Lokale Presets befüllen
  console.log('📝 [Integrationstest] Befülle lokale Presets, Anzahl:', Object.keys(templates).length);
  localPresetsGroup.innerHTML = '';
  if (Object.keys(templates).length === 0) {
    console.log('❌ [Integrationstest] Keine lokalen Vorlagen gefunden');
    const opt = document.createElement('option');
    opt.disabled = true;
    opt.textContent = '(keine Vorlagen gefunden)';
    localPresetsGroup.appendChild(opt);
  } else {
    console.log('✅ [Integrationstest] Füge lokale Vorlagen hinzu');
    Object.keys(templates).forEach(id => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = templates[id].match(/name:\s*"([^"]+)"/)?.[1] || id;
      localPresetsGroup.appendChild(opt);
    });
  }
  
  // Welt-Dateien befüllen
  console.log('📝 [Integrationstest] Befülle Welt-Dateien');
  worldFilesGroup.innerHTML = '';
  listWorldFiles().then(files => {
    console.log('📦 [Integrationstest] Welt-Dateien erhalten:', files);
    if (!files || !files.length) {
      console.log('❌ [Integrationstest] Keine Welt-Dateien gefunden');
      const opt = document.createElement('option');
      opt.disabled = true;
      opt.textContent = '(keine YAMLs gefunden)';
      worldFilesGroup.appendChild(opt);
      return;
    }
    console.log('✅ [Integrationstest] Füge Welt-Dateien hinzu, Anzahl:', files.length);
    for (const path of files) {
      const opt = document.createElement('option');
      opt.value = `file:${path}`;
      opt.textContent = path.replace('worlds/','');
      worldFilesGroup.appendChild(opt);
    }
  }).catch(e => {
    console.error('❌ [Integrationstest] Fehler beim Laden der Welt-Dateien:', e);
    const opt = document.createElement('option');
    opt.disabled = true;
    opt.textContent = '(Fehler beim Laden der Liste)';
    worldFilesGroup.appendChild(opt);
  });
  
  // Event-Listener für Änderungen
  console.log('🔧 [Integrationstest] Füge Event-Listener für Preset-Änderungen hinzu');
  presetSelect.addEventListener('change', async () => {
    console.log('🔄 [Integrationstest] Preset-Änderung erkannt');
    const v = presetSelect.value;
    console.log('📝 [Integrationstest] Ausgewählter Wert:', v);
    
    // Eingebaute Templates
    if (v && templates[v]) {
      console.log('📝 [Integrationstest] Lade lokales Template:', v);
      try {
        const raw = templates[v];
        console.log('📦 [Integrationstest] Template-Raw-Content Länge:', raw.length);
        let spec = safeYamlParse(raw);
        console.log('✅ [Integrationstest] Template geparst:', spec);
        
        // Single Source of Truth: root.id entfernen
        spec = stripRootId(spec);
        console.log('✅ [Integrationstest] Root-ID entfernt');
        
        // Neue systemseitige ID generieren
        const uniqueId = deriveCopyId(v);
        console.log('🏷️ [Integrationstest] Neue ID generiert:', uniqueId);
        if (worldIdInput) worldIdInput.value = uniqueId;
        
        // In den Editor schreiben wir YAML OHNE id
        const yamlContent = safeYamlDump(spec);
        console.log('📝 [Integrationstest] YAML-Content generiert, Länge:', yamlContent.length);
        yamlEditor.value = yamlContent;
        // Aktualisiere die Welt-ID im Editor
        if (editor) {
          editor.worldId = uniqueId;
          console.log('🏷️ [Integrationstest] Welt-ID im Editor gesetzt');
        }
        
        // Aktualisiere die Vorschau - verwende die gleiche Methode wie in setupWorldSearch
        console.log('🎬 [Integrationstest] Aktualisiere Vorschau über _processYamlInput');
        if (editor) {
          console.log('[DIAGNOSE] Lade.js - Setze Welt-ID und starte Verarbeitung (presetSelect - lokales Template)');
          editor.worldId = uniqueId;
          console.log('[DIAGNOSE] Lade.js - Editor-Status vor _processYamlInput (presetSelect):', {
            hasPreviewRenderer: !!editor.previewRenderer,
            hasThreeJSManager: !!editor.threeJSManager,
            threeJSManagerInitialized: editor.threeJSManager?.initialized,
            worldId: editor.worldId
          });
          
          // Now that the editor has the correct YAML, trigger the processing pipeline
          yamlEditor.value = yamlContent;
          simulateInputEvent(yamlEditor);
          
          
        } else {
          console.error('❌ [Integrationstest] Editor nicht verfügbar');
        }
        
        if (window.showToast) window.showToast('success', 'Auswahl geladen.');
        console.log('🎉 [Integrationstest] Lokales Template erfolgreich geladen');
      } catch (e) {
        console.error('❌ [Integrationstest] Fehler beim Laden des lokalen Templates:', e);
        if (window.showToast) window.showToast('error', 'Preset konnte nicht geladen werden: ' + (e?.message || e));
      }
      return;
    }
    
    // worlds/*.yaml Dateien
    if (v && v.startsWith('file:')) {
      const path = v.substring(5);
      console.log('📁 [Integrationstest] Lade Welt-Datei:', path);
      try {
        const res = await fetch(path, { cache: 'no-cache' });
        if (!res.ok) throw new Error('Konnte Datei nicht laden: ' + path);
        const raw = await res.text();
        console.log('📦 [Integrationstest] Datei-Content Länge:', raw.length);
        let spec = safeYamlParse(raw);
        console.log('✅ [Integrationstest] Datei geparst:', spec);
        
        // zone_id bereinigen wie bisher
        if (spec && Object.prototype.hasOwnProperty.call(spec, 'zone_id')) {
          try { delete spec.zone_id; } catch {}
          console.log('✅ [Integrationstest] zone_id entfernt');
        }
        
        // Single Source of Truth: root.id entfernen
        spec = stripRootId(spec);
        console.log('✅ [Integrationstest] Root-ID entfernt');
        
        // Neue systemseitige ID generieren
        const uniqueId = deriveCopyId(path.replace('worlds/', '').replace('.yaml', ''));
        console.log('🏷️ [Integrationstest] Neue ID generiert:', uniqueId);
        if (worldIdInput) worldIdInput.value = uniqueId;
        
        // In den Editor schreiben wir YAML OHNE id
        const yamlContent = safeYamlDump(spec);
        console.log('📝 [Integrationstest] YAML-Content generiert, Länge:', yamlContent.length);
        yamlEditor.value = yamlContent;
        // Aktualisiere die Welt-ID im Editor
        if (editor) {
          editor.worldId = uniqueId;
          console.log('🏷️ [Integrationstest] Welt-ID '+uniqueId+' im Editor gesetzt');
        }
        
        // Aktualisiere die Vorschau - verwende die gleiche Methode wie in setupWorldSearch
        console.log('🎬 [Integrationstest] Aktualisiere Vorschau über _processYamlInput');
        if (editor) {
          console.log('[DIAGNOSE] Lade.js - Setze Welt-ID und starte Verarbeitung (presetSelect - Welt-Datei)');
          editor.worldId = uniqueId;
          console.log('[DIAGNOSE] Lade.js - Editor-Status vor _processYamlInput (presetSelect - Welt-Datei):', {
            hasPreviewRenderer: !!editor.previewRenderer,
            hasThreeJSManager: !!editor.threeJSManager,
            threeJSManagerInitialized: editor.threeJSManager?.initialized,
            worldId: editor.worldId
          });
          
          // Now that the editor has the correct YAML, trigger the processing pipeline
          //simulateInputEvent(yamlEditor);
          await editor._processYamlInput();
          console.log('[DIAGNOSE] Lade.js - _processYamlInput abgeschlossen (presetSelect - Welt-Datei)');
        } else {
          console.error('❌ [Integrationstest] Editor nicht verfügbar');
        }
        
        if (window.showToast) window.showToast('success', 'Auswahl geladen.');
        console.log('🎉 [Integrationstest] Welt-Datei erfolgreich geladen');
      } catch (e) {
        console.error('❌ [Integrationstest] Fehler beim Laden der Welt-Datei:', e);
        if (window.showToast) window.showToast('error', 'Preset konnte nicht geladen werden: ' + (e?.message || e));
      }
    }
  });
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
  console.log('🔍 [setupFromId] Lade Welt mit ID:', world_id);
  
  const yamlEditor = document.getElementById('world-yaml-editor');
  const worldIdInput = document.getElementById('worldIdInput');
  
  if (!yamlEditor) {
    console.error('❌ [setupFromId] YAML-Editor nicht gefunden');
    if (window.showToast) window.showToast('error', 'Editor nicht verfügbar');
    return;
  }
  
  try {
    // Nostr-Service abrufen
    const nostr = nostrService || await window.NostrServiceFactory.getNostrService();
    
    // Welt anhand der ID abrufen
    console.log('📡 [setupFromId] Rufe Welt von Nostr ab...');
    const data = await nostr.getById(world_id);
    
    if (!data) {
      throw new Error('Welt mit ID ' + world_id + ' nicht gefunden');
    }
    
    console.log('✅ [setupFromId] Welt-Daten erhalten:', data);
    
    // YAML-Text extrahieren (gleiche Logik wie in setupWorldSearch)
    let yamlText;
    // The best source is originalYaml, if it exists
    if (data.originalYaml) {
      yamlText = data.originalYaml;
    }
    // The next best is a 'yaml' property
    else if (data.yaml) {
      yamlText = data.yaml;
    }
    // The next best is the nostr event 'content' field
    else if (data.content && typeof data.content === 'string') {
      try {
        // Check if content is JSON or YAML, and dump it back to clean YAML
        const parsed = safeYamlParse(data.content);
        yamlText = safeYamlDump(stripRootId(parsed));
      } catch {
        // Assume it's already YAML if parsing fails
        yamlText = data.content;
      }
    }
    // Fallback for objects that are already parsed
    else if (typeof data === 'object') {
      const spec = stripRootId(data);
      yamlText = safeYamlDump(spec);
    } else {
      throw new Error("Konnte keinen YAML-Inhalt aus den Daten extrahieren.");
    }
    
    console.log('📝 [setupFromId] YAML-Content extrahiert, Länge:', yamlText.length);
    
    // YAML in den Editor schreiben
    yamlEditor.value = yamlText;
    
    // Welt-ID setzen
    if (worldIdInput) {
      worldIdInput.value = world_id;
    }
    
    if (editor) {
      editor.worldId = world_id;
      console.log('🏷️ [setupFromId] Welt-ID im Editor gesetzt:', world_id);
      
      // Input-Event simulieren, um die Verarbeitung auszulösen
      simulateInputEvent(yamlEditor);
      console.log('✅ [setupFromId] Input-Event simuliert, Vorschau sollte aktualisiert werden');
    }
    
    if (window.showToast) window.showToast('success', 'Welt erfolgreich geladen.');
    console.log('🎉 [setupFromId] Welt erfolgreich geladen und gerendert');
    
  } catch (e) {
    console.error('❌ [setupFromId] Fehler beim Laden der Welt:', e);
    if (window.showToast) window.showToast('error', 'Welt konnte nicht geladen werden: ' + (e?.message || e));
  }
}

// Funktion zum Prüfen und Verarbeiten des URL-Query-Parameters
export function setupUrlParameterHandler(editor, nostrService) {
  console.log('🔍 [setupUrlParameterHandler] Prüfe URL-Parameter...');
  
  // URL-Parameter auslesen
  const urlParams = new URLSearchParams(window.location.search);
  const worldId = urlParams.get('world');
  
  if (worldId) {
    console.log('🌍 [setupUrlParameterHandler] Welt-ID in URL gefunden:', worldId);
    
    // Warte kurz, bis der Editor vollständig initialisiert ist
    setTimeout(async () => {
      await setupFromId(worldId, editor, nostrService);
    }, 500);
  } else {
    console.log('ℹ️ [setupUrlParameterHandler] Kein Welt-Parameter in URL gefunden');
  }
}

// Hauptfunktion zum Initialisieren der Load-Funktionalität
export async function initLoadFunctionality(editor, nostrService) {
  console.log('🔍 [DEBUG] initLoadFunctionality aufgerufen');
  setupWorldSearch(editor, nostrService);
  
  // Überprüfen, ob das presetSelect-Element existiert
  const presetSelect = document.getElementById('presetSelect');
  console.log('🔍 [DEBUG] presetSelect-Element gefunden:', !!presetSelect);
  
  if (presetSelect) {
    console.log('🔍 [DEBUG] presetSelect-Element ist vorhanden, rufe setupPresetSelect auf');
    setupPresetSelect(editor);
  } else {
    console.warn('⚠️ [DEBUG] presetSelect-Element nicht gefunden, setupPresetSelect wird nicht aufgerufen');
  }
  
  // URL-Parameter-Handler einrichten
  setupUrlParameterHandler(editor, nostrService);
  
  // setupRenderResetButtons sind veraltet, da die UI-Elemente entfernt wurden.
}