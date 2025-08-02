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
- Effects
  - Scene-Effect: Wendet Änderungen auf [three.Scene](./scene-basics.md) an.
  - Nostr-Effect: Publiziert Events via [nostr.publish](./nostr-basics.md) oder reagiert auf Abos.

## Beispiel-Flow
  - Scene-Effect beobachtet State-Änderungen und erstellt ein [three.Mesh](./scene-basics.md) mit [three.BoxGeometry](./scene-basics.md).
  - Nostr-Effect serialisiert die Domain-Änderung als Event (kind, content, tags) und ruft [nostr.publish](./nostr-basics.md) auf.

## Weiterführend
- UI-Panel bauen, das Actions dispatcht: [add-ui-panel.md](../guides/add-ui-panel.md)
- 3D-Objekt hinzufügen: [add-3d-object.md](../guides/add-3d-object.md)
- Architekturdiagramme ansehen: [architecture.md](../reference/architecture.md)