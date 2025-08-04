# Features – Übersicht (aktualisiert)

Dieses Kapitel vertieft die zentralen Bausteine der Anwendung. Es führt von den Grundlagen von [three.Scene](./scene-basics.md) über [es-module-shims.importMap](./module-shims.md) bis hin zu [nostr.publish](./nostr-basics.md) und dem gesamten Zustands- und Eventfluss.

Inhaltsverzeichnis
- [three.js Grundlagen](./scene-basics.md)
- [es-module-shims und Import Maps](./module-shims.md)
- [Nostr: Events & Relays](./nostr-basics.md)
- [State & Events](./state-and-events.md)
- [Erweiterbarkeit](./extensibility.md)

Empfohlene Reihenfolge
1) three.js Grundlagen
2) es-module-shims und Import Maps
3) Nostr Basics
4) State & Events
5) Erweiterbarkeit

- Einheitliche World-Generation-Pipeline für prozedurale, YAML- und Editor-Welten (`js/world-generation/*`).
- Presets für Terrain/Objekte/Personas in `presets.js` und konsistente Resolver.
- Environment-Optionen mit `skybox`, `time_of_day`, `ambient_light`, `sun_intensity`, optional `fog_distance`, `skybox_mode` (prozedurale Skybox-Box).
- Objekttypen: `tree`, `rock` (Icosahedron), `crystal`, `mushroom`, `stone_circle`, `bookshelf`.
- Personas als Billboard-Planes mit Aura (Presets: `npc_plain`, `npc_guardian`, `npc_scholar`, `npc_fairy`).