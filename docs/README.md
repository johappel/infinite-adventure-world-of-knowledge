# Dokumentation: Infinite Adventure World of Knowledge

Ziel: Diese Dokumentation führt dich schrittweise durch die UI, Architektur und die wichtigsten Technologien, sodass du die Anwendung sicher erweitern kannst – auch ohne Vorerfahrung mit [three.Scene()](docs/features/scene-basics.md:1), [es-module-shims.importMap()](docs/features/module-shims.md:1) und [nostr.publish()](docs/features/nostr-basics.md:1).

Inhaltsverzeichnis
- Überblick
  - Was ist dieses Projekt?
  - Wie ist die UI aufgebaut?
  - Wie hängen 3D-Szene, UI und Nostr zusammen?
- Erste Schritte
  - [Lokale Einrichtung](docs/guides/setup-local.md)
  - [UI-Überblick](docs/ui-overview.md)
- Features (Konzepte im Detail)
  - [three.js Grundlagen](docs/features/scene-basics.md)
  - [es-module-shims und Import Maps](docs/features/module-shims.md)
  - [Nostr: Events & Relays](docs/features/nostr-basics.md)
  - [State & Events](docs/features/state-and-events.md)
  - [Erweiterbarkeit](docs/features/extensibility.md)
- Anleitungen (Schritt-für-Schritt)
  - [3D-Objekt hinzufügen](docs/guides/add-3d-object.md)
  - [UI-Panel hinzufügen](docs/guides/add-ui-panel.md)
  - [Nostr integrieren](docs/guides/integrate-nostr.md)
- Referenz
  - [Architekturdiagramme](docs/reference/architecture.md)
  - [Glossar](docs/reference/glossary.md)
  - [Troubleshooting](docs/reference/troubleshooting.md)
- [Roadmap](docs/roadmap.md)

Was ist dieses Projekt?
Eine interaktive 3D-Client-UI, die eine Szene rendert, UI-Interaktionen bereitstellt und optional Nostr-Events publiziert/abonniert. Im Repo findest du u. a. die Einstiegsdatei [client_ux_boilerplate.html](client_ux_boilerplate.html), die als Grundlage für das UI/3D-Setup dienen kann.

Architekturüberblick
Die Anwendung besteht aus drei Schichten:
- UI Layer: Panels, Buttons, Overlays, Statusanzeigen, Eingaben
- Scene Layer: 3D-Welt mit [three.PerspectiveCamera()](docs/features/scene-basics.md:1), [three.WebGLRenderer()](docs/features/scene-basics.md:1), Meshes, Lights
- Nostr Layer: Kommunikation über Relays (optional), Event-Publishing/Subscription

Mermaid-Übersicht
[mermaid.flowchart()](docs/reference/architecture.md:1)
flowchart TD
  A[Client UI] -- actions --> S[(State)]
  S -- updates --> B[three.js Scene]
  A -- inputs --> P[Panels/Controls]
  B -- events --> S
  S -- publish/subscribe --> N[Nostr Service]
  N -- relay IO --> R[(Relays)]

Empfohlener Lernpfad
1) Grundlagen verstehen:
   - [UI-Überblick](docs/ui-overview.md)
   - [three.js Grundlagen](docs/features/scene-basics.md)
2) Projekt lokal starten:
   - [Setup lokal](docs/guides/setup-local.md)
3) Erste Erweiterung:
   - [3D-Objekt hinzufügen](docs/guides/add-3d-object.md)
4) Kommunikation:
   - [Nostr integrieren](docs/guides/integrate-nostr.md)
5) Stabil skalieren:
   - [State & Events](docs/features/state-and-events.md)
   - [Erweiterbarkeit](docs/features/extensibility.md)

Konventionen in dieser Doku
- Dateiverweise sind klickbar, z. B. [client_ux_boilerplate.html](client_ux_boilerplate.html).
- Sprachkonstrukte/Funktionsaufrufe werden klickbar referenziert, z. B. [three.Mesh()](docs/features/scene-basics.md:1), [importmap.define()](docs/features/module-shims.md:1), [nostr.subscribe()](docs/features/nostr-basics.md:1).
- Diagramme sind in [architecture.md](docs/reference/architecture.md) zentral gesammelt.

Nächste Schritte
- Lies [ui-overview.md](docs/ui-overview.md), um die Oberfläche und Interaktionspunkte zu verstehen.
- Starte das Projekt lokal mit [setup-local.md](docs/guides/setup-local.md).
- Füge probeweise ein Objekt über [add-3d-object.md](docs/guides/add-3d-object.md) ein.