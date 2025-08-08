# @iakw/patchkit — Integrationsleitfaden (Editor und Hauptspiel)

Ziel
- Reibungslose Einbindung der Bibliothek in Browser (Editor) und Node (Hauptspiel/CLI).
- Einheitliche Nutzung für Genesis- und Patch-Prozesse.
- Performance, Tree-Shaking und optionale Worker-Offloads.

Installations- und Build-Setup
- Paketname: @iakw/patchkit
- Install:
  - npm i @iakw/patchkit
- Bundling:
  - ESM (Browser, moderne Bundler): tree-shakebar, sideEffects: false
  - CJS (Node/CLI): kompatibel
- Empfohlene Bundler:
  - tsup (schnell, simple)
  - rollup (feingranular, code-splitting)
- Typen:
  - TypeScript .d.ts im Paket enthalten

Imports
- Browser/Editor (ESM):
  - import { genesis, patch, world, io } from "@iakw/patchkit"
- Node/CLI (CJS):
  - const { genesis, patch, world, io } = require("@iakw/patchkit")

Asynchrone Nutzung
- Alle I/O-abhängigen Funktionen erwarten Ports (Adapter) und liefern Promises.
- Pure Kernfunktionen sind synchron/async gemischt, aber ohne Side-Effects.

Ports und Adapter
- GenesisPort
  - getById(id): Promise<SignedGenesis|Genesis|undefined>
  - save(genesis): Promise<void>
  - search?(query): Promise<(SignedGenesis|Genesis)[]>
- PatchPort
  - listByWorld(genesisId, params?): Promise<SignedPatch[]>
  - getById(id): Promise<SignedPatch|undefined>
  - save(patch): Promise<void>
- WorldPort
  - getGenesis(id): Promise<WorldState> (optional, wenn Genesis als State persistiert)
- SignerPort, VerifierPort, LoggerPort siehe Referenz.

Adapter-Beispiele
- Nostr (Browser/Node)
  - Genesis: kind 30311 (d=genesis_id), Tags ["d", id], ["t","genesis"]; content = YAML/JSON
  - Patch: kind 30312, content = Patch-JSON/YAML, Tags ["targets", genesis_id]
  - Signatur: nostr-tools (NIP-07 oder local signer)
- FS (Node)
  - Verzeichnisstruktur:
    - worlds/genesis/{id}.yaml
    - worlds/patches/{targets_world}/{patch_id}.yaml
- IndexedDB (Browser)
  - Dexie-basierter Store für Offline-Entwicklung

Beispiel: Editor-Flow
- Datei: [examples/genesis-create.ts()](examples/genesis-create.ts:1)
import { genesis, io } from "@iakw/patchkit"
const g = await genesis.create({ name: "Base", author_npub: "npub1..." })
const rep = await genesis.validate(g)
if (!rep.valid) throw new Error("Ungültige Genesis")
const signed = await genesis.sign(g, signerPort)
await io.genesis.save(signed)

- Datei: [examples/patch-flow.ts()](examples/patch-flow.ts:1)
import { patch, world, io } from "@iakw/patchkit"
const p = await patch.create({ name: "Add Desert", author_npub: npub, targets_world: gid })
const valid = await patch.validate(p)
const { ordered } = await world.computeOrder([p])
const { state } = await world.applyPatches(genesisState, ordered)

World Editor Implementierung
- Der World Editor (`world-editor.html`) bietet eine modulare Struktur mit separaten JavaScript-Modulen:
  - `/editor/js/toast.js` - Toast-Benachrichtigungen
  - `/editor/js/patchkit-wiring.js` - PatchKit IO Ports und Adapter
  - `/editor/js/preset-editor.js` - Haupt-Editor-Klasse mit YAML-Handling
  - `/editor/js/patch-ui.js` - Patch-UI v1 Logik
  - `/editor/js/load.js` - Such- und Ladefunktionalität für Welten und Presets

