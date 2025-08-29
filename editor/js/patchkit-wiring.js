/**
 * PatchKit Wiring (Interface)
 * Bindet PatchKit-IO an den Nostr-Service und mappt auf die erwarteten Facade-Methoden der lokalen PatchKit-Implementierung.
 * Erwartet: libs/patchkit/index.js (ESM) verfügbar. Nostr-Service kann optional sein.
 *
 * WICHTIG: libs/patchkit/index.js erwartet Ports mit Methodennamen:
 *   genesisPort: { getById(id), save(signedGenesis) }
 *   patchPort:   { listByWorld(worldId), getById(id), save(signedPatch) }
 * Siehe libs/patchkit/index.js io-Fassade.
 */

import PatchKit from '../../libs/patchkit/index.js';

// Optional: Globale Debug-Refs
const debug = (name, val) => { try { window[name] = val; } catch {} };

export function createAjvInstanceIfNeeded() {
  // PatchKit intern nutzt ensureAjv(); wir übergeben ajv nur, wenn vorhanden.
  // Browser-CDN-Varianten: window.ajv2020 (PatchKit nutzt diese intern), oder klassische window.Ajv.
  const AjvFromPatchKit = null; // nicht benötigt, PatchKit lädt selbst via window.ajv2020
  const AjvGlobal =
    (typeof window !== 'undefined' && (window.Ajv || window.ajv || window.AJV || window.ajv2020))
    || (typeof Ajv !== 'undefined' ? Ajv : undefined);
  // Wenn keine Ajv-Klasse da ist, lassen wir PatchKit ohne Ajv laufen (nutzt Fallback-Validation).
  if (!AjvGlobal) return null;
  try {
    // Wenn ajv2020 vorhanden ist, übergeben wir keine Instanz, da PatchKit selbst initialisiert.
    if (typeof window !== 'undefined' && window.ajv2020) return null;
    return new AjvGlobal({ allErrors: true, strict: false });
  } catch {
    return null;
  }
}

/**
 * Adapter auf erwartete Ports der PatchKit-io-Fassade.
 * Mapping von vorhandenen NostrService-Methoden auf:
 *  - genesisPort.getById(id)
 *  - genesisPort.save(signedGenesis)
 *  - patchPort.listByWorld(worldId)
 *  - patchPort.getById(id)
 *  - patchPort.save(signedPatch)
 */
