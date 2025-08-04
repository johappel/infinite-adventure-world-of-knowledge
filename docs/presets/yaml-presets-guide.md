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

Alternativ kannst du die Textur direkt wählen:
```yaml
terrain:
  type: flat
  texture: "grass_texture"   # forest_floor | grass_texture | marble_texture | stone_texture | floor_texture | water_texture
```

### Terrain Compositing (mehrere Layer mischen)
Mit `texture_layers` kannst du mehrere prozedurale Texturen kombinieren. Intern nutzt das System einen Canvas-Compositor mit optionaler Noise-Maske.

```yaml
terrain:
  type: hills
  texture_layers:
    - { fn: "grass",  alpha: 1.0 }
    - { fn: "stone",  alpha: 0.25, mask: "noise", maskScale: 48 }
    - { fn: "floor",  alpha: 0.10 }
```

Parameter:
- fn: Name des Generators: `grass | stone | marble | floor | water | forest`
- alpha: Deckkraft 0..1
- mask: optional `noise` (blendet Layer per Noise ein)
- maskScale: Detailgrad der Noise-Maske (typisch 32–96)

Tipps:
- Wasser als Grundfläche plus leichte Marmoradern:
```yaml
terrain:
  type: flat
  texture_layers:
    - { fn: "water", alpha: 1 }
    - { fn: "marble", alpha: 0.2, mask: "noise", maskScale: 64 }
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

### Objekt-Kombinationen (Composite)
Neben Einzelobjekten gibt es zusammengesetzte Typen:

- deciduous_tree: Zylinder (Stamm) + Kugel (Krone)
- conifer_tree: Zylinder (Stamm) + Kegel (Krone)
- circle_of_rocks: Kreis aus Felsen

Beispiele:
```yaml
objects:
  - type: "deciduous_tree"
    position: [3, 0, 3]

  - type: "conifer_tree"
    position: [-2, 0, 1]

  - type: "circle_of_rocks"
    number: 12         # Anzahl Steine (default 8)
    radius: 4.5        # Kreisradius (default 3.5)
    randomScale: true  # zufällige Größenvariation
    position: [0, 0, 0]
```

Parameter `circle_of_rocks`:
- number: Anzahl Steine (min 3)
- radius: Kreisradius
- heightJitter: vertikale Variation (default 0.4)
- color: Farbe der Felsen
- randomScale: zufällige Skalierungen aktivieren

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
- `grass_flat`: Flache Graslandschaft (prozedurale Gras-Textur)
- `marble_flat`: Flacher Marmorboden (prozedural)
- plus direkte Texturen via `texture`: `grass_texture | marble_texture | stone_texture | floor_texture | water_texture`
- und mächtiges Mischen via `texture_layers`

### Objects
- `tree_simple`: Einfacher Baum in Waldgrün
- `rock_small`: Kleiner Felsen
- `mushroom_small`: Kleiner Pilz
- `stone_circle_thin`: Dünner Steinkreis
- `crystal`: Interaktiver Kristall
- `bookshelf`: Bücherregal für Bibliotheken
- Composite: `deciduous_tree`, `conifer_tree`, `circle_of_rocks`

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
