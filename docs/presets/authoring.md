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

## Interaktive Bearbeitung mit Addons

Der PresetEditor bietet drei Addons für direkte 3D-Interaktion:

### TerrainClickAddon
- **Objekt-Platzierung**: Klicke auf das Terrain, um Bäume, Felsen, etc. zu platzieren
- **Pfad-Erstellung**: Sammle Punkte für automatische Pfad-Generierung
- **YAML-Generierung**: Erstellt automatisch korrektes YAML

### EntityInteractionAddon
- **Entity-Auswahl**: Mouseover für Hervorhebung, Klick für Bearbeitung
- **Dialog-Bearbeitung**: Benutzerfreundliche Formulare für alle Eigenschaften
- **Echtzeit-Vorschau**: Änderungen sofort in 3D sichtbar

### MaterialEditorAddon
- **Material-Bearbeitung**: Füge Materialien zu Entities hinzu
- **PBR-Controls**: Metalness, Roughness, Emissive mit Slidern
- **Vorlagen**: Vorgefertigte Materialien (Wood, Stone, Glass, etc.)

Diese Addons machen die YAML-Bearbeitung intuitiver und beschleunigen den Workflow erheblich.
