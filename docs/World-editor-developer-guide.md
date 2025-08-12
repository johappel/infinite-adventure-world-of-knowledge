# Wold Editor Entwicklerdokumentation

## Übersicht

Der PresetEditor ist ein modulares System zur Erstellung und Bearbeitung von virtuellen Welten und Patches. Er basiert auf einer ES6-Modularchitektur und wurde von einer monolithischen Struktur in separate, logische Module umstrukturiert.

## Architektur

### Module-Struktur

```
editor/js/preset-editor/
├── index.js          # Haupt-Export-Datei
├── core.js           # Hauptklasse und grundlegende Initialisierung
├── yaml-processor.js # YAML-Verarbeitung und Normalisierung
├── world-manager.js  # Welt-Operationen (Erstellen, Laden, Speichern)
├── patch-manager.js  # Patch-Operationen (Erstellen, Bearbeiten, Anwenden)
├── preview-renderer.js # 3D-Vorschau und Rendering
└── ui-manager.js     # UI-Verwaltung und Event-Bindings
```

### Abhängigkeiten

- **PatchKit API**: Für die Verarbeitung von Genesis- und Patch-Objekten
- **Three.js**: Für die 3D-Visualisierung
- **js-yaml**: Für YAML-Parsing und Serialisierung
- **NostrService**: Für dezentrale Identitätsverwaltung

## Module im Detail

### Core-Modul (`core.js`)

Die `PresetEditor`-Klasse ist das Herzstück des Systems und koordiniert alle anderen Module.

#### Hauptfunktionen

- **Initialisierung**: Setzt alle Submodule und bindet Events
- **YAML-Verarbeitung**: Verarbeitet YAML-Eingaben und validiert sie
- **Statusverwaltung**: Zentrale Statusmeldungen und Fehlerbehandlung
- **API-Integration**: Bindet die PatchKit-API ein

#### Wichtige Methoden

```javascript
// Konstruktor
constructor(opts = {})

// Initialisierung aller Komponenten
async init()

// YAML-Eingabe verarbeiten und validieren
async _processYamlInput()

// Statusmeldung setzen
_setStatus(msg, type = 'info')

// YAML-Text abrufen (abhängig vom aktiven Tab)
getYamlText()

// YAML-Text setzen (abhängig vom aktiven Tab)
setYamlText(text)
```

#### Verwendung

```javascript
import { PresetEditor } from './editor/js/preset-editor/index.js';

const editor = new PresetEditor({
  textarea: document.getElementById('world-yaml-editor'),
  statusEl: document.getElementById('status-bar'),
  canvas: document.getElementById('preview-canvas')
});

await editor.init();
```

### YAML-Processor (`yaml-processor.js`)

Verarbeitet alle YAML-Operationen einschließlich Parsing, Serialisierung und Normalisierung.

#### Hauptfunktionen

- **Parsing**: Konvertiert YAML-Text in JavaScript-Objekte
- **Serialisierung**: Konvertiert JavaScript-Objekte in YAML-Text
- **Normalisierung**: Konvertiert benutzerfreundliches YAML in PatchKit-Format
- **Denormalisierung**: Konvertiert PatchKit-Format in benutzerfreundliches YAML
- **Validierung**: Validiert YAML gegen das PatchKit-Schema

#### Wichtige Methoden

```javascript
// YAML in Objekt umwandeln
parseYaml()

// Objekt in YAML umwandeln
serializeYaml(obj)

// Benutzer-YAML normalisieren (für PatchKit)
normalizeUserYaml(obj)

// PatchKit-YAML denormalisieren (für Benutzer)
denormalizeUserYaml(obj)

// Patch-YAML normalisieren
normalizePatchYaml(obj)

// YAML validieren
validateYaml()
```

#### Normalisierungsprozess

Die `normalizeUserYaml()`-Funktion führt folgende Transformationen durch:

