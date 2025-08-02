# UI-Überblick

Ziel: Verstehen, wie die UI aufgebaut ist, wie sie mit der 3D-Szene interagiert und wo sinnvolle Erweiterungspunkte liegen. Dieses Dokument ist bewusst technologiearm formuliert und verlinkt an geeigneten Stellen in die tieferen Kapitel wie [three.Scene()](docs/features/scene-basics.md:1), [es-module-shims.importMap()](docs/features/module-shims.md:1) und [nostr.publish()](docs/features/nostr-basics.md:1).

Inhaltsverzeichnis
- Bestandteile der UI
- Benutzerfluss
- Interaktion mit der 3D-Szene
- Zustände und Events
- Erweiterungspunkte
- Barrierefreiheit, Responsiveness, Performance

Bestandteile der UI
- Haupt-Canvas: Das Canvas-Element rendert die 3D-Szene (Renderer, Kamera, Loop). Siehe [three.WebGLRenderer()](docs/features/scene-basics.md:1).
- Panels/Overlays: Seitliche oder modale Panels mit Buttons, Slidern, Listenelementen.
- Statusleiste: FPS, Verbindung zu Relays (Nostr), Ladezustände.
- Dialoge: Bestätigungen, Einstellungen, Fehlermeldungen.

Benutzerfluss
1) Seite laden: Module werden via [importmap.define()](docs/features/module-shims.md:1) aufgelöst, der Code initialisiert die Scene.
2) Scene-Init: Kamera, Renderer, Licht, erste Objekte. Siehe [three.PerspectiveCamera()](docs/features/scene-basics.md:1).
3) UI-Init: Panels/Controls werden mit dem State verbunden.
4) Interaktion: Nutzer klickt, zieht, tippt – Events werden in State-Aktionen übersetzt.
5) Optional Nostr: Bestimmte Aktionen werden als Events publiziert/abonniert. Siehe [nostr.subscribe()](docs/features/nostr-basics.md:1).

Interaktion mit der 3D-Szene
- Auswahl/Manipulation: Raycaster prüft, welches Objekt getroffen wurde; State aktualisiert Auswahl und Scene reflektiert die Änderung.
- Kamera-Steuerung: OrbitControls o. ä.; Fenster-Resize passt Kamera/Renderer an.
- Render-Loop: Ein zentraler Ticker ruft das Rendern auf; State/Animationen werden pro Frame berücksichtigt.

Zustände und Events
- UI-State: Sichtbarkeit von Panels, aktuelle Tool-Auswahl, Eingabewerte von Controls.
- Scene-State: Liste der Objekte, deren Transformationswerte, Material-Parameter.
- Event-Fluss: UI-Action -> State-Update -> Scene-Change; Scene-Event -> State-Update -> UI-Reflektierung; optional Nostr-Publish/Subscribe.
- Siehe Details in [State & Events](docs/features/state-and-events.md).

Erweiterungspunkte
- Neue Panels: Erzeuge ein Panel-Template, binde es an State-Selectoren/Aktionen. Siehe [UI-Panel hinzufügen](docs/guides/add-ui-panel.md).
- Neue 3D-Objekte/Tools: Nutze [three.Mesh()](docs/features/scene-basics.md:1) mit eigenen Geometrien/Materialien. Siehe [3D-Objekt hinzufügen](docs/guides/add-3d-object.md).
- Nostr-Features: Abonniere neue Event-Typen, mappe sie auf State/Scene. Siehe [Nostr integrieren](docs/guides/integrate-nostr.md).
- Theming/Styling: Konsistente Klassen/Variablen; achte auf Kontrast/Lesbarkeit.

Barrierefreiheit, Responsiveness, Performance
- A11y: Tastaturnavigation, ARIA-Rollen, Fokusmanagement, skalierbare Schriftgrößen.
- Responsiveness: Panels passen sich an Viewport-Breiten an, Canvas füllt den Raum ohne Verzerrung.
- Performance: Weniger Reflows, debouncte UI-Events, selektive Scene-Updates, Material/Geometrie-Reuse.

Nächste Schritte
- Starte lokal: [setup-local.md](docs/guides/setup-local.md)
- Füge ein Objekt hinzu: [add-3d-object.md](docs/guides/add-3d-object.md)
- Baue ein Panel: [add-ui-panel.md](docs/guides/add-ui-panel.md)