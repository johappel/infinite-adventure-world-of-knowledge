# Roadmap – Empfohlene nächste Schritte

Ziel: Strukturierte Ausbaupfade für die Anwendung definieren, um UI, three.js und Nostr nachhaltig weiterzuentwickeln.

Zeithorizont: Vorschlag in drei Stufen (kurz-/mittel-/langfristig).

Kurzfristig (0–2 Wochen)
- Developer-Experience:
  - Dev-Overlay mit Stats (FPS, Draw Calls), Scene-Inspector.
  - State-Viewer-Panel mit Action-Log.
- UI/UX:
  - Settings-Panel (Theme, Sensitivität der Controls).
  - Keyboard-Shortcuts für häufige Aktionen.
- three.js:
  - Utility-Funktionen für Geometrien/Materialien, Reuse-Strategie.
  - Sauberes Resize-Handling und DPR-Management.
- Nostr:
  - Basic Relay-Statusanzeige.
  - Event-Schema minimal definieren und dokumentieren.

Mittelfristig (2–8 Wochen)
- Plugin-API:
  - Definition stabiler Extension-Points (UI, Scene, Nostr).
  - Hook-System (`onInit`, `onFrame`, `onResize`, `onRaycastHit`).
- Assets/Loading:
  - Asset-Loader (GLTF/Texture), Caching, Progress-UI.
- Kollaboration:
  - Konsistente Event-Schemata für gemeinsame Edits (Locks, Konfliktregeln).
- Qualität:
  - Test-Suite (Reducer/Selectors, Scene-Smokes, Nostr-Mocks).
  - CI für Lint/Test/Build.

Langfristig (8+ Wochen)
- Kollaborative Sessions:
  - Live-Editing mehrerer Nutzer via Nostr-Events.
  - CRDT-Ansatz oder Operation-Transform für konfliktarme Synchronisation.
- Persistente Welten:
  - Snapshots/Checkpoints, Lade-/Speicherpfade für Szenen.
- Performance/Rendering:
  - Instancing für Massenobjekte.
  - Postprocessing-Pipeline (Bloom, SSAO, Tone Mapping).
- Sicherheit:
  - Schlüsselmanagement-Härtung (Wallets, Hardware-Keys, Permissions).
  - Signatur in Worker, Policy für Rate-Limits/Backoff.

Nächste Schritte
- Baue ein Nostr-Statuspanel: [add-ui-panel.md](./guides/add-ui-panel.md)
- Definiere Event-Schemata in der Referenz: [architecture.md](./reference/architecture.md)
- Plane die Plugin-API anhand von [extensibility.md](./features/extensibility.md)