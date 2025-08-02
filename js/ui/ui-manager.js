import { worldStore, EVENT_KINDS } from './event-store.js';

export class UIManager {
  constructor() {
    this.logEl = document.getElementById('log');
    this.loadingEl = document.getElementById('loading');
  }

  appendLog(line) {
    const time = new Date().toLocaleTimeString();
    const d = document.createElement('div');
    d.textContent = `[${time}] ${line}`;
    this.logEl.appendChild(d);
    this.logEl.scrollTop = this.logEl.scrollHeight;
  }

  refreshZonesUI(onZoneSelect, synthZoneTitle) {
    const zonesEl = document.getElementById('zones');
    zonesEl.innerHTML = '';
    const zoneEvents = worldStore.byKind(EVENT_KINDS.ZONE);
    const knownIds = new Set(zoneEvents.flatMap(e=> e.tags?.filter(t=>t[0]==='zone').map(t=>t[1])||[]));
    
    knownIds.forEach(id=>{
      const btn = document.createElement('button');
      btn.className='chip';
      btn.textContent = synthZoneTitle ? synthZoneTitle(id) : id;
      btn.onclick = ()=> {
        if(onZoneSelect) onZoneSelect(id);
      };
      zonesEl.appendChild(btn);
    });
  }

  refreshPersonasUI(currentZone, onPersonaSelect) {
    const box = document.getElementById('personas');
    box.innerHTML = '';
    if(!currentZone) return;
    
    currentZone.personas.forEach(n=>{
      const b = document.createElement('button');
      b.className='chip';
      b.textContent = n.userData.name + ' • ' + n.userData.role;
      b.onclick = ()=> {
        if(onPersonaSelect) onPersonaSelect(n);
      };
      box.appendChild(b);
    });
  }

  withLoading(fn) {
    this.loadingEl.style.display = 'flex';
    setTimeout(()=>{
      try{ 
        fn(); 
      } finally { 
        this.loadingEl.style.display = 'none'; 
      }
    }, 250);
  }

  setupControls(callbacks) {
    // New Zone Button
    document.getElementById('newZoneBtn').onclick = ()=> {
      this.withLoading(()=>{
        if(callbacks.onNewZone) {
          const persona = document.getElementById('personaSelect').value;
          const id = crypto.randomUUID().split('-')[0];
          callbacks.onNewZone(id, persona);
        }
      });
    };

    // Portal Button
    document.getElementById('portalBtn').onclick = ()=> {
      this.withLoading(()=>{
        if(callbacks.onNewPortal) {
          callbacks.onNewPortal();
        }
      });
    };

    // Persona Select
    document.getElementById('personaSelect').onchange = (e)=>{
      document.getElementById('personaHUD').textContent = 'Persona: '+e.target.value;
    };

    // Reset Button
    document.getElementById('resetBtn').onclick = ()=>{
      if(callbacks.onReset) {
        callbacks.onReset();
      }
    };

    // Dialog Send Button
    document.getElementById('sendBtn').onclick = ()=>{
      const inp = document.getElementById('userInput');
      if(callbacks.onMessage) {
        callbacks.onMessage(inp.value);
      }
      inp.value='';
    };

    // Dialog Input Events
    document.getElementById('userInput').addEventListener('keydown', (e)=>{
      // Verhindern dass E-Taste Interaktion auslöst während Tippen
      e.stopPropagation();
      
      if(e.key==='Enter'){ 
        e.preventDefault(); 
        document.getElementById('sendBtn').click(); 
      }
      if(['a','b','c'].includes(e.key.toLowerCase())){
        // quick fill
        e.preventDefault();
        if(callbacks.onMessage) {
          callbacks.onMessage(e.key.toUpperCase());
        }
      }
    });
  }

  clearAll() {
    this.refreshZonesUI();
    document.getElementById('zones').innerHTML = '';
    document.getElementById('personas').innerHTML = '';
    document.getElementById('zoneName').textContent = 'Zone: —';
  }
}
