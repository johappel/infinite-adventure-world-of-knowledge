# @iakw/patchkit — Aufgaben für den Code-Agent (Umsetzung)

Ziel
- Konkrete, priorisierte Aufgabenpakete zur Implementierung der Bibliothek und Integration in Editor und Hauptspiel.
- Jede Aufgabe ist eigenständig, mit Deliverables, Akzeptanzkriterien und Dateipfaden.

Hinweise zum Stil
- Reine Funktionen in /src/core bevorzugen.
- I/O nur über Ports/Adapter in /src/io.
- Typisierung strikt; Schema-Validierung über Ajv, TS-Inferenz via Zod-Typen oder TS-Interfaces.
- Tests (Vitest) mit deterministischen Seeds/Clock.
- Alle Referenzen als klickbare Code-Links im Format [pfad.declaration()](src/pfad.ts:1).

Priorität A — Core Grundgerüst

A1: Projekt-Skaffold
- Dateien:
  - [package.json](package.json:1) (name: @iakw/patchkit, exports ESM/CJS, types)
  - [tsconfig.json](tsconfig.json:1)
  - [src/index.ts()](src/index.ts:1)
- Deliverables: Build mit tsup/rollup; ESM/CJS Bundles; Typen.
- Akzeptanz: import { } from "@iakw/patchkit" funktioniert im Testprojekt.

A2: Typen und Schemas
- Dateien:
  - [src/model/types.ts()](src/model/types.ts:1): SchemaVersion, Genesis, Patch, WorldState, Ports, Reports, Errors
  - [schemas/genesis-1.0.json](schemas/genesis-1.0.json:1), [schemas/patch-1.0.json](schemas/patch-1.0.json:1), [schemas/worldstate-1.0.json](schemas/worldstate-1.0.json:1)
- Akzeptanz: Ajv kann Schemas laden; Typescript-Typen exportiert.

A3: Utilities (IDs, Clock, Hash)
- Dateien:
  - [src/util/ids.ts()](src/util/ids.ts:1): generateUniqueId(seed?), base64url
  - [src/util/clock.ts()](src/util/clock.ts:1): now()
  - [src/util/hash.ts()](src/util/hash.ts:1): sha256
- Tests: IDs Format/Einzigartigkeit; Hash Determinismus.

A4: Parsing/Serialization
- Dateien:
  - [src/core/parsing.ts()](src/core/parsing.ts:1): parseYaml/json, serializeYaml/json mit Limits
- Tests: Roundtrips, Limits (maxDepth, alias=0, size).

A5: Validation-Engine
- Dateien:
  - [src/core/validation.ts()](src/core/validation.ts:1): validateGenesis, validatePatch, composeReport
- Tests: gültig/ungültig, Fehler/Warnungen, Autofix-Suggestions.

Priorität B — Genesis-API

B1: genesis.create/validate/serialize/parse
- Dateien:
  - [src/api/genesis.ts()](src/api/genesis.ts:1)
- Logik: id, created_at, schema_version setzen; Validierung aufrufen.
- Tests: deterministische Erstellung mit seed.

B2: genesis.hash/sign/verify
- Dateien:
  - [src/api/genesis.ts()](src/api/genesis.ts:1)
- Ports: SignerPort, VerifierPort.
- Tests: Sign/Verify mit Mock.

B3: GenesisPort + Adapter (Nostr/FS)
- Dateien:
  - [src/io/ports.ts()](src/io/ports.ts:1) (GenesisPort, PatchPort, WorldPort)
  - [src/io/nostr.ts()](src/io/nostr.ts:1) (MVP: getById/save/search für Genesis + Patches)
  - [src/io/fs.ts()](src/io/fs.ts:1) (Datei-Layout aus docs)
- Tests: FS Roundtrip; Nostr Mock.

Priorität C — Patch-API

C1: patch.create/update/validate/serialize/parse
- Dateien:
  - [src/api/patch.ts()](src/api/patch.ts:1)
- Regeln: id stabil; targets_world erforderlich; update ist idempotent.
- Tests: Create/Update/Validate.

C2: patch.hash/sign/verify
- Dateien:
  - [src/api/patch.ts()](src/api/patch.ts:1)
- Tests: Sign/Verify.

C3: listByWorld/getPatchById/save (Ports)
- Datei:
  - [src/api/io.ts()](src/api/io.ts:1) (Fassade)
- Tests: Adapter-Integration.

Priorität D — World-Orchestrierung

D1: computeOrder (Toposort + Policy)
- Datei:
  - [src/core/order.ts()](src/core/order.ts:1)
- Regeln: depends_on Graph; Tiebreak created_at; optionale Trust-Priorität.
- Tests: Zyklen, Ties, Policy.

D2: applyPatches + Diff/Conflicts
- Dateien:
  - [src/core/apply.ts()](src/core/apply.ts:1)
  - [src/core/merge-diff.ts()](src/core/merge-diff.ts:1)
- Logik: add/update/delete; Referenzprüfungen; Konfliktmodell gem. docs.
- Tests: deterministisch, Konfliktfälle.

D3: world.* API-Fassade
- Datei:
  - [src/api/world.ts()](src/api/world.ts:1)
- Tests: End-to-End mit Genesis+Patch.

Priorität E — Migration & Versionierung

E1: migrate(genesis/patch)
- Dateien:
  - [src/migrate/genesis-1_0_to_1_1.ts()](src/migrate/genesis-1_0_to_1_1.ts:1)
  - [src/migrate/patch-1_0_to_1_1.ts()](src/migrate/patch-1_0_to_1_1.ts:1)
- Tests: Roundtrip 1.0 → 1.1.

E2: Changesets/Release
- Dateien:
  - [.changeset/config.json](.changeset/config.json:1)
  - Dokumentation in [docs/api/reference.md](docs/api/reference.md:1)
- Akzeptanz: Release-Notes generiert.

Priorität F — Observability/Workers

F1: Logger/Events
- Dateien:
  - [src/observability/logger.ts()](src/observability/logger.ts:1)
  - [src/observability/events.ts()](src/observability/events.ts:1)
- Tests: Event-Firing.

F2: Worker-Offloading
- Datei:
  - [src/workers/index.ts()](src/workers/index.ts:1): runInWorker
- Tests: applyPatches im Worker.

Priorität G — Integration Editor/Spiel

G1: Editor-Refactor
- Ziel: preset-editor nutzt nur Bibliothek.
- Aktionen:
  - Ersetzen von ID-/Validierungs-/Apply-Logik durch genesis.*, patch.*, world.*
  - Nostr-Service an Ports anpassen.
- Abnahme: E2E Flow im Editor.

G2: Spiel-Build
- Ziel: Weltaufbau über io + world.*
- Abnahme: deterministische States, Konfliktanzeige.

Teststrategie
- [tests/unit/*.test.ts()](tests/unit/ids.test.ts:1): IDs, Parsing, Validation, Order, Apply
- [tests/integration/*.test.ts()](tests/integration/roundtrip.test.ts:1): FS/Nostr-Adapter, E2E Weltaufbau
- [tests/snapshots/*.snap](tests/snapshots/world.snap:1): serialize und apply Ergebnisse

Akzeptanzkriterien gesamt
- Coverage Core ≥ 90%, gesamt ≥ 80%
- Deterministische Ergebnisse bei fixiertem seed/clock
- Editor und Spiel verwenden ausschließlich Ports/Kit
- API gemäß [docs/api/reference.md](docs/api/reference.md:1) funktionsfähig