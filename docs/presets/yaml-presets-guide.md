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

## Pfade (Wege)

Das System unterstützt Pfade, die automatisch als begehbare Wege auf dem Terrain gerendert werden und intelligent bei der Objekt-Platzierung berücksichtigt werden.

### Pfad-Definition
```yaml
terrain:
  type: hills
  texture: grass_texture
  paths:
    - points:
        - [-20, 0, -15]  # Startpunkt [x, y, z]
        - [-5, 0, -2]    # Wegpunkt
        - [0, 0, 0]      # Zentrum
        - [8, 0, 12]     # Wegpunkt  
        - [20, 0, 18]    # Endpunkt
      smooth: true       # Bezier-Glättung aktivieren
    - points:            # Zweiter Pfad (Verzweigung)
        - [0, 0, 0]
        - [-10, 0, 15]
        - [-18, 0, 22]
      smooth: false      # Gerader Pfad ohne Glättung
```

### Pfad-Optionen
Globale Einstellungen für alle Pfade:
```yaml
terrain:
  paths: [...]
  path_options:
    pathWidth: 18         # Pfadbreite in Pixeln (default: 16)
    pathColor: "#654321"  # Pfadfarbe (default: "#8b7355")
    bgColor: "transparent"  # Hintergrund (default: transparent)
```

**pathWidth Richtwerte:**
- Schmale Pfade: 8-12 (für Fußwege)
- Standard Pfade: 16-20 (für Hauptwege)  
- Breite Straßen: 24-32 (für Verkehrswege)

### Automatische Objekt-Platzierung
Objekte und NPCs werden automatisch **außerhalb** der Pfade platziert:

```yaml
# Normale Definition - System vermeidet Pfade automatisch
objects:
  - preset: "tree_simple"
    # position wird automatisch pfad-frei gewählt
  
  - type: "circle_of_rocks"
    number: 8
    # Auch Composite-Objekte respektieren Pfade
```

### Manuelle Pfad-Kontrolle
Für präzise Kontrolle:
```yaml
objects:
  - preset: "crystal"
    position: [0, 0, 0]     # Direkt auf Pfad platzieren
    avoid_paths: false      # Pfad-Vermeidung deaktivieren
  
  - preset: "bookshelf"
    avoid_paths: true       # Explizit pfad-frei platzieren
    min_path_distance: 3    # Mindestabstand zu Pfaden
```

### Pfad-Features
- ✅ **Bezier-Glättung**: Natürlich geschwungene Wege
- ✅ **Automatische Vermeidung**: Objekte werden pfad-frei platziert
- ✅ **Mehrere Pfade**: Verzweigungen und separate Wege
- ✅ **Texture-Integration**: Pfade werden in Terrain-Textur eingebrannt
- ✅ **Intelligente Fallbacks**: Auch ohne Pfade funktioniert alles

## Collections (Sammlungen)

Das Collections-System ermöglicht es, sehr schnell große Mengen abwechslungsreicher Objekte zu generieren. Perfekt für natürliche Landschaften!

### Collections-Syntax
```yaml
objects:
  - collections: ['trees', 'rocks']
    number: 25           # Anzahl generierter Objekte
    seed: 12345          # Seed für reproduzierbare Ergebnisse
    avoid_paths: true    # Pfad-Vermeidung aktivieren
    min_path_distance: 4 # Mindestabstand zu Pfaden
```

### Verfügbare Collections

**trees** - Verschiedene Baumtypen:
- tree_simple (verschiedene Größen)
- deciduous_tree (Laubbäume)
- conifer_tree (Nadelbäume)

**rocks** - Felsen und Steine:
- rock_small (verschiedene Größen und Farben)

**forest_objects** - Gemischte Waldlandschaft:
- Bäume (gewichtet 70%)
- Felsen und Pilze (gewichtet 30%)

**mystical** - Magische Elemente:
- crystal (verschiedene Farben)
- circle_of_rocks (verschiedene Größen)

**village** - Siedlungs-Objekte:
- bookshelf, crystal, kleine Steinkreise

### Erweiterte Collections-Features

**Mehrere Collections kombinieren:**
```yaml
objects:
  - collections: ['trees', 'rocks', 'mystical']
    number: 40
    seed: 98765
```

**Gewichtete Verteilung:**
Collections haben interne Gewichtungen für realistische Verteilungen:
```yaml
# forest_objects Collection:
# - Bäume: 70% (weight: 3+2+2)
# - Felsen: 15% (weight: 1)  
# - Pilze: 15% (weight: 1)
```

**Automatische Variationen:**
- Zufällige Skalierungen (±20%)
- Verschiedene Farben und Größen
- Unterschiedliche Pfad-Abstände

### Collections vs. Einzelobjekte

```yaml
# Traditionell (viel Arbeit):
objects:
  - preset: "tree_simple"
    position: [5, 0, 3]
    scale: [1.2, 1.2, 1.2]
  - type: "deciduous_tree"  
    position: [8, 0, -2]
    scale: [0.9, 0.9, 0.9]
  - preset: "rock_small"
    position: [-3, 0, 7]
  # ... weitere 20+ Objekte ...

# Mit Collections (eine Zeile):
objects:
  - collections: ['trees', 'rocks']
    number: 25
```

### Tipps für Collections

- **seed**: Gleicher Seed = identische Verteilung
- **number**: 10-50 für kleine Bereiche, 50+ für große Landschaften
- **avoid_paths**: true für natürliche Verteilung
- **Kombinationen**: Mehrere Collection-Einträge für verschiedene Bereiche

## Vorteile
- ✅ Kürzere YAML-Dateien
- ✅ Einheitliches Design
- ✅ Einfacher für LLMs zu erstellen
- ✅ Individuelle Anpassungen möglich
- ✅ Wiederverwendbare Komponenten