1. Stellt sicher, dass `metadata` mit korrekter `schema_version` vorhanden ist
2. Validiert und korrigiert IDs nach dem Muster `^[A-Za-z0-9_-]{8,64}$`
3. Entfernt leere oder null-Werte
4. Konvertiert Entitäts-Arrays in Objekte mit ID-Schlüsseln
5. Normalisiert `environment`, `terrain` und `camera` in die `entities`-Struktur
6. Stellt sicher, dass alle erforderlichen Entitätstypen vorhanden sind

#### Beispiel

```javascript
// Benutzerfreundliches YAML
const userYaml = `
metadata:
  name: "Meine Welt"
  schema_version: "patchkit/1.0"

objects:
  - id: "baum1"
    type: "tree"
    position: [0, 0, 0]
    scale: [1, 1, 1]
    color: "#1a4a1a"
`;

// Normalisiertes YAML (für PatchKit)
const normalizedYaml = yamlProcessor.normalizeUserYaml(parsedUserYaml);
/*
{
  metadata: {
    name: "Meine Welt",
    schema_version: "patchkit/1.0"
  },
  entities: {
    objects: {
      "baum1": {
        type: "tree",
        position: [0, 0, 0],
        scale: [1, 1, 1],
        color: "#1a4a1a"
      }
    },
    portals: {},
    personas: {}
  }
}
*/
```

### World-Manager (`world-manager.js`)

Verwaltet alle Operationen im Zusammenhang mit Welten (Genesis-Objekte).

#### Hauptfunktionen

- **Welterstellung**: Erstellt neue Welten mit Standardwerten
- **Weltladen**: Lädt Welten anhand ihrer ID
- **Weltspeichern**: Speichert Welten im Repository
- **Import/Export**: Importiert und exportiert Welten als YAML-Dateien

#### Wichtige Methoden

```javascript
// Neue Welt erstellen
async createNewWorld()

// Welt anhand der ID laden
async loadWorldById(worldId)

// Aktuelle Welt speichern
async saveCurrent()

// Als neue Welt speichern (mit neuer ID)
async saveAsNewWorld()

// Welt exportieren
async exportWorld()

// Welt importieren
async importWorld()
```

#### Beispiel

```javascript
// Neue Welt erstellen
await editor.worldManager.createNewWorld();

// Welt laden
await editor.worldManager.loadWorldById('world_12345678');

// Welt speichern
await editor.worldManager.saveCurrent();
```

### Patch-Manager (`patch-manager.js`)

Verwaltet alle Operationen im Zusammenhang mit Patches.

#### Hauptfunktionen

- **Patch-Erstellung**: Erstellt neue Patches
- **Patch-Bearbeitung**: Lädt Patches zur Bearbeitung
- **Patch-Löschung**: Löscht Patches (nur eigene)
- **Patch-Anwendung**: Wendet Patches auf Welten an
- **Patch-Visualisierung**: Visualisiert Patches in der 3D-Vorschau

#### Wichtige Methoden

```javascript
// Neuen Patch erstellen
async createNewPatch()

// Patch bearbeiten
async editPatch(patchId)

// Patch löschen
async deletePatch(patchId)

// Patch speichern
async saveAsPatch()

// Patch anwenden
async applyPatch(patchId)

// Patch visualisieren
async visualizePatch(patch, options)

// Patch-Visualisierung zurücksetzen
async resetPatchVisualization()
```

#### Patch-Visualisierung

Die Patch-Visualisierung ermöglicht es, Änderungen durch Patches in der 3D-Vorschau darzustellen:

```javascript
// Patch mit hervorgehobenen Änderungen visualisieren
await editor.patchManager.visualizePatch(patch, {
  highlightChanges: true,
  showConflicts: false
});
```

### Preview-Renderer (`preview-renderer.js`)

Verwaltet die 3D-Vorschau und Rendering-Operationen.

#### Hauptfunktionen

- **Three.js-Initialisierung**: Initialisiert die 3D-Engine
- **Welt-Rendering**: Rendert Welten in der 3D-Vorschau
- **Patch-Konvertierung**: Konvertiert Patches in Genesis-Format für die Vorschau
- **Fenstergrößenanpassung**: Passt die Vorschau an Fensteränderungen an

