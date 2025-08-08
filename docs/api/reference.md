# @iakw/patchkit — API-Referenz v0.2.0

Hinweis
- Sprache: Deutsch
- Version: v0.2.0 (Genesis + Patch)
- Alle Beispiele sind pseudotypisiert im TypeScript-Stil.
- Alle `language construct`-Referenzen werden als Links im Format [code.ts.declaration()](src/code.ts:1) dargestellt.

Namensräume
- genesis.*
- patch.*
- world.*
- io.*
- errors.*
- types.*

Allgemeine Typen
- [types.SchemaVersion](src/model/types.ts:1) = "patchkit/1.0" | "patchkit/1.1"
- [types.ClockPort](src/model/types.ts:1): { now(): number }
- [types.RngPort](src/model/types.ts:1): { randomBytes(len: number): Uint8Array }
- [types.SignerPort](src/model/types.ts:1): { pubkey(): Promise<string>, sign(data: Uint8Array): Promise<{ sig: string }> }
- [types.VerifierPort](src/model/types.ts:1): { verify(data: Uint8Array, sig: string, pubkey: string): Promise<boolean> }
- [types.LoggerPort](src/model/types.ts:1): { debug(...a), info(...a), warn(...a), error(...a) }

Genesis

- [genesis.create()](src/api/genesis.ts:1)
  - Signatur: create(input: CreateGenesisInput, options?: { seed?: string|Uint8Array, clock?: ClockPort, rng?: RngPort }): Promise<types.Genesis>
  - Input:
    - name: string
    - description?: string
    - author_npub: string
    - initialEntities?: Record<string, Record<string, any>>
    - rules?: Record<string, any>
  - Rückgabe: Genesis
  - Fehler: errors.ValidationError, errors.VersionError

- [genesis.validate()](src/api/genesis.ts:1)
  - validate(genesis: GenesisOrRaw, level?: ValidationLevel): Promise<types.ValidationReport>

- [genesis.migrate()](src/api/genesis.ts:1)
  - migrate(genesis: GenesisOrRaw, targetSchema: SchemaVersion, strategy?: MigrationStrategy): Promise<types.Genesis>

- [genesis.serialize()](src/api/genesis.ts:1)
  - serialize(genesis: Genesis, format: "yaml"|"json", options?: SerializeOptions): string|Uint8Array

- [genesis.parse()](src/api/genesis.ts:1)
  - parse(raw: string|Uint8Array, format?: "yaml"|"json"): GenesisOrInvalid

- [genesis.hash()](src/api/genesis.ts:1)
  - hash(genesis: Genesis, algo?: "sha256"): string

- [genesis.sign()](src/api/genesis.ts:1)
  - sign(genesis: Genesis, signer: SignerPort): Promise<types.SignedGenesis>

- [genesis.verifySignature()](src/api/genesis.ts:1)
  - verifySignature(signed: SignedGenesis, verifier?: VerifierPort): Promise<boolean>

Patch

- [patch.create()](src/api/patch.ts:1)
  - create(input: CreatePatchInput, options?: { seed?: string|Uint8Array, clock?: ClockPort, rng?: RngPort }): Promise<types.Patch>

- [patch.update()](src/api/patch.ts:1)
  - update(base: Patch, changes: Partial<Patch>, options?: UpdatePatchOptions): Promise<types.Patch>

- [patch.migrate()](src/api/patch.ts:1)
  - migrate(patch: PatchOrRaw, targetSchema: SchemaVersion, strategy?: MigrationStrategy): Promise<types.Patch>

- [patch.validate()](src/api/patch.ts:1)
  - validate(patch: PatchOrRaw, level?: ValidationLevel): Promise<types.ValidationReport>

- [patch.serialize()](src/api/patch.ts:1), [patch.parse()](src/api/patch.ts:1), [patch.hash()](src/api/patch.ts:1), [patch.sign()](src/api/patch.ts:1), [patch.verifySignature()](src/api/patch.ts:1)

World

- [world.computeOrder()](src/api/world.ts:1)
  - computeOrder(patches: Patch[], policy?: OrderPolicy): Promise<OrderResult>

- [world.applyPatches()](src/api/world.ts:1)
  - applyPatches(genesis: WorldState|Genesis, ordered: Patch[], options?: ApplyOptions): Promise<ApplyResult>

- [world.diffAgainstWorld()](src/api/world.ts:1)
  - diffAgainstWorld(patch: Patch, state: WorldState, options?: DiffOptions): DiffReport

- [world.detectConflicts()](src/api/world.ts:1)
  - detectConflicts(ordered: Patch[], genesis: WorldState|Genesis, options?: ConflictOptions): ConflictReport

