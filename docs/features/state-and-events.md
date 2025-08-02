# State & Events – Der Daten- und Interaktionsfluss

Ziel: Verstehen, wie UI-Interaktionen den Zustand (State) verändern, wie diese Änderungen die 3D-Szene ansteuern und wie optional Nostr-Events publiziert bzw. abonniert werden. Dieses Kapitel stellt robuste Muster und praktische Leitlinien bereit.

Inhaltsverzeichnis
- Warum State-Management?
- Schichten und Verantwortlichkeiten
- Actions, Reducer, Effects
- Eventfluss UI ⇄ State ⇄ Scene ⇄ Nostr
- Fehlerrobustheit, Undo/Redo, Logging
- Testen und Debugging
- Nächste Schritte

Warum State-Management?
- Trennung von Darstellung (UI), Logik (State) und IO (Scene, Nostr).
- Reproduzierbarkeit: Gleiche Actions → gleicher State.
- Testbarkeit: Reducer ohne DOM/WebGL/Nostr testbar.

Schichten und Verantwortlichkeiten
- UI Layer: Panels, Buttons, Controls. Löst Actions aus und rendert anhand von State-Selektoren.
- State Layer: Single Source of Truth. Enthält Domain-Modelle (z. B. Liste von 3D-Objekten).
- Scene Layer: Verarbeitet State-Änderungen in WebGL-Operationen (Objekte hinzufügen, transformieren).
- Nostr Layer: Optionaler IO-Kanal für Publish/Subscribe von Ereignissen.

Actions, Reducer, Effects
- Action: Beschreibt die Absicht. Beispiel:
  - addCube({ id, position, size, material })
  - selectObject({ id })
  - updateTransform({ id, position?, rotation?, scale? })
- Reducer: Pure Funktion, die (state, action) → newState berechnet.
- Effects: Side-Effects auf Basis von Actions/State:
  - Scene-Effect: Wendet Änderungen auf [three.Scene()](docs/features/scene-basics.md:1) an.
  - Nostr-Effect: Publiziert Events via [nostr.publish()](docs/features/nostr-basics.md:1) oder reagiert auf Abos.

Eventfluss UI ⇄ State ⇄ Scene ⇄ Nostr
- UI → State:
  - Der Nutzer klickt "Würfel hinzufügen".
  - UI dispatcht addCube.
  - Reducer fügt ein Cube-Model in den State ein.
- State → Scene:
  - Scene-Effect beobachtet State-Änderungen und erstellt ein [three.Mesh()](docs/features/scene-basics.md:1) mit [three.BoxGeometry()](docs/features/scene-basics.md:1).
  - Renderer visualisiert die Änderung im nächsten Frame.
- State → Nostr (optional):
  - Nostr-Effect serialisiert die Domain-Änderung als Event (kind, content, tags) und ruft [nostr.publish()](docs/features/nostr-basics.md:1) auf.
- Nostr → State:
  - Subscription liefert ein passendes Event (z. B. "cube_added").
  - Nostr-Effect validiert, mappt auf Action addCubeFromRemote und dispatcht.
- Scene → State:
  - Scene-Events (z. B. Raycaster-Hit) werden als Actions (selectObject) zurück in den State geführt, damit UI synchron ist.

Fehlerrobustheit, Undo/Redo, Logging
- Fehlerbehandlung:
  - Reducer bleiben pure und deterministisch.
  - Effects enthalten Try/Catch und liefern Status (OK/FAIL) an State zurück.
- Undo/Redo:
  - Historie im State führen (Vergangenheitsliste, Zukunftsliste).
  - Actions erzeugen Snapshots oder differenzielle Patches.
- Logging:
  - Action-Logger (dev only) für Sequenzanalyse.
  - Rate-Limits und Backoff im Nostr-Effect.

Testen und Debugging
- Reducer-Tests: Input-State + Action → erwarteter Output-State.
- Selector-Tests: Ableitung komplexer UI-Werte aus State.
- Scene-Tests: Adaptiere auf smoke tests (z. B. Objektzahl, Materialtypen).
- Nostr-Tests: Mock-Relay, Roundtrip Publish/Receive.
- Tools:
  - Visualisiere den State in einem Developer-Panel.
  - Debug-Overlay in WebGL (Bounding Boxes, Gizmos).

Nächste Schritte
- UI-Panel bauen, das Actions dispatcht: [add-ui-panel.md](docs/guides/add-ui-panel.md)
- 3D-Objekt hinzufügen: [add-3d-object.md](docs/guides/add-3d-object.md)
- Architekturdiagramme ansehen: [architecture.md](docs/reference/architecture.md)