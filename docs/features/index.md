# Features – Übersicht (aktualisiert)

Dieses Kapitel vertieft die zentralen Bausteine der Anwendung. Es führt von den Grundlagen von [three.Scene](./scene-basics.md) über [es-module-shims.importMap](./module-shims.md) bis hin zu [nostr.publish](./nostr-basics.md) und dem gesamten Zustands- und Eventfluss.

## Core Features

### Player & Animation Systems
- [YAML Player System](./yaml-player-system.md) - Konfigurierbare 3D-Avatare mit Animationen
- [Animation System](./animation-system.md) - Smooth Transitions und State Management
- [Terrain System](./terrain-system.md) - Multi-Sampling Höhenberechnung für hügeliges Terrain

### World Generation & Management
- [three.js Grundlagen](./scene-basics.md) - Basis 3D-Rendering
- [es-module-shims und Import Maps](./module-shims.md) - Modular loading
- [State & Events](./state-and-events.md) - Weltdaten und Persistierung
- [Erweiterbarkeit](./extensibility.md) - Plugin-System

### Communication & Interaction
- [Nostr: Events & Relays](./nostr-basics.md) - Decentralized communication

## Feature Overview

Inhaltsverzeichnis
- [three.js Grundlagen](./scene-basics.md)
- [es-module-shims und Import Maps](./module-shims.md)
- [Nostr: Events & Relays](./nostr-basics.md)
- [State & Events](./state-and-events.md)
- [Erweiterbarkeit](./extensibility.md)
- [YAML Player System](./yaml-player-system.md) ⭐ **NEU**
- [Animation System](./animation-system.md) ⭐ **NEU**
- [Terrain System](./terrain-system.md) ⭐ **NEU**

Empfohlene Reihenfolge
1) three.js Grundlagen
2) es-module-shims und Import Maps
3) YAML Player System ⭐
4) Animation System ⭐  
5) Terrain System ⭐
6) Nostr Basics
7) State & Events
8) Erweiterbarkeit

## Technical Features

- Einheitliche World-Generation-Pipeline für prozedurale, YAML- und Editor-Welten (`js/world-generation/*`).
- YAML Player System mit konfigurierbaren Avataren, Animationen und Terrain-Integration
- Multi-Sampling Terrain-System für stabile Höhenberechnung auf hügeligem Terrain
- Three-Phase Animation System (Movement → Neutral → Idle) mit smooth Transitions
- Presets für Terrain/Objekte/Personas in `presets.js` und konsistente Resolver.
- Environment-Optionen mit `skybox`, `time_of_day`, `ambient_light`, `sun_intensity`, optional `fog_distance`, `skybox_mode` (prozedurale Skybox-Box).
- Objekttypen: `tree`, `rock` (Icosahedron), `crystal`, `mushroom`, `stone_circle`, `bookshelf`.
- Personas als Billboard-Planes mit Aura (Presets: `npc_plain`, `npc_guardian`, `npc_scholar`, `npc_fairy`).