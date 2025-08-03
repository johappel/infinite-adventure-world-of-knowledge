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

    // 7. Animation-Loop für dynamische Elemente starten
    this.startZoneAnimations(zoneGroup);

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

    let geometry;
    
    // Verschiedene Terrain-Typen
    if (terrainConfig.type === 'hills') {
      console.log('🏔️ Erstelle Hills-Terrain mit Höhenvariation');
      // Hills: PlaneGeometry mit mehr Segmenten für Verformung
      geometry = new THREE.PlaneGeometry(width, height, 64, 64);
      
      // Vertices manipulieren für Hills-Effekt
      const positionAttribute = geometry.attributes.position;
      const vertex = new THREE.Vector3();
      
      for (let i = 0; i < positionAttribute.count; i++) {
        vertex.fromBufferAttribute(positionAttribute, i);
        
        // Mehrere Hügel mit verschiedenen Frequenzen
        const x = vertex.x;
        const z = vertex.z;
        
        // Haupthügel
        const wave1 = Math.sin(x * 0.08) * Math.cos(z * 0.08) * 3;
        // Kleinere Hügel
        const wave2 = Math.sin(x * 0.15 + 1.5) * Math.cos(z * 0.12 + 0.8) * 2;
        // Detailstrukturen
        const wave3 = Math.sin(x * 0.25 + 3) * Math.cos(z * 0.2 + 2) * 1;
        // Zufälliges Rauschen
        const noise = (Math.random() - 0.5) * 0.5;
        
        const elevation = wave1 + wave2 + wave3 + noise;
        positionAttribute.setY(i, elevation);
      }
      
      // WICHTIG: Position-Updates aktivieren
      positionAttribute.needsUpdate = true;
      // Normale neu berechnen für korrekte Beleuchtung
      geometry.computeVertexNormals();
    } else if (terrainConfig.type === 'mountains') {
      console.log('⛰️ Erstelle Mountains-Terrain');
      // Mountains: noch stärkere Höhenunterschiede
      geometry = new THREE.PlaneGeometry(width, height, 96, 96);
      
      const positionAttribute = geometry.attributes.position;
      const vertex = new THREE.Vector3();
      
      for (let i = 0; i < positionAttribute.count; i++) {
        vertex.fromBufferAttribute(positionAttribute, i);
        
        const x = vertex.x;
        const z = vertex.z;
        const distance = Math.sqrt(x * x + z * z);
        
        // Bergketten
        const mountain1 = Math.sin(distance * 0.03) * 12;
        const mountain2 = Math.sin(x * 0.04) * Math.cos(z * 0.04) * 8;
        const ridges = Math.sin(x * 0.1) * Math.sin(z * 0.1) * 4;
        const noise = (Math.random() - 0.5) * 2;
        
        const elevation = mountain1 + mountain2 + ridges + noise;
        positionAttribute.setY(i, Math.max(0, elevation));
      }
      
      positionAttribute.needsUpdate = true;
      geometry.computeVertexNormals();
    } else {
      console.log('🟢 Erstelle flaches Terrain');
      // Flat terrain (default)
      geometry = new THREE.PlaneGeometry(width, height, 2, 2);
    }

    // Material für bessere Sichtbarkeit - MeshStandardMaterial statt Lambert
    const material = new THREE.MeshStandardMaterial({
      color: terrainConfig.color || '#4a7c1e',
      roughness: 0.7,
      metalness: 0.1,
      side: THREE.DoubleSide  // Terrain von beiden Seiten sichtbar
    });

    const terrain = new THREE.Mesh(geometry, material);
    terrain.rotation.x = -Math.PI / 2;  // Horizontal ausrichten
    terrain.position.y = terrainConfig.y || 0;
    terrain.name = 'terrain';
    terrain.receiveShadow = true;  // Schatten empfangen
    terrain.castShadow = false;    // Selbst keine Schatten werfen

    parentGroup.add(terrain);
    console.log('✅ Terrain erstellt');
  }

  /**
   * Richtet die Umgebung ein (Beleuchtung, etc.) - verbesserte Beleuchtung
   */
  setupEnvironment(envConfig, parentGroup) {
    console.log('🌅 Richte Umgebung ein:', envConfig);

    // Stärkere Umgebungsbeleuchtung
    const ambientLight = new THREE.AmbientLight(0x404040, envConfig.ambient_light || 0.8);
    parentGroup.add(ambientLight);

    // Hauptlicht mit Schatten
    const directionalLight = new THREE.DirectionalLight(0xffffff, envConfig.sun_intensity || 1.0);
    directionalLight.position.set(10, 20, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    parentGroup.add(directionalLight);
    
    // Zusätzliches Fülllicht
    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
    fillLight.position.set(-10, 10, -5);
    parentGroup.add(fillLight);

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

    // Geometrie basierend auf Typ erstellen
    switch (objConfig.type) {
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
      case 'mushroom':
        // Pilz: Kleiner Stiel + breiter Hut
        geometry = new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8, 1);
        break;
      case 'stone_circle':
        // Steinkreis als flacher Torus
        geometry = new THREE.TorusGeometry(2, 0.2, 8, 32);
        break;
      case 'bookshelf':
      case 'box':
      default:
        geometry = new THREE.BoxGeometry(1, 1, 1);
        break;
    }

    // Material mit MeshStandardMaterial für bessere Beleuchtung
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(objConfig.color || '#8b4513'),
      roughness: 0.7,
      metalness: 0.1
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `${objConfig.type}_${index}`;
    mesh.castShadow = true;    // Schatten werfen
    mesh.receiveShadow = true; // Schatten empfangen

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
    const geometry = new THREE.PlaneGeometry(6, 6);
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
    // Portal-Material (animiert wie im bestehenden System) - MeshStandardMaterial verwenden
    const portalMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(portalConfig.color || '#4169e1'),
      transparent: true,
      opacity: 0.7,
      emissive: new THREE.Color(portalConfig.color || '#4169e1'),
      emissiveIntensity: 0.3,  // Reduzierte Intensität
      roughness: 0.1,
      metalness: 0.3,
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
