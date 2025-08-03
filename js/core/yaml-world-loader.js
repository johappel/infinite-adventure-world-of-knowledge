/**
 * YAML World Loader - Konvertiert YAML-Weltbeschreibungen in THREE.js Szenen
 * Kompatibel mit dem bestehenden WisdomWorld System
 */

import * as THREE from 'three';
import { worldStore, createEvent, EVENT_KINDS } from './event-store.js';
import { terrainPresets, objectPresets, personaPresets, textures, deepMerge, withDefaultsTerrain, withDefaultsObject, withDefaultsPersona } from '../presets/index.js';

// Globaler Zugriff auf js-yaml (falls via CDN geladen)
const yaml = window.jsyaml;

export class YAMLWorldLoader {
  constructor(zoneManager) {
    this.zoneManager = zoneManager;
    this.loadedWorlds = new Map();
  }

  /**
   * Lädt eine YAML-Welt-Datei und konvertiert sie in THREE.js Objekte
   */
  async loadWorldFromYAML(yamlPath, zoneId = null) {
    try {
      console.log(`🌍 Lade YAML-Welt: ${yamlPath}`);
      
      // YAML-Datei laden
      const response = await fetch(yamlPath);
      if (!response.ok) {
        throw new Error(`HTTP Fehler: ${response.status}`);
      }
      
      const yamlText = await response.text();
      const worldData = yaml.load(yamlText);
      
      console.log('📄 YAML-Weltdaten geladen:', worldData);
      
      // Zone-ID aus YAML oder Parameter verwenden
      const finalZoneId = zoneId || worldData.id || worldData.name || 'unnamed-zone';
      
      // Welt in THREE.js Szene konvertieren
      const zoneInfo = this.convertYAMLToZone(worldData, finalZoneId);
      
      // In Cache speichern
      this.loadedWorlds.set(finalZoneId, worldData);
      
      console.log(`✅ YAML-Welt "${finalZoneId}" erfolgreich geladen`);
      return zoneInfo;
      
    } catch (error) {
      console.error('❌ Fehler beim Laden der YAML-Welt:', error);
      throw error;
    }
  }

  /**
   * Konvertiert YAML-Weltdaten in THREE.js Objekte
   */
  convertYAMLToZone(worldData, zoneId) {
    console.log(`🏗️ Konvertiere YAML zu Zone: ${zoneId}`);
    const zoneGroup = new THREE.Group();
    zoneGroup.name = zoneId;
    zoneGroup.visible = false;

    const personas = [];
    const portals = [];

    // // TEST: Sichtbare Test-Box hinzufügen
    // const testGeo = new THREE.BoxGeometry(10, 1, 10);
    // const testMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    // const testCube = new THREE.Mesh(testGeo, testMat);
    // testCube.position.y = 0.5;
    // zoneGroup.add(testCube);
    // console.log('🔴 Test-Würfel zur Zone hinzugefügt');

    // Terrain mit Preset/Defaults
    if (worldData.terrain) {
      const terrCfg = this.resolveTerrainConfig(worldData.terrain);
      this.createTerrain(terrCfg, zoneGroup);
    }

    if (worldData.environment) {
      this.setupEnvironment(worldData.environment, zoneGroup);
    }

    if (worldData.objects) {
      const list = worldData.objects.map(o=> this.resolveObjectConfig(o));
      this.createObjects(list, zoneGroup);
    }

    if (worldData.personas) {
      const list = worldData.personas.map(p=> this.resolvePersonaConfig(p));
      const createdPersonas = this.createPersonas(list, zoneGroup, zoneId);
      personas.push(...createdPersonas);
    }

    if (worldData.portals) {
      const createdPortals = this.createPortals(worldData.portals, zoneGroup, zoneId);
      portals.push(...createdPortals);
    }

    if (worldData.interactive_elements) {
      this.createInteractiveElements(worldData.interactive_elements, zoneGroup);
    }

    this.startZoneAnimations(zoneGroup);
    this.zoneManager.worldRoot.add(zoneGroup);

    const zoneInfo = { group: zoneGroup, personas, portals, worldData };
    this.zoneManager.zoneMeshes[zoneId] = zoneInfo;

    const evt = createEvent(EVENT_KINDS.ZONE, { id: zoneId, name: worldData.name, description: worldData.description, source: 'yaml' }, [['zone', zoneId]]);
    worldStore.add(evt);

    // WICHTIG: Zone für Test sichtbar machen
    zoneGroup.visible = true;
    console.log('✅ Zone sichtbar gesetzt für Test');

    console.log(`✅ Zone "${zoneId}" konvertiert: ${personas.length} NPCs, ${portals.length} Portale`);
    return zoneInfo;
  }

