# @iakw/patchkit — Observability (Logging, Events, Metriken, Flags)

Ziel
- Transparente Nachvollziehbarkeit der Bibliotheksabläufe für Debugging, Performance-Analyse und Governance.
- Einheitliche Events und strukturierte Logs für Editor, Spiel und CI.

Komponenten
- LoggerPort: Strukturierte Logs
  - Schnittstelle: { debug, info, warn, error } mit Kontextfeldern
  - Default: no-op Logger
  - Adapter: console, pino
- Event-Hooks
  - beforeApply, afterApply, onConflict, onValidate, onMigrate, onGenesisCreate, onPatchCreate, onIo
- Metriken
  - Timings (validate_ms, order_ms, apply_ms, serialize_ms)
  - Counters (patches_count, conflicts_count, entities_count)
- Feature Flags
  - flags.enableScopedOverrides
  - flags.strictRefIntegrity
  - flags.genesis_rules_v2

Logger-Kontrakt
- Datei: [src/observability/logger.ts()](src/observability/logger.ts:1)
Empfohlenes Logschema:
- level: "debug" | "info" | "warn" | "error"
- msg: string
- ctx: object (z. B. { patch_id, genesis_id, duration_ms, errors })
- ts: epoch ms (vom Logger gesetzt)

Beispiel (pino)
- Datei: [examples/logger-pino.ts()](examples/logger-pino.ts:1)
import pino from "pino"
export const logger = pino({ level: "info" })

Events
- Datei: [src/observability/events.ts()](src/observability/events.ts:1)
Hook-Signaturen:
- onValidate(payload: { kind: "genesis"|"patch", id: string, valid: boolean, errors: number, warnings: number, duration_ms: number })
- onConflict(payload: { conflicts: Conflict[], patches: string[], genesis_id: string })
- beforeApply(payload: { patches: number, genesis_id: string })
- afterApply(payload: { duration_ms: number, entities: number, conflicts: number })
- onMigrate(payload: { from: string, to: string, changes: number })
- onIo(payload: { op: "load"|"save"|"search", target: "genesis"|"patch", id?: string, duration_ms?: number })

Metriken
- Datei: [src/observability/metrics.ts()](src/observability/metrics.ts:1)
API:
- time(name: string, fn: () => Promise<T>): Promise<{ result: T, ms: number }>
- counter(name: string).inc(by?: number)
Vorgaben:
- validate_ms, order_ms, apply_ms, parse_ms, serialize_ms
- conflicts_count, patches_count, entities_count

Feature Flags
- Datei: [src/util/flags.ts()](src/util/flags.ts:1)
Struktur:
- export interface Flags { enableScopedOverrides?: boolean; strictRefIntegrity?: boolean; genesis_rules_v2?: boolean }
- Übergabe über Options aller High-Level-APIs:
  - computeOrder(..., { flags })
  - applyPatches(..., { flags })
  - validatePatch(..., { flags })

Beispielnutzung
- Datei: [examples/observability.ts()](examples/observability.ts:1)
import { world } from "@iakw/patchkit"
const flags = { strictRefIntegrity: true }
const { state, conflicts } = await world.applyPatches(genesis, ordered, { flags, logger, events })

Richtlinien
- Keine personenbezogenen Daten loggen (npub ok).
- IDs und Zeiten als Felder, nicht in Freitext.
- Konsistente Feldnamen für spätere Analyse.

Debug-Modus
- Option debug: true in Optionen aktiviert ausführlichere Logs, inkludiert Trace:
  - ApplyTrace mit Reihenfolge, Operationen, betroffenen Entities
- Datei: [src/core/apply.ts()](src/core/apply.ts:1) liefert trace wenn debug aktiv.