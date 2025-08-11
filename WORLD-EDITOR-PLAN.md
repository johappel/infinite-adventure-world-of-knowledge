# World Editor Refactoring & Modernisierung – Code Agent Auftrag

## Ziel
Der bisher monolithische `editor/js/preset-editor.js` wird vollständig in logisch getrennte ES6-Module refaktoriert und die HTML-Integration in `world-editor.html` entsprechend angepasst. Das System bleibt kompatibel mit `libs/patchkit` und erfüllt die Dokumentationsvorgaben aus `docs/api/schemas.md`. Die Bearbeitung umfasst neben der Code- und UI-Optimierung auch Tests und Entwicklerdokumentation.

---

## Aufgabenübersicht für den Code Agent

### 1. **Modulare Dateistruktur anlegen**
Unter `editor/js/preset-editor/` folgende Module erstellen:

- **`core.js`** – Hauptklasse `PresetEditorCore`  
  Konstruktor, State-Initialisierung, Bootstrap-Logik, Orchestrierung aller anderen Module.

- **`event-bindings.js`** – Alle DOM-Eventlistener  
  `bindBasicEvents`, `bindInputEvents`, `bindTabEvents`, `bindPatchVisualizationEvents`.

- **`yaml-utils.js`** – YAML-Verarbeitung  
  `getYamlText`, `setYamlText`, `parseYaml`, `serializeYaml`,  
  `normalizeUserYaml`, `denormalizeUserYaml`, `normalizePatchYaml`, `stripWorldId`.

- **`world-manager.js`** – Welt-Operationen  
  `createNewWorld`, `loadWorldById*` (alle Varianten), `_saveWorld`, `saveCurrent` (World-Part), `_getCurrentGenesisData`.

- **`patch-manager.js`** – Patch-Operationen  
  `createNewPatch`, `editPatch`, `deletePatch`, `saveAsPatch`, `_savePatch`,  
  `_convertPatchToYaml`, `_convertPatchToGenesisFormat`, `convertOperationsToPatchFormat`, `_updatePatchPreview`.

- **`preview-manager.js`** – Vorschauverwaltung  
  `_initThreePreview`, `_initPatchVisualizer`, `updatePreviewFromYaml`, `updatePreviewFromObject`, `_render2DFallback`.

- **`patch-visualization.js`** – Patch-Visualisierung  
  `_togglePatchVisualization`, `_visualizeCurrentPatch`, `visualizePatch`, `visualizePatches`,  
  `resetPatchVisualization`, Steuermethoden für Modi/Animation/Transparenz/Fokus, `updatePatchVisualizationAnimations`, `getPatchVisualizationInfo`.

- **`ui-utils.js`** – UI- und Status-Updates  
  `_setStatus`, `switchTab`, `_updateTabUI`, `_updateWorldTabName`, `_updatePatchTabName`, `_setValidationErrorsUI`,  
  `initPatchUI`, `_refreshPatchList`, `_closePatchDetails`.

- **`helpers/author.js`** – Gemeinsame Funktion  
  `resolveAuthorNpub()` für zentrale Autorenermittlung.

---

### 2. **Code-Migration**
- Alle relevanten Methoden aus `preset-editor.js` in die oben genannten Module übertragen.
- Gemeinsame Funktionen deduplizieren:
  - Patch- und World-Speicherroutinen in Helfer extrahieren.
  - Autorenermittlung zentralisieren.
  - YAML-Konvertierungen vereinheitlichen.

---

### 3. **Anpassung `world-editor.html`**
- Entferne bisherigen Direktimport von `preset-editor.js`.
- Importiere nur noch `PresetEditorCore`:
  ```javascript
  import { PresetEditorCore } from './editor/js/preset-editor/core.js';
  ```
- Bootstrap in HTML:
  ```javascript
  const editor = new PresetEditorCore();
  await editor.init();
  ```
- Bestehende DOM-IDs beibehalten.

---

### 4. **Einbindung (To-Do 6)**
- ES6-Standardimporte verwenden, keine komplexen Importmaps.
- Alle Pfade relativ, z. B. `./editor/js/preset-editor/yaml-utils.js`.

---

### 5. **Kompatibilität mit `libs/patchkit` (To-Do 7)**
- `normalizeUserYaml`, `denormalizeUserYaml`, `normalizePatchYaml` unverändert beibehalten.  
- Validate-Aufrufe beibehalten (`patchKit.genesis.validate`, `patchKit.patch.validate`).

---

### 6. **Einhaltung von `docs/api/schemas.md` (To-Do 8)**
- Pflichtfelder vor Speichern automatisch setzen.
- Validierung gegen Schema ausführen.
- Tests mit Beispielen aus `docs/api/schemas.md`.

---

### 7. **UI-Review & Verbesserungen (To-Do 9)**
- Tabs klarer differenzieren.
- Buttons an Tab-Kontext anpassen ("Neue Welt"/"Neuer Patch").
- Suchfunktion ersetzen/manuell testen.

---

### 8. **Erweiterungen Kernfunktionen (To-Do 10)**
- Echtzeit-Preview (Debounce 300 ms).
- Preset-Tab mit YAML-Vorschau.
- Owner-Restriktionen für Save.

---

### 9. **Dokumentation (To-Do 11)**
- JSDoc in allen Modulen.
- Ergänzende Doku `docs/guides/refactoring-preset-editor.md`.

---

### 10. **Optimierungen (To-Do 12)**
- Einheitlicher Debouncer für Inputs.
- Rendering-Optimierungen.
- Tab-Visibility-Awareness für 3D.

---

### 11. **Testplan (To-Do 13)**
- Unit-Tests für YAML-Utils, World-Manager, Patch-Manager.
- Integrationstests für Save/Load.
- Puppeteer-basiertes UI-Smoke-Testing.

---

**Auftrag:**  
Code Agent, führe alle oben genannten Schritte 1–11 vollständig aus und überprüfe nach jedem Schritt die Funktionsfähigkeit, bevor du mit dem nächsten weitermachst. Halte den Code modular, gut kommentiert und testbar.  
Stelle sicher, dass der Editor nach Refactoring mindestens die gleiche Funktionalität wie vorher hat, aber wartbarer, schneller und besser strukturiert ist.