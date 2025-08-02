# Architektur – Diagramme und Datenflüsse

Ziel: Das Zusammenspiel von UI, State, Scene (three.js) und Nostr visuell nachvollziehen und Erweiterungspunkte identifizieren.

Inhaltsverzeichnis
- Flowchart: Module und Datenflüsse
- Sequenzdiagramm: Interaktion „Add Cube“
- Datenmodell (vereinfacht)
- Nächste Schritte

Flowchart: Module und Datenflüsse
[mermaid.flowchart()](reference/architecture.md:1)
flowchart LR
  UI[UI Layer] -- actions --> State[(State)]
  State -- updates --> Scene[three.js]
  Scene -- emits --> State
  State -- publish/subscribe --> Nostr[Nostr Service]
  Nostr -- relay IO --> Relays[(Relays)]
  UI -- reads --> State
  UI -- reflects --> Scene

Sequenzdiagramm: Interaktion „Add Cube“
[mermaid.sequenceDiagram()](reference/architecture.md:30)
sequenceDiagram
  participant User
  participant UI
  participant State
  participant Scene
  participant Nostr
  User->>UI: Click "Add Cube"
  UI->>State: dispatch(addCube)
  State->>Scene: applyChange(add cube)
  Scene-->>State: objectAdded event
  State->>Nostr: publish(event: cube_added)
  Nostr-->>State: ack/notice
  State-->>UI: selection updated

Datenmodell (vereinfacht)
- Object
  - id: string
  - kind: "mesh"
  - geometry: "box" | "sphere" | ...
  - material: { type: "standard" | "phong" | "basic", color: string }
  - transform: { position: [x,y,z], rotation: [x,y,z], scale: [x,y,z] }
- Selection
  - id: string | null
- Nostr
  - relays: string[]
  - status: { connected: number, total: number }
  - queue: EventDraft[]

Nächste Schritte
- Details zum Event-/State-Flow: [state-and-events.md](features/state-and-events.md)
- three.js Basics: [scene-basics.md](features/scene-basics.md)
- Nostr-Grundlagen: [nostr-basics.md](features/nostr-basics.md)