export function createPatchKitPorts(nostrService) {
  // Wenn kein Service vorliegt, liefern wir Ports, die definierte Fehler werfen/leer liefern.
  const notImpl = (name) => async () => { throw new Error(`NostrService.${name} ist nicht implementiert`); };

  const genesisPort = {
    async getById(id) {
      // nostr-service-factory.js bietet getById(id) auf dem Service-Wrapper
      return nostrService?.getById ? nostrService.getById(id) : notImpl('getById')();
    },
    async save(signedGenesis) {
      // saveOrUpdate erwartet { id, name, type:'genesis', yaml, originalYaml?, pubkey }
      // Extrahiere minimal benötigte Felder aus signedGenesis
      const md = signedGenesis?.metadata || {};
      const yaml = PatchKit.genesis.serialize ? PatchKit.genesis.serialize(signedGenesis, 'yaml') : JSON.stringify(signedGenesis);
      const ident = await nostrService.getIdentity();
      const payload = {
        id: md.id,
        name: md.name || '',
        type: 'genesis',
        yaml,
        originalYaml: signedGenesis.originalYaml, // originalYaml-Feld weitergeben
        pubkey: ident.pubkey
      };
      return nostrService?.saveOrUpdate ? nostrService.saveOrUpdate(payload) : notImpl('saveOrUpdate')();
    }
  };

  const patchPort = {
    async listByWorld(worldId) {
      return this.listPatchesByWorld(worldId);
    },
    async listPatchesByWorld(worldId) {
      // Service hat keine direkte listByWorld; implementiere via get({kinds:[30312]}) und Filter
      if (!nostrService?.get) return [];
      const evts = await nostrService.get({ kinds: [30312] }).catch(() => []);
      const allPatches = [];
      
      for (const e of evts) {
        try {
          // Prüfe zuerst die Tags für target-Information (neue Datenstruktur)
          const targetTag = e.tags?.find(t => Array.isArray(t) && t[0] === 'target');
          const targetWorldId = targetTag && targetTag[1];
          
          // Prüfe, ob dieser Patch zur gewünschten Welt gehört
          const belongsToWorld = targetWorldId === worldId;
          
          if (belongsToWorld) {
            // Parse den Content für Patch-Details
            const c = JSON.parse(e.content);
            const payload = c.payload || null;
            const p = typeof payload === 'string' ? JSON.parse(payload) : c;
            
            // Extrahiere Patch-ID aus d-Tag (neue Struktur) - PRIORITÄT für d-Tag
            const dTag = e.tags?.find(t => Array.isArray(t) && t[0] === 'd');
            const patchId = dTag && dTag[1];
            
            const patchObj = {
              id: patchId || p.metadata.id || p.id || e.id || '',
              name: p.metadata.name || p.name || '',
              metadata: {
                schema_version: 'patchkit/1.0',
                id: patchId || p.metadata.id || p.id || e.id || '', // d-Tag hat Priorität
                name: p.metadata.name || p.name || '',
                description: p.metadata.description || p.description || '',
                author_npub: e.pubkey || '',
                created_at: e.created_at || 0,
                version: p.version || '',
                targets_world: worldId,
                depends_on: Array.isArray(p.depends_on) ? p.depends_on : [],
                overrides: Array.isArray(p.overrides) ? p.overrides : []
              },
              operations: Array.isArray(p.operations) ? p.operations : []
            };
            
            if (payload) {
              patchObj.originalYaml = payload;
            }
            
            allPatches.push(patchObj);
          }
        } catch (error) {
          console.warn('[DEBUG PATCHES] Fehler beim Verarbeiten des Patch-Events:', e.id, error);
        }
      }

      // DEBUG: Zeige alle gefundenen Patches vor der Filterung
      console.log('[DEBUG PATCHES] listPatchesByWorld: Alle Patches vor Filterung:', allPatches.map(p => ({
        id: p.id,
        created_at: p.metadata?.created_at,
        name: p.metadata?.name
      })));

      // Gruppiere Patches nach ID und behalte nur die neueste Revision (höchster created_at)
      const patchMap = new Map();
      for (const patch of allPatches) {
        const existingPatch = patchMap.get(patch.id);
        const currentTime = patch.metadata?.created_at || 0;
        const existingTime = existingPatch?.metadata?.created_at || 0;

        if (!existingPatch || currentTime > existingTime) {
          patchMap.set(patch.id, patch);
        }
      }

      const latestPatches = Array.from(patchMap.values());
      
      // DEBUG: Zeige die gefilterten Patches
      console.log('[DEBUG PATCHES] listPatchesByWorld: Neueste Revisionen nach Filterung:', latestPatches.map(p => ({
        id: p.id,
        created_at: p.metadata?.created_at,
        name: p.metadata?.name
      })));

      return latestPatches;
    },
    async getById(id) {
      return nostrService?.getById ? nostrService.getById(id) : notImpl('getById')();
    },
    async save(signedPatch) {
      const md = signedPatch?.metadata || {};
      const yaml = signedPatch.originalYaml || (PatchKit.patch.serialize ? PatchKit.patch.serialize(signedPatch, 'yaml') : JSON.stringify(signedPatch));
      const ident = await nostrService.getIdentity();
      // content JSON inkl. payload
      const contentJSON = JSON.stringify({
        id: md.id,
        target: md.targets_world,
        name: md.name || '',
        description: md.description || '',
        version: md.version || '',
        operations: signedPatch.operations || [],
        payload: signedPatch.originalYaml || ''
      });
      
      // WICHTIG: Die ID muss die Patch-ID sein, nicht die World-ID!
      // Die saveOrUpdate Methode benötigt die Patch-ID für die Duplikaterkennung
      const patchId = md.id;
      const worldId = md.targets_world;
      
      const payload = {
        id: patchId, // Patch-ID statt World-ID!
        name: md.name || '',
        type: 'patch',
        yaml: yaml,
        originalYaml: signedPatch.originalYaml,
        pubkey: ident.pubkey
      };
      
      // console.log('[DEBUG patchPort.save] signedPatch metadata:', md);
      // console.log('[DEBUG patchPort.save] payload id:', payload.id, 'worldId:', worldId, 'patch_id:', patchId);
      // console.log('[DEBUG patchPort.save] yaml content:', yaml);
      // console.log('[DEBUG patchPort.save] full payload:', payload);
      
      return nostrService?.saveOrUpdate ? nostrService.saveOrUpdate(payload) : notImpl('saveOrUpdate')();
    },
    async delete(id) {
      if (nostrService?.delete) {
        return nostrService.delete(id);
      }
      throw new Error('NostrService.delete ist nicht implementiert');
    },

    // Löscht ein einzelnes Patch-Objekt anhand seiner Patch-ID (metadata.id oder eventId).
    // Delegiert an nostrService.deletePatch(patchId) falls vorhanden.
    async deletePatch(patchId) {
      if (!patchId) throw new Error('patchId fehlt für deletePatch');
      if (nostrService?.deletePatch) {
        return nostrService.deletePatch(patchId);
      }
      throw new Error('NostrService.deletePatch ist nicht implementiert');
    }
  };

  debug('genesisPortRef', genesisPort);
  debug('patchPortRef', patchPort);
  return { genesisPort, patchPort };
}

/**
 * Stellt ein PatchKit-API-Objekt bereit: { genesis, patch, world, io?, ajv?, io:{genesisPort,patchPort} }
 */
export async function createPatchKitAPI(nostrService) {
  // Ajv optional; PatchKit kann ohne Ajv mit Fallback prüfen.
  const ajv = createAjvInstanceIfNeeded() || undefined;

  // Nostr-Service auto-erzeugen, falls nicht übergeben
  let service = nostrService;
  if (!service && typeof window !== 'undefined' && window.NostrServiceFactory) {
    try {
      // Factory liefert ein Interface mit getById/saveOrUpdate/get/etc.
      const resolved = await awaitOrNull(window.NostrServiceFactory.getNostrService);
      service = resolved || (typeof window.NostrServiceFactory.create === 'function' ? window.NostrServiceFactory.create() : null);
    } catch { service = null; }
  }

  const { genesisPort, patchPort } = createPatchKitPorts(service);

  // PatchKit-Namespaces holen
  const kit = PatchKit; // default export mit { genesis, patch, world, io }
  const api = { genesis: kit.genesis, patch: kit.patch, world: kit.world, ajv, io: { genesisPort, patchPort } };
  debug('PatchKitAPI', api);
  return api;
}

// Hilfsfunktion: ruft eine evtl. async Factory-Funktion auf oder gibt null zurück
async function awaitOrNull(fn) {
  try {
    if (typeof fn === 'function') {
      const r = fn();
      return (r && typeof r.then === 'function') ? await r : r;
    }
  } catch {}
  return null;
}

// Optional: globaler Fallback
try { window.createPatchKitAPI = createPatchKitAPI; } catch {}