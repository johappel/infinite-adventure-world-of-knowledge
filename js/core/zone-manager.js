import * as THREE from 'three';
import { seededRng, pick } from '../utils/random.js';
import { makeSkyboxTextures, makeGroundTexture, makePersonaTexture, makePortalMaterial } from '../graphics/asset-generators.js';
import { worldStore, createEvent, EVENT_KINDS } from './event-store.js';
import { WorldLoader } from './world-loader.js';
import { YAMLWorldLoader } from './yaml-world-loader.js';

export class ZoneManager {
  constructor(worldRoot) {
    this.worldRoot = worldRoot;
    this.currentZoneId = null;
    this.zoneMeshes = {}; // zoneId -> { group, personas[], portals[] }
    this.worldLoader = new WorldLoader();
    this.yamlWorldLoader = new YAMLWorldLoader(this);
    this.loadedWorldDocs = new Map(); // Cache für YAML-Welten
  }

  generateZone(zoneId, personaHint) {
    const rng = seededRng(zoneId);
    const group = new THREE.Group();
    group.userData.zoneId = zoneId;

    // skybox
    const sky = makeSkyboxTextures(rng);
    const skyGeo = new THREE.BoxGeometry(1000,1000,1000);
    const materials = [
      new THREE.MeshBasicMaterial({ map: sky.px, side: THREE.BackSide }),
      new THREE.MeshBasicMaterial({ map: sky.nx, side: THREE.BackSide }),
      new THREE.MeshBasicMaterial({ map: sky.py, side: THREE.BackSide }),
      new THREE.MeshBasicMaterial({ map: sky.ny, side: THREE.BackSide }),
      new THREE.MeshBasicMaterial({ map: sky.pz, side: THREE.BackSide }),
      new THREE.MeshBasicMaterial({ map: sky.nz, side: THREE.BackSide }),
    ];
    const skybox = new THREE.Mesh(skyGeo, materials);
    group.add(skybox);

    // ground
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(18, 64),
      new THREE.MeshStandardMaterial({ map: makeGroundTexture(rng) })
    );
    ground.rotation.x = -Math.PI/2;
    ground.receiveShadow = true;
    group.add(ground);

