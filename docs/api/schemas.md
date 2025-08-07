# @iakw/patchkit — Schemas und Validierung

Ziel
- Zentrale, versionierte Schemata für Genesis, Patch und WorldState.
- Klare Regeln, Constraints und Beispiele.
- Grundlage für Validierung, Migration und Tooling.

Schema-Versionierung
- SchemaVersion: patchkit/1.0, patchkit/1.1 (zukünftig)
- Bibliothek-SemVer ist unabhängig von den Schema-Versionen.
- Upgrades via Migrationsmodule (genesis.migrate, patch.migrate).

Validierungstools
- Runtime: Ajv (Draft 2020-12)
- TS-Inferenz: Zod (Entwicklerfreundlichkeit)
- YAML-Parser: yaml (eemeli) mit Limits (maxDepth, aliasCount=0, size)

Genesis-Schema (Auszug, patchkit/1.0)
- Datei: [schemas/genesis-1.0.json](schemas/genesis-1.0.json:1)
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://iakw.dev/schemas/genesis-1.0.json",
  "title": "Genesis",
  "type": "object",
  "required": ["metadata", "entities"],
  "additionalProperties": false,
  "properties": {
    "metadata": {
      "type": "object",
      "required": ["schema_version", "id", "name", "author_npub", "created_at"],
      "additionalProperties": false,
      "properties": {
        "schema_version": { "const": "patchkit/1.0" },
        "id": { "type": "string", "pattern": "^[A-Za-z0-9_-]{8,64}$" },
        "name": { "type": "string", "minLength": 1 },
        "description": { "type": "string" },
        "author_npub": { "type": "string", "minLength": 1 },
        "created_at": { "type": "integer", "minimum": 0 },
        "version": { "type": "string" }
      }
    },
    "entities": {
      "type": "object",
      "patternProperties": {
        "^[a-z0-9_-]+$": {
          "type": "object",
          "patternProperties": {
            "^[a-z0-9_-]+$": {
              "type": "object",
              "additionalProperties": true
            }
          },
          "additionalProperties": false
        }
      },
      "additionalProperties": false
    },
    "rules": {
      "type": "object",
      "additionalProperties": true
    }
  }
}
```

Patch-Schema (Auszug, patchkit/1.0)
- Datei: [schemas/patch-1.0.json](schemas/patch-1.0.json:1)
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://iakw.dev/schemas/patch-1.0.json",
  "title": "Patch",
  "type": "object",
  "required": ["metadata", "operations"],
  "additionalProperties": false,
  "properties": {
    "metadata": {
      "type": "object",
      "required": ["schema_version", "id", "name", "author_npub", "created_at", "targets_world"],
      "additionalProperties": false,
      "properties": {
        "schema_version": { "const": "patchkit/1.0" },
        "id": { "type": "string", "pattern": "^[A-Za-z0-9_-]{8,64}$" },
        "name": { "type": "string", "minLength": 1 },
        "description": { "type": "string" },
        "author_npub": { "type": "string", "minLength": 1 },
        "created_at": { "type": "integer", "minimum": 0 },
        "version": { "type": "string" },
        "targets_world": { "type": "string", "pattern": "^[A-Za-z0-9_-]{8,64}$" },
        "depends_on": {
          "type": "array",
          "items": { "type": "string", "pattern": "^[A-Za-z0-9_-]{8,64}$" },
          "uniqueItems": true
        },
        "overrides": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["patch_id"],
            "properties": {
              "patch_id": { "type": "string", "pattern": "^[A-Za-z0-9_-]{8,64}$" },
              "entities": { "type": "array", "items": { "type": "string" } },
              "properties": { "type": "array", "items": { "type": "string" } },
              "scope": {
                "type": "object",
                "required": ["entity_type", "entity_id"],
                "properties": {
                  "entity_type": { "type": "string" },
                  "entity_id": { "type": "string" }
                },
                "additionalProperties": false
              }
            },
            "additionalProperties": false
          }
        }
      }
    },
    "operations": {
      "type": "array",
      "items": {
        "oneOf": [
          {
            "type": "object",
            "required": ["type", "entity_type", "payload"],
            "properties": {
              "type": { "const": "add" },
              "entity_type": { "type": "string" },
              "entity_id": { "type": "string" },
              "payload": { "type": "object", "additionalProperties": true }
            },
            "additionalProperties": false
          },
          {
            "type": "object",
            "required": ["type", "entity_type", "entity_id", "changes"],
            "properties": {
              "type": { "const": "update" },
              "entity_type": { "type": "string" },
              "entity_id": { "type": "string" },
              "changes": { "type": "object", "additionalProperties": true }
            },
            "additionalProperties": false
          },
          {
            "type": "object",
            "required": ["type", "entity_type", "entity_id"],
            "properties": {
              "type": { "const": "delete" },
              "entity_type": { "type": "string" },
              "entity_id": { "type": "string" }
            },
            "additionalProperties": false
          }
        ]
      }
    }
  }
}
```

WorldState-Schema (leicht)
- Datei: [schemas/worldstate-1.0.json](schemas/worldstate-1.0.json:1)
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://iakw.dev/schemas/worldstate-1.0.json",
  "title": "WorldState",
  "type": "object",
  "required": ["entities"],
  "properties": {
    "entities": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "additionalProperties": {
          "type": "object",
          "additionalProperties": true
        }
      }
    },
    "meta": { "type": "object", "additionalProperties": true }
  },
  "additionalProperties": false
}
```

Validierungsregeln (zusätzlich zur Schema-Prüfung)
- Referenzintegrität: update/delete benötigen vorhandene Entities; optional streng mit Option strictRefIntegrity.
- Zyklendetektion: depends_on darf keine Zyklen bilden; Fehler mit Zykluspfad.
- Größen-/Komplexitätslimits: maxEntities, maxProps pro Entity, konfigurierbar.
- Signaturprüfung: author_npub muss mit Signatur pubkey übereinstimmen (falls aktiviert).

Linting und Auto-Fix
- Fehlende Felder: leere Listen/Maps als Defaults.
- Normalisierung: Kleinschreibung für Keys nach Policy (optional).
- Suggestions: z. B. entity_id aus payload ableiten, wenn eindeutig.

Beispiel: Gültige Genesis (YAML)
- Datei: [examples/genesis.yaml](examples/genesis.yaml:1)
```yaml
metadata:
  schema_version: patchkit/1.0
  id: gen_XYZ123
  name: Base World
  author_npub: npub1abc...
  created_at: 1733600000
entities:
  biome:
    forest:
      temp: 20
      humidity: 0.6
```

Beispiel: Gültiger Patch (YAML)
- Datei: [examples/patch-desert.yaml](examples/patch-desert.yaml:1)
```yaml
metadata:
  schema_version: patchkit/1.0
  id: a1B2c3D4e5
  name: Biome Desert
  author_npub: npub1xyz...
  created_at: 1733600000
  targets_world: gen_XYZ123
operations:
  - type: add
    entity_type: biome
    entity_id: desert
    payload:
      temp: 40
      humidity: 0.1
```

Hinweise zur Migration
- 1.0 → 1.1 (Beispiel-Ideen):
  - Umbenennung metadata.version → metadata.content_version
  - Einführung entities.*.*._deleted Flag statt delete-Operation (optional)
  - Neue Capabilities: overrides_scoped, genesis_rules_v2