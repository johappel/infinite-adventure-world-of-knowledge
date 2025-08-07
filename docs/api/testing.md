# @iakw/patchkit — Teststrategie und Qualität

Ziele
- Hohe Sicherheit durch umfassende Unit-, Integrations- und Snapshot-Tests.
- Deterministische Ergebnisse via Seed/Clock-Injektion.
- Reproduzierbare CI-Läufe mit stabilen Artefakten.

Test-Stack
- Runner: Vitest (+ @vitest/coverage-v8)
- Lint/Format: ESLint, Prettier
- Mocks: Test-Ports für FS/Nostr/Signer/Verifier/Logger
- Fixtures: Beispiele unter /docs/api/examples

Qualitätsziele
- Coverage: Core ≥ 90%, Gesamt ≥ 80%
- Lint: keine Warnungen im CI
- Build: ESM/CJS + Typen erfolgreich

Determinismus
- RNG via RngPort injiziert
- Clock via ClockPort injiziert
- Fixierte Seeds in Tests:
  - const rng = seededRng("test-seed")
  - const clock = fixedClock(1733600000)

Struktur
- Datei: [tests/unit/*.test.ts()](tests/unit/ids.test.ts:1)
  - ids.test.ts: generateUniqueId Format/Uniqueness/Seed
  - parsing.test.ts: YAML/JSON roundtrip, Limits
  - validation.genesis.test.ts: gültig/ungültig, Autofix
  - validation.patch.test.ts: Pflichtfelder, depends_on/overrides
  - order.test.ts: Toposort, Ties, Policy
  - apply.test.ts: add/update/delete, Konflikte, Diffs
- Datei: [tests/integration/*.test.ts()](tests/integration/roundtrip.test.ts:1)
  - fs-adapter.test.ts: Genesis/Patch speichern/laden
  - nostr-adapter.test.ts: Mock-Relays, Signatur-Flow
  - e2e.world-build.test.ts: Genesis + Patches → deterministischer State
- Datei: [tests/snapshots/*.snap](tests/snapshots/world.snap:1)
  - serialize(genesis)
  - applyPatches State-Dumps

Beispiel: deterministisches Create
- Datei: [tests/unit/genesis.create.test.ts()](tests/unit/genesis.create.test.ts:1)
import { genesis } from "@iakw/patchkit"
import { fixedClock, seededRng } from "./helpers"
test("deterministic genesis id", async () => {
  const g1 = await genesis.create({ name: "Welt", author_npub: "npub1..." }, { clock: fixedClock(1733600000), rng: seededRng("seed") })
  const g2 = await genesis.create({ name: "Welt", author_npub: "npub1..." }, { clock: fixedClock(1733600000), rng: seededRng("seed") })
  expect(g1.metadata.id).toEqual(g2.metadata.id)
})

Beispiel: Konflikterkennung
- Datei: [tests/unit/conflicts.test.ts()](tests/unit/conflicts.test.ts:1)
import { world } from "@iakw/patchkit"
test("update/update conflict", async () => {
  const { conflicts } = await world.detectConflicts(orderedPatches, genesis)
  expect(conflicts.some(c => c.kind === "update_conflict")).toBe(true)
})

CI/CD
- GitHub Actions:
  - Node 18/20, OS Matrix
  - Schritte: install → lint → build → test → coverage upload
- Changesets:
  - Versionierung, Release Notes, Publish
- Cache:
  - npm cache, tsbuildinfo, vitest cache

Leistungs-Tests (optional)
- Große Patch-Sets (10k ops)
- Metriken: apply_ms, order_ms
- Thresholds: Fail wenn Regression > 20%

Testdaten-Strategie
- Kleine, repräsentative Beispiele in /docs/api/examples
- Generative Fixtures für Lasttests
- Snapshot-Updates manuell reviewen

Fehlerklassen-Tests
- Throw-Pfade und Inhalte:
  - ValidationError.issues
  - CycleError.cycle
  - ConflictError.conflicts

Reporting
- JUnit-XML Export optional für CI
- Coverage-Reports in HTML/LCOV