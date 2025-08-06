/**
 * RelayNostrService
 * Produktion/Live-Provider auf Basis nostr-tools SimplePool.
 * Erwartet eine Identity mit signEvent(), getPublicKey().
 */
export class RelayNostrService {
  constructor(relayUrls = [], identity) {
    this.relayUrls = relayUrls;
    this.identity = identity;
    this.pool = null;
  }

  async _ensurePool() {
    if (this.pool) return this.pool;
    const { SimplePool } = await import('https://esm.sh/nostr-tools@2.5.1');
    this.pool = new SimplePool();
    return this.pool;
  }

  async publish(event) {
    const pool = await this._ensurePool();
    // event muss signiert sein
    if (!event.id || !event.sig) {
      if (!this.identity) throw new Error('Keine Identity zum Signieren vorhanden.');
      event = await this.identity.signEvent({
        kind: event.kind,
        created_at: event.created_at ?? Math.floor(Date.now() / 1000),
        tags: event.tags ?? [],
        content: event.content ?? '',
        pubkey: event.pubkey ?? this.identity.pubkey
      });
    }
    await pool.publish(this.relayUrls, event);
  }

  async get(filter) {
    const pool = await this._ensurePool();
    const evts = await pool.list(this.relayUrls, [filter]);
    // Sortiere chronologisch
    return (evts || []).sort((a, b) => (a.created_at ?? 0) - (b.created_at ?? 0));
  }

  subscribe(filter) {
    // Liefert AsyncIterable über SimplePool.sub
    const self = this;
    const iterable = {
      [Symbol.asyncIterator]() {
        let sub = null;
        const queue = [];
        let resolver = null;
        let closed = false;

        const ensureSub = async () => {
          if (sub) return sub;
          const pool = await self._ensurePool();
          sub = pool.sub(self.relayUrls, [filter]);
          sub.on('event', (evt) => {
            queue.push(evt);
            if (resolver) { const r = resolver; resolver = null; r(); }
          });
          sub.on('eose', () => {
            // End of stored events; live continues automatically
          });
          return sub;
        };

        return {
          async next() {
            if (closed) return { done: true, value: undefined };
            await ensureSub();
            if (queue.length > 0) return { done: false, value: queue.shift() };
            await new Promise(res => resolver = res);
            if (closed) return { done: true, value: undefined };
            if (queue.length > 0) return { done: false, value: queue.shift() };
            return { done: false, value: await new Promise(res => { resolver = () => res(queue.shift()); }) };
          },
          async return() {
            closed = true;
            if (sub) sub.unsub();
            return { done: true, value: undefined };
          }
        };
      }
    };
    return iterable;
  }

  unsubscribe(subscription) {
    // Bei diesem AsyncIterator-Design unsub via return()
    // subscription.return?.(); // Aufrufer kann den Iterator schließen
  }
}