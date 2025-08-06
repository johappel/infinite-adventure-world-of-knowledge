export const APP_MODE = 'development'; // 'development' | 'production'
export const RELAYS = [
  'wss://relay.damus.io',
  'wss://nostr.wine'
];

// Identity strategy Option A:
// - Prefer NIP-07 if available (window.nostr)
// - Fallback to locally stored/generated nsec (for dev)
export const IDENTITY_STRATEGY = 'nip07_with_local_fallback';

// Router v1: use simple worldId parameters; naddr support will be added later
export const ROUTER_MODE = 'worldId_v1';