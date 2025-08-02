# Glossar – Begriffe kurz erklärt

Ziel: Ein schnelles Nachschlagewerk zentraler Begriffe im Projekt.

Begriffe
- Scene: Container für 3D-Objekte. Siehe [three.Scene()](docs/features/scene-basics.md:1).
- Camera: Sicht auf die Szene. Meist [three.PerspectiveCamera()](docs/features/scene-basics.md:1).
- Renderer: Zeichnet die Szene ins Canvas, z. B. [three.WebGLRenderer()](docs/features/scene-basics.md:1).
- Mesh: Kombination aus Geometrie und Material, via [three.Mesh()](docs/features/scene-basics.md:1).
- Material: Bestimmt das Aussehen (Farbe, Glanz, PBR), z. B. [three.MeshStandardMaterial()](docs/features/scene-basics.md:1).
- Geometry: Formdaten eines Objekts, z. B. [three.BoxGeometry()](docs/features/scene-basics.md:1).
- Raycaster: Werkzeug zur Schnittpunktsuche zwischen Mausstrahl und Objekten.
- Import Map: Zuordnung Modulname → URL, genutzt mit [es-module-shims.importMap()](docs/features/module-shims.md:1).
- Nostr: Protokoll für signierte Events über Relays. Siehe [nostr-basics.md](docs/features/nostr-basics.md).
- Relay: Server (WebSocket), der Nostr-Events weiterleitet.
- Event (Nostr): Signierte Nachricht mit kind, content, tags etc. Publizieren via [nostr.publish()](docs/features/nostr-basics.md:1).
- State: Der zentrale Anwendungszustand. Siehe [state-and-events.md](docs/features/state-and-events.md).
- Action: Absichtserklärung für eine Zustandsänderung (z. B. addCube).
- Reducer: Pure Funktion: (state, action) → newState.
- Effect: Seiteneffekt-Layer (Scene-/Nostr-IO).
- Selector: Ableitung von Daten aus dem State für UI/Effects.