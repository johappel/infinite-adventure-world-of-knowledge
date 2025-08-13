import { APP_MODE, RELAYS, IDENTITY_STRATEGY } from './config.js';
import { ensureUniqueWorldId as _ensureUniqueWorldId } from './unique-id.js';

let _service = null;
let _identity = null;

// Identity Option A: prefer NIP-07, fallback to local nsec
async function getIdentity() {
  if (_identity) return _identity;

  if (IDENTITY_STRATEGY === 'nip07_with_local_fallback' && typeof window !== 'undefined' && window.nostr) {
    try {
      const pubkey = await window.nostr.getPublicKey();
      _identity = {
        type: 'nip07',
        pubkey,
        getPublicKey: async () => pubkey,
        signEvent: (evt) => window.nostr.signEvent(evt)
      };
      console.log('[identity] NIP-07 aktiv:', pubkey);
      return _identity;
    } catch (e) {
      console.warn('[identity] NIP-07 nicht verfügbar/fehlgeschlagen, nutze lokalen Schlüssel:', e);
    }
  }

  // Local fallback with nostr-tools (esm)
  const { generateSecretKey, getPublicKey, nip19 } = await import('https://esm.sh/nostr-tools@2.5.1');
  let nsec = localStorage.getItem('nostr_local_nsec');
  let sk;
  if (!nsec) {
    sk = generateSecretKey();
    nsec = nip19.nsecEncode(sk);
    localStorage.setItem('nostr_local_nsec', nsec);
  } else {
    try {
      const dec = nip19.decode(nsec);
      sk = dec.data;
    } catch {
      sk = generateSecretKey();
      nsec = nip19.nsecEncode(sk);
      localStorage.setItem('nostr_local_nsec', nsec);
    }
  }
  const pubkey = getPublicKey(sk);
  const { finalizeEvent } = await import('https://esm.sh/nostr-tools@2.5.1/pure.js');

  _identity = {
    type: 'local',
    pubkey,
    getPublicKey: async () => pubkey,
    signEvent: async (draft) => finalizeEvent(draft, sk)
  };
  console.log('[identity] Lokaler Schlüssel aktiv:', pubkey);
  return _identity;
}

function parseGenesisNameFromYaml(yaml) {
  try {
    const spec = window.jsyaml?.load ? window.jsyaml.load(yaml) : null;
    return  spec?.metadata?.name || '';
  } catch { return ''; }
}

