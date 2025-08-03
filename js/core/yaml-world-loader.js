/**
 * YAML World Loader - Konvertiert YAML-Weltbeschreibungen in THREE.js Szenen
 * Kompatibel mit dem bestehenden WisdomWorld System
 */

import * as THREE from 'three';
import { worldStore, createEvent, EVENT_KINDS } from './event-store.js';

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
    
    // Basis-Zonen-Gruppe erstellen
    const zoneGroup = new THREE.Group();
    zoneGroup.name = zoneId;
    zoneGroup.visible = false; // Standardmäßig unsichtbar

    const personas = [];
    const portals = [];

    // 1. Terrain erstellen
    if (worldData.terrain) {
      this.createTerrain(worldData.terrain, zoneGroup);
    }

    // 2. Umgebung einrichten
    if (worldData.environment) {
      this.setupEnvironment(worldData.environment, zoneGroup);
    }

    // 3. Objekte erstellen
    if (worldData.objects) {
      this.createObjects(worldData.objects, zoneGroup);
    }

    // 4. NPCs/Personas erstellen
    if (worldData.personas) {
      const createdPersonas = this.createPersonas(worldData.personas, zoneGroup, zoneId);
      personas.push(...createdPersonas);
    }

    // 5. Portale erstellen
    if (worldData.portals) {
      const createdPortals = this.createPortals(worldData.portals, zoneGroup, zoneId);
      portals.push(...createdPortals);
    }

    // 6. Interaktive Elemente
    if (worldData.interactive_elements) {
      this.createInteractiveElements(worldData.interactive_elements, zoneGroup);
    }

    // Zur WorldRoot hinzufügen
    this.zoneManager.worldRoot.add(zoneGroup);

    // Zone-Info im bestehenden Format zurückgeben
    const zoneInfo = {
      group: zoneGroup,
      personas,
      portals,
      worldData
    };

    // Im ZoneManager registrieren
    this.zoneManager.zoneMeshes[zoneId] = zoneInfo;

    // Zone-Event speichern (für Persistenz)
    const evt = createEvent(EVENT_KINDS.ZONE, {
      id: zoneId,
      name: worldData.name,
      description: worldData.description,
      source: 'yaml'
    }, [['zone', zoneId]]);
    worldStore.add(evt);

    console.log(`✅ Zone "${zoneId}" konvertiert: ${personas.length} NPCs, ${portals.length} Portale`);
    return zoneInfo;
  }

  /**
   * Erstellt das Terrain basierend auf YAML-Konfiguration
   */
  createTerrain(terrainConfig, parentGroup) {
    console.log('🌍 Erstelle Terrain:', terrainConfig);

    const width = terrainConfig.size?.[0] || terrainConfig.width || 50;
    const height = terrainConfig.size?.[1] || terrainConfig.height || 50;

    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshLambertMaterial({
      color: terrainConfig.color || '#4a7c1e'
    });

    const terrain = new THREE.Mesh(geometry, material);
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.y = terrainConfig.y || 0;
    terrain.name = 'terrain';

    parentGroup.add(terrain);
    console.log('✅ Terrain erstellt');
  }

  /**
   * Richtet die Umgebung ein (Beleuchtung, etc.)
   */
  setupEnvironment(envConfig, parentGroup) {
    console.log('🌅 Richte Umgebung ein:', envConfig);

    // Basis-Beleuchtung
    const ambientLight = new THREE.AmbientLight(0x404040, envConfig.ambient_light || 0.6);
    parentGroup.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, envConfig.sun_intensity || 0.8);
    directionalLight.position.set(10, 10, 5);
    parentGroup.add(directionalLight);

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
   * Erstellt ein einzelnes Objekt
   */
  createSingleObject(objConfig, index) {
    let geometry;

    // Geometrie basierend auf Typ erstellen
    switch (objConfig.type) {
      case 'rock':
        geometry = new THREE.DodecahedronGeometry(0.5);
        break;
      case 'tree':
        geometry = new THREE.CylinderGeometry(0.3, 0.8, 3);
        break;
      case 'crystal':
        geometry = new THREE.OctahedronGeometry(0.8);
        break;
      case 'sphere':
        geometry = new THREE.SphereGeometry(objConfig.size || 1);
        break;
      case 'bookshelf':
      case 'box':
      default:
        geometry = new THREE.BoxGeometry(1, 1, 1);
        break;
    }

    const material = new THREE.MeshLambertMaterial({
      color: objConfig.color || '#8b4513'
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `${objConfig.type}_${index}`;

    // Position setzen
    if (objConfig.position) {
      mesh.position.set(...objConfig.position);
    }

    // Skalierung setzen
    if (objConfig.scale) {
      mesh.scale.set(...objConfig.scale);
    }

    // Interaktive Eigenschaften
    if (objConfig.interactive) {
      mesh.userData.interactive = true;
      mesh.userData.script = objConfig.script;
    }

    // Interaktions-Text
    if (objConfig.interaction) {
      mesh.userData.interaction = objConfig.interaction;
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

        // Aura-Ring für NPC (wie im bestehenden System)
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
    // NPC als Plane erstellen (wie im bestehenden System)
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // NPC-Textur zeichnen
    ctx.fillStyle = personaConfig.appearance?.color || '#ff6b6b';
    ctx.fillRect(0, 0, 128, 128);
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(personaConfig.name, 64, 30);
    ctx.fillText(`(${personaConfig.role || 'NPC'})`, 64, 50);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshLambertMaterial({ 
      map: texture,
      transparent: true,
      emissive: new THREE.Color(personaConfig.appearance?.color || '#ff6b6b'),
      emissiveIntensity: 0.3
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const persona = new THREE.Mesh(geometry, material);

    // Position setzen
    if (personaConfig.position) {
      persona.position.set(...personaConfig.position);
      persona.position.y += 1; // Etwas erhöht für Sichtbarkeit
    }

    // UserData für das Dialog-System
    persona.userData = {
      type: 'persona',
      name: personaConfig.name,
      role: personaConfig.role || 'NPC',
      id: `persona_${index}`,
      zoneId: zoneId,
      dialogue: personaConfig.dialogue,
      behavior: personaConfig.behavior,
      // Für das bestehende Dialog-System
      greeting: personaConfig.behavior?.greeting || personaConfig.dialogue?.opening || 'Hallo!'
    };

    persona.name = personaConfig.name;
    return persona;
  }

  /**
   * Erstellt Aura-Ring für Persona (wie im bestehenden System)
   */
  createPersonaAura(persona) {
    const ringGeometry = new THREE.RingGeometry(1.2, 1.6, 16);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x44dd44,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });
    
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.copy(persona.position).add(new THREE.Vector3(0, 0.05, 0));
    ring.rotation.x = Math.PI / 2;
    ring.userData = { type: 'personaAura', target: persona };
    
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
    // Portal-Material (animiert wie im bestehenden System)
    const portalMaterial = new THREE.MeshBasicMaterial({
      color: portalConfig.color || '#4169e1',
      transparent: true,
      opacity: 0.7,
      emissive: new THREE.Color(portalConfig.color || '#4169e1'),
      emissiveIntensity: 0.8
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
}
