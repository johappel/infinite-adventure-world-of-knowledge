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
  const yamlEditor = document.getElementById('yaml-editor');
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
            // Falls yaml nicht geliefert, nachladen
            let data = it;
            if (!it.yaml) {
              data = await nostr.getById(it.id);
            }
            if (!data || !data.yaml) throw new Error('Kein YAML gefunden');
            
            // YAML parsen und root.id entfernen, dann Editor setzen
            let spec = safeYamlParse(data.yaml);
            spec = stripRootId(spec);
            
            if (yamlEditor) yamlEditor.value = safeYamlDump(spec);
            
            // worldIdInput auf die externe ID setzen
            if (worldIdInput && data.id) worldIdInput.value = data.id;
            
            // Aktualisiere die Welt-ID im Editor
            if (editor) editor.worldId = data.id;
            
            // Aktualisiere die Vorschau
            if (editor && typeof editor.updatePreviewFromYaml === 'function') {
              await editor.updatePreviewFromYaml();
            }
            
            hideResults();
            if (window.showToast) window.showToast('success', 'Auswahl geladen.');
          } catch (e) {
            if (window.showToast) window.showToast('error', 'Konnte Ergebnis nicht laden: ' + (e?.message || e));
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
  const presetSelect = document.getElementById('presetSelect');
  const yamlEditor = document.getElementById('yaml-editor');
  const worldIdInput = document.getElementById('worldIdInput');
  
  if (!presetSelect || !yamlEditor) return;
  
  // Lokale Presets befüllen
  const localPresetsGroup = document.getElementById('localPresetsGroup');
  if (localPresetsGroup) {
    localPresetsGroup.innerHTML = '';
    Object.keys(templates).forEach(id => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = templates[id].match(/name:\s*"([^"]+)"/)?.[1] || id;
      localPresetsGroup.appendChild(opt);
    });
  }
  
  // Welt-Dateien befüllen
  const worldFilesGroup = document.getElementById('worldFilesGroup');
  if (worldFilesGroup) {
    worldFilesGroup.innerHTML = '';
    listWorldFiles().then(files => {
      if (!files.length) {
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
      const opt = document.createElement('option');
      opt.disabled = true; 
      opt.textContent = '(Fehler beim Laden der Liste)';
      worldFilesGroup.appendChild(opt);
    });
  }
  
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
        yamlEditor.value = safeYamlDump(spec);
        
        // Aktualisiere die Welt-ID im Editor
        if (editor) editor.worldId = uniqueId;
        
        // Aktualisiere die Vorschau
        if (editor && typeof editor.updatePreviewFromYaml === 'function') {
          await editor.updatePreviewFromYaml();
        }
        
        if (window.showToast) window.showToast('success', 'Auswahl geladen.');
      } catch (e) {
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
        yamlEditor.value = safeYamlDump(spec);
        
        // Aktualisiere die Welt-ID im Editor
        if (editor) editor.worldId = uniqueId;
        
        // Aktualisiere die Vorschau
        if (editor && typeof editor.updatePreviewFromYaml === 'function') {
          await editor.updatePreviewFromYaml();
        }
        
        if (window.showToast) window.showToast('success', 'Auswahl geladen.');
      } catch (e) {
        if (window.showToast) window.showToast('error', 'Preset konnte nicht geladen werden: ' + (e?.message || e));
      }
    }
  });
}

// Hauptfunktion zum Initialisieren der Load-Funktionalität
export async function initLoadFunctionality(editor, nostrService) {
  setupWorldSearch(editor, nostrService);
  setupPresetSelect(editor);
}