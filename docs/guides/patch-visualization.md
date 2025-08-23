# Patch-Visualisierung nutzen

Ziel: Diese Anleitung erklärt, wie du die Patch-Visualisierungsfunktionen im Preset-Editor nutzen kannst, um Änderungen an Welten visuell darzustellen, zu erstellen und zu verwalten.

## Überblick

Die Patch-Visualisierung ist eine Erweiterung des Preset-Editors, die es ermöglicht:

- **Visuelle Darstellung von Patches**: Sieh dir die Auswirkungen von Patches auf die 3D-Welt in Echtzeit an
- **Patch-Erstellung**: Erstelle neue Patches basierend auf visuellen Änderungen
- **Patch-Bearbeitung**: Bearbeite vorhandene Patches mit direkter Vorschau
- **Patch-Management**: Verwalte deine Patches mit einem übersichtlichen UI

## Voraussetzungen

- Grundlegendes Verständnis des [Preset-Editors](../world-maker.md)
- Kenntnisse über das [YAML World Format](../world-maker.md#yaml-format-spezifikation)
- Lokal laufende Entwicklungsumgebung (siehe [Setup lokal](./setup-local.md))

## Erste Schritte

### 1. Preset-Editor öffnen

Öffne den Preset-Editor über `world-editor.html` (vorzugsweise via lokalem HTTP-Server).

### 2. Welt laden oder erstellen

- Welt aus Vorlage/Preset laden oder „Neu“
- 3D-Vorschau rendert die Welt (Statusbar zeigt Objektanzahl)

### 3. Patches laden (automatisch)

- Das Panel „🧩 Patches“ (Sidebar) zeigt vorhandene Patches (IndexedDB/Nostr)
- Fehlen Patches, wird „Keine Patches gefunden“ angezeigt

### 4. Zur Patch-Ansicht wechseln

- Klicke auf den "Patch"-Tab oben im Editor, um zur Patch-Ansicht zu wechseln
- YAML im Patch-Editor eingeben (siehe Beispiele oben)
- Vorschau: Welt bleibt sichtbar, Patch-Änderungen werden farblich überlagert

## Patch-Visualisierung verstehen

### Hauptkomponenten

1. **3D-Visualisierungsbereich**: Zeigt die Welt mit visuellen Hervorhebungen für Patch-Änderungen
2. **Patch-Liste**: Zeigt verfügbare Patches an, die auf die Welt angewendet werden können (#patch-list-container .patch-list-content)
3. **Patch-Editor**: YAML-Editor zum Erstellen und Bearbeiten von Patches
4. **Visualisierungs-Controls**: Steuerelemente für die Darstellung der Patch-Änderungen

### Farbliche Hervorhebungen

- **Grün**: Hinzugefügte Entitäten
- **Rot**: Entfernte Entitäten
- **Gelb**: Modifizierte Entitäten
- **Magenta**: Konflikte (pulsierende Hervorhebung)

## Patches erstellen

Wichtig: Das im Patch-Tab eingegebene YAML ist ein "benutzerfreundliches Editor-Format" und wird vor dem Speichern/Visualisieren automatisch in das interne Schema "patchkit/1.0" (operations als Liste von add/update/delete Objekten) normalisiert.

- update/delete wirken auf Objekte mit id.
- add fügt neue Objekte/Entitäten hinzu (id optional, wird sonst generiert).
- In der 3D-Preview bleibt die Welt erhalten; Patch-Änderungen werden überlagert farblich hervorgehoben.

Hinweis: Selektion bestehender Objekte per Mausklick (Raycasting) ist vorgesehen, aber in der aktuellen Version noch nicht verfügbar. Änderungen können über den YAML-Editor vorgenommen werden.

### Methode 1: Visuell über den 3D-Editor

1. Wähle im 3D-Bereich eine Entität aus, die du ändern möchtest
2. Klicke auf "Patch erstellen" im Kontextmenü
3. Passe die Eigenschaften im YAML-Editor an
4. Klicke auf "Patch speichern"

### Methode 2: Direkt im YAML-Editor

1. Wechsle zum "Patch"-Tab
2. Gib deinen Patch im YAML-Format ein:

```yaml
name: "Mein erster Patch"            # erforderlich
description: "Fügt einen Baum hinzu" # optional
operations: add  # erforderlich: operations kommen nur im Patches vor, nicht in der genesis
objects:
  - type: "tree"
    position: [5, 0, 3]
    scale: [1, 1, 1]
    color: "#4a7c1e"
```

3. Klicke auf "Patch speichern" (jede entity erhält automatisch eine unigue id)


## Patch anzeigen

Beim Laden einer Genesis können Patches geladen und in der 3D-Ansicht visualisiert werden.
Die finale Welt mit allen Änderungen wird dargestellt, Änderungen werden farblich hervorgehoben.

Um die Auswirkung eines **einzelnen Patches** anzuzeigen, klicke in der Liste auf einen Patch:
Alle vorhergehenden Patches werden berücksichtigt; die Elemente des aktuell angeklickten Patches werden zusätzlich hervorgehoben (siehe Farblegende).

## Eigene Patches bearbeiten (nur Author npub)

1. Wähle in der Patch-Liste den Patch aus, den du bearbeiten möchtest
2. Klicke auf das Bearbeiten-Symbol (✏️) neben dem Patch-Namen
3. Der Patch wird im YAML-Editor geladen
4. Nimm deine Änderungen vor
5. Klicke auf "Patch aktualisieren"

## Patches löschen (nur Author npub)

1. Wähle in der Patch-Liste den Patch aus, den du löschen möchtest
2. Klicke auf das Löschen-Symbol (🗑️) neben dem Patch-Namen
3. Bestätige die Löschung im Dialog

## Fortgeschrittene Patch-Visualisierung steuern

### Visualisierungs-Optionen

- **Highlight-Änderungen**: Änderungen ein-/ausblenden
- **Zeitbasierte Anwendung**: Modus 'step' oder 'continuous'
- **Geschwindigkeit**: setAnimationSpeed(0.5 … 5)
- **Konflikte**: Pulsieren in Magenta

#### Tastenkürzel (optional)
- `P`: Patches nacheinander abspielen (wenn konfiguriert)
- '+': schneller
- '-': langsamer
- `Leertaste`: Pause/Fortsetzen
- `N`: Nächster Patch
- `M`: Vorhergehender


Die zeitbasierte Patch-Anwendung ermöglicht es dir, die Auswirkungen eines Patches schrittweise zu visualisieren.
Hinweis: In der aktuellen Version ist die Timeline-Steuerung als Status vorhanden (step/continuous) und wird schrittweise ausgebaut.

## Best Practices

### Patch-Erstellung

- **Kleine, fokussierte Patches**: Erstelle Patches, die eine spezifische Änderung vornehmen
- **Aussagekräftige Namen**: Verwende beschreibende Namen für deine Patches
- **Dokumentation**: Füge Beschreibungen hinzu, um den Zweck des Patches zu erklären



## weitere Beispiele (Editor-YAML)

Die folgenden Beispiele sind im benutzerfreundlichen Patch-Editor-Format. Der Editor normalisiert diese Eingaben intern in das "patchkit/1.0"-Schema.

1) Objekt hinzufügen (add)

```yaml
name: "Baum hinzufügen"
description: "Fügt einen einzelnen Baum zur Welt hinzu"

objects:
  - type: "tree"
    position: [5, 0, 3]
    scale: [1, 1, 1]
    color: "#4a7c1e"
```

2) Objekt ändern (update)

