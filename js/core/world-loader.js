import * as THREE from 'three';

/**
 * World Loader - Lädt und konvertiert YAML-Weltdefinitionen
 */
export class WorldLoader {
  constructor() {
    this.loadedWorlds = new Map();
    this.yamlParser = null;
    this.initYAMLParser();
  }

  async initYAMLParser() {
    // Lade js-yaml dynamisch
    if (typeof window !== 'undefined' && !window.jsyaml) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js';
      document.head.appendChild(script);
      
      await new Promise((resolve) => {
        script.onload = resolve;
      });
    }
    this.yamlParser = window.jsyaml;
  }

  /**
   * Lädt eine YAML-Weltdefinition
   */
  async loadWorld(yamlPath) {
    try {
      console.log(`🌍 Lade YAML-Welt: ${yamlPath}`);
      
      const response = await fetch(yamlPath);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const yamlText = await response.text();
      const worldData = this.yamlParser.load(yamlText);
      
      console.log('📄 YAML-Weltdaten geladen:', worldData);
      
      // Cache the loaded world
      this.loadedWorlds.set(worldData.id, worldData);
      
      return worldData;
    } catch (error) {
      console.error(`❌ Fehler beim Laden von ${yamlPath}:`, error);
      throw error;
    }
  }

  /**
   * Konvertiert YAML-Weltdaten zu THREE.js-Objekten
   */
  convertToThreeJS(worldData, worldRoot) {
    console.log('🏗️ Konvertiere YAML zu THREE.js...');
    
    // Szene leeren
    this.clearWorld(worldRoot);
    
    const result = {
      terrain: null,
      objects: [],
      portals: [],
      personas: [],
      environment: worldData.environment || {}
    };

    // Terrain erstellen
    if (worldData.terrain) {
      result.terrain = this.createTerrain(worldData.terrain, worldRoot);
    }

    // Objekte erstellen
    if (worldData.objects) {
      result.objects = this.createObjects(worldData.objects, worldRoot);
    }

    // Portale erstellen
    if (worldData.portals) {
      result.portals = this.createPortals(worldData.portals, worldRoot);
    }

    // Personas erstellen
    if (worldData.personas) {
      result.personas = this.createPersonas(worldData.personas, worldRoot);
    }

    // Umgebung anwenden
    this.applyEnvironment(worldData.environment, worldRoot);

    console.log(`✅ YAML-Welt konvertiert: ${result.objects.length} Objekte, ${result.portals.length} Portale, ${result.personas.length} Personas`);
    
    return result;
  }

  /**
   * Leert die Welt
   */
  clearWorld(worldRoot) {
    while (worldRoot.children.length > 0) {
      const child = worldRoot.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => mat.dispose());
        } else {
          child.material.dispose();
        }
      }
      worldRoot.remove(child);
    }
  }

  /**
   * Erstellt das Terrain
   */
  createTerrain(terrainData, worldRoot) {
    const size = terrainData.size || [50, 50];
    const geometry = new THREE.PlaneGeometry(size[0], size[1]);
    const material = new THREE.MeshLambertMaterial({
      color: terrainData.color || '#4a7c1e'
    });

    const terrain = new THREE.Mesh(geometry, material);
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.y = 0;
    terrain.name = 'terrain';
    terrain.userData = { type: 'terrain', ...terrainData };

    worldRoot.add(terrain);
    console.log('🌍 Terrain erstellt:', terrainData);
    
    return terrain;
  }

  /**
   * Erstellt Objekte aus YAML-Definition
   */
  createObjects(objectsData, worldRoot) {
    const objects = [];

    objectsData.forEach((objData, index) => {
      const mesh = this.createObjectMesh(objData);
      if (mesh) {
        mesh.name = `object_${index}`;
        mesh.userData = { 
          type: 'object', 
          yamlData: objData,
          interactive: objData.interactive || false,
          script: objData.script || null
        };

        // Position setzen
        if (objData.position) {
          mesh.position.set(objData.position[0], objData.position[1], objData.position[2]);
        }

        // Skalierung setzen
        if (objData.scale) {
          mesh.scale.set(objData.scale[0], objData.scale[1], objData.scale[2]);
        }

        worldRoot.add(mesh);
        objects.push(mesh);
        
        console.log(`🎲 Objekt erstellt: ${objData.type} an Position [${objData.position}]`);
      }
    });

    return objects;
  }

  /**
   * Erstellt ein einzelnes Objekt-Mesh basierend auf dem Typ
   */
  createObjectMesh(objData) {
    let geometry;
    
    switch (objData.type) {
      case 'rock':
        geometry = new THREE.DodecahedronGeometry(1);
        break;
      case 'tree':
        geometry = new THREE.CylinderGeometry(0.3, 0.8, 3, 8);
        break;
      case 'crystal':
        geometry = new THREE.OctahedronGeometry(1);
        break;
      case 'mushroom':
        geometry = new THREE.CylinderGeometry(0.8, 0.2, 1, 8);
        break;
      case 'bookshelf':
        geometry = new THREE.BoxGeometry(2, 4, 0.5);
        break;
      case 'reading_table':
        geometry = new THREE.BoxGeometry(2, 0.1, 1);
        break;
      case 'globe':
        geometry = new THREE.SphereGeometry(0.5, 16, 16);
        break;
      case 'stone_circle':
        geometry = new THREE.TorusGeometry(3, 0.3, 8, 16);
        break;
      case 'crystal_knowledge':
        geometry = new THREE.OctahedronGeometry(1.5);
        break;
      default:
        geometry = new THREE.BoxGeometry(1, 1, 1);
    }

    const material = new THREE.MeshLambertMaterial({
      color: objData.color || '#888888'
    });

    // Für interaktive Objekte Emissive hinzufügen
    if (objData.interactive) {
      material.emissive = new THREE.Color(objData.color || '#888888');
      material.emissiveIntensity = 0.1;
    }

    return new THREE.Mesh(geometry, material);
  }

  /**
   * Erstellt Portale
   */
  createPortals(portalsData, worldRoot) {
    const portals = [];

    portalsData.forEach((portalData, index) => {
      const size = portalData.size || [2, 3, 0.5];
      const geometry = new THREE.BoxGeometry(size[0], size[1], size[2]);
      const material = new THREE.MeshLambertMaterial({
        color: portalData.color || '#4169e1',
        transparent: true,
        opacity: 0.7,
        emissive: new THREE.Color(portalData.color || '#4169e1'),
        emissiveIntensity: 0.3
      });

      const portal = new THREE.Mesh(geometry, material);
      portal.position.set(portalData.position[0], portalData.position[1], portalData.position[2]);
      portal.name = `portal_${portalData.id}`;
      portal.userData = {
        type: 'portal',
        destination: portalData.destination,
        portalName: portalData.name,
        yamlData: portalData
      };

      worldRoot.add(portal);
      portals.push(portal);
      
      console.log(`🚪 Portal erstellt: ${portalData.name} -> ${portalData.destination}`);
    });

    return portals;
  }

  /**
   * Erstellt NPCs/Personas
   */
  createPersonas(personasData, worldRoot) {
    const personas = [];

    personasData.forEach((personaData, index) => {
      // Basis-Geometrie für NPC
      const height = personaData.appearance?.height || 1.8;
      const geometry = new THREE.CapsuleGeometry(0.3, height, 4, 8);
      const material = new THREE.MeshLambertMaterial({
        color: personaData.appearance?.color || '#ff6b6b'
      });

      const persona = new THREE.Mesh(geometry, material);
      persona.position.set(personaData.position[0], height/2, personaData.position[2]);
      persona.name = `persona_${personaData.name.replace(/\s+/g, '_')}`;
      persona.userData = {
        type: 'persona',
        personaName: personaData.name,
        dialogue: personaData.dialogue,
        behavior: personaData.behavior,
        yamlData: personaData
      };

      // Namenslabel erstellen
      const nameLabel = this.createNameLabel(personaData.name);
      nameLabel.position.set(0, height + 0.5, 0);
      persona.add(nameLabel);

      worldRoot.add(persona);
      personas.push(persona);
      
      console.log(`👤 Persona erstellt: ${personaData.name} an Position [${personaData.position}]`);
    });

    return personas;
  }

  /**
   * Erstellt ein Namenslabel für NPCs
   */
  createNameLabel(name) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    
    context.fillStyle = 'rgba(0, 0, 0, 0.8)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.fillStyle = 'white';
    context.font = '24px Arial';
    context.textAlign = 'center';
    context.fillText(name, canvas.width / 2, canvas.height / 2 + 8);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(2, 0.5, 1);
    
    return sprite;
  }

  /**
   * Wendet Umgebungseinstellungen an
   */
  applyEnvironment(envData, worldRoot) {
    if (!envData) return;

    console.log('🌤️ Wende Umgebungseinstellungen an:', envData);
    
    // Hier könnten später erweiterte Umgebungseffekte implementiert werden
    // - Skybox-Wechsel
    // - Nebel
    // - Lichtanpassungen
    // - Partikeleffekte
  }

  /**
   * Validiert YAML-Weltdaten
   */
  validateWorldData(worldData) {
    const errors = [];
    const warnings = [];

    if (!worldData.name) errors.push('Weltname fehlt');
    if (!worldData.id) errors.push('Welt-ID fehlt');
    if (!worldData.description) warnings.push('Weltbeschreibung fehlt');

    // Validiere Objekte
    if (worldData.objects) {
      worldData.objects.forEach((obj, index) => {
        if (!obj.type) errors.push(`Objekt ${index}: Typ fehlt`);
        if (!obj.position) errors.push(`Objekt ${index}: Position fehlt`);
      });
    }

    // Validiere Portale
    if (worldData.portals) {
      worldData.portals.forEach((portal, index) => {
        if (!portal.destination) errors.push(`Portal ${index}: Ziel fehlt`);
        if (!portal.position) errors.push(`Portal ${index}: Position fehlt`);
      });
    }

    // Validiere Personas
    if (worldData.personas) {
      worldData.personas.forEach((persona, index) => {
        if (!persona.name) errors.push(`Persona ${index}: Name fehlt`);
        if (!persona.position) errors.push(`Persona ${index}: Position fehlt`);
      });
    }

    return { errors, warnings, isValid: errors.length === 0 };
  }
}
