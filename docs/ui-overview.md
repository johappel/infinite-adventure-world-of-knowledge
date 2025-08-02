# UI-Überblick

Ziel: Verstehen, wie die UI aufgebaut ist, wie sie mit der 3D-Szene interagiert und wo sinnvolle Erweiterungspunkte liegen. Dieses Dokument ist bewusst technologiearm formuliert und verlinkt an geeigneten Stellen in die tieferen Kapitel wie [three.Scene](./features/scene-basics.md), [es-module-shims.importMap](./features/module-shims.md) und [nostr.publish](./features/nostr-basics.md).

## Aufbau
- Panels/Sidebar: Anzeigen und Ändern von State. Buttons/Inputs dispatchen Actions.
- Haupt-Canvas: Das Canvas-Element rendert die 3D-Szene (Renderer, Kamera, Loop). Siehe [three.WebGLRenderer](./features/scene-basics.md).

## Ablauf (vereinfacht)
1) Seite laden: Module werden via [importmap.define](./features/module-shims.md) aufgelöst, der Code initialisiert die Scene.
2) Scene-Init: Kamera, Renderer, Licht, erste Objekte. Siehe [three.PerspectiveCamera](./features/scene-basics.md).
3) UI-Interaktion: Buttons/Inputs → Actions → State → Effekte (Scene/Nostr).
4) Render-Loop: Scene wird kontinuierlich gezeichnet.
5) Optional Nostr: Bestimmte Aktionen werden als Events publiziert/abonniert. Siehe [nostr.subscribe](./features/nostr-basics.md).

## Erweiterungen
- Siehe Details in [State & Events](./features/state-and-events.md).
- Neue Panels: Erzeuge ein Panel-Template, binde es an State-Selectoren/Aktionen. Siehe [UI-Panel hinzufügen](./guides/add-ui-panel.md).
- Neue 3D-Objekte/Tools: Nutze [three.Mesh](./features/scene-basics.md) mit eigenen Geometrien/Materialien. Siehe [3D-Objekt hinzufügen](./guides/add-3d-object.md).
- Nostr-Features: Abonniere neue Event-Typen, mappe sie auf State/Scene. Siehe [Nostr integrieren](./guides/integrate-nostr.md).

## Nächste Schritte
- Starte lokal: [setup-local.md](./guides/setup-local.md)
- Füge ein Objekt hinzu: [add-3d-object.md](./guides/add-3d-object.md)
- Baue ein Panel: [add-ui-panel.md](./guides/add-ui-panel.md)