import { APP_MODE, RELAYS, IDENTITY_STRATEGY } from './config.js';

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