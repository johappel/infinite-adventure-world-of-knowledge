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

Öffne den Preset-Editor über `world-editor.html` in deinem Browser.

### 2. Welt laden oder erstellen

Lade eine vorhandene Welt oder erstelle eine neue:

```javascript
// Welt aus YAML-Datei laden
yamlHelpers.loadZone('worlds/sample_world.yaml')

//von world_id laden

setupFromId(world_id, editor, nostrService)
- world_id: Nostr-Event-ID (NIP-33 d-Tag)
- editor: Editor-Instanz (wird im Bootstrap-Prozess erstellt)
- nostrService: await window.NostrServiceFactory.getNostrService(); //nostr oder indexDb

// Oder eine neue Welt erstellen
editor.createNewWorld()
```

### 3. Zur Patch-Ansicht wechseln

Klicke auf den "Patch"-Tab oben im Editor, um zur Patch-Ansicht zu wechseln.

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

## Patches erstellen

Modifizierende Patches (Operation: update, delete) auf Objekte angewendet werden, die eine id haben. Objekte, die eine Id haben sollten bei MouseOver im 3D Preview farblich hervorgehoben werden.
Grundsätzlich können Objekte über die add Opreation hinzugefügt werden. 

**Wenn eine Welt (Genesis) im 

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

Beim Laden einer Genesis werden **automatisch alle Patches** in der Reihenfolge ihres entstehens (created_at) verarbeitet und in der 3D Ansicht wird die finale Welt mit allen gepatchten Veränderungen  gerenderd.

Um die Auswirkung eines **einzelen Patches** anzuzeigen, klicke in der Liste auf einen Patch: Alle vorhergehenden Patches werden in der 3D Preview visualisiet. Die Elemente des aktuell angeklickten Patches werden ebenfalls in die Welt hinein gerenderd aber farblich hervorgehoben (siehe oben)

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

Die Patch-Visualisierung bietet verschiedene Steuerungsmöglichkeiten:

- **Highlight-Änderungen**: Zeigt hervorgehobene Änderungen an/aus
- **Zeitbasierte Anwendung**: Spielt die Patch-Anwendung schrittweise ab

#### Tastenkürzel
- `P`: Spiele alle patches nacheinander ab 
- '+': schneller abspielen (zeitbasiert)
- '-': langsamer abspielen
- `Leertaste`: Pausiert/fortgesetzt den automatischen ablauf aller Patches
- `N`: Nächhster Patch
- `M`: Vorhergehender


Die zeitbasierte Patch-Anwendung ermöglicht es dir, die Auswirkungen eines Patches schrittweise zu visualisieren

## Best Practices

### Patch-Erstellung

- **Kleine, fokussierte Patches**: Erstelle Patches, die eine spezifische Änderung vornehmen
- **Aussagekräftige Namen**: Verwende beschreibende Namen für deine Patches
- **Dokumentation**: Füge Beschreibungen hinzu, um den Zweck des Patches zu erklären



## weitere Beispiele

```yaml
name: "Baum hinzufügen"
description: "Fügt einen einzelnen Baum zur Welt hinzu"
operations: add 
objects:
  - type: "tree"
    position: [5, 0, 3]
    scale: [1, 1, 1]
    color: "#4a7c1e"
```

```yaml
name: "Baumfarbe ändern"
description: "schöneres grün"
operations: update 
  - id: "existing-tree"
    color: "#5a8c2e"
```

```yaml
name: "Baum entfernen"
operations: delete 
  - id: "existing-tree"
```




### Debug-Optionen

Aktiviere die Debug-Optionen, um Probleme zu diagnostizieren:

```javascript
// Debug-Modus aktivieren
editor.setDebugMode(true)

// Patch-Visualisierung debuggen
editor.patchVisualizer.debug = true

// Konsolenausgaben anzeigen
console.log(editor.patchVisualizer.getState())
```

## API-Referenz

### PatchVisualizer-Klasse

Die PatchVisualizer-Klasse bietet die folgenden Methoden:

```javascript
// Patch visualisieren
await editor.patchVisualizer.visualizePatch(patch, options)

// Visualisierung zurücksetzen
editor.patchVisualizer.resetVisualization()

// Highlight-Status umschalten
editor.patchVisualizer.toggleHighlights()

// Zeitbasierte Anwendung starten/stoppen
editor.patchVisualizer.toggleTimeBasedApplication()

// Animationsgeschwindigkeit setzen
editor.patchVisualizer.setAnimationSpeed(speed)
```

### PresetEditor-Erweiterungen

Der PresetEditor wurde um folgende Methoden erweitert:

```javascript
// Patch erstellen
await editor.savePatch()

// Patch bearbeiten
await editor.editPatch(patchId)

// Patch löschen
await editor.deletePatch(patchId)

// Zur Patch-Ansicht wechseln
editor.switchTab('patch')
```
