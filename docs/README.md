# Dokumentation

Ziel: Diese Dokumentation führt dich schrittweise durch die UI, Architektur und die wichtigsten Technologien, sodass du die Anwendung sicher erweitern kannst – auch ohne Vorerfahrung mit [three.Scene](./features/scene-basics.md), [es-module-shims.importMap](./features/module-shims.md) und [nostr.publish](./features/nostr-basics.md).

## Inhalte
- Einstieg
  - [Lokale Einrichtung](./guides/setup-local.md)
  - [UI-Überblick](./ui-overview.md)
- Features
  - [three.js Grundlagen](./features/scene-basics.md)
  - [es-module-shims und Import Maps](./features/module-shims.md)
  - [Nostr: Events & Relays](./features/nostr-basics.md)
  - [State & Events](./features/state-and-events.md)
  - [Erweiterbarkeit](./features/extensibility.md)
- Guides
  - [3D-Objekt hinzufügen](./guides/add-3d-object.md)
  - [UI-Panel hinzufügen](./guides/add-ui-panel.md)
  - [Nostr integrieren](./guides/integrate-nostr.md)
  - [Patch-Visualisierung nutzen](./guides/patch-visualization.md)
- Referenz
  - [Architekturdiagramme](./reference/architecture.md)
  - [Glossar](./reference/glossary.md)
  - [Troubleshooting](./reference/troubleshooting.md)
- [Roadmap](./roadmap.md)

## Überblick
Eine interaktive 3D-Client-UI, die eine Szene rendert, UI-Interaktionen bereitstellt und optional Nostr-Events publiziert/abonniert. Im Repo findest du u. a. die Einstiegsdatei [client_ux_boilerplate.html](../client_ux_boilerplate.html), die als Grundlage für das UI/3D-Setup dienen kann.

### Architektur-Layer
- UI Layer: Panels, Buttons, Inputs, State-Subscription
- Scene Layer: 3D-Welt mit [three.PerspectiveCamera](./features/scene-basics.md), [three.WebGLRenderer](./features/scene-basics.md), Meshes, Lights
- IO Layer: Nostr-Relays, Netzwerk, Persistenz

[mermaid.flowchart](./reference/architecture.md)

### Weiterführende Links
- Für Einsteiger:
   - [UI-Überblick](./ui-overview.md)
   - [three.js Grundlagen](./features/scene-basics.md)
   - [Setup lokal](./guides/setup-local.md)
- Erste Schritte bauen:
   - [3D-Objekt hinzufügen](./guides/add-3d-object.md)
   - [Nostr integrieren](./guides/integrate-nostr.md)
   - [Patch-Visualisierung nutzen](./guides/patch-visualization.md)
- Vertiefung:
   - [State & Events](./features/state-and-events.md)
   - [Erweiterbarkeit](./features/extensibility.md)

## Hinweise
- Dateiverweise sind klickbar, z. B. [client_ux_boilerplate.html](../client_ux_boilerplate.html).
- Sprachkonstrukte/Funktionsaufrufe werden klickbar referenziert, z. B. [three.Mesh](./features/scene-basics.md), [importmap.define](./features/module-shims.md), [nostr.subscribe](./features/nostr-basics.md).
- Diagramme sind in [architecture.md](./reference/architecture.md) zentral gesammelt.

## Nächste Schritte
- Lies [ui-overview.md](./ui-overview.md), um die Oberfläche und Interaktionspunkte zu verstehen.
- Starte das Projekt lokal mit [setup-local.md](./guides/setup-local.md).
- Füge probeweise ein Objekt über [add-3d-object.md](./guides/add-3d-object.md) ein.
- Erstelle und visualisiere Patches mit [patch-visualization.md](./guides/patch-visualization.md).

---

# Dokumentation

Diese Dokumentation beschreibt die einheitliche World-Generation-Pipeline der Wissens-Entdeckungswelt.

## Einheitliche Pipeline
Seit der Konsolidierung werden alle Welten – prozedural, YAML-basiert und im Preset-Editor – über die gleiche Pipeline erzeugt:

