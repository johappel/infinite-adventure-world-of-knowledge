# Presets – Übersicht

Ziel: Fehlerarmes YAML-Autorieren mit vordefinierten, getesteten Bausteinen. Presets liefern sinnvolle Defaults und können in YAML mit `preset:` benutzt und überschrieben werden.

Inhalte
- Terrain-Presets
- Objekt-Presets
- Collections-System
- Persona-Presets
- Defaults & Sanitizer
- Beispiele

## Terrain-Presets
- forest_floor: Hills-Terrain mit Waldboden-Canvastextur, moderater Amplitude.

YAML:
```yaml
terrain:
  preset: forest_floor
  amplitude: 4.5   # optional Override
  y: -0.03         # optional
```

## Objekt-Presets
- tree_simple: Grundbaum (grün, groß)
- rock_small: Kleiner Fels
- mushroom_small: Kleiner Pilz (interaktiv)
- stone_circle_thin: Dünner Steinkreis-Ring

**Neue Dorf-Gebäude:**
- house_simple: Einfaches Haus mit Dach
- house_large: Großes Haus mit Schornstein
- hut_small: Kleine runde Hütte
- tower_watch: Wachturm mit Plattform
- windmill: Windmühle mit Flügeln
- barn: Große Scheune
- well: Dorfbrunnen

YAML:
```yaml
objects:
  - preset: tree_simple
    position: [3,0,5]
  - preset: house_simple
    position: [10,0,0]
  - preset: windmill
    position: [-8,0,12]
  - preset: well
    position: [0,0,0]
```

## Collections-System

Das neue Collections-System ermöglicht es, sehr schnell große Mengen abwechslungsreicher Objekte zu generieren – perfekt für natürliche Landschaften!

### Verfügbare Collections
- **trees**: Verschiedene Baumtypen mit Variationen
- **rocks**: Felsen und Steine unterschiedlicher Größen  
- **forest_objects**: Gemischte Waldlandschaft (70% Bäume, 30% andere)
- **mystical**: Magische Elemente (Kristalle, Steinkreise)
- **village**: Dorf-Gebäude (Häuser, Hütten, Türme, Brunnen, etc.)

YAML:
```yaml
objects:
  - collections: ['village']
    number: 12            # Generiert ein kleines Dorf
    seed: 12345          # Für reproduzierbare Ergebnisse
    avoid_paths: true    # Gebäude respektieren Straßen
    min_path_distance: 6 # Mindestabstand zu Pfaden
```

### Vorteile von Collections
- **Schnell**: Statt 30+ einzelne Objekte = eine YAML-Zeile
- **Abwechslungsreich**: Automatische Variationen in Größe und Farbe
- **Intelligent**: Automatische Pfad-Vermeidung und Terrain-Anpassung
- **Reproduzierbar**: Gleicher Seed = identische Verteilung

## Persona-Presets
- npc_plain: Neutraler NPC
- npc_fairy: Waldfee

YAML:
```yaml
personas:
  - preset: npc_fairy
    name: "Waldfee Aria"
    position: [5,0,-8]
```

## Defaults & Sanitizer
- Vektoren werden auf gültige Längen/Typen geprüft.
- Fehlende Pflichtwerte werden ergänzt (z. B. `appearance.height`).

## Hinweise
- Presets sind Vorschläge – jedes Feld darf überschrieben werden.
- Canvastexturen werden wiederholend gefiltert (Mipmaps/Anisotropy) für flimmerarme Darstellung.