- Save/Load-Logik mit originalYaml-Feld:
  - Beim Speichern wird der ursprüngliche YAML-Content im `originalYaml`-Feld des Genesis-Objekts gespeichert
  - Beim Laden wird geprüft, ob ein `originalYaml`-Feld vorhanden ist, und dieses bevorzugt verwendet
  - Dies stellt sicher, dass das ursprüngliche YAML-Format erhalten bleibt und nicht in die Genesis-Struktur umgewandelt wird
  - Die Implementierung erfolgt in mehreren Schichten:
    - `world-editor.html` - UI-Event-Handler für Speichern/Laden
    - `editor/js/preset-editor.js` - Editor-Klassenmethoden für Save/Load
    - `editor/js/load.js` - Such- und Ladefunktionalität
    - `editor/js/patchkit-wiring.js` - IO-Ports für Genesis und Patch
    - `js/core/net/nostr-service-factory.js` - Nostr-Service mit Unterstützung für originalYaml

- Beispiel für die Verwendung des originalYaml-Felds:
```javascript
// Beim Speichern
const yamlText = editor.getYamlText();
const g = await editor.patchKit.genesis.create({
  name: stripped?.name || 'Unbenannte Welt',
  description: stripped?.description || '',
  author_npub,
  initialEntities: stripped?.entities || {},
  rules: stripped?.rules || {}
});
// Speichere den ursprünglichen YAML-Text
g.originalYaml = yamlText;

// Beim Laden
if (genesisEvt.originalYaml) {
  // Verwende den ursprünglichen YAML-Text direkt
  editor.setYamlText(genesisEvt.originalYaml);
} else {
  // Fallback auf die Genesis-Struktur
  const worldObj = this.patchKit.genesis.parse(genesisEvt?.yaml || genesisEvt);
  const text = this.serializeYaml(this.stripWorldId(worldObj));
  editor.setYamlText(text);
}
```

Beispiel: Hauptspiel-World-Build
- Datei: [examples/world-build.ts()](examples/world-build.ts:1)
import { io, world } from "@iakw/patchkit"
const g = await io.loadGenesis("gen_XYZ", genesisPort)
const patches = await io.listPatchesByWorld("gen_XYZ", patchPort)
const { ordered } = await world.computeOrder(patches)
const { state, conflicts } = await world.applyPatches(g, ordered)

Performance-Anforderungen
- computeOrder: O(N+E) (N=Patches, E=Abhängigkeiten)
- applyPatches: linear zur Anzahl Operationen
- Datenstrukturen: Maps für schnellen Zugriff
- YAML/JSON: Parsing-Limits (maxDepth, size) konfigurierbar

Threading und Worker
- Offloading großer Rechenpfade möglich:
  - runInWorker(task, payload): Promise<T> (Bibliotheks-Helfer)
  - Transferables: große Arrays/Buffer
- Empfohlen für:
  - applyPatches bei sehr großen Welten
  - computeOrder bei Tausenden Patches

Tree-Shaking und Teilimporte
- Import nur benötigter Module:
  - import { world } from "@iakw/patchkit/world"
  - import { patch } from "@iakw/patchkit/patch"
- sideEffects: false → ungenutzter Code wird entfernt

Tool-Empfehlungen
- Ajv (Runtime-Validation), Zod (TS-Inferenz)
- yaml (eemeli) als Parser
- tsup/rollup für Bundle
- nostr-tools für Signatur/Relays
- comlink (optional) für Worker-Kommunikation
- pino (Logger-Adapter)

Konfiguration
- Policies:
  - orderPolicy: trust lists, tiebreaker
  - validation: strictRefIntegrity, size limits
- Feature-Flags:
  - flags.enableScopedOverrides, flags.genesis_rules_v2

Sicherheitsaspekte
- Strict parsing: keine YAML Aliase, Tiefe begrenzen
- Signaturpflicht optional erzwingbar