- `js/world-generation/index.js`: `buildZoneFromSpec(spec)` baut eine Zone (Gruppe) aus einer WorldSpec.
- `js/world-generation/resolve.js`: Löst Presets und Defaults in eine vollständige Spec auf.
- `js/world-generation/presets.js`: Enthält Preset- und Default-Tabellen für Terrain, Objekte, Personas und Environment.
- `js/world-generation/environment.js`: Hintergrundfarbe/Himmel, Nebel, Lichter (Ambient/Directional/Hemi) via `applyEnvironment` und Farbkurven via `getSkyColor`.
- `js/world-generation/builders.js`: Fabriken für Terrain, Objekte (inkl. Felsen als Icosahedron), Personas (Billboard-Planes) und Portale.
- `js/world-generation/animation.js`: Einheitliche Animationen für Portale/Auren und Persona-Billboarding.

Diese Module werden in folgenden Pfaden verwendet:
- Prozedural: `ZoneManager.generateZone` → Spec → `buildZoneFromSpec`.
- YAML: `YAMLWorldLoader`/`ZoneManager.loadYAMLZone` laden YAML → Spec → `buildZoneFromSpec`.
- Preset-Editor: `preset-editor.html` parst YAML → Spec → `buildZoneFromSpec` für die Vorschau.

## Presets und Defaults
Siehe `js/world-generation/presets.js`:
- Terrain-Presets: `forest_floor` (Hügellandschaft mit Textur), `grass_flat`, `marble_flat`.
- Objekt-Presets: `tree_simple`, `rock_small` (Icosahedron), `crystal`, `mushroom_small`, `stone_circle_thin`, `bookshelf`.
- Persona-Presets: `npc_plain`, `npc_guardian`, `npc_scholar`, `npc_fairy` (alle als Billboard-Planes mit Canvas-Avatar und Aura).
- Environment-Defaults: `skybox: clear_day`, `time_of_day: 0.5`, `ambient_light: 0.7`, `sun_intensity: 0.9`, optional `fog_distance`, `skybox_mode: cube` (prozedurale Skybox-Box).

## Environment-Optionen
- `skybox`: Preset für Hintergrundfarbkurve (`clear_day`, `sunset`, `night`, `storm`, `mystery_dark`, `skyline`, `ocean`, `bay`).
- `time_of_day`: 0..1 steuert Sonnenstand und Farbübergänge.
- `ambient_light`: Intensität des AmbientLight.
- `sun_intensity`: Intensität des DirectionalLight.
- `fog_distance`: Optionaler linearer Nebel (Start 10, Ende fog_distance).
- `skybox_mode`: `'cube'` aktiviert prozedurale Skybox-Box (Sternen-/Gradiententexturen); weglassen verwendet nur die Hintergrundfarbe.

## Einheitliche Typen
- Terrain: `type: flat|hills`, `size: [w,h]`, optionale Hügel-Parameter `amplitude`, `flat_radius`, `blend_radius`, `outer_gain`, optional `texture: forest_floor`.
- Objekte: `type: tree|rock|crystal|mushroom|stone_circle|bookshelf` oder passende `preset`-Namen.
- Personas: Billboard-Planes mit `name`, `role`, `position`, `appearance{ color, height }` oder `preset` (`npc_*`).
- Portale: Zylinder-Rahmen, Größe `[width,height,depth]`, `color`, `position`, `destination|target`.

## Migration bestehender Inhalte
- YAML-Welten (unter `worlds/`) sollten Environment-Felder vereinheitlichen (empfohlen: `skybox_mode: cube`, `ambient_light: 0.7`, `sun_intensity: 0.9`).
- Objekt-Typen/Preset-Namen an die oben genannten Werte anpassen.
- Personas als Preset (`npc_*`) oder mit `appearance` definieren; Darstellung erfolgt als Billboard-Plane.

## Beispiele
Beispiel-Environment:
```yaml
environment:
  skybox: clear_day
  time_of_day: 0.5
  ambient_light: 0.7
  sun_intensity: 0.9
  skybox_mode: cube
  # fog_distance: 80
```
Beispiel-Objekt:
```yaml
objects:
  - preset: rock_small
    position: [3, 0, -2]
  - type: stone_circle
    color: '#696969'
    position: [0, 0, 0]
```
Beispiel-Persona:
```yaml
personas:
  - preset: npc_guardian
    name: "Wächter"
    position: [0, 0, 5]
```