#### Wichtige Methoden

```javascript
// Three.js Preview initialisieren
async _initThreePreview()

// Vorschau aus Objekt aktualisieren
async updatePreviewFromObject(worldObj)

// Welt rendern
async renderWorld()

// Welt zurücksetzen
async resetWorld()

// Fenstergrößenänderung behandeln
_handleWindowResize()
```

#### Beispiel

```javascript
// Vorschau aus Objekt aktualisieren
const worldObj = {
  metadata: { name: "Meine Welt" },
  entities: {
    objects: {
      "baum1": {
        type: "tree",
        position: [0, 0, 0]
      }
    }
  }
};
await editor.previewRenderer.updatePreviewFromObject(worldObj);
```

### UI-Manager (`ui-manager.js`)

Verwaltet alle UI-Elemente, Tabs und Event-Bindings.

#### Hauptfunktionen

- **Tab-Verwaltung**: Verwaltet den Wechsel zwischen World- und Patch-Editoren
- **Event-Bindings**: Bindet UI-Events an die entsprechenden Funktionen
- **Status-Updates**: Aktualisiert den UI-Zustand basierend auf dem Editor-Zustand
- **Dialoge**: Zeigt Bestätigungs- und Eingabedialoge an

#### Wichtige Methoden

```javascript
// Tab wechseln
switchTab(tabName)

// Patch-Tab-Namen aktualisieren
_updatePatchTabName(name)

// Validierungsfehler in UI anzeigen
_setValidationErrorsUI(errors, rawYaml)

// UI-Zustand aktualisieren
updateUIState()

// Toast anzeigen
showToast(type, message)

// Bestätigungsdialog anzeigen
showConfirmDialog(message)

// Eingabedialog anzeigen
showInputDialog(message, defaultValue)
```

#### Beispiel

```javascript
// Zum Patch-Tab wechseln
editor.uiManager.switchTab('patch');

// Erfolgs-Toast anzeigen
editor.uiManager.showToast('success', 'Welt gespeichert');

// Bestätigungsdialog anzeigen
if (editor.uiManager.showConfirmDialog('Möchten Sie wirklich speichern?')) {
  // Speichern
}
```

## YAML-Schema

### Genesis-Objekt (Welt)
Metadaten außerhalb des YAML EDITORS
id: world_id => nostr tags: ["d:world12345"]
kind: 30311
created_at: Veröffentlichungsdatum
```yaml
name: "Meine Welt"             # Optional
description: "Beschreibung"     # Optional
objects:                        # Optional
  - type: "tree"               # Erforderlich
    position: [0, 0, 0]        # Optional, Standard: [0, 0, 0]
    scale: [1, 1, 1]           # Optional, Standard: [1, 1, 1]
    color: "#1a4a1a"           # Optional
    # ... weitere objektspezifische Eigenschaften

portals:                        # Optional
  - id: "door-to-house"         # Erforderlich
    position: [0, 0, 0]         # Optional, Standard: [0, 0, 0]
    destination: "world_12348"  # Optional
    

personas:                      # Optional
  - name: "Merlin"             # Erforderlich
    position: [0, 0, 0]        # Optional, Standard: [0, 0, 0]
    # ... weitere personaspezifische Eigenschaften

environment:                     # Optional
  skybox: "clear_day"
  time_of_day: 0.5
  ambient_light: 0.6
  sun_intensity: 0.8
  fog_distance: 100
  ambient_sound: "birds"

terrain:                         # Optional
  type: "plane"                 # Optional, Standard: "plane"
  size: [100, 100]               # Optional, Standard: [100, 100]
  color: "#1a4a1a"               # Optional, Standard: "#1a4a1a"

camera:                          # Optional
  position: [0, 5, 10]          # Optional, Standard: [0, 5, 10]
  target: [0, 0, 0]             # Optional, Standard: [0, 0, 0]

rules:                           # Optional
  # ... welt-spezifische Regeln
```

