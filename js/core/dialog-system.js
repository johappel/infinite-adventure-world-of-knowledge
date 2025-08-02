import { worldStore, createEvent, EVENT_KINDS } from './event-store.js';
import { seededRng, pick } from '../utils/random.js';

export class DialogSystem {
  constructor() {
    this.dialogBody = document.getElementById('dialogBody');
    this.activeNPC = document.getElementById('activeNPC');
    this.currentNPC = null;
  }

  openDialog(npc) {
    this.currentNPC = npc;
    this.activeNPC.textContent = npc.userData.name + ' ('+npc.userData.role+')';
    this.addBubble('npc', this.synthGreeting(npc));
    this.suggestOptions(npc);
    
    // persist persona presence if not logged
    const evt = createEvent(EVENT_KINDS.PERSONA, 
      { name: npc.userData.name, role: npc.userData.role, zone: npc.userData.zoneId }, 
      [['zone', npc.userData.zoneId], ['persona', npc.userData.id]]
    );
    worldStore.add(evt);
  }

  synthGreeting(npc) {
    const lines = {
      Forscher: [
        'Willkommen, Entdecker. Möchtest du eine Hypothese prüfen oder ein neues Portal kartieren?',
        'Ich habe hier Datenpunkte gesammelt. Interessiert an einer kleinen Expedition?'
      ],
      Lehrer: [
        'Schön, dass du da bist. Soll ich dir die Grundlagen dieser Zone strukturieren?',
        'Lernen wir gemeinsam: Möchtest du ein Beispiel, eine Aufgabe oder direkt ein Portal?'
      ],
      Magier: [
        'Die Schleier sind dünn heute. Ein Portal könnte sich öffnen, wenn du fragst.',
        'Wissen ist ein Ritual. Welche Perspektive beschwörst du?'
      ],
      Schüler: [
        'Ich habe etwas entdeckt, kann es aber nicht einordnen. Hilfst du mir?',
        'Sollen wir gemeinsam Notizen vergleichen und Spuren legen?'
      ]
    };
    const arr = lines[npc.userData.role] || ['Hallo!'];
    return arr[Math.floor(Math.random()*arr.length)];
  }

  suggestOptions(npc) {
    const opts = [
      { key:'A', text:'Neues Portal zu verwandter Zone' },
      { key:'B', text:'Kurzüberblick (Markdown) der Zone' },
      { key:'C', text:'Lokale Mini-Quest erzeugen' }
    ];
    const wrap = document.createElement('div');
    wrap.className='bubble npc';
    wrap.innerHTML = 'Optionen: ' + opts.map(o=>`<span class="kbd">${o.key}</span> ${o.text}`).join(' • ');
    this.dialogBody.appendChild(wrap);
    this.dialogBody.scrollTop = this.dialogBody.scrollHeight;
    
    // hint UI keys
    const input = document.getElementById('userInput');
    input.placeholder = 'Tippe A, B oder C …';
  }

  addBubble(who, text) {
    const div = document.createElement('div');
    div.className = 'bubble ' + (who==='user'?'user':'npc');
    div.textContent = text;
    this.dialogBody.appendChild(div);
    this.dialogBody.scrollTop = this.dialogBody.scrollHeight;
  }

  handleUserMessage(text, currentZoneId, onPortalLink, onZoneDescription) {
    if(!text.trim()) return;
    this.addBubble('user', text);
    const upper = text.trim().toUpperCase();
    
    // simple command options
    if(this.currentNPC){
      if(upper==='A'){
        const newId = crypto.randomUUID().split('-')[0];
        if(onPortalLink) onPortalLink(currentZoneId, newId);
        this.addBubble('npc', 'Ich habe ein Portal markiert. Gehe darauf zu und drücke E, um zu wechseln.');
        
        // trace
        const evt = createEvent(EVENT_KINDS.DIALOG, 
          { npc: this.currentNPC.userData.name, text: 'Portalvorschlag: '+newId }, 
          [['zone', currentZoneId]]
        );
        worldStore.add(evt);
        return;
      } else if(upper==='B'){
        if(onZoneDescription) {
          const description = onZoneDescription(currentZoneId);
          this.addBubble('npc', description || 'Keine Beschreibung gefunden.');
        }
        const evt = createEvent(EVENT_KINDS.DIALOG, 
          { npc: this.currentNPC.userData.name, text: 'Kurzüberblick geteilt' }, 
          [['zone', currentZoneId]]
        );
        worldStore.add(evt);
        return;
      } else if(upper==='C'){
        const quest = this.synthQuest(currentZoneId);
        this.addBubble('npc', 'Mini-Quest: '+quest.title+' – '+quest.hint);
        const evt = createEvent(EVENT_KINDS.DIALOG, 
          { npc: this.currentNPC.userData.name, text: 'Quest erzeugt: '+quest.title }, 
          [['zone', currentZoneId]]
        );
        worldStore.add(evt);
        return;
      }
    }
    
    // generic echo with persona style
    this.addBubble('npc', 'Interessant. Möchtest du A, B oder C wählen?');
    const evt = createEvent(EVENT_KINDS.DIALOG, { text: 'User: '+text }, [['zone', currentZoneId]]);
    worldStore.add(evt);
  }

  synthQuest(zoneId) {
    const rng = seededRng(zoneId+'quest'+Math.floor(Math.random()*999));
    const actions = ['Vergleiche','Finde','Ordne','Skizziere','Erkläre'];
    const targets = ['zwei Begriffe','ein Artefakt','ein Zitat','ein Muster','eine Regel'];
    return {
      title: pick(rng, actions)+' '+pick(rng, targets),
      hint: 'Interagiere mit einer Persona und notiere eine Spur.'
    };
  }

  clear() {
    this.dialogBody.innerHTML = '';
    this.activeNPC.textContent = 'Niemand';
    this.currentNPC = null;
  }
}
