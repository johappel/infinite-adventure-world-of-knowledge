# Beispiel: Welt bauen (Genesis + Patches) — Vanilla JS

Datei: [examples/world-build.js()](examples/world-build.js:1)

```js
// Vanilla JS Nutzung von @iakw/patchkit für den deterministischen Weltaufbau

import { io, world } from "@iakw/patchkit";

// Platzhalter-Ports; in Produktion Nostr/FS/HTTP Adapter verwenden
const genesisPort = {
  async getById(id) {
    // ... lade Genesis per Adapter
    return undefined;
  }
};

const patchPort = {
  async listByWorld(genesisId) {
    // ... lade Patches per Adapter
    return [];
  }
};

async function buildWorld(genesisId) {
  const genesis = await io.loadGenesis(genesisId, genesisPort);
  if (!genesis) throw new Error("Genesis nicht gefunden: " + genesisId);

  const patches = await io.listPatchesByWorld(genesisId, patchPort);
  const { ordered } = await world.computeOrder(patches);

  const { state, conflicts } = await world.applyPatches(genesis, ordered, {
    flags: { strictRefIntegrity: true }
  });

  if (conflicts && conflicts.length) {
    console.warn("Konflikte erkannt:", conflicts);
  }
  return state;
}

buildWorld("gen_XYZ123")
  .then(state => console.log("Entities:", Object.keys(state.entities)))
  .catch(console.error);
```

Hinweise
- computeOrder führt Toposort aus und respektiert depends_on, created_at sowie optionale Policy-Regeln.
- applyPatches ist deterministisch; gleicher Input führt zum gleichen Output.