# @iakw/patchkit — Migrationsplan (Editor/Spiel → gemeinsame Bibliothek)

Ziel
- Herauslösen der Genesis- und Patch-Logik aus dem Preset-Editor und dem Hauptspiel in @iakw/patchkit.
- Konsistenz, Wiederverwendbarkeit, deterministische Ergebnisse, klare Verantwortlichkeiten.

Phasenübersicht
- Phase 1: Vorbereitung und Extraktion (Core-Funktionen, Ports, minimale API)
- Phase 2: Editor-Integration (Genesis/Patch-Flows ersetzen, Validierung)
- Phase 3: Spiel-Integration (Build-Pipeline, Konfliktanzeige)
- Phase 4: Schema/Migration (Upgrader, Kompatibilität)
- Phase 5: Stabilisierung, Dokumentation, Release

Voraussetzungen
- Tooling: TypeScript, tsup/rollup, Vitest, Ajv, yaml, nostr-tools, Changesets
- Repo-Struktur:
  - libs/patchkit (neues Paket)
  - app/editor (Preset-Editor)
  - app/game (Hauptspiel)
  - docs/api (diese Dokumente)

Phase 1 — Vorbereitung und Extraktion
- Aufgaben
  - A1: Core-Typen und Schemas definieren
    - Dateien: [src/model/types.ts()](src/model/types.ts:1), [schemas/genesis-1.0.json](schemas/genesis-1.0.json:1), [schemas/patch-1.0.json](schemas/patch-1.0.json:1)
  - A2: IDs/RNG/Clock Utilities
    - Datei: [src/util/ids.ts()](src/util/ids.ts:1), [src/util/clock.ts()](src/util/clock.ts:1)
  - A3: Parsing/Serialization (YAML/JSON)
    - Datei: [src/core/parsing.ts()](src/core/parsing.ts:1)
  - A4: Validation (Ajv) und Reports
    - Datei: [src/core/validation.ts()](src/core/validation.ts:1)
  - A5: Public API Fassade (genesis.*, patch.*, world.*, io.*)
    - Dateien: [src/api/genesis.ts()](src/api/genesis.ts:1), [src/api/patch.ts()](src/api/patch.ts:1), [src/api/world.ts()](src/api/world.ts:1), [src/api/io.ts()](src/api/io.ts:1)
  - A6: I/O Ports + Nostr/FS Adapter (MVP)
    - Dateien: [src/io/ports.ts()](src/io/ports.ts:1), [src/io/nostr.ts()](src/io/nostr.ts:1), [src/io/fs.ts()](src/io/fs.ts:1)

- Abnahme
  - Unit-Tests Core: IDs, Parsing, Validation
  - Build ESM/CJS, Typen

Phase 2 — Editor-Integration
- Aufgaben
  - B1: Neuer Welt-Flow über genesis.create/validate/sign/save
    - Editor ersetzt UI-Generierung von IDs; nutzt Bibliotheks-ID
  - B2: Patch-Flow über patch.create/update/validate/serialize
    - targets_world aus geladener Genesis
  - B3: Preview auf world.computeOrder/applyPatches umstellen
  - B4: Entfernen doppelter Logik im Editor (ID-Management, Validierung, Apply)
  - B5: Fehler-/Konfliktberichte direkt aus Reports der Bibliothek anzeigen

- Abnahme
  - Editor E2E: Genesis anlegen, Patch erstellen, Vorschau, Export
  - Determinismus: wiederholtes Anwenden erzeugt gleiche Zustände

Phase 3 — Spiel-Integration
- Aufgaben
  - C1: Build-Pipeline: loadGenesis + listPatchesByWorld + computeOrder + applyPatches
  - C2: Konfliktanzeige/UI-Aggregation über ConflictReport
  - C3: Optional Worker-Offloading für applyPatches

- Abnahme
  - Performance-Benchmarks
  - Snapshot-Tests der resultierenden Welt

Phase 4 — Schema/Migration
- Aufgaben
  - D1: versionierte schema_version "patchkit/1.0" aktivieren
  - D2: migrate(genesis/patch) Pfade implementieren
  - D3: Import vorhandener Welten/Patches; Migrationstests
  - D4: Upgrader-Dokumentation (Breaking Changes)

- Abnahme
  - Abwärtskompatibilitätstest (Import Altbestände)
  - Stabilität über CI

Phase 5 — Stabilisierung, Dokumentation, Release
- Aufgaben
  - E1: Typedoc-Generierung
  - E2: Beispiele/Guides finalisieren
  - E3: Changesets Release v0.2.0
  - E4: Deprecation-Hinweise im Editor/Hauptspiel (Alt-APIs)

Risiken und Gegenmaßnahmen
- Risiko: Divergenz zwischen Editor und Spiel
  - Maßnahme: Contract-Tests gegen gemeinsame API, Version-Pins
- Risiko: Performance bei großen Welten
  - Maßnahme: Worker-Offloading, Map-basierte Datenstrukturen, Streaming später
- Risiko: Schema-Änderungen brechen Altbestände
  - Maßnahme: Migrationspfade, SemVer, Feature-Gates

Akzeptanzkriterien
- Editor und Spiel verwenden ausschließlich @iakw/patchkit für Genesis/Patches.
- Gleiches Input-Set führt zu identischem Weltzustand (Hash).
- Vollständige Testsuite (Coverage Core ≥ 90%).
- Dokumentation und Beispiele sind vollständig, buildbar und lauffähig.

Checkliste
- [ ] Core-Typen und Schemas angelegt
- [ ] Parsing/Validation implementiert
- [ ] Public API (genesis/patch/world/io) verfügbar
- [ ] Ports/Adapter (Nostr/FS) MVP
- [ ] Editor-Integration abgeschlossen
- [ ] Spiel-Integration abgeschlossen
- [ ] Migration alt → neu getestet
- [ ] CI/Release eingerichtet