### Patch-Objekt
**Metadaten außerhalb des YAML Editors**
id: patch_id => nostr tags: ["a", "30311:PUBKEY_DES_ERSTELLERS:WELT_ID"]
kind: 30312
created_at: Datum des patches


```yaml
name: "Eine Box hinzufügen"
operation: "add"                 # Erforderlich "add", "update", "delete"
  - type: "tree"                 # entity_id wird automatisch generiert
    position: [0, 0, 0]
  
operation: "update"
  - entity_id: "obj1"
    color: "#ff0000"
  
operation: "delete"
    entity_id: "obj2"            # Für "delete"-Operationen
```

## Best Practices

### Fehlerbehandlung

Alle asynchronen Methoden sollten Fehler abfangen und entsprechend behandeln:

```javascript
try {
  await editor.worldManager.saveCurrent();
} catch (error) {
  console.error('Fehler beim Speichern:', error);
  editor._setStatus('Speichern fehlgeschlagen: ' + error.message, 'error');
}
```

### Statusmeldungen

Verwenden Sie die `_setStatus()`-Methode für konsistente Statusmeldungen:

```javascript
// Erfolgsstatus
editor._setStatus('Welt geladen', 'success');

// Fehlerstatus
editor._setStatus('Laden fehlgeschlagen: ' + error.message, 'error');

// Informationsstatus
editor._setStatus('Wird verarbeitet...', 'info');
```

### UI-Updates

Verwenden Sie den UI-Manager für konsistente UI-Updates:

```javascript
// Erfolgs-Toast anzeigen
editor.uiManager.showToast('success', 'Welt gespeichert');

// Bestätigungsdialog anzeigen
if (editor.uiManager.showConfirmDialog('Möchten Sie wirklich speichern?')) {
  // Speichern
}
```

### YAML-Verarbeitung

Verwenden Sie immer die Normalisierungsfunktionen des YAML-Processors:

```javascript
// Benutzer-YAML normalisieren
const normalized = editor.yamlProcessor.normalizeUserYaml(userObj);

// PatchKit-YAML denormalisieren
const denormalized = editor.yamlProcessor.denormalizeUserYaml(patchkitObj);
```

## Erweiterungen

Der PresetEditor ist für Erweiterungen konzipiert. Neue Funktionalität kann durch folgende Muster hinzugefügt werden:

1. **Neue Module**: Erstellen Sie neue Module unter `editor/js/preset-editor/`
2. **Integration**: Integrieren Sie neue Module in die `PresetEditor`-Klasse
3. **Export**: Exportieren Sie neue Module in `index.js`
4. **Importmap**: Aktualisieren Sie die Importmap bei Bedarf

Beispiel für ein neues Modul:

```javascript
// editor/js/preset-editor/new-feature.js
export class NewFeature {
  constructor(editor) {
    this.editor = editor;
  }
  
  async doSomething() {
    // Implementierung
  }
}
```

Integration in den Core:

```javascript
// editor/js/preset-editor/core.js
import { NewFeature } from './new-feature.js';

export class PresetEditor {
  constructor(opts = {}) {
    // ... bestehender Code
    
    // Neues Modul initialisieren
    this.newFeature = new NewFeature(this);
  }
}
```

Export in index.js:

```javascript
// editor/js/preset-editor/index.js
export { NewFeature } from './new-feature.js';
```

## Testen

Für das Testen der Module sollten separate Testdateien erstellt werden, die die Funktionalität jedes Moduls isoliert überprüfen.

Beispiel für einen Test:

```javascript
// tests/yaml-processor.test.js
import { YamlProcessor } from '../editor/js/preset-editor/yaml-processor.js';

// Mock-Editor erstellen
const mockEditor = {
  getYamlText: () => 'test: value',
  setYamlText: () => {},
  _setStatus: () => {},
  patchKit: {
    genesis: {
      validate: () => ({ valid: true })
    }
  }
};

const yamlProcessor = new YamlProcessor(mockEditor);

// Test durchführen
const result = yamlProcessor.parseYaml();
console.assert(result.test === 'value', 'Parse-Test fehlgeschlagen');
```

