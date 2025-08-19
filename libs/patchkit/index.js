// @iakw/patchkit — MVP (Vanilla JS, ESM) with Ajv-based schema validation
// Public API namespaces: genesis, patch, world, io
// Vanilla JavaScript only. ESM module. No external bundler required.
// This file embeds JSON Schemas and performs runtime validation with Ajv when available.

// 0) Ajv loader (browser CDN or Node fallback)
// In Browser, include (example):
// <script src="https://cdnjs.cloudflare.com/ajax/libs/ajv/8.12.0/ajv2020.bundle.min.js"></script>
// which exposes window.ajv2020 as the Ajv 2020 constructor.
let AjvCtor = null;
function ensureAjv() {
  if (AjvCtor) return AjvCtor;
  if (typeof window !== "undefined" && window.ajv2020) {
    AjvCtor = window.ajv2020; // global provided by CDN
    return AjvCtor;
  }
  try {
    // Node/CommonJS dynamic require fallback (if used in Node)
    // eslint-disable-next-line no-undef
    const mod = require("ajv/dist/2020");
    AjvCtor = mod.default || mod;
    return AjvCtor;
  } catch {
    return null;
  }
}

// 1) Internal utils (minimal)
const Base64URL = {
  fromBytes(bytes) {
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }
};
function getCrypto() {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) return crypto;
  try { return require("crypto").webcrypto; } catch { /* ignore */ }
  return null;
}
function randomBytes(len = 16) {
  const c = getCrypto();
  if (c && c.getRandomValues) {
    const arr = new Uint8Array(len);
    c.getRandomValues(arr);
    return arr;
  }
  const arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) arr[i] = Math.floor(Math.random() * 256);
  return arr;
}
function generateUniqueId(bytes = 16) {
  return Base64URL.fromBytes(randomBytes(bytes));
}
function nowEpoch() {
  return Math.floor(Date.now() / 1000);
}

// 2) YAML Serialization helpers (fallback to JSON if YAML lib missing)
function ensureYamlLib() {
  if (typeof YAML !== "undefined" && YAML && typeof YAML.stringify === "function" && typeof YAML.parse === "function") {
    return YAML;
  }
  return null;
}
function isNonEmptyString(x) { return typeof x === "string" && x.length > 0; }
function safeClone(obj) { return JSON.parse(JSON.stringify(obj)); }

// 3) Embedded JSON Schemas (patchkit/1.0)
const SCHEMA_GENESIS_1_0 = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://iakw.dev/schemas/genesis-1.0.json",
  title: "Genesis",
  type: "object",
  required: ["metadata", "entities"],
  additionalProperties: false,
  properties: {
    metadata: {
      type: "object",
      required: ["schema_version", "id", "name", "author_npub", "created_at"],
      additionalProperties: false,
      properties: {
        schema_version: { const: "patchkit/1.0" },
        id: { type: "string", pattern: "^[A-Za-z0-9_-]{8,64}$" },
        name: { type: "string", minLength: 1 },
        description: { type: "string" },
        author_npub: { type: "string", minLength: 1 },
        created_at: { type: "integer", minimum: 0 },
        version: { type: "string" }
      }
    },
    entities: {
      type: "object",
      patternProperties: {
        "^[a-z0-9_-]+$": {
          type: "object",
          patternProperties: {
            "^[a-z0-9_-]+$": {
              type: "object",
              additionalProperties: true
            }
          },
          additionalProperties: false
        }
      },
      additionalProperties: false
    },
    rules: { type: "object", additionalProperties: true }
  }
};

