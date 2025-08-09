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

Öffne den Preset-Editor über `preset-editor.html` in deinem Browser.

### 2. Welt laden oder erstellen

Lade eine vorhandene Welt oder erstelle eine neue:

```javascript
// Welt aus YAML-Datei laden
yamlHelpers.loadZone('worlds/sample_world.yaml')

// Oder eine neue Welt erstellen
editor.createNewWorld()
```

### 3. Zur Patch-Ansicht wechseln

Klicke auf den "Patch"-Tab oben im Editor, um zur Patch-Ansicht zu wechseln.

## Patch-Visualisierung verstehen

### Hauptkomponenten

1. **3D-Visualisierungsbereich**: Zeigt die Welt mit visuellen Hervorhebungen für Patch-Änderungen
2. **Patch-Liste**: Zeigt verfügbare Patches an, die auf die Welt angewendet werden können
3. **Patch-Editor**: YAML-Editor zum Erstellen und Bearbeiten von Patches
4. **Visualisierungs-Controls**: Steuerelemente für die Darstellung der Patch-Änderungen

### Farbliche Hervorhebungen

- **Grün**: Hinzugefügte Entitäten
- **Rot**: Entfernte Entitäten
- **Gelb**: Modifizierte Entitäten
- **Blau**: Konflikte zwischen Patches

## Patches erstellen

### Methode 1: Visuell über den 3D-Editor

1. Wähle im 3D-Bereich eine Entität aus, die du ändern möchtest
2. Klicke auf "Patch erstellen" im Kontextmenü
3. Passe die Eigenschaften im YAML-Editor an
4. Klicke auf "Patch speichern"

### Methode 2: Direkt im YAML-Editor

1. Wechsle zum "Patch"-Tab
2. Gib deinen Patch im YAML-Format ein:

```yaml
name: "Mein erster Patch"
description: "Fügt einen Baum hinzu"
author: "Dein Name"
entities:
  added:
    objects:
      - type: "tree"
        position: [5, 0, 3]
        scale: [1, 1, 1]
        color: "#4a7c1e"
```

3. Klicke auf "Patch speichern"
4. Gib einen Namen für deinen Patch ein und bestätige

## Patches bearbeiten

1. Wähle in der Patch-Liste den Patch aus, den du bearbeiten möchtest
2. Klicke auf das Bearbeiten-Symbol (✏️) neben dem Patch-Namen
3. Der Patch wird im YAML-Editor geladen
4. Nimm deine Änderungen vor
5. Klicke auf "Patch aktualisieren"

## Patches löschen

1. Wähle in der Patch-Liste den Patch aus, den du löschen möchtest
2. Klicke auf das Löschen-Symbol (🗑️) neben dem Patch-Namen
3. Bestätige die Löschung im Dialog

## Patch-Visualisierung steuern

### Visualisierungs-Optionen

Die Patch-Visualisierung bietet verschiedene Steuerungsmöglichkeiten:

- **Highlight-Änderungen**: Zeigt hervorgehobene Änderungen an/aus
- **Zeitbasierte Anwendung**: Spielt die Patch-Anwendung schrittweise ab
- **Konflikt-Anzeige**: Zeigt Konflikte zwischen Patches an
- **Animationsgeschwindigkeit**: Steuert die Geschwindigkeit der Zeitbasierten Anwendung

### Tastenkürzel

- `Leertaste`: Pausiert/fortgesetzt die zeitbasierte Anwendung
- `P`: Wechselt zur Patch-Ansicht
- `W`: Wechselt zur Welt-Ansicht
- `S`: Speichert den aktuellen Patch

## Fortgeschrittene Funktionen

### Zeitbasierte Patch-Anwendung

Die zeitbasierte Patch-Anwendung ermöglicht es dir, die Auswirkungen eines Patches schrittweise zu visualisieren:

1. Erstelle oder lade einen Patch
2. Aktiviere "Zeitbasierte Anwendung" in den Visualisierungs-Optionen
3. Klicke auf "Abspielen", um die Animation zu starten
4. Beobachte, wie die Änderungen schrittweise angewendet werden