  resolveTerrainConfig(cfg){
    let out = cfg;
    if (cfg.preset && terrainPresets[cfg.preset]) out = deepMerge(terrainPresets[cfg.preset], cfg);
    return withDefaultsTerrain(out);
  }

  resolveObjectConfig(cfg){
    if (cfg.preset && objectPresets[cfg.preset]) {
      return withDefaultsObject(deepMerge(objectPresets[cfg.preset], cfg));
    }
    return withDefaultsObject(cfg);
  }

  resolvePersonaConfig(cfg){
    if (cfg.preset && personaPresets[cfg.preset]) {
      return withDefaultsPersona(deepMerge(personaPresets[cfg.preset], cfg));
    }
    return withDefaultsPersona(cfg);
  }

  /**
   * Erstellt das Terrain basierend auf YAML-Konfiguration
   */
  createTerrain(terrainConfig, parentGroup) {
    console.log('🌍 Erstelle Terrain:', terrainConfig);
    const width = terrainConfig.size?.[0] || terrainConfig.width || 50;
    const height = terrainConfig.size?.[1] || terrainConfig.height || 50;

    let geometry;
    if (terrainConfig.type === 'hills') {
      console.log('🏔️ Erstelle Hills-Terrain mit Höhenvariation');
      geometry = new THREE.PlaneGeometry(width, height, 96, 96);
      const pos = geometry.attributes.position;
      const v = new THREE.Vector3();
      const amplitude = terrainConfig.amplitude ?? 2.5;
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        const x = v.x, y = v.y; // Ebene liegt in XY
        const wave1 = Math.sin(x * 0.08) * Math.cos(y * 0.08) * 0.9;
        const wave2 = Math.sin(x * 0.18 + 1.2) * Math.cos(y * 0.14 + 0.7) * 0.6;
        const wave3 = Math.sin(x * 0.3 + 2.4) * Math.cos(y * 0.22 + 1.7) * 0.3;
        const elevation = (wave1 + wave2 + wave3) * amplitude;
        pos.setZ(i, elevation); // Höhe in Z schreiben
      }
      pos.needsUpdate = true;
      geometry.computeVertexNormals();
    } else if (terrainConfig.type === 'mountains') {
      console.log('⛰️ Erstelle Mountains-Terrain');
      geometry = new THREE.PlaneGeometry(width, height, 128, 128);
      const pos = geometry.attributes.position;
      const v = new THREE.Vector3();
      const amplitude = terrainConfig.amplitude ?? 6.0;
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        const r = Math.hypot(v.x, v.y); // XY verwenden
        const ridge = Math.sin(r * 0.06) * 0.8 + Math.sin(v.x * 0.08) * Math.cos(v.y * 0.08) * 0.6;
        pos.setZ(i, Math.max(0, ridge * amplitude));
      }
      pos.needsUpdate = true;
      geometry.computeVertexNormals();
    } else {
      console.log('🟢 Erstelle flaches Terrain');
      geometry = new THREE.PlaneGeometry(width, height, 2, 2);
    }

    const material = new THREE.MeshStandardMaterial({
      color: terrainConfig.color || '#4a7c1e',
      roughness: 0.75,
      metalness: 0.05,
      side: THREE.FrontSide
    });

    // Canvas-Textur anwenden, wenn texture: 'forest_floor'
    if (terrainConfig.texture === 'forest_floor') {
      const tex = textures.makeForestFloorTexture();
      // Farbdarstellung verbessern und Textur sichtbar machen
      if (THREE.sRGBEncoding !== undefined) {
        tex.encoding = THREE.sRGBEncoding;
      }
      material.map = tex;
      // Optional: neutrale Farbe, damit die Textur nicht abgedunkelt wird
      material.color = new THREE.Color('#ffffff');
      material.needsUpdate = true;
    }

    const terrain = new THREE.Mesh(geometry, material);
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.y = terrainConfig.y ?? 0;
    terrain.name = 'terrain';
    terrain.receiveShadow = true;
    terrain.renderOrder = -10;
    terrain.material.transparent = false;
    terrain.material.depthWrite = true;
    terrain.material.depthTest = true;
    parentGroup.add(terrain);
    console.log('✅ Terrain erstellt');
  }

  /**
   * Richtet die Umgebung ein (Beleuchtung, etc.) - verbesserte Beleuchtung
   */
  setupEnvironment(envConfig, parentGroup) {
    console.log('🌅 Richte Umgebung ein:', envConfig);
    const ambientLight = new THREE.AmbientLight(0x404040, envConfig.ambient_light || 0.7);
    parentGroup.add(ambientLight);
    const dir = new THREE.DirectionalLight(0xffffff, envConfig.sun_intensity || 0.9);
    dir.position.set(10, 20, 8);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.near = 0.5;
    dir.shadow.camera.far = 80;
    parentGroup.add(dir);
    const fill = new THREE.HemisphereLight(0xaaccff, 0x223344, 0.15);
    parentGroup.add(fill);
    console.log('✅ Umgebung eingerichtet');
  }

  /**
   * Erstellt Objekte aus YAML-Konfiguration
   */
  createObjects(objectsConfig, parentGroup) {
    console.log(`🎲 Erstelle ${objectsConfig.length} Objekte`);

    objectsConfig.forEach((objConfig, index) => {
      const mesh = this.createSingleObject(objConfig, index);
      if (mesh) {
        parentGroup.add(mesh);
      }
    });

    console.log(`✅ ${objectsConfig.length} Objekte erstellt`);
  }

  /**
   * Erstellt ein einzelnes Objekt mit erweiterten Typen
   */
  createSingleObject(objConfig, index) {
    let geometry;
    switch (objConfig.type) {
      case 'stone_circle': {
        const radius = (objConfig.scale?.[0] ?? 3);
        const tube = Math.max(0.08 * radius, 0.15); // dünner, klarer Ring
        geometry = new THREE.TorusGeometry(radius, tube, 12, 64);
        break;
      }
      case 'mushroom': {
        geometry = new THREE.CylinderGeometry(0.1, 0.1, 0.5, 10, 1);
        break;
      }
      case 'rock':
        geometry = new THREE.DodecahedronGeometry(0.5);
        break;
      case 'tree':
        geometry = new THREE.CylinderGeometry(0.3, 0.8, 3, 8, 1);
        break;
      case 'crystal':
        geometry = new THREE.OctahedronGeometry(0.8);
        break;
      case 'sphere':
        geometry = new THREE.SphereGeometry(objConfig.size || 1, 16, 16);
        break;
      case 'bookshelf':
      case 'box':
      default:
        geometry = new THREE.BoxGeometry(1, 1, 1);
    }

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(objConfig.color || '#8b4513'),
      roughness: 0.75,
      metalness: 0.08
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `${objConfig.type}_${index}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    if (objConfig.position) {
      mesh.position.set(...objConfig.position);
    }
    if (objConfig.scale) {
      mesh.scale.set(...objConfig.scale);
    }

    // Spezifische Ausrichtung für Stone Circle
    if (objConfig.type === 'stone_circle') {
      mesh.rotation.x = Math.PI / 2;        // flach auf den Boden
      mesh.position.y = Math.max(mesh.position.y ?? 0, 0.02); // leicht über Boden -> kein Flimmern
    }

    // Interaktiv
    if (objConfig.interactive) {
      mesh.userData.interactive = true;
    }

    return mesh;
  }

  /**
   * Erstellt NPCs/Personas kompatibel mit dem bestehenden System
   */
  createPersonas(personasConfig, parentGroup, zoneId) {
    console.log(`👤 Erstelle ${personasConfig.length} NPCs`);
    const personas = [];

    personasConfig.forEach((personaConfig, index) => {
      const persona = this.createSinglePersona(personaConfig, index, zoneId);
      if (persona) {
        parentGroup.add(persona);
        personas.push(persona);
        const auraRing = this.createPersonaAura(persona);
        parentGroup.add(auraRing);
      }
    });

    console.log(`✅ ${personas.length} NPCs erstellt`);
    return personas;
  }

  /**
   * Erstellt eine einzelne Persona kompatibel mit dem bestehenden Dialog-System
   */
  createSinglePersona(personaConfig, index, zoneId) {
    // Größerer Canvas für bessere Qualität
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Hintergrund mit starkem Kontrast
    const baseColor = personaConfig.appearance?.color || '#ff6b6b';
    
    // Starker dunkler Rahmen
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 512, 512);
    
    // Gradient-Hintergrund für bessere Sichtbarkeit
    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    gradient.addColorStop(0, baseColor);
    gradient.addColorStop(0.7, `${baseColor}cc`);
    gradient.addColorStop(1, '#000000');
    ctx.fillStyle = gradient;
    ctx.fillRect(20, 20, 472, 472);
    
    // Weiße Umrandung für maximale Sichtbarkeit
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8;
    ctx.strokeRect(20, 20, 472, 472);
    
    // Großer Avatar-Kreis
    ctx.beginPath();
    ctx.arc(256, 180, 80, 0, Math.PI * 2);
    ctx.fillStyle = baseColor;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.stroke();
    
    // Größere Augen
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(230, 160, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(282, 160, 15, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(230, 160, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(282, 160, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Lächeln
    ctx.beginPath();
    ctx.arc(256, 180, 50, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // Name mit großer Schrift und Schatten
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(personaConfig.name, 258, 320);
    ctx.fillText(`(${personaConfig.role || 'NPC'})`, 258, 360);
    
    ctx.fillStyle = '#ffffff';
    ctx.fillText(personaConfig.name, 256, 318);
    ctx.fillText(`(${personaConfig.role || 'NPC'})`, 256, 358);
    
    // Zusätzlicher Glüheffekt-Ring
    ctx.beginPath();
    ctx.arc(256, 256, 200, 0, Math.PI * 2);
    ctx.strokeStyle = baseColor + '44';
    ctx.lineWidth = 12;
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    
    // Verbessertes Material mit Emission
    const material = new THREE.MeshStandardMaterial({ 
      map: texture,
      transparent: true,
      alphaTest: 0.1,
      emissive: new THREE.Color(baseColor),
      emissiveIntensity: 0.3,
      roughness: 0.1,
      metalness: 0.1
    });

    // Größere Geometrie für bessere Sichtbarkeit
    const geometry = new THREE.PlaneGeometry( (personaConfig.appearance?.height||1.4) * 2.8, (personaConfig.appearance?.height||1.4) * 2.8 );
    const persona = new THREE.Mesh(geometry, material);

    // Position setzen
    if (personaConfig.position) {
      persona.position.set(...personaConfig.position);
      persona.position.y += 2; // Höher für bessere Sichtbarkeit
    }

    // Persona sollte immer zur Kamera schauen
    persona.userData.lookAtCamera = true;

    // UserData für das Dialog-System
    persona.userData = {
      type: 'persona',
      name: personaConfig.name,
      role: personaConfig.role || 'NPC',
      id: `persona_${index}`,
      zoneId: zoneId,
      dialogue: personaConfig.dialogue,
      behavior: personaConfig.behavior,
      lookAtCamera: true, // Für Animation
      // Für das bestehende Dialog-System
      greeting: personaConfig.behavior?.greeting || personaConfig.dialogue?.opening || 'Hallo!'
    };

    persona.name = personaConfig.name;
    
    // Aura-Ring hinzufügen
    const aura = this.createPersonaAura(persona);
    persona.add(aura);
    
    return persona;
  }

  /**
   * Erstellt Aura-Ring für Persona (wie im bestehenden System) - stabiler
   */
  createPersonaAura(persona) {
    const ringGeometry = new THREE.RingGeometry(2.0, 2.8, 32);
    const ringMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x44ff44),
      transparent: true,
      opacity: 0.4,  // Reduzierte Opacity für weniger Flimmern
      side: THREE.DoubleSide,
      roughness: 0.8,
      metalness: 0.1,
      emissive: new THREE.Color(0x002200),
      emissiveIntensity: 0.2
    });
    
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.set(0, -1.8, 0); // Relativ zur Persona
    ring.rotation.x = -Math.PI / 2;
    ring.userData = { 
      type: 'personaAura', 
      target: persona,
      animationPhase: Math.random() * Math.PI * 2 // Für Animation
    };
    
    return ring;
  }

  /**
   * Erstellt Portale kompatibel mit dem bestehenden System
   */
  createPortals(portalsConfig, parentGroup, zoneId) {
    console.log(`🚪 Erstelle ${portalsConfig.length} Portale`);
    const portals = [];

    portalsConfig.forEach((portalConfig, index) => {
      const portal = this.createSinglePortal(portalConfig, index, zoneId);
      if (portal) {
        parentGroup.add(portal);
        portals.push(portal);
      }
    });

    console.log(`✅ ${portals.length} Portale erstellt`);
    return portals;
  }

  /**
   * Erstellt ein einzelnes Portal
   */
  createSinglePortal(portalConfig, index, zoneId) {
    const portalMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(portalConfig.color || '#4169e1'),
      transparent: true,
      opacity: 0.6,
      emissive: new THREE.Color(portalConfig.color || '#4169e1'),
      emissiveIntensity: 0.25,
      roughness: 0.2,
      metalness: 0.2,
      side: THREE.DoubleSide
    });

    // Portal-Geometrie
    const width = portalConfig.size?.[0] || 1.8;
    const height = portalConfig.size?.[1] || 3.2;
    const depth = portalConfig.size?.[2] || 0.2;
    
    const geometry = new THREE.CylinderGeometry(width, width, height, 32, 1, true);
    const portal = new THREE.Mesh(geometry, portalMaterial);

    // Position setzen
    if (portalConfig.position) {
      portal.position.set(...portalConfig.position);
    }

    // UserData für das Interaktions-System
    portal.userData = {
      type: 'portal',
      id: portalConfig.id || `portal_${index}`,
      name: portalConfig.name || 'Unbenanntes Portal',
      target: portalConfig.destination || portalConfig.target,
      zoneId: zoneId,
      description: portalConfig.description
    };

    portal.name = portalConfig.name || `Portal_${index}`;
    return portal;
  }

  /**
   * Erstellt interaktive Elemente
   */
  createInteractiveElements(elementsConfig, parentGroup) {
    console.log(`💫 Erstelle ${elementsConfig.length} interaktive Elemente`);

    elementsConfig.forEach((elementConfig, index) => {
      const element = this.createSingleInteractiveElement(elementConfig, index);
      if (element) {
        parentGroup.add(element);
      }
    });
  }

  /**
   * Erstellt ein einzelnes interaktives Element
   */
  createSingleInteractiveElement(elementConfig, index) {
    switch (elementConfig.type) {
      case 'info_sign':
        return this.createInfoSign(elementConfig, index);
      default:
        console.warn(`Unbekannter interaktiver Element-Typ: ${elementConfig.type}`);
        return null;
    }
  }

  /**
   * Erstellt ein Info-Schild
   */
  createInfoSign(config, index) {
    const geometry = new THREE.BoxGeometry(2, 1.5, 0.1);
    const material = new THREE.MeshLambertMaterial({
      color: config.color || '#8b4513'
    });

    const sign = new THREE.Mesh(geometry, material);
    
    if (config.position) {
      sign.position.set(...config.position);
    }

    sign.userData = {
      type: 'info_sign',
      text: config.text || 'Info-Schild',
      interactive: true
    };

    sign.name = `InfoSign_${index}`;
    return sign;
  }

  /**
   * Gibt geladene Welten zurück
   */
  getLoadedWorlds() {
    return this.loadedWorlds;
  }

  /**
   * Überprüft ob eine Zone aus YAML geladen wurde
   */
  isYAMLZone(zoneId) {
    return this.loadedWorlds.has(zoneId);
  }

  /**
   * Startet Animationen für eine Zone
   */
  startZoneAnimations(zoneGroup) {
    const animateZone = () => {
      const time = Date.now() * 0.001;
      
      // Animiere alle Aura-Ringe
      zoneGroup.traverse((child) => {
        if (child.userData.type === 'personaAura') {
          const phase = child.userData.animationPhase || 0;
          child.material.opacity = 0.3 + Math.sin(time * 2 + phase) * 0.2;
          child.rotation.z = time * 0.5 + phase;
        }
        
        // Animiere interaktive Objekte mit Skripten
        if (child.userData.script) {
          try {
            // Sichere Skript-Ausführung
            const func = new Function(child.userData.script);
            func.call(child);
          } catch (error) {
            console.warn('Skript-Fehler:', error);
          }
        }
      });
      
      requestAnimationFrame(animateZone);
    };
    
    requestAnimationFrame(animateZone);
  }
}
