# Erweiterbarkeit – Muster, Schnittstellen, Best Practices

Ziel: Du sollst neue UI-Panels, 3D-Funktionalität und Nostr-Features sicher ergänzen können, ohne die Basis zu destabilisieren. Dieses Kapitel zeigt dir stabile Schnittstellen, Hook-Punkte und bewährte Muster.

Inhaltsverzeichnis
- Prinzipien der Erweiterbarkeit
- Modularisierung und Stable Interfaces
- Hook-Punkte in UI, Scene und Nostr
- Abhängigkeits- und Versionsstrategie
- Qualitäts-Gates: Tests, Lint, Review-Checkliste
- Beispiele für Erweiterungen
- Nächste Schritte

Prinzipien der Erweiterbarkeit
- Trenne Darstellung (UI), Logik (State) und IO (Scene, Nostr) strikt. Siehe [State & Events](docs/features/state-and-events.md).
- Baue auf kleine, fokussierte Module – klare Responsibility, geringe Kopplung.
- Verwende Adapter-Schnittstellen für Dritt-IO (Nostr/Relays), um Austauschbarkeit zu gewährleisten.
- Biete öffentliche, dokumentierte Entry Points für Erweiterungen an, nicht interne Details.

Modularisierung und Stable Interfaces
- UI-Module:
  - Exportiere reine View/Presenter-Logik; binde State nur über definierte Selectors/Aktionen.
  - Keine direkten WebGL- oder Nostr-Zugriffe in UI-Komponenten.
- Scene-Module:
  - Halten APIs wie `addMesh(model)`, `updateTransform(id, delta)`, `removeById(id)`.
  - Scene liest ausschließlich aus State-Slices und schreibt keine globalen Variablen.
- Nostr-Module:
  - Bieten `publish(event)`, `subscribe(filter, handler)`, `connect(relays)`, `disconnect()`.
  - Keine direkte UI-Manipulation; nur Events/Callbacks zurück nach State.

Hook-Punkte in UI, Scene und Nostr
- UI Hooks:
  - Action-Dispatch: Buttons/Controls lösen Actions aus (z. B. addCube, selectObject).
  - Selector-Bindings: Panels lesen selektierte Daten aus State (z. B. currentSelection).
- Scene Hooks:
  - Lifecycle: `onInit(scene, renderer)`, `onFrame(delta)`, `onResize(width, height)`.
  - Interaction: Raycaster-Result → Action (z. B. selectObject), niemals direkte UI-Manipulation.
- Nostr Hooks:
  - Connection: `onRelayOpen`, `onRelayClose`, Logging/Status in State.
  - Subscription: Filter → Handler mappt auf Actions (z. B. addCubeFromRemote).
  - Publishing: Action → Event-Mapping (Kinds, Tags, Content-Format).

Abhängigkeits- und Versionsstrategie
- three.js:
  - Version pinnen, Breaking Changes beobachten. Import-Pfade via Import Map pflegen. Siehe [es-module-shims und Import Maps](docs/features/module-shims.md).
- Nostr-Client-Bibliotheken:
  - API-Stabilität beachten; baue dünne Adapter-Layer, damit ein Lib-Wechsel wenig Aufwand ist.
- Intern:
  - Public API deiner Module in CHANGELOG dokumentieren; SemVer nutzen.

Qualitäts-Gates: Tests, Lint, Review-Checkliste
- Tests:
  - Reducer/Selector-Unit-Tests für State.
  - Smoke-Tests für Scene (Objektanzahl, Materialtypen, keine Exceptions im Frame).
  - Nostr-Mocks für Publish/Subscribe-Roundtrips.
- Lint/Format:
  - Einheitliche Regeln verhindern „Diff-Rauschen“.
- Review-Checkliste:
  - Keine globalen Side-Effects.
  - State-Änderungen nur per Actions/Reducer.
  - UI-Komponenten ohne versteckte IO.
  - Dokumentation/Kommentare aktualisiert.
  - Import Map angepasst, falls neue Externals.

Beispiele für Erweiterungen
- Neues UI-Panel
  - Template anlegen, Controls definieren, Actions dispatchen, Selectors binden.
  - Siehe [UI-Panel hinzufügen](docs/guides/add-ui-panel.md).
- Neues 3D-Objekt/Tool
  - Scene-API nutzen: [three.Mesh()](docs/features/scene-basics.md:1) erstellen, State-IDs sauber verwalten.
  - Siehe [3D-Objekt hinzufügen](docs/guides/add-3d-object.md).
- Nostr-Eventtyp
  - Neues kind definieren, Event-Schema beschreiben (content/tags), Mapping in Publish/Subscribe ergänzen.
  - Siehe [Nostr integrieren](docs/guides/integrate-nostr.md).

Nächste Schritte
- Lies [architecture.md](docs/reference/architecture.md) für den Gesamtüberblick.
- Baue ein Panel gemäß [add-ui-panel.md](docs/guides/add-ui-panel.md).
- Ergänze einen End-to-End-Flow inkl. Nostr nach [integrate-nostr.md](docs/guides/integrate-nostr.md).