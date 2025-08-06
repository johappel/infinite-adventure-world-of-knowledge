/**
 * Utilitys zur Sicherstellung global eindeutiger World-IDs (d-Tag) über alle Autoren/Relays.
 * Ziel: Eine worldId darf nicht doppelt als Parameterized-Key (NIP-33, d=worldId) existieren.
 * Strategie:
 *  - Prüfe zuerst exakt die d=worldId gegen alle bekannten Autoren (bzw. ohne Autorenbindung),
 *    indem wir nach kind 30311 und "#d": [worldId] filtern (Relay-seitig wird "#d" unterstützt).
 *  - Falls Kollision, hänge einen Suffix an: "-<short>" und prüfe erneut (max. Versuche).
 */

function shortId() {
  try {
    return crypto.randomUUID().split('-')[0];
  } catch {
    return Math.random().toString(36).slice(2, 8);
  }
}

/**
 * Ermittelt eine weltweit eindeutige worldId (d-Tag) über den gegebenen nostrService.
 * Achtung: Benötigt einen Provider, der Filter mit "#d" unterstützt (nostr-tools/Relays).
 * Für DexieNostrService: Wir prüfen lokal gespeicherte Genesis-Events auf ["d", id] Tag.
 *
 * @param {object} nostrService - Service aus nostr-service-factory (mit get()).
 * @param {string} desiredId - Wunsch-ID (Basis).
 * @param {object} [opts]
 * @param {number} [opts.maxTries=10] - wie viele Suffix-Versuche
 * @returns {Promise<string>} - eindeutige worldId
 */
export async function ensureUniqueWorldId(nostrService, desiredId, opts = {}) {
  const maxTries = opts.maxTries ?? 10;
  let base = sanitizeId(desiredId || 'world');
  let candidate = base;

  for (let i = 0; i < maxTries; i++) {
    const exists = await worldIdExists(nostrService, candidate);
    if (!exists) return candidate;
    candidate = `${base}-${shortId()}`;
  }
  // Fallback: hart eindeutiger Kandidat
  return `${base}-${shortId()}`;
}

/**
 * Prüft, ob eine worldId bereits belegt ist (d-Tag = worldId) für kind 30311 (Genesis).
 * - RelayNostrService: nutzt Filter { kinds:[30311], '#d':[worldId] }.
 * - DexieNostrService: simuliert Filter über tags und durchsucht lokal gespeicherte Events.
 */
export async function worldIdExists(nostrService, worldId) {
  try {
    const filter = { kinds: [30311], '#d': [worldId] };
    const events = await nostrService.get(filter);
    if (Array.isArray(events) && events.length > 0) {
      return true;
    }
    return false;
  } catch {
    // Falls der Provider "#d" nicht versteht, versuchen wir eine breitere Suche und filtern manuell.
    try {
      const broad = await nostrService.get({ kinds: [30311] });
      return (broad || []).some(e => Array.isArray(e.tags) && e.tags.some(t => t[0] === 'd' && t[1] === worldId));
    } catch {
      return false;
    }
  }
}

function sanitizeId(id) {
  const s = String(id || '').trim();
  if (!s) return 'world';
  return s.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
}