import * as THREE from 'three';
import { seededRng, pick } from '../utils/random.js';
import { worldStore, createEvent, EVENT_KINDS } from './event-store.js';
import { WorldLoader } from './world-loader.js';
import { YAMLWorldLoader } from './yaml-world-loader.js';
import { buildZoneFromSpec } from '../world-generation/index.js';

export class ZoneManager {
  constructor(worldRoot) {
    this.worldRoot = worldRoot;
    this.currentZoneId = null;
    this.zoneMeshes = {};
    this.worldLoader = new WorldLoader();
    this.yamlWorldLoader = new YAMLWorldLoader(this);
    this.loadedWorldDocs = new Map();
  }

  generateZone(zoneId, personaHint) {
    const rng = seededRng(zoneId);
    const spec = {
      id: zoneId,
      name: this.synthZoneTitle(zoneId),
      description: this.synthZoneMarkdown(zoneId),
      environment: { skybox: 'clear_day', time_of_day: 0.5, ambient_light: 0.7, sun_intensity: 0.9, skybox_mode: 'cube' },
      terrain: { type: 'hills', texture: 'forest_floor', color: '#4a7c1e', amplitude: 2.5, size: [50,50] },
      objects: [], personas: [], portals: [ { id: 'central', position: [0,1.6,-6], size: [0.9,3.2,0.2], color: '#66ffee' } ]
    };
    const propCount = 20 + Math.floor(rng()*20);
    for(let i=0;i<propCount;i++){
      const r = 2 + rng()*15; const a = rng()*Math.PI*2; const x = Math.cos(a)*r; const z = Math.sin(a)*r;
      spec.objects.push({ type: 'rock', color: `hsl(${Math.floor(rng()*360)} 20% 50%)`, position: [x, 0.2, z], scale: [1, 0.4 + rng()*2.0, 1] });
    }
    const personaRoles = ['Forscher', 'Lehrer', 'Magier', 'Schüler'];
    const personaCount = 2 + Math.floor(rng()*2);
    for(let i=0;i<personaCount;i++){
      const role = personaHint || pick(rng, personaRoles);
      const name = role + ' ' + (['Ava','Noah','Mira','Liam','Yara','Odin','Sofi','Juno'][Math.floor(rng()*8)]);
      const r = 3 + rng()*10; const a = rng()*Math.PI*2; const x = Math.cos(a)*r; const z = Math.sin(a)*r;
      spec.personas.push({ name, role, position: [x,0,z], appearance: { color: `hsl(${Math.floor(rng()*360)} 60% 60%)`, height: 1.6 } });
    }
    const zoneInfo = buildZoneFromSpec(spec, { rng });
    this.worldRoot.add(zoneInfo.group);
    this.zoneMeshes[zoneId] = zoneInfo;
    if(!worldStore.latestByTag(EVENT_KINDS.ZONE, 'zone', zoneId)){
      const evt = createEvent(EVENT_KINDS.ZONE, { title: this.synthZoneTitle(zoneId), description: this.synthZoneMarkdown(zoneId) }, [['zone', zoneId]]);
      worldStore.add(evt);
    }
    return zoneInfo.group;
  }

  synthZoneTitle(zoneId) {
    const rng = seededRng(zoneId);
    const themes = ['Astronomie','Biologie','Geschichte','Philosophie','Mathematik','Kunst','Musik','Theologie','Informatik','Sprachwissenschaft'];
    const forms = ['Garten','Sphäre','Archiv','Observatorium','Werkstatt','Labyrinth','Hain','Agora','Korridor','Nexus'];
    return pick(rng, forms)+' der '+pick(rng, themes);
  }

  synthZoneMarkdown(zoneId) {
    const rng = seededRng(zoneId);
    const hints = [
      'Portale verbinden Perspektiven. Drücke E in der Nähe eines Portals.',
      'Sprich mit Personas für neue Zugänge.',
      'Jede Zone besitzt eigene Logik und lokale Ziele.',
      'Spuren bleiben bestehen: deine Entdeckungen werden vermerkt.',
    ];
    return [
      `# ${this.synthZoneTitle(zoneId)}`,
      '',
      `Diese Zone wird dynamisch beim Betreten erzeugt.`,
      '',
      `Hinweis: ${pick(rng, hints)}`,
      '',
      `- Altersfreigabe: ${Math.random() < 0.2 ? '12+' : 'Freigegeben'}`,
      `- Zugangsbedingung: ${Math.random() < 0.3 ? 'Finde einen Hinweis bei einer Persona' : 'Keine'}`,
    ].join('\n');
  }