I/O

- [io.loadGenesis()](src/api/io.ts:1)
  - loadGenesis(id: string, port: GenesisPort|WorldPort): Promise<Genesis|WorldState>

- [io.listPatchesByWorld()](src/api/io.ts:1)
  - listPatchesByWorld(genesisId: string, port: PatchPort): Promise<SignedPatch[]>

- [io.getPatchById()](src/api/io.ts:1)
  - getPatchById(id: string, port: PatchPort): Promise<SignedPatch|undefined>

Fehler

- [errors.ValidationError](src/errors/index.ts:1) { issues: ValidationIssue[] }
- [errors.ConflictError](src/errors/index.ts:1) { conflicts: Conflict[] }
- [errors.CycleError](src/errors/index.ts:1) { cycle: string[] }
- [errors.MigrationError](src/errors/index.ts:1) { from: SchemaVersion, to: SchemaVersion, details }
- [errors.VersionError](src/errors/index.ts:1) { required: SchemaVersion, found: SchemaVersion }
- [errors.PolicyError](src/errors/index.ts:1) { rule: string, details }
- [errors.GenesisConflictError](src/errors/index.ts:1) { reason: "id_duplicate"|"ref_integrity"|"schema_mismatch", details }

Typen (Auszug)

- [types.GenesisMetadata](src/model/types.ts:1)
- [types.Genesis](src/model/types.ts:1)
- [types.SignedGenesis](src/model/types.ts:1)
- [types.PatchMetadata](src/model/types.ts:1)
- [types.Patch](src/model/types.ts:1)
- [types.SignedPatch](src/model/types.ts:1)
- [types.WorldState](src/model/types.ts:1)
- [types.OrderPolicy](src/model/types.ts:1)
- [types.OrderResult](src/model/types.ts:1)
- [types.Conflict](src/model/types.ts:1)
- [types.ApplyResult](src/model/types.ts:1)
- [types.ValidationReport](src/model/types.ts:1)

Beispiele

Genesis erzeugen
- Datei: [examples/genesis-create.ts](examples/genesis-create.ts:1)
import { genesis, io } from "@iakw/patchkit"
const g = await genesis.create({ name: "Base World", author_npub: "npub1..." })
const report = await genesis.validate(g)
if (!report.valid) throw new Error("Genesis invalid")
const yaml = genesis.serialize(g, "yaml")

Patches anwenden
- Datei: [examples/world-build.ts](examples/world-build.ts:1)
import { io, world } from "@iakw/patchkit"
const g = await io.loadGenesis("gen_XYZ", genesisPort)
const patches = await io.listPatchesByWorld("gen_XYZ", patchPort)
const { ordered } = await world.computeOrder(patches)
const { state, conflicts } = await world.applyPatches(g, ordered)

Konflikte erkennen
- Datei: [examples/conflict.json](examples/conflict.json:1)
{
  "kind": "update_conflict",
  "entity": { "type": "biome", "id": "desert" },
  "property": "temp",
  "patches": ["a1B2...", "z9Y8..."],
  "details": { "values": [40, 35] }
}

YAML-Handling und originalYaml-Feld
- Das `originalYaml`-Feld wird verwendet, um den ursprünglichen YAML-Text beim Speichern und Laden zu erhalten
- Genesis-Objekte und Patch-Objekte können ein `originalYaml`-Feld enthalten
- Beim Speichern in Nostr-Events:
  - Genesis (kind 30311): content = YAML-String
  - Patch (kind 30312): content = JSON mit action, target, id, payload = YAML-String
- Beim Laden aus Nostr-Events:
  - Genesis: originalYaml = content (YAML-String)
  - Patch: originalYaml = payload (YAML-String)
- Der Editor verwendet `originalYaml` bevorzugt, um das ursprüngliche YAML-Format wiederherzustellen

Beispiel für die Verwendung des originalYaml-Felds:
```javascript
// Genesis mit originalYaml erstellen
const g = await genesis.create({ name: "Base World", author_npub: "npub1..." });
g.originalYaml = yamlText; // Ursprünglicher YAML-Text

// Patch mit originalYaml erstellen
const p = await patch.create({ 
  name: "Add Desert", 
  author_npub: "npub1...", 
  targets_world: "gen_XYZ" 
});
p.originalYaml = yamlText; // Ursprünglicher YAML-Text

// Beim Laden
if (genesis.originalYaml) {
  // Verwende den ursprünglichen YAML-Text
  editor.setYamlText(genesis.originalYaml);
} else {
  // Fallback auf die serialisierte Form
  const yaml = genesis.serialize(genesis, "yaml");
  editor.setYamlText(yaml);
}