```yaml
name: "Baumfarbe ändern"
description: "schöneres grün"

objects:
  - id: "existing-tree"
    color: "#5a8c2e"
```

3) Objekt entfernen (delete)

```yaml
name: "Baum entfernen"

objects:
  - id: "existing-tree"
    delete: true
```

Interne Normalisierung (informativ):
- add → { type: "add", entity_type: "object", entity_id?, payload: {...} }
- update → { type: "update", entity_type: "object", entity_id: "existing-tree", changes: {...} }
- delete → { type: "delete", entity_type: "object", entity_id: "existing-tree" }




### Debug-Optionen

Aktiviere Debug-Ausgaben in der Konsole:

```javascript
// Basis-Debugging
console.log('PatchKit:', editor.patchKit);
console.log('PatchVisualizer info:', editor.patchVisualizer?.getPatchInfo());

// Reihenfolge/Abhängigkeiten prüfen
const order = await editor.patchKit.world.computeOrder(await editor.patchKit.io.patchPort.listByWorld(editor.worldId));
console.log('Order result:', order);
```

## API-Referenz

### PatchVisualizer-Klasse

Die PatchVisualizer-Klasse bietet u. a. folgende Methoden:

```javascript
// Patch(es) visualisieren
await editor.patchVisualizer.visualizePatches(genesis, [patch], { showConflicts: true })

// Visualisierung zurücksetzen
editor.patchVisualizer.resetVisualization()

// Highlights ein-/ausschalten
editor.patchVisualizer.toggleHighlights() // returns boolean

// Zeitmodus umschalten: 'none' | 'step' | 'continuous'
editor.patchVisualizer.toggleTimeBasedApplication('step')

// Animationsgeschwindigkeit setzen (z. B. 0.5, 1, 2, 3)
editor.patchVisualizer.setAnimationSpeed(2)
```

### PresetEditor-Erweiterungen

Der PresetEditor bietet u. a.:

```javascript
// Patch speichern (aus aktuellem Patch-Tab YAML)
await editor.patchManager.saveAsPatch()

// Patch bearbeiten/löschen
await editor.patchManager.selectPatch(patchId)
await editor.patchManager.deletePatch(patchId)

// Patch-Visualisierung (einzeln/mehrere)
await editor.patchManager.visualizePatch(patch, { highlightChanges: true })
await editor.patchManager.visualizePatches([patchA, patchB])

// Patch-Visualisierung zurücksetzen
await editor.patchManager.resetPatchVisualization()

// Tabs
editor.uiManager.switchTab('patch')
```
