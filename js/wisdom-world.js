import * as THREE from 'three';
import { worldStore, EVENT_KINDS } from './core/event-store.js';
import { ThirdPersonCamera } from './core/camera.js';
import { Player } from './core/player.js';
import { InputManager } from './core/input-manager.js';
import { ZoneManager } from './core/zone-manager.js';
import { InteractionSystem } from './core/interaction-system.js';
import { DialogSystem } from './core/dialog-system.js';
import { UIManager } from './ui/ui-manager.js';
import { YamlPlayer } from './core/yaml-player.js';
import { URLRouter } from './core/url-router.js';
import { applyEnvironment } from './world-generation/environment.js';

export class WisdomWorld {
  constructor() {
    this.init();
  }

  init() {
    // Initialize data store
    worldStore.load();

    // Three.js setup
    this.setupThreeJS();
    
    // Note: Other systems will be initialized after YAML player is created
    // See initializeSystemsWithPlayer()
  }

  initializeSystemsWithPlayer() {
    // Core systems - WICHTIG: Reihenfolge beachten!
    this.player = new Player(this.worldRoot, this.currentPlayerObject);
    this.camera = new ThirdPersonCamera(this.threeCamera, this.currentPlayerObject);
    this.inputManager = new InputManager();
    this.zoneManager = new ZoneManager(this.worldRoot);
    
    // Terrain-Referenz wird nach initializeWorld() gesetzt, wenn Zone geladen ist
    // InteractionSystem braucht camera und zoneManager
    this.interactionSystem = new InteractionSystem(this.zoneManager, this.camera, this.currentPlayerObject);
    this.dialogSystem = new DialogSystem();
    this.uiManager = new UIManager();

    // Setup connections between systems
    this.setupConnections();
    
    // Initialize input handling
    this.inputManager.init(this.canvas);
    
    // Setup UI controls
    this.setupUI();
    
    // Start render loop
    this.setupRenderLoop();
    
    // Initialize with first zone (Standard-Initialisierung wiederhergestellt)
    this.initializeWorld();
    
    // URL-Router als zusätzliches Feature hinzufügen
    this.urlRouter = new URLRouter({
      loadPredefinedZone: (zoneId) => this.loadPredefinedZone(zoneId),
      loadYAMLFromString: (yamlString) => this.loadYAMLFromString(yamlString)
    });
  }

