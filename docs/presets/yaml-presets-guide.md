# YAML Preset System - Anleitung

## Überblick
Das Preset-System ermöglicht es, wiederverwendbare Konfigurationen für Terrain, Objekte und NPCs zu definieren. Dies macht YAML-Welten kürzer, einheitlicher und einfacher zu erstellen.

## Verwendung

### Terrain Presets
```yaml
terrain:
  preset: "forest_floor"  # Lädt alle Werte aus dem Preset
  # Individuelle Werte überschreiben das Preset
  size: [100, 100]        # Überschreibt nur die Größe
```

### Object Presets
```yaml
objects:
  - preset: "tree_simple"
    position: [5, 0, 3]    # Position ist immer individuell
    scale: [2, 2, 2]       # Überschreibt Preset-Skalierung
    
  - preset: "bookshelf"
    position: [-5, 0, -3]  # Alles andere vom Preset
```

### Persona Presets
```yaml
personas:
  - preset: "npc_guardian"
    name: "Waldwächter Theron"  # Name immer individuell
    position: [0, 0, 5]
    dialogue:                   # Erweitert das Preset
      opening: "Eigener Dialog..."
```

## Verfügbare Presets

### Terrain
- `forest_floor`: Hügelige Waldlandschaft mit Canvas-Textur
- `grass_flat`: Flache Graslandschaft 
- `marble_flat`: Flacher Marmorboden für Innenräume

### Objects
- `tree_simple`: Einfacher Baum in Waldgrün
- `rock_small`: Kleiner Felsen
- `mushroom_small`: Kleiner Pilz
- `stone_circle_thin`: Dünner Steinkreis
- `crystal`: Interaktiver Kristall
- `bookshelf`: Bücherregal für Bibliotheken

### Personas
- `npc_plain`: Standard-NPC mit roter Farbe
- `npc_fairy`: Kleine Fee in Gold
- `npc_scholar`: Gelehrter für Bibliotheken
- `npc_guardian`: Großer Wächter für Wälder

## Vorteile
- ✅ Kürzere YAML-Dateien
- ✅ Einheitliches Design
- ✅ Einfacher für LLMs zu erstellen
- ✅ Individuelle Anpassungen möglich
- ✅ Wiederverwendbare Komponenten
