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

## Genesis-Schema (Auszug, patchkit/1.0)

Das Genesis-Schema unterstützt zwei Formate:

### Format 1: Flache YAML-Struktur (benutzerfreundlich)

```yaml
name: "Weltname"                 # Anzeigename der Welt
description: "Beschreibung..."   # Beschreibung für UI und Logs
id: "zone-id"                   # Eindeutige Zone-ID

environment:
  skybox: "clear_day"           # Himmel-Typ
  time_of_day: 0.5             # 0.0-1.0 (Mitternacht bis Mitternacht)
  ambient_light: 0.6           # Umgebungslicht-Stärke
  sun_intensity: 0.8           # Sonnen-Stärke
  fog_distance: 100            # Sichtweite
  ambient_sound: "birds"       # Hintergrundgeräusche

terrain:
  type: "flat"                 # flat, hills, mountains
  size: [50, 50]              # [Breite, Tiefe] in Einheiten
  color: "#4a7c1e"            # Farbe des Bodens
  texture: "grass"            # Textur-Hint

objects:
  - type: "rock"
    position: [5, 0, 3]
    scale: [1.2, 0.8, 1.1]
    color: "#8b7355"
    interactive: true

portals:
  - id: "to-forest"
    name: "Zum Mystischen Wald"
    position: [-10, 1, 0]
    size: [2, 3, 0.5]
    destination: "zone-forest"
    color: "#9370db"

personas:
  - name: "Lehrmeister Aelion"
    position: [0, 0, 5]
    appearance:
      color: "#ff6b6b"
      height: 1.8
      type: "humanoid"

extensions:
  weather: "sunny"
  season: "spring"
  scripts_enabled: true
  ambient_particles: "fireflies"
  special_lighting: "warm"
  multiplayer_spawn: [0, 0, 0]
```

### Format 2: Interne Struktur (PatchKit)

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

## Patch-Schema (Auszug, patchkit/1.0)

Das Patch-Schema unterstützt zwei Formate:

### Format 1: Flache YAML-Struktur (benutzerfreundlich)

```yaml
name: "Wegweiser"
description: "Fügt Wegweiser an den Eingängen hinzu"
objects:
  - type: box
    position: [0, 1, 30]
    scale: [0.3, 2, 0.3]
    color: "#654321"
```

### Format 2: Operations-Format (für komplexe Änderungen)

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

## WorldState-Schema (leicht)
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

## Normalisierung und Denormalisierung

Die Bibliothek stellt Funktionen zur Konvertierung zwischen den Formaten bereit:

### Normalisierung

Die `normalizeUserYaml`-Funktion konvertiert das benutzerfreundliche YAML-Format in das interne PatchKit-Format:

```javascript
const yamlText = `
name: "Testwelt"
objects:
  - type: box
    position: [0, 0, 0]
`;

const parsed = yaml.parse(yamlText);
const normalized = normalizeUserYaml(parsed);
// Ergebnis: { metadata: {...}, entities: { object: { obj1: { type: "box", position: [0, 0, 0] } } }, rules: {} }
```

### Denormalisierung

Die `denormalizeUserYaml`-Funktion konvertiert das interne PatchKit-Format zurück in das benutzerfreundliche YAML-Format:

```javascript
const normalized = {
  metadata: { name: "Testwelt" },
  entities: { object: { obj1: { type: "box", position: [0, 0, 0] } } }
};

const denormalized = denormalizeUserYaml(normalized);
// Ergebnis: { name: "Testwelt", objects: [{ type: "box", position: [0, 0, 0] }] }
```

## Beispiel: Gültige Genesis (YAML)

```yaml
name: "Base World"
description: "Eine einfache Testwelt"
id: "gen_XYZ123"

environment:
  skybox: "clear_day"
  time_of_day: 0.5
  ambient_light: 0.6
  sun_intensity: 0.8

terrain:
  type: "flat"
  size: [50, 50]
  color: "#4a7c1e"

objects:
  - type: "rock"
    position: [5, 0, 3]
    scale: [1.2, 0.8, 1.1]
    color: "#8b7355"
```

## Beispiel: Gültiger Patch (YAML)

```yaml
name: "Biome Desert"
description: "Fügt eine Wüste hinzu"
objects:
  - type: "cactus"
    position: [10, 0, 10]
    scale: [1, 2, 1]
    color: "#2d5016"
```

## Beispiel: Gültiger Patch (Operations-Format)

```yaml
metadata:
  schema_version: "patchkit/1.0"
  id: "a1B2c3D4e5"
  name: "Biome Desert"
  author_npub: "npub1xyz..."
  created_at: 1733600000
  targets_world: "gen_XYZ123"
operations:
  - type: add
    entity_type: object
    entity_id: cactus1
    payload:
      type: cactus
      position: [10, 0, 10]
      scale: [1, 2, 1]
      color: "#2d5016"
```

## Validierungsregeln (zusätzlich zur Schema-Prüfung)
- Referenzintegrität: update/delete benötigen vorhandene Entities; optional streng mit Option strictRefIntegrity.
- Zyklendetektion: depends_on darf keine Zyklen bilden; Fehler mit Zykluspfad.
- Größen-/Komplexitätslimits: maxEntities, maxProps pro Entity, konfigurierbar.
- Signaturprüfung: author_npub muss mit Signatur pubkey übereinstimmen (falls aktiviert).

## Linting und Auto-Fix
- Fehlende Felder: leere Listen/Maps als Defaults.
- Normalisierung: Kleinschreibung für Keys nach Policy (optional).
- Suggestions: z. B. entity_id aus payload ableiten, wenn eindeutig.

## Hinweise zur Migration
- 1.0 → 1.1 (Beispiel-Ideen):
  - Umbenennung metadata.version → metadata.content_version
  - Einführung entities.*.*._deleted Flag statt delete-Operation (optional)
  - Neue Capabilities: overrides_scoped, genesis_rules_v2