  setupThreeJS() {
    this.canvas = document.getElementById('three');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias:true });
    
    this.scene = new THREE.Scene();
    // Mache Instanz global verfügbar für Debug
    window.wisdomWorld = this;

    this.threeCamera = new THREE.PerspectiveCamera(60, 1, 0.1, 2000);
    this.threeCamera.position.set(0, 5, 8);

    // Bootstrap Lighting (named so we can remove later once environment is applied)
    const hemi = new THREE.HemisphereLight(0xaaccff, 0x223344, 0.5);
    hemi.name = 'BOOTSTRAP_Hemi';
    this.scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.name = 'BOOTSTRAP_Dir';
    dir.position.set(5,10,3);
    this.scene.add(dir);

    // World container
    this.worldRoot = new THREE.Group();
    this.scene.add(this.worldRoot);

    // Create default YAML player (instead of simple marker)
    this.createDefaultYamlPlayer();

    // Clock for animations
    this.clock = new THREE.Clock();

    // Window resize handler
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  createDefaultYamlPlayer() {
    // Import YamlPlayer and create default player
    import('./core/yaml-player.js').then(({ YamlPlayer }) => {
      const defaultPlayerConfig = {
        appearance: {
          body_color: "#3366cc",
          skin_color: "#f4c2a1", 
          hair_color: "#8b4513",
          height: 0.6,  // Smaller height to prevent sinking
          proportions: {
            head_size: 0.25,
            torso_height: 0.7,
            arm_length: 0.5,
            leg_length: 0.6
          }
        },
        style: {
          hair_type: "short",
          accessories: []
        },
        animations: {
          idle: { arm_swing: 0.1, body_sway: 0.05 },
          walking: { arm_swing: 0.8, leg_swing: 0.8, speed: 12 },
          running: { arm_swing: 1.2, leg_swing: 1.2, speed: 18 }
        }
      };

      this.yamlPlayer = new YamlPlayer(defaultPlayerConfig);
      this.currentPlayerObject = this.yamlPlayer.avatar;
      
      // Set position and add to scene
      this.currentPlayerObject.position.set(0, 0.1, 0);  // Lower base position
      this.scene.add(this.currentPlayerObject);
      
      // Store player configuration in userData for movement system
      this.currentPlayerObject.userData = this.currentPlayerObject.userData || {};
      this.currentPlayerObject.userData.yamlPlayer = this.yamlPlayer;
      this.currentPlayerObject.userData.type = 'player';
      this.currentPlayerObject.userData.isPlayer = true;

      // Update systems with new player
      this.initializeSystemsWithPlayer();

      console.log('✨ Default YAML Player erstellt');
    }).catch(error => {
      console.error('Fehler beim Laden des YAML Players:', error);
      
      // Fallback to standard marker if YAML player fails
      this.playerMarker = new THREE.Mesh(
        new THREE.ConeGeometry(0.25, 0.8, 12),
        new THREE.MeshStandardMaterial({ color: 0x6ee7ff, emissive: 0x073a55, emissiveIntensity: 0.5 })
      );
      this.playerMarker.position.set(0,0.4,0);
      this.playerMarker.rotation.x = Math.PI;
      this.scene.add(this.playerMarker);
      this.currentPlayerObject = this.playerMarker;
      
      // Initialize systems with fallback player
      this.initializeSystemsWithPlayer();
    });
  }

  setupConnections() {
    // Input callbacks
    this.inputManager.setInteractCallback(() => this.interactionSystem.interact());
    this.inputManager.setMouseInteractCallback((e) => this.interactionSystem.interactWithMouse(e));
    this.inputManager.setMouseMoveCallback((deltaX, deltaY) => {
      this.camera.addMouseRotation(deltaX, deltaY);
    });

    // Interaction callbacks
    this.interactionSystem.setPersonaInteractCallback((npc) => this.dialogSystem.openDialog(npc));
    this.interactionSystem.setPortalInteractCallback((targetZone) => {
      this.zoneManager.setCurrentZone(targetZone, null, this.player, this.camera);
      this.setTerrainReference();
      this.applyCurrentEnvironment();
      this.updateUI();
    });
    this.interactionSystem.setFeedbackCallback((message) => this.dialogSystem.addBubble('npc', message));
  }

  setupUI() {
    this.uiManager.setupControls({
      onNewZone: (id, persona) => {
        this.zoneManager.setCurrentZone(id, persona, this.player, this.camera);
        this.setTerrainReference();
        this.applyCurrentEnvironment();
        this.updateUI();
        this.uiManager.appendLog('Zone erzeugt: ' + this.zoneManager.synthZoneTitle(id));
      },
      onNewPortal: () => {
        if(!this.zoneManager.currentZoneId){
          this.uiManager.appendLog('Keine aktive Zone.');
          return;
        }
        const target = crypto.randomUUID().split('-')[0];
        this.zoneManager.linkPortal(this.zoneManager.currentZoneId, target);
        this.uiManager.appendLog('Portal markiert zu: ' + this.zoneManager.synthZoneTitle(target));
        this.updateUI();
      },
      onLoadYamlZone: async (zoneId) => {
        try {
          console.log(`🌍 Lade YAML-Zone: ${zoneId}`);
          await this.zoneManager.setCurrentZone(zoneId, null, this.player, this.camera);
          this.setTerrainReference();
          this.applyCurrentEnvironment();
          this.updateUI();
          this.uiManager.appendLog(`YAML-Zone geladen: ${this.zoneManager.synthZoneTitle(zoneId)}`);
        } catch (error) {
          console.error('❌ Fehler beim Laden der YAML-Zone:', error);
          this.uiManager.appendLog(`Fehler beim Laden von ${zoneId}: ${error.message}`);
        }
      },
      onReset: () => {
        localStorage.removeItem('wisdom_world_events_v1');
        worldStore.load();
        this.uiManager.appendLog('Persistenz gelöscht.');
        this.zoneManager.clear();
        this.dialogSystem.clear();
        this.uiManager.clearAll();
        this.zoneManager.currentZoneId = null;
      },
      onMessage: (text) => {
        this.dialogSystem.handleUserMessage(
          text,
          this.zoneManager.currentZoneId,
          (fromZone, toZone) => {
            this.zoneManager.linkPortal(fromZone, toZone);
            this.updateUI();
          },
          (zoneId) => {
            const zoneEvt = worldStore.latestByTag(EVENT_KINDS.ZONE, 'zone', zoneId);
            return zoneEvt?.content?.description;
          }
        );
      }
    });

    // Setup logging callback for worldStore
    const originalAdd = worldStore.add.bind(worldStore);
    worldStore.add = (evt) => {
      originalAdd(evt,
        (line) => this.uiManager.appendLog(line),
        () => this.updateUI()
      );
    };

    // YAML-Funktionen global verfügbar machen
    window.yamlHelpers = {
      loadZone: (yamlPath) => this.loadZoneFromYaml(yamlPath),
      loadExamples: () => this.zoneManager.loadExampleWorlds(),
      listWorlds: () => Array.from(this.zoneManager.loadedWorldDocs.keys()),
      getWorldDoc: (id) => this.zoneManager.loadedWorldDocs.get(id),
      switchToZone: (id) => this.switchToYamlZone(id)
    };

    

    // === Debug: Neutrales Insert-Hook-System ===
    // window.debugInsert(fn) registriert eine per-Frame Callback-Funktion, die in der Render-Schleife aufgerufen wird.
    // Beispiel in der Konsole:
    //   debugInsert(({player, scene}) => {
    //     const gy = player._raycastGroundY(player.pos.x, player.pos.z, player.marker?.position.y ?? 0);
    //     const desired = (gy!=null) ? gy + player.avatarHeightOffset : null;
    //     if ((window.__ctr=(window.__ctr||0))+1 % 10 === 0) console.log('gy=',gy,'desired=',desired,'markerY=',player.marker?.position.y, 'rootY=', player.worldRoot?.position.y, 'lastGood=', player.lastGoodGroundY);
    //   });
    //   // Zum Entfernen:
    //   debugInsert(null);
    window.__debugInsertFn = null;
    window.debugInsert = (fn) => {
      if (typeof fn === 'function') {
        window.__debugInsertFn = fn;
        console.log('[debugInsert] aktiviert');
      } else {
        window.__debugInsertFn = null;
        console.log('[debugInsert] deaktiviert');
      }
    };

    console.log('🎮 YAML-Hilfsfunktionen verfügbar:');
    console.log('- yamlHelpers.loadZone(path) - Lädt YAML-Zone');
    console.log('- yamlHelpers.loadExamples() - Lädt alle Beispielwelten');
    console.log('- yamlHelpers.listWorlds() - Listet geladene Welten');
    console.log('- yamlHelpers.getWorldDoc(id) - Holt Weltdaten');
    console.log('- yamlHelpers.switchToZone(id) - Wechselt zu Zone');
  }

  setupRenderLoop() {
    // Throttle-Helfer für seltene Updates
    const throttle = (fn, minMs) => {
      let last = 0; let scheduled = false; let lastArgs = null;
      return (...args) => {
        const now = performance.now();
        lastArgs = args;
        if (now - last >= minMs) {
          last = now; fn(...args); return;
        }
        if (!scheduled) {
          scheduled = true;
          const wait = Math.max(0, minMs - (now - last));
          setTimeout(() => { scheduled = false; last = performance.now(); fn(...lastArgs); }, wait);
        }
      };
    };

    // Gedrosselte Funktionen
    const updateZoneAnimationsThrottled = throttle((dt) => {
      this.zoneManager.updateAnimations(
        dt,
        this.clock,
        (obj) => this.interactionSystem.isObjectInRange(obj),
        this.threeCamera
      );
    }, 16); // ~60 Hz max

    const updateYamlPlayerThrottled = throttle(() => {
      if (this.yamlPlayer) this.yamlPlayer.update();
    }, 16);

    // Sichtbarkeits-Pause der Engine
    let isPaused = false;
    const onVisibilityChange = () => { isPaused = document.hidden; };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Frame-Zeit-Messung (seltenes Warn-Log)
    let warnCooldown = 0;

    const animate = (time) => {
      if (isPaused) {
        // Renderer pausieren, aber nächste RAF weiter planen
        this.clock.getDelta();
        this.renderer.setAnimationLoop(animate);
        return;
      }

      const dt = this.clock.getDelta();
      const frameStart = performance.now();

      // Update player movement and rotation
      const isMoving = this.player.move(
        dt,
        this.inputManager.keys,
        this.inputManager.isRightMouseDown,
        this.camera.getYaw(),
        (rotationChange) => this.camera.addKeyboardRotation(rotationChange)
      );

      // Update YAML player animations if active (gedrosselt)
      if (this.yamlPlayer) {
        if (isMoving) {
          const isRunning = this.inputManager.keys.has('shift') || this.inputManager.keys.has('Shift');
          const animationType = isRunning ? 'running' : 'walking';
          this.yamlPlayer.startAnimation(animationType);
        } else {
          this.yamlPlayer.stopAnimation();
        }
        updateYamlPlayerThrottled();
      }

      // Update camera position
      this.camera.update();

      // Update zone animations (gedrosselt)
      updateZoneAnimationsThrottled(dt);

      // Optionaler per-Frame-Debug-Hook (try/catch ohne Garbage)
      const hook = window.__debugInsertFn;
      if (typeof hook === 'function') {
        try { hook({ player: this.player, scene: this.scene, app: this }); } catch {}
      }

      this.renderer.render(this.scene, this.threeCamera);

      const frameDur = performance.now() - frameStart;
      if (frameDur > 16 && (time - warnCooldown) > 2000) {
        warnCooldown = time;
        // Dezent: seltene Warnung statt Spam
        console.warn(`[Perf] Frame ${frameDur.toFixed(1)}ms (>16ms)`);
      }

      this.renderer.setAnimationLoop(animate);
    };

    // Verwende setAnimationLoop (besser integriert mit WebGL/VR, stabilere Taktung)
    this.renderer.setAnimationLoop(animate);
  }

  updateUI() {
    this.uiManager.refreshZonesUI(
      (id) => {
        this.zoneManager.setCurrentZone(id, null, this.player, this.camera);
        this.setTerrainReference();
        this.updateUI();
      },
      (id) => this.zoneManager.synthZoneTitle(id)
    );
    
    this.uiManager.refreshPersonasUI(
      this.zoneManager.getCurrentZone(),
      (npc) => this.dialogSystem.openDialog(npc)
    );

    this.setTerrainReference();
    // Versuche nach Terrain-/Zone-Setup die Environment (inkl. Fog) anzuwenden
    this.applyCurrentEnvironment();
  }

  // Hilfsfunktion um Terrain-Referenz korrekt zu setzen
  setTerrainReference() {
    const z = this.zoneManager.getCurrentZone();
    if (!z?.group) {
      return;
    }
    
    // Rekursive Suche nach einem Mesh mit Geometrie
    const findTerrainMesh = (object) => {
      // Prüfe das aktuelle Objekt
      if (object.type === 'Mesh' && object.geometry && object.userData?.terrainSize) {
        return object;
      }
      
      // Durchsuche Kinder rekursiv
      if (object.children) {
        for (const child of object.children) {
          const found = findTerrainMesh(child);
          if (found) return found;
        }
      }
      
      return null;
    };
    
    const terrain = findTerrainMesh(z.group);
    
    if (terrain && this.player) {
      this.player.setTerrainRef(terrain);
    }
  }

  // Environment/Fog aus aktueller WorldSpec anwenden
  applyCurrentEnvironment() {
    try {
      // Entferne Bootstrap-Lichter, damit YAML-Environment allein gilt
      this.scene.children
        .filter(c => c.isLight && (c.name === 'BOOTSTRAP_Hemi' || c.name === 'BOOTSTRAP_Dir'))
        .forEach(l => this.scene.remove(l));

      // Ermittele Environment-Quelle
      const z = this.zoneManager?.getCurrentZone?.();
      const currentSpec = this.zoneManager?.getCurrentWorldDoc?.() || z?.spec || null;
      const env = currentSpec?.environment;
      if (!env) return;

      // applyEnvironment erwartet (envConfig, sceneOrGroup, options)
      applyEnvironment(env, this.scene, { skipSkybox: false, skipFog: false, skipLights: false });

      // Renderer ClearColor an Scene-Background angleichen, falls gesetzt
      if (this.scene.background instanceof THREE.Color) {
        this.renderer.setClearColor(this.scene.background, 1);
      }
    } catch (e) {
      console.warn('Environment-Anwendung fehlgeschlagen:', e);
    }
  }

  initializeWorld() {
    this.updateUI();
    const initial = worldStore.byKind(EVENT_KINDS.ZONE)[0];
    if(initial){
      const id = initial.tags.find(t=>t[0]==='zone')[1];
      this.zoneManager.setCurrentZone(id, null, this.player, this.camera);
    } else {
      this.zoneManager.setCurrentZone('start-'+crypto.randomUUID().split('-')[0], 'Forscher', this.player, this.camera);
    }
    this.setTerrainReference();
    this.applyCurrentEnvironment();
    this.updateUI();
  }

  resize() {
    const rect = document.getElementById('viewport').getBoundingClientRect();
    this.renderer.setSize(rect.width, rect.height, false);
    this.threeCamera.aspect = rect.width/rect.height;
    this.threeCamera.updateProjectionMatrix();
  }

  /**
   * Lädt eine YAML-Zone
   */
  async loadZoneFromYaml(yamlPath) {
    try {
      const result = await this.zoneManager.loadZoneFromYaml(yamlPath);
      
      // Update player if zone has player configuration
      this.updatePlayerFromZone(result);
      
      this.updateUI();
      this.uiManager.appendLog(`YAML-Zone geladen: ${result.spec?.name || yamlPath}`);
      return result;
    } catch (error) {
      this.uiManager.appendLog(`Fehler beim Laden: ${error.message}`);
      throw error;
    }
  }

  updatePlayerFromZone(zoneResult) {
    // Always use YAML player now (either custom or default)
    if (zoneResult.player) {
      console.log('🎭 YAML Player gefunden (custom oder default)');
      
      // Remove old player marker from scene
      if (this.currentPlayerObject && this.currentPlayerObject !== zoneResult.player.avatar) {
        this.scene.remove(this.currentPlayerObject);
      }
      
      // Set new YAML player as current player object
      this.yamlPlayer = zoneResult.player;
      this.currentPlayerObject = zoneResult.player.avatar;
      
      // Add YAML player avatar to scene (not to zone group)
      if (!this.scene.children.includes(this.currentPlayerObject)) {
        this.scene.add(this.currentPlayerObject);
      }
      
      // Ensure player starts at origin for movement system
      this.currentPlayerObject.position.set(0, 0.1, 0);
      
      // Update all systems to use new player
      this.camera.playerMarker = this.currentPlayerObject;
      this.player.setMarker(this.currentPlayerObject);
      this.interactionSystem.playerMarker = this.currentPlayerObject;
      
      // Remove old blue cone marker if it exists
      if (this.playerMarker && this.scene.children.includes(this.playerMarker)) {
        this.scene.remove(this.playerMarker);
      }
      
      this.uiManager.appendLog('✨ YAML Player aktiviert');
    } else {
      console.log('❌ Kein Player verfügbar - das sollte nicht passieren');
    }
  }

  /**
   * Lädt eine vordefinierte Zone (für URL-Router)
   */
  async loadPredefinedZone(zoneId) {
    try {
      console.log(`🌍 Lade vordefinierte Zone: ${zoneId}`);
      
      // Versuche YAML-Zone zu laden
      const yamlPath = `worlds/${zoneId}.yaml`;
      await this.loadZoneFromYaml(yamlPath);
      
      // URL-Hash aktualisieren
      this.urlRouter.setZoneHash(zoneId);
      
    } catch (error) {
      console.warn(`⚠️ YAML-Zone ${zoneId} nicht gefunden, erstelle prozedurale Zone`);
      
      // Fallback: Prozedurale Zone erstellen
      this.zoneManager.setCurrentZone(zoneId, 'Forscher', this.player, this.camera);
      this.setTerrainReference();
      this.applyCurrentEnvironment();
      this.updateUI();
    }
  }

  /**
   * Lädt YAML aus String (für URL-Router)
   */
  async loadYAMLFromString(yamlString) {
    try {
      // YAML parsen und temporäre Zone erstellen
      const jsyaml = window.jsyaml || (await import('https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/+esm'));
      const worldData = jsyaml.load(yamlString);
      
      // Zone-ID generieren falls nicht vorhanden
      if (!worldData.id) {
        worldData.id = 'url-zone-' + Date.now();
      }
      
      // Als temporäre Zone laden
      this.zoneManager.loadedWorldDocs.set(worldData.id, worldData);
      await this.switchToYamlZone(worldData.id);
      
      console.log(`🌍 YAML-Zone aus URL geladen: ${worldData.name}`);
      
    } catch (error) {
      console.error('❌ Fehler beim Laden der YAML-Zone aus URL:', error);
      this.loadPredefinedZone('zone-welcome'); // Fallback
    }
  }

  /**
   * Wechselt zu einer bereits geladenen YAML-Zone
   */
  switchToYamlZone(zoneId) {
    const worldData = this.zoneManager.loadedWorldDocs.get(zoneId);
    if (!worldData) {
      this.uiManager.appendLog(`Zone ${zoneId} nicht gefunden. Lade zuerst mit yamlHelpers.loadZone()`);
      return;
    }

    // Clear current zone and generate YAML zone
    if (this.zoneManager.currentZoneId && this.zoneManager.zoneMeshes[this.zoneManager.currentZoneId]) {
      this.zoneManager.worldRoot.remove(this.zoneManager.zoneMeshes[this.zoneManager.currentZoneId].group);
    }

    this.zoneManager.generateYamlZone(zoneId, worldData);
    this.zoneManager.currentZoneId = zoneId;

    // Reset player position
    this.player.reset();
    this.camera.reset();

    this.setTerrainReference();
    this.applyCurrentEnvironment();
    this.updateUI();
    this.uiManager.appendLog(`Wechsel zu YAML-Zone: ${worldData.name}`);
  }
}
