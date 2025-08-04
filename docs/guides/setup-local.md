# Lokales Setup (aktualisiert)

Ziel: Das Projekt lokal öffnen, die HTML über einen lokalen Server ausliefern, [es-module-shims.importMap](../features/module-shims.md) korrekt laden und typische Setup-Probleme lösen.

## Schritte
1) Öffne das Repo in VS Code.
2) Prüfe die Startdatei [client_ux_boilerplate.html](../../client_ux_boilerplate.html) – hier wird die Import Map und der App-Entry definiert.
3) Lies kurz [README.md](../../README.md), um den Überblick zu bekommen.

## Starten
- Rechtsklick auf [client_ux_boilerplate.html](../../client_ux_boilerplate.html) → „Open with Live Server“.


## Troubleshooting
- In [client_ux_boilerplate.html](../../client_ux_boilerplate.html): 
  - Import Map vorhanden und vor dem ersten Module-Script.
  - es-module-shims korrekt eingebunden.

## Performance-Hinweise
- Siehe [three.js Grundlagen](../features/scene-basics.md) für Render-Loop-Optimierungen.

## Nächste Schritte
- Lies [ui-overview.md](../ui-overview.md).
- Füge ein Objekt hinzu über [add-3d-object.md](./add-3d-object.md).
- Erzeuge ein UI-Panel über [add-ui-panel.md](./add-ui-panel.md).

- Öffne `index.html` im Browser oder per Static Server.
- Beispielwelten liegen unter `worlds/`. Diese nutzen die gemeinsame Pipeline (siehe `js/world-generation/*`).
- In YAML kannst du `environment.skybox_mode: cube` setzen, um die prozedurale Skybox zu aktivieren.
- Für konsistentes Licht: `ambient_light: 0.7`, `sun_intensity: 0.9` (anpassbar pro Welt).