const SCHEMA_PATCH_1_0 = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://iakw.dev/schemas/patch-1.0.json",
  title: "Patch",
  type: "object",
  required: ["metadata", "operations"],
  additionalProperties: false,
  properties: {
    metadata: {
      type: "object",
      required: ["schema_version", "id", "name", "author_npub", "created_at", "targets_world"],
      additionalProperties: false,
      properties: {
        schema_version: { const: "patchkit/1.0" },
        id: { type: "string", pattern: "^[A-Za-z0-9_-]{8,64}$" },
        name: { type: "string", minLength: 1 },
        description: { type: "string" },
        author_npub: { type: "string", minLength: 1 },
        created_at: { type: "integer", minimum: 0 },
        version: { type: "string" },
        targets_world: { type: "string", pattern: "^[A-Za-z0-9_-]{8,64}$" },
        depends_on: {
          type: "array",
          items: { type: "string", pattern: "^[A-Za-z0-9_-]{8,64}$" },
          uniqueItems: true
        },
        overrides: {
          type: "array",
          items: {
            type: "object",
            required: ["patch_id"],
            additionalProperties: false,
            properties: {
              patch_id: { type: "string", pattern: "^[A-Za-z0-9_-]{8,64}$" },
              entities: { type: "array", items: { type: "string" } },
              properties: { type: "array", items: { type: "string" } },
              scope: {
                type: "object",
                required: ["entity_type", "entity_id"],
                additionalProperties: false,
                properties: {
                  entity_type: { type: "string" },
                  entity_id: { type: "string" }
                }
              }
            }
          }
        }
      }
    },
    operations: {
      type: "array",
      items: {
        oneOf: [
          {
            type: "object",
            required: ["type", "entity_type", "payload"],
            additionalProperties: false,
            properties: {
              type: { const: "add" },
              entity_type: { type: "string" },
              entity_id: { type: "string" },
              payload: { type: "object", additionalProperties: true }
            }
          },
          {
            type: "object",
            required: ["type", "entity_type", "entity_id", "changes"],
            additionalProperties: false,
            properties: {
              type: { const: "update" },
              entity_type: { type: "string" },
              entity_id: { type: "string" },
              changes: { type: "object", additionalProperties: true }
            }
          },
          {
            type: "object",
            required: ["type", "entity_type", "entity_id"],
            additionalProperties: false,
            properties: {
              type: { const: "delete" },
              entity_type: { type: "string" },
              entity_id: { type: "string" }
            }
          }
        ]
      }
    }
  }
};

// 4) Ajv validator cache
let _ajv = null;
let _validateGenesis = null;
let _validatePatch = null;
function getAjv() {
  if (_ajv) return _ajv;
  const Ajv = ensureAjv();
  if (!Ajv) return null;
  _ajv = new Ajv({ allErrors: true, strict: false });
  return _ajv;
}
function ensureValidators() {
  const ajv = getAjv();
  if (!ajv) return;
  if (!_validateGenesis) _validateGenesis = ajv.compile(SCHEMA_GENESIS_1_0);
  if (!_validatePatch) _validatePatch = ajv.compile(SCHEMA_PATCH_1_0);
}

