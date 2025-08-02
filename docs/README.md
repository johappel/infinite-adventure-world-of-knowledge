# Dokumentation: Infinite Adventure World of Knowledge

Ziel: Diese Dokumentation führt dich schrittweise durch die UI, Architektur und die wichtigsten Technologien, sodass du die Anwendung sicher erweitern kannst – auch ohne Vorerfahrung mit [three.Scene()](./features/scene-basics.md:1), [es-module-shims.importMap()](./features/module-shims.md:1) und [nostr.publish()](./features/nostr-basics.md:1).

Inhaltsverzeichnis
- Überblick
  - Was ist dieses Projekt?
  - Wie ist die UI aufgebaut?
  - Wie hängen 3D-Szene, UI und Nostr zusammen?
- Erste Schritte
  - [Lokale Einrichtung](./guides/setup-local.md)
  - [UI-Überblick](ui-overview.md)
- Features (Konzepte im Detail)
  - [three.js Grundlagen](./features/scene-basics.md)
  - [es-module-shims und Import Maps](./features/module-shims.md)
  - [Nostr: Events & Relays](./features/nostr-basics.md)
  - [State & Events](./features/state-and-events.md)
  - [Erweiterbarkeit](./features/extensibility.md)
- Anleitungen (Schritt-für-Schritt)
  - [3D-Objekt hinzufügen](./guides/add-3d-object.md)
  - [UI-Panel hinzufügen](./guides/add-ui-panel.md)
  - [Nostr integrieren](./guides/integrate-nostr.md)
- Referenz
  - [Architekturdiagramme](./reference/architecture.md)
  - [Glossar](./reference/glossary.md)
  - [Troubleshooting](./reference/troubleshooting.md)
- [Roadmap](roadmap.md)

Was ist dieses Projekt?
Eine interaktive 3D-Client-UI, die eine Szene rendert, UI-Interaktionen bereitstellt und optional Nostr-Events publiziert/abonniert. Im Repo findest du u. a. die Einstiegsdatei [client_ux_boilerplate.html](client_ux_boilerplate.html), die als Grundlage für das UI/3D-Setup dienen kann.

Architekturüberblick
Die Anwendung besteht aus drei Schichten:
- UI Layer: Panels, Buttons, Overlays, Statusanzeigen, Eingaben
- Scene Layer: 3D-Welt mit [three.PerspectiveCamera()](./features/scene-basics.md:1), [three.WebGLRenderer()](./features/scene-basics.md:1), Meshes, Lights
- Nostr Layer: Kommunikation über Relays (optional), Event-Publishing/Subscription

Mermaid-Übersicht
[mermaid.flowchart()](./reference/architecture.md:1)
flowchart TD
  A[Client UI] -- actions --> S[(State)]
  S -- updates --> B[three.js Scene]
  A -- inputs --> P[Panels/Controls]
  B -- events --> S
  S -- publish/subscribe --> N[Nostr Service]
  N -- relay IO --> R[(Relays)]

Empfohlener Lernpfad
1) Grundlagen verstehen:
   - [UI-Überblick](ui-overview.md)
   - [three.js Grundlagen](./features/scene-basics.md)
2) Projekt lokal starten:
   - [Setup lokal](./guides/setup-local.md)
3) Erste Erweiterung:
   - [3D-Objekt hinzufügen](./guides/add-3d-object.md)
4) Kommunikation:
   - [Nostr integrieren](./guides/integrate-nostr.md)
5) Stabil skalieren:
   - [State & Events](./features/state-and-events.md)
   - [Erweiterbarkeit](./features/extensibility.md)

Konventionen in dieser Doku
- Dateiverweise sind klickbar, z. B. [client_ux_boilerplate.html](client_ux_boilerplate.html).
- Sprachkonstrukte/Funktionsaufrufe werden klickbar referenziert, z. B. [three.Mesh()](./features/scene-basics.md:1), [importmap.define()](./features/module-shims.md:1), [nostr.subscribe()](./features/nostr-basics.md:1).
- Diagramme sind in [architecture.md](./reference/architecture.md) zentral gesammelt.

Nächste Schritte
- Lies [ui-overview.md](ui-overview.md), um die Oberfläche und Interaktionspunkte zu verstehen.
- Starte das Projekt lokal mit [setup-local.md](./guides/setup-local.md).
- Füge probeweise ein Objekt über [add-3d-object.md](./guides/add-3d-object.md) ein.