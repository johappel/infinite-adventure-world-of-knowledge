// Simple "Nostr-like" local event store (persisted to localStorage)
const STORE_KEY = 'wisdom_world_events_v1';

export const worldStore = {
  events: [],
  
  load(){
    try{ 
      this.events = JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); 
    }
    catch(e){ 
      this.events = []; 
    }
  },
  
  save(){ 
    localStorage.setItem(STORE_KEY, JSON.stringify(this.events)); 
  },
  
  add(evt, logCallback, refreshCallback){
    this.events.push(evt);
    this.save();
    if(logCallback) {
      logCallback(`[${evt.kind}] ${evt.content?.title||evt.content?.text||'Event'} (${evt.id.slice(0,8)})`);
    }
    if(refreshCallback) {
      refreshCallback();
    }
  },
  
  byKind(kind){ 
    return this.events.filter(e=>e.kind===kind); 
  },
  
  latestByTag(kind, tag, value){
    const list = this.events.filter(e=>e.kind===kind && e.tags?.some(t=>t[0]===tag && t[1]===value));
    return list.length? list[list.length-1] : null;
  }
};

// Event creation helper mimicking Nostr structure
export function createEvent(kind, content, tags=[]){
  const id = crypto.randomUUID();
  const created_at = Math.floor(Date.now()/1000);
  return { id, kind, created_at, content, tags };
}

// Event kind constants
export const EVENT_KINDS = {
  ZONE: 30001,
  PERSONA: 30002,
  DIALOG: 30003,
  PORTAL: 30004,
  TRACE: 30005
};
