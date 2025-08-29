// This file contains a corrected version of the getById function.
// The rest of the file remains unchanged from your original provided code.

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
    return spec?.metadata?.name || '';
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
      
      // Suche nach Events mit d-Tag = id (sowohl World als auch Patch Events)
      const filter = { kinds: [30311, 30312], '#d': [id] };
      const events = await this.get(filter).catch(() => []);
      
      if (events && events.length) {
        // Sortiere nach created_at (neueste zuerst)
        const sortedEvents = events.sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
        
        for (const event of sortedEvents) {
          // Extrahiere Typ aus Tags
          const typeTag = event.tags?.find(t => t[0] === 'type');
          const eventType = typeTag?.[1] || (event.kind === 30311 ? 'world' : 'patch');
          
          // Extrahiere Name aus Tags oder Content
          const nameTag = event.tags?.find(t => t[0] === 'name');
          let name = nameTag?.[1] || '';
          
          let yamlContent = '';
          let originalYamlContent = '';
          
          if (eventType === 'world' && event.kind === 30311) {
            // World Event: Content ist direkt YAML
            yamlContent = event.content;
            originalYamlContent = event.content;
            if (!name) {
              try { name = parseGenesisNameFromYaml(event.content); } catch {}
            }
          }
          else if (eventType === 'patch' && event.kind === 30312) {
            // Patch Event: Content ist JSON mit payload
            try {
              const patchContent = JSON.parse(event.content);
              yamlContent = patchContent.payload;
              originalYamlContent = patchContent.payload;
              if (!name) {
                try { name = parseGenesisNameFromYaml(patchContent.payload); } catch {}
              }
            } catch {
              continue; // Ungültiges JSON, überspringe
            }
          }
          
          const result = {
            id,
            name,
            type: eventType,
            yaml: yamlContent,
            originalYaml: originalYamlContent,
            pubkey: event.pubkey
          };
          
          return result;
        }
      }
      
      // Fallback: Suche ohne Tag-Filter für Dexie-Kompatibilität
      const broad = await this.get({ kinds: [30311, 30312] }).catch(() => []);
      const filteredEvents = (broad || []).filter(e => {
        // Prüfe d-Tag in Tags-Array
        const hasDTag = Array.isArray(e.tags) && e.tags.some(t => t[0] === 'd' && t[1] === id);
        
        // Für Patches: Prüfe zusätzlich target-Tag
        const hasTargetTag = Array.isArray(e.tags) && e.tags.some(t => t[0] === 'target' && t[1] === id);
        
        return hasDTag || hasTargetTag;
      });
      
      if (filteredEvents.length) {
        const latest = filteredEvents.sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0))[0];
        
        const typeTag = latest.tags?.find(t => t[0] === 'type');
        const eventType = typeTag?.[1] || (latest.kind === 30311 ? 'world' : 'patch');
        
        const nameTag = latest.tags?.find(t => t[0] === 'name');
        let name = nameTag?.[1] || '';
        
        let yamlContent = '';
        let originalYamlContent = '';
        
        if (eventType === 'world') {
          yamlContent = latest.content;
          originalYamlContent = latest.content;
          if (!name) {
            try { name = parseGenesisNameFromYaml(latest.content); } catch {}
          }
        } else {
          try {
            const patchContent = JSON.parse(latest.content);
            yamlContent = patchContent.payload;
            originalYamlContent = patchContent.payload;
            if (!name) {
              try { name = parseGenesisNameFromYaml(patchContent.payload); } catch {}
            }
          } catch {
            return null; // Ungültiges JSON
          }
        }
        
        const result = {
          id,
          name,
          type: eventType,
          yaml: yamlContent,
          originalYaml: originalYamlContent,
          pubkey: latest.pubkey
        };
        
        return result;
      }
      
      return null;
    },

    // API: searchWorlds(query) → [{ id, name, type, yaml? }]
    async searchWorlds(query) {
      const q = String(query || '').trim().toLowerCase();
      if (!q) return [];
      
      // Suche in World- und Patch-Events
      const evts = await this.get({ kinds: [30311, 30312] }).catch(() => []);
      const results = [];
      
      for (const e of evts) {
        // Extrahiere Typ aus Tags oder leite aus Kind ab
        const typeTag = e.tags?.find(t => t[0] === 'type');
        const eventType = typeTag?.[1] || (e.kind === 30311 ? 'world' : 'patch');
        
        // Extrahiere ID aus d-Tag
        const dTag = e.tags?.find(t => t[0] === 'd');
        const id = dTag?.[1] || '';
        
        // Extrahiere Name aus name-Tag oder Content
        const nameTag = e.tags?.find(t => t[0] === 'name');
        let name = nameTag?.[1] || '';
        
        let contentForSearch = '';
        
        if (eventType === 'world') {
          contentForSearch = e.content;
          if (!name) {
            try { name = parseGenesisNameFromYaml(e.content); } catch {}
          }
        } else {
          try {
            const patchContent = JSON.parse(e.content);
            contentForSearch = patchContent.payload;
            if (!name) {
              try { name = parseGenesisNameFromYaml(patchContent.payload); } catch {}
            }
          } catch {
            continue; // Ungültiges JSON, überspringe
          }
        }
        
        // Prüfe auf Treffer in ID, Name oder Content
        const hit = (id && id.toLowerCase().includes(q)) ||
                   (name && name.toLowerCase().includes(q)) ||
                   (contentForSearch && contentForSearch.toLowerCase().includes(q));
        
        if (hit) {
          results.push({
            id: id,
            name: name || '(ohne Name)',
            type: eventType
          });
        }
      }
      
      // Deduplizieren nach ID und Type
      const seen = new Set();
      const dedup = [];
      for (const r of results) {
        const key = `${r.type}:${r.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          dedup.push(r);
        }
      }
      
      return dedup;
    },

    // API: saveOrUpdate({ id, name, type, yaml, originalYaml?, pubkey })
    async saveOrUpdate({ id, name, type, yaml, originalYaml, pubkey }) {
      if (!id || !type || !yaml || !pubkey) throw new Error('Ungültige Parameter für saveOrUpdate');
      const now = Math.floor(Date.now() / 1000);

      console.log('[nostr] saveOrUpdate', { id, type, yaml, originalYaml, pubkey });

      if (type === 'genesis') {
        // In Development-Modus: Delegiere an den Dexie-Service für korrekte Update-Logik
        if (APP_MODE === 'development') {
          console.log('[DEBUG factory saveOrUpdate] Delegiere an Dexie-Service für Genesis-Update');
          return serviceImpl.saveOrUpdate({ id, name, type, yaml, originalYaml, pubkey });
        }
        
        // Für Production: Original-Logik mit Relay-Service
        // Prüfe vorhandene Genesis mit gleicher d=id
        const existing = await this.getById(id);
        if (existing && existing.type === 'genesis') {
          if (existing.pubkey !== pubkey) {
            const err = new Error('Keine Update-Rechte für diese worldId');
            err.code = 'AUTH';
            throw err;
          }
        }
        
        // Verwende originalYaml falls vorhanden, sonst yaml
        const contentToSave = originalYaml || yaml;
        
        // Tags für World-Events: d, type, name
        const tags = [
          ['d', id],
          ['type', 'world']
        ];
        if (name) {
          tags.push(['name', name]);
        }
        
        // Content immer als JSON-String für Konsistenz
        const draft = {
          kind: 30311,
          created_at: now,
          tags,
          content: contentToSave, // Bleibt YAML-String für Abwärtskompatibilität
          pubkey
        };
        const evt = await this.ensureSigned(draft);
        await this.publish(evt);
        return { ok: true, id, kind: 30311, eventId: evt.id };
      }
  
      if (type === 'patch') {
        // In Development-Modus: Delegiere an den Dexie-Service für korrekte Update-Logik
        if (APP_MODE === 'development') {
          console.log('[DEBUG factory saveOrUpdate] Delegiere an Dexie-Service für Patch-Update');
          return serviceImpl.saveOrUpdate({ id, name, type, yaml, originalYaml, pubkey });
        }
        
        // Für Production: Original-Logik mit Relay-Service
        // Verwende originalYaml falls vorhanden, sonst yaml
        const payloadToSave = originalYaml || yaml;
        
        // Extrahiere Patch-ID aus dem YAML-Content, falls vorhanden
        let patchId;
        try {
          const contentObj = JSON.parse(yaml);
          patchId = contentObj.metadata?.id || contentObj.id;
          console.log('[DEBUG factory saveOrUpdate] Patch-ID aus YAML extrahiert:', patchId);
        } catch {
          // Content ist kein JSON
        }
        
        // Falls keine Patch-ID gefunden, verwende die übergebene ID (World-ID als Fallback)
        if (!patchId) {
          patchId = id;
          console.log('[DEBUG factory saveOrUpdate] Verwende World-ID als Fallback:', patchId);
        }
        
        console.log('[DEBUG factory saveOrUpdate] Finale Patch-ID für Tags:', patchId);
        
        // Tags für Patch-Events: d (Patch-ID), type, target (World-ID), name
        const tags = [
          ['d', patchId],        // Eigene eindeutige Patch-ID
          ['type', 'patch'],
          ['target', id]         // target ist die World-ID, auf die sich der Patch bezieht
        ];
        if (name) {
          tags.push(['name', name]);
        }
        
        // Content als JSON-String mit einheitlicher Struktur
        const payload = {
          action: 'update',
          target: 'world',
          id: patchId,           // Verwende die Patch-ID im Payload
          target_world: id,      // Speichere die Ziel-World-ID separat
          payload: payloadToSave
        };
        const draft = {
          kind: 30312,
          created_at: now,
          tags,
          content: JSON.stringify(payload),
          pubkey
        };
        const evt = await this.ensureSigned(draft);
        await this.publish(evt);
        return { ok: true, id: patchId, kind: 30312, eventId: evt.id };
      }
  
      throw new Error('Unbekannter Typ in saveOrUpdate');
    },
    

    // Delete-Funktion: löscht alle Patches einer Welt (oder sendet eine Lösch-Anweisung)
    // Implementierung:
    // - Wenn der konkrete Provider eine deleteById(id) Methode hat, rufe sie.
    // - Sonst: publiziere ein 30313-Event mit action='delete' im Content (lokale Konvention).
    async deleteById(id) {
      if (!id) throw new Error('missing id for deleteById');
      // If provider implements deleteById, delegate
      if (typeof serviceImpl.deleteById === 'function') {
        return serviceImpl.deleteById(id);
      }
      // Fallback: publish a delete notice (kind 30313)
      const now = Math.floor(Date.now() / 1000);
      const payload = { action: 'delete', id };
      const draft = { kind: 30313, created_at: now, tags: [['d', id]], content: JSON.stringify(payload), pubkey: (await getIdentity()).pubkey };
      const evt = await this.ensureSigned(draft);
      await this.publish(evt);
      return { ok: true, id, kind: 30313, eventId: evt.id };
    },
 
    // Löscht ein einzelnes Patch-Event anhand seiner Patch-ID (metadata.id oder eventId).
    // Delegiert an den Provider falls implementiert, sonst publiziert eine 30313-Lösch-Notiz für das Patch.
    async deletePatch(patchId) {
      if (!patchId) throw new Error('missing patchId for deletePatch');
      if (typeof serviceImpl.deletePatch === 'function') {
        return serviceImpl.deletePatch(patchId);
      }
      // Fallback: publiziere Lösch-Notice für Patch (kind 30313)
      const now = Math.floor(Date.now() / 1000);
      const payload = { action: 'delete', target: 'patch', patchId };
      const draft = { kind: 30313, created_at: now, tags: [['d', patchId]], content: JSON.stringify(payload), pubkey: (await getIdentity()).pubkey };
      const evt = await this.ensureSigned(draft);
      await this.publish(evt);
      return { ok: true, patchId, kind: 30313, eventId: evt.id };
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
