# Beispiel: Patch erstellen, validieren und anwenden (Vanilla JS)

Datei: [examples/patch-flow.js()](examples/patch-flow.js:1)

```js
// Vanilla JS Nutzung von @iakw/patchkit für Patch-Erstellung, Validierung und Anwendung

import { genesis, patch, world, io } from "@iakw/patchkit";

// Platzhalter-Ports
const signerPort = {
  async pubkey() { return "npub1example..."; },
  async sign(data) { return { sig: "sig-example" }; }
};

const genesisPort = {
  async getById(id) { return undefined; },
  async save(signedGenesis) { console.log("Saved genesis:", signedGenesis.metadata.id); }
};

async function runFlow() {
  // 1) Genesis erzeugen (nur für das Beispiel; in realer Nutzung oft vorhanden)
  const g = await genesis.create({ name: "World A", author_npub: "npub1example..." });
  const repG = await genesis.validate(g);
  if (!repG.valid) throw new Error("Ungültige Genesis");
  await io.genesis.save(await genesis.sign(g, signerPort), genesisPort);

  // 2) Patch erzeugen
  const p = await patch.create({
    name: "Add Desert",
    author_npub: "npub1example...",
    targets_world: g.metadata.id
  });

  // 3) Patch aktualisieren (Operationen hinzufügen)
  const p2 = await patch.update(p, {
    operations: [
      { type: "add", entity_type: "biome", entity_id: "desert", payload: { temp: 40, humidity: 0.1 } }
    ]
  });

  // 4) Validieren
  const repP = await patch.validate(p2);
  if (!repP.valid) {
    console.error("Patch-Fehler:", repP.errors);
    return;
  }

  // 5) Reihenfolge berechnen und anwenden
  const { ordered } = await world.computeOrder([p2]);
  const { state, conflicts } = await world.applyPatches(g, ordered, { flags: { strictRefIntegrity: true } });

  if (conflicts && conflicts.length) {
    console.warn("Konflikte erkannt:", conflicts);
  }

  // 6) Diff und Serialisierung
  const diff = await world.diffAgainstWorld(p2, state);
  const yaml = patch.serialize(p2, "yaml");

  console.log("Diff:", diff);
  console.log("Patch YAML:\\n", yaml);
}

runFlow().catch(console.error);
```

Hinweise
- patch.create und patch.update sind idempotent bezüglich gleicher Änderungen.
- world.computeOrder berücksichtigt depends_on und Tiebreaker.
- world.applyPatches liefert deterministischen Zustand und Konfliktliste.