// 5) Public API: genesis
export const genesis = {
  async create(input, options = {}) {
    // Wenn eine ID im Input übergeben wird, verwende diese, ansonsten generiere eine neue
    const id = input?.id || generateUniqueId(12);
    const created_at = (options.clock && typeof options.clock.now === "function") ? options.clock.now() : nowEpoch();
    const g = {
      metadata: {
        schema_version: "patchkit/1.0",
        id,
        name: input?.name || "",
        description: input?.description || "",
        author_npub: input?.author_npub || "",
        created_at,
      },
      entities: input?.initialEntities || {},
      rules: input?.rules || {}
    };
    return g;
  },
  async validate(genesisObj) {
    ensureValidators();
    const errors = [];
    const warnings = [];
    if (_validateGenesis) {
      const ok = _validateGenesis(genesisObj);
      if (!ok && Array.isArray(_validateGenesis.errors)) {
        for (const e of _validateGenesis.errors) {
          errors.push({ path: e.instancePath || "", msg: e.message || "Schemafehler", keyword: e.keyword });
        }
      }
      return { valid: ok === true, errors, warnings };
    }
    // Fallback leichte Prüfungen wenn Ajv nicht verfügbar
    if (!genesisObj || typeof genesisObj !== "object") errors.push({ path: "", msg: "Genesis fehlt/ungültig" });
    const md = genesisObj?.metadata;
    if (!md) errors.push({ path: "metadata", msg: "metadata fehlt" });
    if (!isNonEmptyString(md?.id)) errors.push({ path: "metadata.id", msg: "id fehlt" });
    if (!isNonEmptyString(md?.name)) errors.push({ path: "metadata.name", msg: "name fehlt" });
    if (!isNonEmptyString(md?.author_npub)) errors.push({ path: "metadata.author_npub", msg: "author_npub fehlt" });
    if (typeof genesisObj?.entities !== "object") errors.push({ path: "entities", msg: "entities fehlt/ungültig" });
    return { valid: errors.length === 0, errors, warnings };
  },
  serialize(genesisObj, format = "yaml") {
    if (format === "json") return JSON.stringify(genesisObj, null, 2);
    const yamlLib = ensureYamlLib();
    if (!yamlLib) {
      return JSON.stringify(genesisObj, null, 2);
    }
    return yamlLib.stringify(genesisObj);
  },
  parse(raw, format = "yaml") {
    if (format === "json") return JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw));
    const yamlLib = ensureYamlLib();
    if (!yamlLib) return JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw));
    return yamlLib.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw));
  },
  async sign(genesisObj, signerPort) {
    const payload = new TextEncoder().encode(JSON.stringify(genesisObj));
    const pubkey = signerPort && typeof signerPort.pubkey === "function" ? await signerPort.pubkey() : "npub0";
    const sigObj = signerPort && typeof signerPort.sign === "function" ? await signerPort.sign(payload) : { sig: "nosig" };
    return { ...safeClone(genesisObj), signature: { pubkey, sig: sigObj.sig } };
  }
};

// 6) Public API: patch
export const patch = {
  async create(input, options = {}) {
    const id = generateUniqueId(12);
    const created_at = (options.clock && typeof options.clock.now === "function") ? options.clock.now() : nowEpoch();
    const p = {
      metadata: {
        schema_version: "patchkit/1.0",
        id,
        name: input?.name || "",
        description: input?.description || "",
        author_npub: input?.author_npub || "",
        created_at,
        version: input?.version || "",
        targets_world: input?.targets_world || "",
        depends_on: Array.isArray(input?.depends_on) ? input.depends_on.slice() : [],
        overrides: Array.isArray(input?.overrides) ? input.overrides.slice() : []
      },
      operations: Array.isArray(input?.operations) ? input.operations.slice() : []
    };
    return p;
  },
  async update(base, changes = {}) {
    const next = safeClone(base);
    if (changes.metadata) {
      // prevent id change
      const { id, ...restMd } = changes.metadata;
      next.metadata = { ...next.metadata, ...restMd };
    }
    if (Array.isArray(changes.operations)) {
      next.operations = changes.operations.slice();
    }
    return next;
  },
  async validate(patchObj) {
    ensureValidators();
    const errors = [];
    const warnings = [];
    if (_validatePatch) {
      const ok = _validatePatch(patchObj);
      if (!ok && Array.isArray(_validatePatch.errors)) {
        for (const e of _validatePatch.errors) {
          errors.push({ path: e.instancePath || "", msg: e.message || "Schemafehler", keyword: e.keyword });
        }
      }
      return { valid: ok === true, errors, warnings };
    }
    // Fallback
    if (!patchObj || typeof patchObj !== "object") errors.push({ path: "", msg: "Patch fehlt/ungültig" });
    const md = patchObj?.metadata;
    if (!md) errors.push({ path: "metadata", msg: "metadata fehlt" });
    if (!isNonEmptyString(md?.id)) errors.push({ path: "metadata.id", msg: "id fehlt" });
    if (!isNonEmptyString(md?.name)) errors.push({ path: "metadata.name", msg: "name fehlt" });
    if (!isNonEmptyString(md?.author_npub)) errors.push({ path: "metadata.author_npub", msg: "author_npub fehlt" });
    if (!isNonEmptyString(md?.targets_world)) errors.push({ path: "metadata.targets_world", msg: "targets_world fehlt" });
    if (!Array.isArray(patchObj?.operations)) errors.push({ path: "operations", msg: "operations fehlt/ungültig" });
    return { valid: errors.length === 0, errors, warnings };
  },
  serialize(patchObj, format = "yaml") {
    if (format === "json") return JSON.stringify(patchObj, null, 2);
    const yamlLib = ensureYamlLib();
    if (!yamlLib) {
      return JSON.stringify(patchObj, null, 2);
    }
    return yamlLib.stringify(patchObj);
  },
  parse(raw, format = "yaml") {
    if (format === "json") return JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw));
    const yamlLib = ensureYamlLib();
    if (!yamlLib) return JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw));
    return yamlLib.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw));
  },
  async sign(patchObj, signerPort) {
    const payload = new TextEncoder().encode(JSON.stringify(patchObj));
    const pubkey = signerPort && typeof signerPort.pubkey === "function" ? await signerPort.pubkey() : "npub0";
    const sigObj = signerPort && typeof signerPort.sign === "function" ? await signerPort.sign(payload) : { sig: "nosig" };
    return { ...safeClone(patchObj), signature: { pubkey, sig: sigObj.sig } };
  }
};

