# Presets verwenden – Autorenguide

Schnellstart
1) Wähle ein Terrain-Preset.
2) Füge Objekte mit Presets hinzu.
3) Erzeuge Personas mit Presets und überschreibe `name`, `position`, `appearance.height`.

Beispiel
```yaml
terrain:
  preset: forest_floor
  amplitude: 4.0

objects:
  - preset: tree_simple
    position: [3,0,5]
  - preset: rock_small
    position: [-2,0,4]

personas:
  - preset: npc_plain
    name: "Lehrmeister"
    position: [0,0,6]
    appearance:
      height: 1.6
```

Tipps
- Verwende `preset:` wann immer möglich, um Tippfehler bei Typen zu vermeiden.
- Setze `y` auf dem Terrain leicht negativ (z. B. `-0.03`), um Z-Flimmern mit Ringen/Portalen zu reduzieren.
- Für ruhige Darstellung: große, gleichmäßige Skalen verwenden; zu kleine, dünne Geometrien vermeiden.
