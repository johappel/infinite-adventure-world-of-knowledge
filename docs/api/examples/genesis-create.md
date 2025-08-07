# Beispiel: Genesis erstellen und speichern (Vanilla JS)

Datei: [examples/genesis-create.js()](examples/genesis-create.js:1)

```js
// Beispielhafter Editor- oder Node-Kontext (Vanilla JS)
// Annahme: @iakw/patchkit exportiert ESM-APIs: genesis, io
// In Browser-Bundles via import, in Node via dynamic import oder Bundler.

import { genesis, io } from "@iakw/patchkit";

// Minimaler Signer-Port (Platzhalter) — in Produktion NIP-07 oder nostr-tools verwenden
const signerPort = {
  async pubkey() { return "npub1example..."; },
  async sign(data) { return { sig: "sig-example" }; }
};

// Minimaler GenesisPort (Platzhalter) — in Produktion Nostr/FS/HTTP Adapter verwenden
const genesisPort = {
  async getById(id) { return undefined; },
  async save(signedGenesis) {
    console.log("Saved genesis:", signedGenesis.metadata.id);
  }
};

async function createAndSaveGenesis() {
  const g = await genesis.create({
    name: "Base World",
    author_npub: "npub1example...",
    description: "Startwelt"
  });

  const report = await genesis.validate(g);
  if (!report.valid) {
    console.error("Ungültige Genesis:", report.errors);
    return;
  }

  const signed = await genesis.sign(g, signerPort);
  await io.genesis.save(signed, genesisPort);

  const yaml = genesis.serialize(g, "yaml");
  console.log("Genesis YAML:\\n", yaml);
}

createAndSaveGenesis().catch(console.error);
```

Hinweise
- Vanilla JS: keine TypeScript-Syntax.
- Signatur/Save sind abstrahiert über Ports (SignerPort/GenesisPort).
- Für echte Persistenz: Nostr- oder FS-Adapter aus der Bibliothek nutzen.