function wrapInterface(serviceImpl) {
  return {
    get impl() { return serviceImpl; },
    async publish(event) { return serviceImpl.publish(event); },
    subscribe(filter) { return serviceImpl.subscribe(filter); },
    async get(filter) { return serviceImpl.get(filter); },
    unsubscribe(sub) { return serviceImpl.unsubscribe?.(sub); },

    async ensureSigned(draftEvent) {
      if (draftEvent.id && draftEvent.sig) return draftEvent;
      const ident = await getIdentity();
      const now = Math.floor(Date.now() / 1000);
      const draft = {
        kind: draftEvent.kind,
        created_at: draftEvent.created_at ?? now,
        tags: draftEvent.tags ?? [],
        content: draftEvent.content ?? '',
        pubkey: draftEvent.pubkey ?? ident.pubkey
      };
      return ident.signEvent(draft);
    },

    async publishSigned(draftEvent) {
      const evt = await this.ensureSigned(draftEvent);
      return this.publish(evt);
    },

    async getIdentity() { return getIdentity(); },

    // IDs global eindeutig sicherstellen (NIP-33 d-Tag)
    async ensureUniqueWorldId(desiredId, opts) {
      return _ensureUniqueWorldId(this, desiredId, opts);
    },

    // API: getById(id) → { id, name, type, yaml, originalYaml?, pubkey } | null
    async getById(id) {
      if (!id) return null;
      // Versuche: Genesis (30311) per '#d' und ggf. Patches (30312) mit d=id
      const filterGenesis = { kinds: [30311], '#d': [id] };
      const gens = await this.get(filterGenesis).catch(() => []);
      if (gens && gens.length) {
        const latest = gens.sort((a,b) => (b.created_at ?? 0) - (a.created_at ?? 0))[0];
        const name = parseGenesisNameFromYaml(latest.content);
        const result = { id, name, type: 'genesis', yaml: latest.content, pubkey: latest.pubkey };
        
        // Bei Genesis ist der Content direkt der YAML-Text, also setzen wir originalYaml = yaml
        result.originalYaml = latest.content;
        
        return result;
      }
      // Fallback: breite Suche und manuelles Filtern (Dexie kompatibel)
      const broad = await this.get({ kinds: [30311] }).catch(() => []);
      const g2 = (broad || []).filter(e => Array.isArray(e.tags) && e.tags.some(t => t[0] === 'd' && t[1] === id));
      if (g2.length) {
        const latest = g2.sort((a,b) => (b.created_at ?? 0) - (a.created_at ?? 0))[0];
        const name = parseGenesisNameFromYaml(latest.content);
        const result = { id, name, type: 'genesis', yaml: latest.content, pubkey: latest.pubkey };
        
        // Bei Genesis ist der Content direkt der YAML-Text, also setzen wir originalYaml = yaml
        result.originalYaml = latest.content;
        
        return result;
      }
      // Falls keine Genesis: prüfe Patch 30312 (nimmt id als Ziel)
      const patches = await this.get({ kinds: [30312] }).catch(() => []);
      // Patch-Content: JSON { action, target, id, payload }
      const matched = (patches || []).filter(e => {
        try {
          const p = JSON.parse(e.content);
          return p && p.id === id && typeof p.payload === 'string';
        } catch { return false; }
      });
      if (matched.length) {
        const latest = matched.sort((a,b) => (b.created_at ?? 0) - (a.created_at ?? 0))[0];
        let name = '';
        const patchContent = JSON.parse(latest.content);
        try { name = parseGenesisNameFromYaml(patchContent.payload); } catch {}
        const result = { id, name, type: 'patch', yaml: patchContent.payload, pubkey: latest.pubkey };
        
        // Bei Patch ist der payload direkt der YAML-Text, also setzen wir originalYaml = payload
        result.originalYaml = patchContent.payload;
        
        return result;
      }
      return null;
    },

    // API: searchWorlds(query) → [{ id, name, type, yaml? }]
    async searchWorlds(query) {
      const q = String(query || '').trim().toLowerCase();
      if (!q) return [];
      // Hole lokal verfügbare Genesis und Patches und filtere clientseitig
      const evts = await this.get({ kinds: [30311, 30312] }).catch(() => []);
      const results = [];
      for (const e of evts) {
        if (e.kind === 30311) {
          const d = (e.tags || []).find(t => t[0] === 'd')?.[1] || '';
          let name = '';
          try { name = parseGenesisNameFromYaml(e.content); } catch {}
          const hit = (d && d.toLowerCase().includes(q)) || (name && name.toLowerCase().includes(q));
          if (hit) results.push({ id: d, name: name || '(ohne Name)', type: 'genesis' });
        } else if (e.kind === 30312) {
          try {
            const p = JSON.parse(e.content);
            const d = p?.id || '';
            let name = '';
            try { name = parseGenesisNameFromYaml(p.payload); } catch {}
            const hit = (d && d.toLowerCase().includes(q)) || (name && name.toLowerCase().includes(q));
            if (hit) results.push({ id: d, name: name || '(ohne Name)', type: 'patch' });
          } catch {}
        }
      }
      // Gruppieren nach id+type, jeweils jüngstes bevorzugen wäre möglich; hier einfache Dedup
      const seen = new Set();
      const dedup = [];
      for (const r of results) {
        const key = `${r.type}:${r.id}`;
        if (!seen.has(key)) { seen.add(key); dedup.push(r); }
      }
      return dedup;
    },

    // API: saveOrUpdate({ id, name, type, yaml, originalYaml?, pubkey })
    async saveOrUpdate({ id, name, type, yaml, originalYaml, pubkey }) {
      if (!id || !type || !yaml || !pubkey) throw new Error('Ungültige Parameter für saveOrUpdate');
      const now = Math.floor(Date.now() / 1000);

      if (type === 'genesis') {
        // Prüfe vorhandene Genesis mit gleicher d=id
        const existing = await this.getById(id);
        if (existing && existing.type === 'genesis') {
          if (existing.pubkey !== pubkey) {
            const err = new Error('Keine Update-Rechte für diese worldId');
            err.code = 'AUTH';
            throw err;
          }
        }
        
        // Speichere den YAML-Content direkt als String im Event-Content
        // Wenn originalYaml vorhanden ist, verwende es, sonst den yaml-Parameter
        const contentToSave = originalYaml || yaml;
        
        // Signiere und speichere replaceable Genesis (30311) mit Tags ['d', id]
        const tags = [['d', id]];
        // optional 'a' Tag analog bestehendem Code nicht zwingend hier
        const draft = { kind: 30311, created_at: now, tags, content: contentToSave, pubkey };
        const evt = await this.ensureSigned(draft);
        await this.publish(evt);
        return { ok: true, id, kind: 30311, eventId: evt.id };
      }

      if (type === 'patch') {
        // Patch: 30312, content JSON mit payload
        // Verwende originalYaml falls vorhanden, sonst yaml
        const payloadToSave = originalYaml || yaml;
        
        const payload = { action: 'update', target: 'world', id, payload: payloadToSave };
        const draft = { kind: 30312, created_at: now, tags: [], content: JSON.stringify(payload), pubkey };
        const evt = await this.ensureSigned(draft);
        await this.publish(evt);
        return { ok: true, id, kind: 30312, eventId: evt.id };
      }

      throw new Error('Unbekannter Typ in saveOrUpdate');
    },

    // Small helpers for common filters
    filterForWorldATag(aTag, kinds) {
      const f = { kinds, '#a': [aTag] };
      return f;
    }
  };
}

export async function getNostrService() {
  if (_service) return _service;

  if (APP_MODE === 'development') {
    const { DexieNostrService } = await import('./providers/dexie-nostr-service.js');
    const svc = new DexieNostrService();
    _service = wrapInterface(svc);
    console.log('[nostr] DexieNostrService aktiv (development).');
    return _service;
  } else {
    // Placeholder Relay provider (to be implemented)
    const { RelayNostrService } = await import('./providers/relay-nostr-service.js').catch(() => ({ RelayNostrService: class {
      constructor() { throw new Error('RelayNostrService noch nicht implementiert'); }
    }}));
    const identity = await getIdentity();
    const svc = new RelayNostrService(RELAYS, identity);
    _service = wrapInterface(svc);
    console.log('[nostr] RelayNostrService aktiv (production).');
    return _service;
  }
}