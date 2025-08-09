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
        // Extrahiere die World ID aus den Tags
        const worldId = this._extractWorldIdFromTags(event.tags);
        
        if (worldId) {
          // Prüfe, ob bereits ein Event mit dieser World ID in den Tags existiert
          const allEvents = await this.db.events.toArray();
          const existingEvent = allEvents.find(e => {
            const tags = e.tags || [];
            return tags.some(tag => tag === `d:${worldId}`);
          });
          
          if (existingEvent) {
            // Event existiert bereits - aktualisiere es
            // Erstelle ein aktualisiertes Event-Objekt
            const updatedEvent = {
              eventId: existingEvent.eventId, // Behalte die ursprüngliche Event ID bei
              pubkey: event.pubkey,
              kind: event.kind,
              created_at: event.created_at,
              content: event.content,
              sig: event.sig,
              tags: (event.tags || []).map(normalizeTagEntry)
            };
            
            // Aktualisiere das Event in der Datenbank
            await this.db.events.update(existingEvent.id, updatedEvent);
          } else {
            // Event existiert nicht - erstelle ein neues
            await this.db.events.add({
              eventId: event.id,
              pubkey: event.pubkey,
              kind: event.kind,
              created_at: event.created_at,
              content: event.content,
              sig: event.sig,
              tags: (event.tags || []).map(normalizeTagEntry)
            });
          }
        } else {
          // Keine World ID gefunden - erstelle ein neues Event
          await this.db.events.add({
            eventId: event.id,
            pubkey: event.pubkey,
            kind: event.kind,
            created_at: event.created_at,
            content: event.content,
            sig: event.sig,
            tags: (event.tags || []).map(normalizeTagEntry)
          });
        }
      } catch (e) {
        console.error('Fehler beim Veröffentlichen des Events:', e);
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

  async getById(id) {
    // Liefert ein einzelnes Event anhand der World ID in den Tags
    try {
      // Prüfe, ob bereits ein Event mit dieser World ID in den Tags existiert
      const allEvents = await this.db.events.toArray();
      const row = allEvents.find(event => {
        const tags = event.tags || [];
        return tags.some(tag => tag === `d:${id}`);
      });
      
      if (!row) {
        return null;
      }
      
      const event = this._dbToEvent(row);
      
      // Prüfe, ob originalYaml im Content gespeichert ist und füge es hinzu
      try {
        const content = JSON.parse(row.content);
        if (content.originalYaml) {
          event.originalYaml = content.originalYaml;
        }
      } catch (e) {
        // Ignoriere JSON-Parse-Fehler
      }
      
      return event;
    } catch (error) {
      console.error('Fehler beim Laden des Events:', error);
      throw error;
    }
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

  async saveOrUpdate(payload) {
    // Speichert oder aktualisiert ein Event basierend auf der World ID in den Tags
    // Wird von patchkit-wiring.js für Genesis und Patches verwendet
    try {
      const { id, name, type, yaml, originalYaml, pubkey } = payload;
      
      // Prüfe, ob bereits ein Event mit dieser World ID in den Tags existiert
      const allEvents = await this.db.events.toArray();
      const existingEvent = allEvents.find(event => {
        const tags = event.tags || [];
        return tags.some(tag => tag === `d:${id}`);
      });
      
      if (existingEvent) {
        // Event existiert bereits - aktualisiere es
        // Erstelle ein aktualisiertes Event-Objekt
        const updatedEvent = {
          eventId: existingEvent.eventId, // Behalte die ursprüngliche Event ID bei
          pubkey: pubkey || existingEvent.pubkey,
          kind: existingEvent.kind, // Behalte den ursprünglichen Kind bei
          created_at: Math.floor(Date.now() / 1000), // Aktualisiere den Zeitstempel
          content: yaml,
          sig: existingEvent.sig, // Behalte die ursprüngliche Signatur bei
          tags: existingEvent.tags // Behalte die ursprünglichen Tags bei
        };
        
        // Aktualisiere das Event in der Datenbank
        await this.db.events.update(existingEvent.id, updatedEvent);
        
        // Konvertiere das aktualisierte Event zurück in das Nostr-Format
        const event = this._dbToEvent(updatedEvent);
        
        // Füge das originalYaml-Feld hinzu, falls vorhanden
        if (originalYaml) {
          event.originalYaml = originalYaml;
        }
        
        // Benachrichtige die Abonnenten über die Aktualisierung
        this._notifySubscribers(event);
        
        return event;
      } else {
        // Event existiert nicht - erstelle ein neues
        const kind = type === 'genesis' ? 30311 : 30312;
        
        // Erstelle ein neues Event-Objekt mit der World ID in den Tags
        const newEvent = {
          eventId: id, // Verwende die World ID als Event ID
          pubkey: pubkey,
          kind: kind,
          created_at: Math.floor(Date.now() / 1000),
          content: yaml,
          sig: '', // Leere Signatur für lokale Events
          tags: [`d:${id}`] // Speichere die World ID in den Tags
        };
        
        // Speichere das neue Event in der Datenbank
        await this.db.events.add(newEvent);
        
        // Konvertiere das neue Event zurück in das Nostr-Format
        const event = this._dbToEvent(newEvent);
        
        // Füge das originalYaml-Feld hinzu, falls vorhanden
        if (originalYaml) {
          event.originalYaml = originalYaml;
        }
        
        // Benachrichtige die Abonnenten über das neue Event
        this._notifySubscribers(event);
        
        return event;
      }
    } catch (error) {
      console.error('Fehler beim Speichern/Aktualisieren des Events:', error);
      throw error;
    }
  }

  // Hilfsmethode zum Extrahieren der World ID aus den Tags
  _extractWorldIdFromTags(tags) {
    if (!Array.isArray(tags)) return null;
    
    // Suche nach einem Tag mit dem Format ['d', 'worldId']
    for (const tag of tags) {
      if (Array.isArray(tag) && tag.length >= 2 && tag[0] === 'd') {
        return tag[1];
      }
    }
    
    return null;
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