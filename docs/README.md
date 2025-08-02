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