// 7) Public API: world (MVP compute/apply/diff)
export const world = {
  async computeOrder(patches, policy = {}) {
    // Topologische Sortierung anhand metadata.depends_on
    // policy: { onCycle: 'mark' | 'drop' | 'throw', tie: 'created_at' | 'name' | 'id' }
    const onCycle = policy.onCycle || 'mark';
    const tie = policy.tie || 'created_at';
    const items = (patches || []).slice();

    // Map id -> patch
    const byId = new Map();
    for (const p of items) {
      const id = p?.metadata?.id;
      if (id) byId.set(id, p);
    }

    // deps: id -> Set(depId)
    const deps = new Map();
    for (const p of items) {
      const id = p?.metadata?.id;
      if (!id) continue;
      const arr = Array.isArray(p?.metadata?.depends_on) ? p.metadata.depends_on.filter(x => typeof x === 'string') : [];
      deps.set(id, new Set(arr.filter(d => byId.has(d) && d !== id))); // nur bekannte, keine Self-Dep
    }

    // In-Degrees berechnen: Anzahl eingehender Kanten pro Knoten
    const inDeg = new Map();
    for (const id of byId.keys()) inDeg.set(id, 0);
    for (const [id, set] of deps.entries()) {
      for (const d of set) {
        // Kante d -> id (id hängt von d ab), also inDeg(id)++
        inDeg.set(id, (inDeg.get(id) || 0) + 1);
      }
    }

    // Tie-Breaker
    const keyCreatedAt = (p) => p?.metadata?.created_at || 0;
    const keyName = (p) => p?.metadata?.name || '';
    const keyId = (p) => p?.metadata?.id || '';
    const cmpTie = (a, b) => {
      if (tie === 'name') {
        return keyName(a).localeCompare(keyName(b))
            || (keyCreatedAt(a) - keyCreatedAt(b))
            || keyId(a).localeCompare(keyId(b));
      }
      if (tie === 'id') {
        return keyId(a).localeCompare(keyId(b))
            || (keyCreatedAt(a) - keyCreatedAt(b))
            || keyName(a).localeCompare(keyName(b));
      }
      // default created_at asc, dann name, dann id
      return (keyCreatedAt(a) - keyCreatedAt(b))
          || keyName(a).localeCompare(keyName(b))
          || keyId(a).localeCompare(keyId(b));
    };

    // Kahn-Algorithmus
    const queue = [];
    for (const [id, deg] of inDeg.entries()) {
      if (deg === 0) {
        const node = byId.get(id);
        if (node) queue.push(node);
      }
    }
    queue.sort(cmpTie);

    const ordered = [];
    const visited = new Set();

    while (queue.length) {
      const n = queue.shift();
      const nid = n?.metadata?.id;
      if (!nid) continue;
      if (visited.has(nid)) continue;
      visited.add(nid);
      ordered.push(n);

      // entferne ausgehende Kanten von nid (d.h. reduziere inDeg derjenigen, die nid als Dependency haben)
      for (const [id, set] of deps.entries()) {
        if (set.has(nid)) {
          set.delete(nid);
          inDeg.set(id, (inDeg.get(id) || 0) - 1);
          if ((inDeg.get(id) || 0) === 0) {
            const node = byId.get(id);
            if (node) {
              queue.push(node);
              queue.sort(cmpTie);
            }
          }
        }
      }
    }

    // Zyklen erkennen: Knoten mit inDeg>0 sind beteiligt
    const cyclicIds = Array.from(inDeg.entries())
      .filter(([, deg]) => deg > 0)
      .map(([id]) => id);

    const cycles = [];
    if (cyclicIds.length) {
      // einfache Markierung: alle verbleibenden als ein Zyklus melden
      cycles.push({ nodes: cyclicIds.slice() });

      if (onCycle === 'drop') {
        // nichts tun: Zyklusknoten werden nicht hinzugefügt
      } else if (onCycle === 'throw') {
        throw new Error('Toposort-Zyklus erkannt: ' + cyclicIds.join(','));
      } else {
        // 'mark' (Default): Zyklusknoten hinten anhängen in stabiler Tie-Order
        const rest = cyclicIds.map(id => byId.get(id)).filter(Boolean).sort(cmpTie);
        ordered.push(...rest);
      }
    }

    return { ordered, cycles };
  },
  
  
  async applyPatches(genesisObj, orderedPatches, options = {}) {
    // Ziel: Ein zentrales, robustes applyPatches, das verschiedene Input-Formate
    // normalisiert und einheitlich anwendet. Liefert { state, diffs, conflicts }.
    console.log("[DEBUG applyPatches] Applying patches to genesis world state...");

    // Helper: normalize genesis input (YAML/JSON/parsed)
    function normalizeGenesis(g) {
      if (!g) return { metadata: {}, entities: {} };
      // If string - try JSON then YAML
      if (typeof g === 'string') {
        try { return JSON.parse(g); } catch {};
        try { return ensureYamlLib().load(g); } catch {};
        return { metadata: {}, entities: {} };
      }
      // If it looks like an event with content/yaml
      if (g.content && typeof g.content === 'string') {
        try { return JSON.parse(g.content); } catch {};
        try { return ensureYamlLib().load(g.content); } catch {};
      }
      // Already an object
      return g;
    }

    // Helper: normalize single patch/potential event into canonical patch object
    function normalizePatch(p) {
      if (!p) return null;

      // If string: try JSON then YAML
      if (typeof p === 'string') {
        try { const j = JSON.parse(p); if (j) return j; } catch {}
        try { const y = ensureYamlLib().load(p); if (y) return y; } catch {}
      }

      // If patch event-like (originalYaml or yaml or content)
      if (p.originalYaml && typeof p.originalYaml === 'string') {
        // try parse originalYaml
        try { const parsed = JSON.parse(p.originalYaml); if (parsed) return parsed; } catch {}
        try { const parsed = ensureYamlLib().load(p.originalYaml); if (parsed) return parsed; } catch {}
      }
      if (p.yaml && typeof p.yaml === 'string') {
        try { const parsed = JSON.parse(p.yaml); if (parsed) return parsed; } catch {}
        try { const parsed = ensureYamlLib().load(p.yaml); if (parsed) return parsed; } catch {}
      }
      if (p.content && typeof p.content === 'string') {
        try { const parsed = JSON.parse(p.content); if (parsed) return parsed; } catch {}
        try { const parsed = ensureYamlLib().load(p.content); if (parsed) return parsed; } catch {}
      }

      // If patchKit.patch.parse exists (not in this module), caller may handle
      // Otherwise assume it's already an object-like patch
      if (p.operations && Array.isArray(p.operations)) return p;

      // Try to extract operations or compatible shapes
      const candidate = { metadata: p.metadata || {}, operations: [] };
      // If p has objects/portals/personas lists, convert to add ops
      const entityKeys = ['objects','portals','personas'];
      for (const key of entityKeys) {
        if (Array.isArray(p[key])) {
          for (const e of p[key]) {
            candidate.operations.push({ type: 'add', entity_type: key.replace(/s$/,''), payload: safeClone(e) });
          }
        }
      }
      // environment/terrain/camera as update ops
      for (const k of ['environment','terrain','camera']) {
        if (p[k]) candidate.operations.push({ type: 'update', entity_type: k, changes: safeClone(p[k]) });
      }

      if (candidate.operations.length) return candidate;

      // give up - return null
      return null;
    }

    try {
      // Normalize inputs
      const genesis = normalizeGenesis(genesisObj) || { metadata: {}, entities: {} };
      const patches = Array.isArray(orderedPatches) ? orderedPatches.map(normalizePatch).filter(Boolean) : [];

      console.log('[DEBUG applyPatches] Genesis Object:', genesis);
      console.log('[DEBUG applyPatches] Normalized Patches:', patches);

      // Prepare state
      const baseEntities = safeClone(genesis?.entities || {});
      const state = { entities: baseEntities, meta: { genesis_id: genesis?.metadata?.id } };
      const diffs = [];
      const conflicts = [];

      function getEntity(t, id) {
        state.entities[t] = state.entities[t] || {};
        return state.entities[t][id];
      }
      function ensureEntity(t, id) {
        state.entities[t] = state.entities[t] || {};
        if (!state.entities[t][id]) state.entities[t][id] = {};
        return state.entities[t][id];
      }

      // Apply patches sequentially
      for (const p of patches) {
        if (!p || !Array.isArray(p.operations)) continue;
        for (const op of p.operations) {
          const typ = String(op.type || '').toLowerCase();
          if (typ === 'add') {
            // Determine ID: prefer explicit entity_id, then payload.id, otherwise generate
            const id = op.entity_id || (op.payload && (op.payload.id || op.payload._id)) || generateUniqueId(8);
            const et = op.entity_type || (op.payload && op.payload.type) || 'objects';
            const entityType = String(et).replace(/s$/,'')
            // If already exists -> conflict (or treat as update)
            if (getEntity(entityType, id)) {
              conflicts.push({ reason: 'add-exists', patch: p, op, id, entityType });
              // convert to update
              const ent = ensureEntity(entityType, id);
              Object.assign(ent, safeClone(op.payload || {}));
              diffs.push({ kind: 'conflict-add-existing-updated', entity: { type: entityType, id }, from: undefined, to: safeClone(ent) });
            } else {
              ensureEntity(entityType, id);
              Object.assign(state.entities[entityType][id], safeClone(op.payload || {}));
              diffs.push({ kind: 'add', entity: { type: entityType, id }, from: undefined, to: safeClone(state.entities[entityType][id]) });
            }
          } else if (typ === 'update') {
            // Special keys: environment/terrain/camera are top-level updates
            const et = op.entity_type || op.target || (op.payload && op.payload.type) || null;
            if (['environment','terrain','camera'].includes(et)) {
              // Write to state.meta or state.entities as appropriate; use meta for environment
              state.meta[et] = Object.assign({}, state.meta[et] || {}, safeClone(op.changes || op.payload || {}));
              diffs.push({ kind: 'update', entity: { type: et, id: null }, from: undefined, to: safeClone(state.meta[et]) });
              continue;
            }

            const entityType = String(et || (op.entity_type || '')).replace(/s$/,'')
            const id = op.entity_id || (op.target_id || (op.payload && (op.payload.id || op.payload._id)));
            if (!id) {
              // nothing to update
              conflicts.push({ reason: 'update-no-id', patch: p, op });
              continue;
            }
            const existing = getEntity(entityType, id);
            if (!existing) {
              // missing entity -> conflict
              conflicts.push({ reason: 'update-missing', patch: p, op, id, entityType });
              // Option: create placeholder and apply
              ensureEntity(entityType, id);
              Object.assign(state.entities[entityType][id], safeClone(op.changes || op.payload || {}));
              diffs.push({ kind: 'create-on-update', entity: { type: entityType, id }, from: undefined, to: safeClone(state.entities[entityType][id]) });
            } else {
              const before = safeClone(existing);
              Object.assign(existing, safeClone(op.changes || op.payload || {}));
              diffs.push({ kind: 'update', entity: { type: entityType, id }, from: before, to: safeClone(existing) });
            }
          } else if (typ === 'remove' || typ === 'delete') {
            const entityType = String(op.entity_type || op.target || '').replace(/s$/,'')
            const id = op.entity_id || op.target_id || (op.payload && (op.payload.id || op.payload._id));
            if (!id) { conflicts.push({ reason: 'remove-no-id', patch: p, op }); continue; }
            const existing = getEntity(entityType, id);
            if (!existing) { conflicts.push({ reason: 'remove-missing', patch: p, op, id, entityType }); continue; }
            const before = safeClone(existing);
            delete state.entities[entityType][id];
            diffs.push({ kind: 'remove', entity: { type: entityType, id }, from: before, to: undefined });
          } else {
            // Unknown op type: try to interpret as high-level action
            console.warn('[applyPatches] Unrecognized op type:', op.type, op);
            conflicts.push({ reason: 'unknown-op', patch: p, op });
          }
        }
      }

      return { state, diffs, conflicts };
    } catch (e) {
      console.error('[applyPatches] Fehler beim Anwenden der Patches:', e);
      return { state: genesis?.entities ? { entities: genesis.entities } : { entities: {} }, diffs: [], conflicts: [{ reason: 'exception', error: String(e) }] };
    }
  },
};


