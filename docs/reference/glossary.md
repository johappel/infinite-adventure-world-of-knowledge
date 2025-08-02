# Glossar – Begriffe kurz erklärt

Ziel: Ein schnelles Nachschlagewerk zentraler Begriffe im Projekt.

Begriffe
- Scene: Container für 3D-Objekte. Siehe [three.Scene](../features/scene-basics.md).
- Camera: Sicht auf die Szene. Meist [three.PerspectiveCamera](../features/scene-basics.md).
- Renderer: Zeichnet die Szene ins Canvas, z. B. [three.WebGLRenderer](../features/scene-basics.md).
- Mesh: Kombination aus Geometrie und Material, via [three.Mesh](../features/scene-basics.md).
- Material: Bestimmt das Aussehen (Farbe, Glanz, PBR), z. B. [three.MeshStandardMaterial](../features/scene-basics.md).
- Geometry: Formdaten eines Objekts, z. B. [three.BoxGeometry](../features/scene-basics.md).
- Raycaster: Werkzeug zur Schnittpunktsuche zwischen Mausstrahl und Objekten.
- Import Map: Zuordnung Modulname → URL, genutzt mit [es-module-shims.importMap](../features/module-shims.md).
- Nostr: Protokoll für signierte Events über Relays. Siehe [nostr-basics.md](../features/nostr-basics.md).
- Relay: Server (WebSocket), der Nostr-Events weiterleitet.
- Event (Nostr): Signierte Nachricht mit kind, content, tags etc. Publizieren via [nostr.publish](../features/nostr-basics.md).
- State: Der zentrale Anwendungszustand. Siehe [state-and-events.md](../features/state-and-events.md).
- Action: Absichtserklärung für eine Zustandsänderung (z. B. addCube).
- Reducer: Pure Funktion: (state, action) → newState.
- Effect: Seiteneffekt-Layer (Scene-/Nostr-IO).
- Selector: Ableitung von Daten aus dem State für UI/Effects.