/**
 * DexieNostrService
 * Entwicklung/Offline-Provider, der Nostr-ähnliche Events lokal persistiert und Subscriptions simuliert.
 * Speichert persistente Events (z.B. 0, 30311, 30312, 30313); ephemere (20000-29999) werden nicht gespeichert,
 * aber live an Abonnenten zugestellt.
 */
import Dexie from 'https://esm.sh/dexie@4.0.8';

function normalizeTagEntry(tag) {
  // Speichere Tags als "k:v" für Index-Suche (z.B. "a:30311:pub:worldid")
  if (!Array.isArray(tag) || tag.length === 0) return '';
  const k = String(tag[0] ?? '');
  const v = String(tag[1] ?? '');
  return `${k}:${v}`;
}

export class DexieNostrService {
  constructor(dbName = 'NostrLocalDatabase_v1') {
    this.db = new Dexie(dbName);
    this.db.version(1).stores({
      events: '++id,&eventId,pubkey,kind,created_at,*tags'
    });
    this.liveSubscriptions = new Map(); // subId -> callback(event)
  }

  async publish(event) {
    // Ephemeral kinds (20k-29k) nicht persistieren
    const isEphemeral = event.kind >= 20000 && event.kind < 30000;

    if (!isEphemeral) {
      try {
        await this.db.events.add({
          eventId: event.id,
          pubkey: event.pubkey,
          kind: event.kind,
          created_at: event.created_at,
          content: event.content,
          sig: event.sig,
          tags: (event.tags || []).map(normalizeTagEntry)
        });
      } catch (e) {
        // Duplikate ignorieren
      }
    }

    // Live-Abonnenten benachrichtigen
    this._notifySubscribers(event);
  }

  async get(filter) {
    // Liefert eine Liste historischer Events, die dem Filter entsprechen.
    const col = this._query(filter);
    const rows = await col.sortBy('created_at');
    return rows.map(r => this._dbToEvent(r));
  }

  subscribe(filter) {
    // Asynchroner Iterator über historische + live Events
    const self = this;
    const subId = crypto.randomUUID();
    const queue = [];
    let liveResolver = null;
    let closed = false;

    // Historische Events vorab abrufen
    let primed = false;
    (async () => {
      const hist = await self.get(filter);
      hist.forEach(evt => queue.push(evt));
      primed = true;
      if (liveResolver) { const r = liveResolver; liveResolver = null; r(); }
    })();

    const onEvent = (evt) => {
      if (self._matches(evt, filter)) {
        queue.push(evt);
        if (liveResolver) { const r = liveResolver; liveResolver = null; r(); }
      }
    };
    this.liveSubscriptions.set(subId, onEvent);

    const asyncIterable = {
      [Symbol.asyncIterator]() {
        return {
          async next() {
            if (closed) return { done: true, value: undefined };
            if (queue.length > 0) return { done: false, value: queue.shift() };
            // Warten auf nächstes Event oder priming
            await new Promise(res => liveResolver = res);
            if (closed) return { done: true, value: undefined };
            if (queue.length > 0) return { done: false, value: queue.shift() };
            return { done: false, value: await new Promise(res => { liveResolver = () => res(queue.shift()); }) };
          },
          async return() {
            closed = true;
            self.liveSubscriptions.delete(subId);
            return { done: true, value: undefined };
          }
        };
      }
    };
    // Rückgabe ist AsyncIterable
    return asyncIterable;
  }

  unsubscribe(subscription) {
    // Wenn Iterator via return() beendet, räumen wir bereits auf.
    // Optional: explizites Unsubscribe, falls wir subId hätten. Hier no-op.
  }

  // ---------------- Interna ----------------

  _query(filter) {
    // Unterstützt: kinds, authors, since/until, limit, tags via 'a','e','p', generisch über filter.#a,...
    let col = this.db.events.orderBy('created_at');

    const clauses = [];

    if (Array.isArray(filter.kinds) && filter.kinds.length) {
      clauses.push(r => filter.kinds.includes(r.kind));
    }
    if (Array.isArray(filter.authors) && filter.authors.length) {
      clauses.push(r => filter.authors.includes(r.pubkey));
    }
    if (typeof filter.since === 'number') {
      clauses.push(r => r.created_at >= filter.since);
    }
    if (typeof filter.until === 'number') {
      clauses.push(r => r.created_at <= filter.until);
    }

    // Tag-Filter wie {"#a": ["30311:pub:worldId"]} etc.
    Object.keys(filter).forEach(k => {
      if (k.startsWith('#')) {
        const tagKey = k.substring(1);
        const vals = Array.isArray(filter[k]) ? filter[k] : [];
        if (vals.length) {
          clauses.push(r => {
            const t = r.tags || [];
            return vals.some(v => t.includes(`${tagKey}:${v}`));
          });
        }
      }
    });

    // Dexie Where + Filter in Memory (da komplexe Tag-Logik):
    return col.filter(r => clauses.every(fn => fn(r)));
  }

  _matches(event, filter) {
    // Prüft Event-Objekt gegen denselben Filter wie _query
    if (Array.isArray(filter.kinds) && filter.kinds.length && !filter.kinds.includes(event.kind)) return false;
    if (Array.isArray(filter.authors) && filter.authors.length && !filter.authors.includes(event.pubkey)) return false;
    if (typeof filter.since === 'number' && event.created_at < filter.since) return false;
    if (typeof filter.until === 'number' && event.created_at > filter.until) return false;

    // Tag-Keys
    if (event.tags) {
      const flat = event.tags.map(normalizeTagEntry);
      for (const key of Object.keys(filter)) {
        if (key.startsWith('#')) {
          const tkey = key.substring(1);
          const vals = Array.isArray(filter[key]) ? filter[key] : [];
          if (vals.length && !vals.some(v => flat.includes(`${tkey}:${v}`))) return false;
        }
      }
    }
    return true;
  }

  _dbToEvent(row) {
    // Rekonstruiere Event-Shape
    return {
      id: row.eventId,
      pubkey: row.pubkey,
      kind: row.kind,
      created_at: row.created_at,
      content: row.content,
      sig: row.sig,
      tags: (row.tags || []).map(s => {
        const i = s.indexOf(':');
        if (i < 0) return [s];
        return [s.slice(0, i), s.slice(1 + i)];
      })
    };
  }

  _notifySubscribers(event) {
    for (const cb of this.liveSubscriptions.values()) {
      try { cb(event); } catch {}
    }
  }
}