    // stones/props
    const propCount = 20 + Math.floor(rng()*20);
    const propMat = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(rng(), 0.2, 0.5) });
    for(let i=0;i<propCount;i++){
      const r = 2 + rng()*15;
      const a = rng()*Math.PI*2;
      const x = Math.cos(a)*r;
      const z = Math.sin(a)*r;
      const h = 0.4 + rng()*2.0;
      const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.2 + rng()*0.6),
        propMat.clone()
      );
      rock.position.set(x, 0.2, z);
      rock.scale.y = h;
      rock.rotation.y = rng()*Math.PI*2;
      group.add(rock);
    }

    // personas
    const personaRoles = ['Forscher', 'Lehrer', 'Magier', 'Schüler'];
    const personas = [];
    const personaCount = 2 + Math.floor(rng()*2);
    for(let i=0;i<personaCount;i++){
      const role = personaHint || pick(rng, personaRoles);
      const name = role + ' ' + (['Ava','Noah','Mira','Liam','Yara','Odin','Sofi','Juno'][Math.floor(rng()*8)]);
      const tex = makePersonaTexture(name, role, rng);
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 1.6),
        new THREE.MeshStandardMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, metalness:0.1, roughness:0.9 })
      );
      const r = 3 + rng()*10; const a = rng()*Math.PI*2;
      plane.position.set(Math.cos(a)*r, 1.0, Math.sin(a)*r);
      plane.userData = { type:'persona', name, role, zoneId, id: crypto.randomUUID() };
      group.add(plane);
      personas.push(plane);

      // floating ring
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.9, 0.02, 8, 64),
        new THREE.MeshStandardMaterial({ color: 0x8bffb0, emissive: 0x1a6032, emissiveIntensity:0.6 })
      );
      ring.position.copy(plane.position).add(new THREE.Vector3(0,0.05,0));
      ring.rotation.x = Math.PI/2;
      ring.userData = { type:'personaAura', target: plane };
      group.add(ring);
    }

    // central portal placeholder
    const portalGeom = new THREE.CylinderGeometry(0.9, 0.9, 3.2, 48, 1, true);
    const portal = new THREE.Mesh(portalGeom, makePortalMaterial());
    portal.position.set(0, 1.6, -6);
    portal.rotation.y = Math.PI/8;
    portal.userData = { type:'portal', zoneId, target:null }; // target set on link
    group.add(portal);

    this.worldRoot.add(group);
    this.zoneMeshes[zoneId] = { group, personas, portals:[portal] };

    // Store zone event if not already present
    if(!worldStore.latestByTag(EVENT_KINDS.ZONE, 'zone', zoneId)){
      const evt = createEvent(EVENT_KINDS.ZONE, {
        title: this.synthZoneTitle(zoneId),
        description: this.synthZoneMarkdown(zoneId),
      }, [['zone', zoneId]]);
      worldStore.add(evt);
    }

    return group;
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
    // hide all
    Object.values(this.zoneMeshes).forEach(z=>z.group.visible=false);
    
    // Prüfe zuerst ob es eine YAML-Zone ist
    if(!this.zoneMeshes[zoneId]) {
      // Versuche YAML-Zone zu laden, andernfalls generiere prozedural
      if (this.isYAMLZone(zoneId)) {
        await this.loadYAMLZone(zoneId);
      } else {
        this.generateZone(zoneId, personaHint);
      }
    }
    
    this.zoneMeshes[zoneId].group.visible = true;
    this.currentZoneId = zoneId;
    
    document.getElementById('zoneName').textContent = 'Zone: ' + this.synthZoneTitle(zoneId);
    
    // Reset für Third-Person Navigation
    if(player) {
      player.reset();
    }
    
    if(camera) {
      camera.reset();
      // Kamera-Ausrichtung für Third-Person
      camera.camera.position.set(0, 5, 8);
      camera.camera.lookAt(0, 1, 0);
    }
    
    // Trace visit
    const evt = createEvent(EVENT_KINDS.TRACE, { zone: zoneId, action: 'visit' }, [['zone', zoneId]]);
    worldStore.add(evt);
  }

  /**
   * Lädt eine YAML-Zone basierend auf Zone-ID
   */
  async loadYAMLZone(zoneId) {
    try {
      const yamlPath = `./worlds/${zoneId}.yaml`;
      console.log(`🌍 Versuche YAML-Zone zu laden: ${yamlPath}`);
      
      const zoneInfo = await this.yamlWorldLoader.loadWorldFromYAML(yamlPath, zoneId);
      console.log(`✅ YAML-Zone "${zoneId}" erfolgreich geladen`);
      return zoneInfo;
    } catch (error) {
      console.warn(`⚠️ YAML-Zone "${zoneId}" konnte nicht geladen werden, generiere prozedural:`, error);
      return this.generateZone(zoneId);
    }
  }

  /**
   * Lädt eine YAML-Zone aus einer spezifischen Datei
   */
  async loadZoneFromYaml(yamlPath, zoneId = null) {
    try {
      console.log(`🌍 Lade Zone aus YAML: ${yamlPath}`);
      const zoneInfo = await this.yamlWorldLoader.loadWorldFromYAML(yamlPath, zoneId);
      console.log(`✅ Zone aus YAML geladen`);
      return zoneInfo;
    } catch (error) {
      console.error(`❌ Fehler beim Laden der YAML-Zone:`, error);
      throw error;
    }
  }

  /**
   * Prüft ob eine Zone-ID eine YAML-Zone ist
   */
  isYAMLZone(zoneId) {
    // Standard YAML-Zonen
    const yamlZones = ['zone-start', 'zone-forest', 'zone-archive'];
    return yamlZones.includes(zoneId) || this.yamlWorldLoader.isYAMLZone(zoneId);
  }

  linkPortal(fromZone, toZone) {
    const z = this.zoneMeshes[fromZone];
    if(!z) return;
    const p = z.portals[0];
    p.userData.target = toZone;

    // record link event
    const evt = createEvent(EVENT_KINDS.PORTAL, { from: fromZone, to: toZone }, [['from', fromZone], ['to', toZone]]);
    worldStore.add(evt);
  }

  getCurrentZone() {
    return this.currentZoneId ? this.zoneMeshes[this.currentZoneId] : null;
  }

  updateAnimations(dt, clock, isObjectInRange, camera) {
    const z = this.getCurrentZone();
    if(!z) return;

    z.portals.forEach(p=>{
      // Einfache Portal-Animation über Material-Eigenschaften
      const time = clock.getElapsedTime();
      p.material.emissiveIntensity = 1.0 + 0.3 * Math.sin(time * 2.0);
      p.rotation.y += dt * 0.5;
      
      // Reichweiten-Feedback: Portal heller wenn in Nähe
      if(isObjectInRange && isObjectInRange(p)) {
        p.material.emissiveIntensity += 0.5;
      }
    });
    
    z.group.children.forEach(o=>{
      if(o.userData?.type==='personaAura'){
        o.rotation.z += dt*0.8;
        
        // Reichweiten-Feedback: Aura-Ring heller wenn in Nähe der Persona
        const persona = o.userData.target;
        if(persona && isObjectInRange && isObjectInRange(persona)) {
          o.material.emissiveIntensity = 1.2;
        } else {
          o.material.emissiveIntensity = 0.6;
        }
      }
      if(o.userData?.type==='persona'){
        // billboard to camera
        if(camera) {
          o.lookAt(camera.position.x, o.position.y, camera.position.z);
        }
      }
    });
  }

  clear() {
    Object.values(this.zoneMeshes).forEach(z=>this.worldRoot.remove(z.group));
    for(const k of Object.keys(this.zoneMeshes)) delete this.zoneMeshes[k];
    this.currentZoneId = null;
  }

  /**
   * Lädt eine Zone aus einer YAML-Datei
   */
  async loadZoneFromYaml(yamlPath) {
    try {
      console.log(`🌍 Lade YAML-Zone: ${yamlPath}`);
      
      // YAML-Weltdaten laden
      const worldData = await this.worldLoader.loadWorld(yamlPath);
      
      // Validierung
      const validation = this.worldLoader.validateWorldData(worldData);
      if (!validation.isValid) {
        console.error('❌ YAML-Validation fehlgeschlagen:', validation.errors);
        throw new Error(`YAML-Validation fehlgeschlagen: ${validation.errors.join(', ')}`);
      }
      
      if (validation.warnings.length > 0) {
        console.warn('⚠️ YAML-Warnungen:', validation.warnings);
      }
      
      // Zur Zone wechseln
      this.generateYamlZone(worldData.id, worldData);
      this.currentZoneId = worldData.id;
      
      // WorldDoc im Cache speichern
      this.loadedWorldDocs.set(worldData.id, worldData);
      
      console.log(`✅ YAML-Zone geladen: ${worldData.name}`);
      return worldData;
      
    } catch (error) {
      console.error(`❌ Fehler beim Laden der YAML-Zone ${yamlPath}:`, error);
      throw error;
    }
  }

  /**
   * Generiert eine Zone aus YAML-Daten
   */
  generateYamlZone(zoneId, worldData) {
    console.log(`🏗️ Generiere YAML-Zone: ${worldData.name}`);
    
    // Bestehende Zone entfernen
    if (this.zoneMeshes[zoneId]) {
      this.worldRoot.remove(this.zoneMeshes[zoneId].group);
      delete this.zoneMeshes[zoneId];
    }
    
    const group = new THREE.Group();
    group.userData.zoneId = zoneId;
    group.userData.isYamlZone = true;
    group.userData.worldData = worldData;

    // YAML-Weltdaten zu THREE.js konvertieren
    const result = this.worldLoader.convertToThreeJS(worldData, group);
    
    // Sammle referenzen für Animationen und Interaktionen
    const personas = result.personas || [];
    const portals = result.portals || [];
    const objects = result.objects || [];
    
    this.worldRoot.add(group);
    this.zoneMeshes[zoneId] = { 
      group, 
      personas, 
      portals,
      objects,
      isYamlZone: true,
      worldData 
    };

    // Store zone event if not already present
    const existing = worldStore.latestByTag(EVENT_KINDS.ZONE, 'zone', zoneId);
    if (!existing) {
      worldStore.add(createEvent(EVENT_KINDS.ZONE, {
        name: worldData.name,
        description: worldData.description,
        seed: worldData.seed || Math.floor(Math.random() * 1000000),
        yamlSource: true
      }, [['zone', zoneId]]));
    }

    console.log(`✅ YAML-Zone generiert: ${worldData.name} (${personas.length} Personas, ${portals.length} Portale, ${objects.length} Objekte)`);
  }

  /**
   * Gibt das aktuelle WorldDoc zurück (falls YAML-Zone)
   */
  getCurrentWorldDoc() {
    if (!this.currentZoneId) return null;
    return this.loadedWorldDocs.get(this.currentZoneId);
  }

  /**
   * Lädt Beispielwelten
   */
  async loadExampleWorlds() {
    const examples = [
      'worlds/zone-start.yaml',
      'worlds/zone-forest.yaml', 
      'worlds/zone-archive.yaml'
    ];

    console.log('📚 Lade Beispielwelten...');
    
    for (const yamlPath of examples) {
      try {
        await this.loadZoneFromYaml(yamlPath);
        console.log(`✅ ${yamlPath} geladen`);
      } catch (error) {
        console.error(`❌ Fehler bei ${yamlPath}:`, error);
      }
    }
    
    console.log(`📚 ${this.loadedWorldDocs.size} Beispielwelten geladen`);
  }
}