  async setCurrentZone(zoneId, personaHint, player, camera) {
    Object.values(this.zoneMeshes).forEach(z=>z.group.visible=false);
    if(!this.zoneMeshes[zoneId]) {
      if (this.isYAMLZone(zoneId)) { await this.loadYAMLZone(zoneId); }
      else { this.generateZone(zoneId, personaHint); }
    }
    this.zoneMeshes[zoneId].group.visible = true;
    this.currentZoneId = zoneId;
    const title = this.synthZoneTitle(zoneId);
    const el = document.getElementById('zoneName'); if(el) el.textContent = 'Zone: ' + title;
    if(player) player.reset();
    if(camera) { camera.reset(); camera.camera.position.set(0,5,8); camera.camera.lookAt(0,1,0); this.worldRoot.parent.userData.__camera = camera.camera; }
    const evt = createEvent(EVENT_KINDS.TRACE, { zone: zoneId, action: 'visit' }, [['zone', zoneId]]);
    worldStore.add(evt);
  }

  async loadYAMLZone(zoneId) {
    try {
      const yamlPath = `./worlds/${zoneId}.yaml`;
      const worldData = await this.worldLoader.loadWorld(yamlPath);
      this.loadedWorldDocs.set(worldData.id || zoneId, worldData);
      const zoneInfo = buildZoneFromSpec({ id: zoneId, ...worldData }, { rng: Math.random });
      this.worldRoot.add(zoneInfo.group);
      this.zoneMeshes[zoneId] = zoneInfo;
      return zoneInfo;
    } catch (error) {
      console.warn(`⚠️ YAML-Zone "${zoneId}" konnte nicht geladen werden, generiere prozedural:`, error);
      return this.generateZone(zoneId);
    }
  }

  async loadZoneFromYaml(yamlPath, zoneId = null) {
    try {
      const worldData = await this.worldLoader.loadWorld(yamlPath);
      const finalId = zoneId || worldData.id || 'unnamed-zone';
      this.loadedWorldDocs.set(finalId, worldData);
      const zoneInfo = buildZoneFromSpec({ id: finalId, ...worldData }, { rng: Math.random });
      this.worldRoot.add(zoneInfo.group);
      this.zoneMeshes[finalId] = zoneInfo;
      return zoneInfo;
    } catch (error) { console.error('❌ Fehler beim Laden der YAML-Zone:', error); throw error; }
  }

  isYAMLZone(zoneId) {
    const yamlZones = ['zone-start', 'zone-forest', 'zone-archive'];
    return yamlZones.includes(zoneId) || this.loadedWorldDocs.has(zoneId);
  }

  linkPortal(fromZone, toZone) {
    const z = this.zoneMeshes[fromZone]; if(!z) return;
    const p = z.portals?.[0]; if(!p) return; p.userData.target = toZone;
    const evt = createEvent(EVENT_KINDS.PORTAL, { from: fromZone, to: toZone }, [['from', fromZone], ['to', toZone]]);
    worldStore.add(evt);
  }

  getCurrentZone() { return this.currentZoneId ? this.zoneMeshes[this.currentZoneId] : null; }

  updateAnimations(dt, clock, isObjectInRange, camera) {
    const z = this.getCurrentZone(); if(!z) return;
    if(camera && this.worldRoot && this.worldRoot.parent) this.worldRoot.parent.userData.__camera = camera;
  }

  clear() {
    Object.values(this.zoneMeshes).forEach(z=>this.worldRoot.remove(z.group));
    for(const k of Object.keys(this.zoneMeshes)) delete this.zoneMeshes[k];
    this.currentZoneId = null;
  }

  getCurrentWorldDoc() { if (!this.currentZoneId) return null; return this.loadedWorldDocs.get(this.currentZoneId); }

  async loadExampleWorlds() {
    const examples = ['worlds/zone-start.yaml','worlds/zone-forest.yaml','worlds/zone-archive.yaml'];
    for (const yamlPath of examples) { try { await this.loadZoneFromYaml(yamlPath); } catch {} }
  }
}
