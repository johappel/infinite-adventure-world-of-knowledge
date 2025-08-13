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

// Hilfsfunktion zum Aktualisieren/Entfernen des URL‑Parameters „world“
export function updateUrlParam(worldId) {
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
      'worlds/presets/single_persona.yaml'
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
              editor.worldId = data.id;
              
              // Now that the editor has the correct YAML, trigger the processing pipeline
              await editor._processYamlInput();
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
      opt.textContent = path.replace('worlds/','');
      worldFilesGroup.appendChild(opt);
    }
  }).catch(e => {
    console.error('Fehler beim Laden der Welt-Dateien:', e);
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
        let spec = safeYamlParse(raw);
        
        // Single Source of Truth: root.id entfernen
        spec = stripRootId(spec);
        
        // Neue systemseitige ID generieren
        const uniqueId = deriveCopyId(v);
        if (worldIdInput) worldIdInput.value = uniqueId;
        
        // In den Editor schreiben wir YAML OHNE id
        const yamlContent = safeYamlDump(spec);
        yamlEditor.value = yamlContent;
        // Aktualisiere die Welt-ID im Editor
        if (editor) {
          editor.worldId = uniqueId;
        }
        
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
        console.error('Fehler beim Laden des lokalen Templates:', e);
        if (window.showToast) window.showToast('error', 'Preset konnte nicht geladen werden: ' + (e?.message || e));
      }
      return;
    }
    
    // worlds/*.yaml Dateien
    if (v && v.startsWith('file:')) {
      const path = v.substring(5);
      try {
        const res = await fetch(path, { cache: 'no-cache' });
        if (!res.ok) throw new Error('Konnte Datei nicht laden: ' + path);
        const raw = await res.text();
        let spec = safeYamlParse(raw);
        
        // zone_id bereinigen wie bisher
        if (spec && Object.prototype.hasOwnProperty.call(spec, 'zone_id')) {
          try { delete spec.zone_id; } catch {}
        }
        
        // Single Source of Truth: root.id entfernen
        spec = stripRootId(spec);
        
        // Neue systemseitige ID generieren
        const uniqueId = deriveCopyId(path.replace('worlds/', '').replace('.yaml', ''));
        if (worldIdInput) worldIdInput.value = uniqueId;
        
        // In den Editor schreiben wir YAML OHNE id
        const yamlContent = safeYamlDump(spec);
        yamlEditor.value = yamlContent;
        // Aktualisiere die Welt-ID im Editor
        if (editor) {
          editor.worldId = uniqueId;
        }
        
        // URL-Parameter aktualisieren
        updateUrlParam(uniqueId);
        
        // Aktualisiere die Vorschau - verwende die gleiche Methode wie in setupWorldSearch
        if (editor) {
          editor.worldId = uniqueId;
          
          // Now that the editor has the correct YAML, trigger the processing pipeline
          //simulateInputEvent(yamlEditor);
          await editor._processYamlInput();
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
  const yamlEditor = document.getElementById('world-yaml-editor');
  const worldIdInput = document.getElementById('worldIdInput');
  
  if (!yamlEditor) {
    console.error('YAML-Editor nicht gefunden');
    if (window.showToast) window.showToast('error', 'Editor nicht verfügbar');
    return;
  }
  
  try {
    // Nostr-Service abrufen
    const nostr = nostrService || await window.NostrServiceFactory.getNostrService();
    
    // Welt anhand der ID abrufen
    const data = await nostr.getById(world_id);
    
    if (!data) {
      throw new Error('Welt mit ID ' + world_id + ' nicht gefunden');
    }
    
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
    
    // YAML in den Editor schreiben
    yamlEditor.value = yamlText;
    
    // Welt-ID setzen
    if (worldIdInput) {
      worldIdInput.value = world_id;
    }
    
    if (editor) {
      editor.worldId = world_id;
      
      // Input-Event simulieren, um die Verarbeitung auszulösen
      simulateInputEvent(yamlEditor);
    }
    
    if (window.showToast) window.showToast('success', 'Welt erfolgreich geladen.');
    
  } catch (e) {
    console.error('Fehler beim Laden der Welt:', e);
    if (window.showToast) window.showToast('error', 'Welt konnte nicht geladen werden: ' + (e?.message || e));
  }
}

// Funktion zum Prüfen und Verarbeiten des URL-Query-Parameters
export function setupUrlParameterHandler(editor, nostrService) {
  const urlParams = new URLSearchParams(window.location.search);
  const worldId = urlParams.get('world');

  if (worldId) {
    // Wenn die aktuelle Welt bereits geladen ist, nicht erneut laden
    if (editor && editor.worldId === worldId) {
      console.log('World already loaded from URL, skipping reload.');
      return;
    }
    setTimeout(async () => {
      await setupFromId(worldId, editor, nostrService);
    }, 500);
  }
}

// Hauptfunktion zum Initialisieren der Load-Funktionalität
export async function initLoadFunctionality(editor, nostrService) {
  // Lade Templates aus YAML-Dateien
  await loadTemplates();
  
  setupWorldSearch(editor, nostrService);
  
  // Überprüfen, ob das presetSelect-Element existiert
  const presetSelect = document.getElementById('presetSelect');
  
  if (presetSelect) {
    await setupPresetSelect(editor);
  } else {
    console.warn('presetSelect-Element nicht gefunden, setupPresetSelect wird nicht aufgerufen');
  }
  
  // URL-Parameter-Handler einrichten
  setupUrlParameterHandler(editor, nostrService);
  
  // setupRenderResetButtons sind veraltet, da die UI-Elemente entfernt wurden.
}