// 8) Public API: io facade (ports are provided by caller; MVP thin wrappers)
export const io = {
  async loadGenesis(id, genesisPort) {
    if (!genesisPort || typeof genesisPort.getById !== "function") throw new Error("GenesisPort.getById fehlt");
    return await genesisPort.getById(id);
  },
  async listPatchesByWorld(genesisId, patchPort) {
    if (!patchPort || typeof patchPort.listByWorld !== "function") throw new Error("PatchPort.listByWorld fehlt");
    return await patchPort.listByWorld(genesisId);
  },
  async getPatchById(id, patchPort) {
    if (!patchPort || typeof patchPort.getById !== "function") throw new Error("PatchPort.getById fehlt");
    return await patchPort.getById(id);
  },
  async saveSignedGenesis(signedGenesis, genesisPort) {
    if (!genesisPort || typeof genesisPort.save !== "function") throw new Error("GenesisPort.save fehlt");
    return await genesisPort.save(signedGenesis);
  },
  async saveSignedPatch(signedPatch, patchPort) {
    if (!patchPort || typeof patchPort.save !== "function") throw new Error("PatchPort.save fehlt");
    return await patchPort.save(signedPatch);
  },
  genesis: {
    async save(signedGenesis, genesisPort) { return io.saveSignedGenesis(signedGenesis, genesisPort); }
  }
};

export default { genesis, patch, world, io };