### Konfliktvisualisierung

Wenn mehrere Patches auf dieselben Entitäten wirken, werden Konflikte visualisiert:

1. Lade mehrere Patches, die sich überschneiden
2. Aktiviere "Konflikt-Anzeige"
3. Konfliktbereiche werden in Blau hervorgehoben
4. Im Konflikt-Panel siehst du Details zu den Konflikten

### Patch-Komposition

Du kannst mehrere Patches kombinieren:

1. Wähle in der Patch-Liste mehrere Patches aus
2. Klicke auf "Patches kombinieren"
3. Die kombinierten Änderungen werden visualisiert
4. Speichere den kombinierten Patch als neuen Patch

## Best Practices

### Patch-Erstellung

- **Kleine, fokussierte Patches**: Erstelle Patches, die eine spezifische Änderung vornehmen
- **Aussagekräftige Namen**: Verwende beschreibende Namen für deine Patches
- **Dokumentation**: Füge Beschreibungen hinzu, um den Zweck des Patches zu erklären

### Patch-Management

- **Versionskontrolle**: Nutze Patches, um Änderungen nachvollziehbar zu machen
- **Testen**: Visualisiere Patches immer vor dem Anwenden auf eine Produktionswelt
- **Backup**: Erstelle Backups wichtiger Welten vor dem Anwenden von Patches

### Performance

- **Komplexe Patches**: Bei sehr komplexen Patches kann die Visualisierung langsam sein
- **Viele Entitäten**: Patches mit vielen Entitäten können die Leistung beeinträchtigen
- **Optimierung**: Nutze die "Highlight-Änderungen"-Option, um die Performance zu verbessern

## Fehlerbehebung

### Häufige Probleme

**Patch wird nicht visualisiert:**
- Stelle sicher, dass der Patch korrekt formatiert ist
- Überprüfe, ob der Patch auf die aktuelle Welt anwendbar ist
- Prüfe die Browser-Konsole auf Fehlermeldungen

**3D-Visualisierung funktioniert nicht:**
- Stelle sicher, dass Three.js korrekt geladen ist
- Überprüfe, ob der WebGL-Renderer unterstützt wird
- Aktualisiere den Browser auf die neueste Version

**Patch kann nicht gespeichert werden:**
- Überprüfe die Netzwerkverbindung
- Stelle sicher, dass du die notwendigen Berechtigungen hast
- Prüfe, ob der Patch-Name bereits vergeben ist

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

## Beispiele

### Einfacher Patch

```yaml
name: "Baum hinzufügen"
description: "Fügt einen einzelnen Baum zur Welt hinzu"
author: "Beispielautor"
entities:
  added:
    objects:
      - type: "tree"
        position: [5, 0, 3]
        scale: [1, 1, 1]
        color: "#4a7c1e"
```

### Komplexer Patch

```yaml
name: "Wald erweitern"
description: "Fügt mehrere Bäume und Felsen hinzu"
author: "Beispielautor"
entities:
  added:
    objects:
      - type: "tree"
        position: [5, 0, 3]
        scale: [1, 1, 1]
        color: "#4a7c1e"
      - type: "tree"
        position: [7, 0, 5]
        scale: [1.2, 1.2, 1.2]
        color: "#3d6b1a"
      - type: "rock"
        position: [3, 0, 2]
        scale: [0.8, 0.6, 0.8]
        color: "#8b7355"
  modified:
    objects:
      - id: "existing-tree"
        color: "#5a8c2e"
```

## Nächste Schritte

- Experimentiere mit verschiedenen Patch-Typen
- Erstelle komplexe Patches mit mehreren Änderungen
- Nutze die zeitbasierte Anwendung für Präsentationen
- Kombiniere mehrere Patches zu einem Gesamt-Patch

---

Diese Anleitung bietet eine umfassende Einführung in die Patch-Visualisierungsfunktionen. Für weitere Informationen zur Welt-Erstellung und zum YAML-Format siehe [world-maker.md](../world-maker.md).