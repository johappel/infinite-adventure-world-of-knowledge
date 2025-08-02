import * as THREE from 'three';
import { worldStore, EVENT_KINDS } from './core/event-store.js';
import { ThirdPersonCamera } from './core/camera.js';
import { Player } from './core/player.js';
import { InputManager } from './core/input-manager.js';
import { ZoneManager } from './core/zone-manager.js';
import { InteractionSystem } from './core/interaction-system.js';
import { DialogSystem } from './core/dialog-system.js';
import { UIManager } from './ui/ui-manager.js';

export class WisdomWorld {
  constructor() {
    this.init();
  }

  init() {
    // Initialize data store
    worldStore.load();

    // Three.js setup
    this.setupThreeJS();
    
    // Core systems
    this.player = new Player(this.worldRoot);
    this.camera = new ThirdPersonCamera(this.threeCamera, this.playerMarker);
    this.inputManager = new InputManager();
    this.zoneManager = new ZoneManager(this.worldRoot);
    this.interactionSystem = new InteractionSystem(this.zoneManager, this.threeCamera, this.playerMarker);
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
    
    // Initialize with first zone
    this.initializeWorld();
  }

  setupThreeJS() {
    this.canvas = document.getElementById('three');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias:true });
    
    this.scene = new THREE.Scene();
    this.threeCamera = new THREE.PerspectiveCamera(60, 1, 0.1, 2000);
    this.threeCamera.position.set(0, 5, 8);

    // Lighting
    const hemi = new THREE.HemisphereLight(0xaaccff, 0x223344, 0.5);
    this.scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5,10,3);
    this.scene.add(dir);

    // World container
    this.worldRoot = new THREE.Group();
    this.scene.add(this.worldRoot);

    // Player marker
    this.playerMarker = new THREE.Mesh(
      new THREE.ConeGeometry(0.25, 0.8, 12),
      new THREE.MeshStandardMaterial({ color: 0x6ee7ff, emissive: 0x073a55, emissiveIntensity: 0.5 })
    );
    this.playerMarker.position.set(0,0.4,0);
    this.playerMarker.rotation.x = Math.PI;
    this.scene.add(this.playerMarker);

    // Clock for animations
    this.clock = new THREE.Clock();

    // Window resize handler
    window.addEventListener('resize', () => this.resize());
    this.resize();
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
      this.updateUI();
    });
    this.interactionSystem.setFeedbackCallback((message) => this.dialogSystem.addBubble('npc', message));
  }

  setupUI() {
    this.uiManager.setupControls({
      onNewZone: (id, persona) => {
        this.zoneManager.setCurrentZone(id, persona, this.player, this.camera);
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
  }

  setupRenderLoop() {
    const animate = () => {
      const dt = this.clock.getDelta();
      
      // Update player movement and rotation
      this.player.move(
        dt, 
        this.inputManager.keys, 
        this.inputManager.isRightMouseDown, 
        this.camera.getYaw(),
        (rotationChange) => this.camera.addKeyboardRotation(rotationChange)
      );
      
      // Update camera position
      this.camera.update();
      
      // Update zone animations
      this.zoneManager.updateAnimations(
        dt, 
        this.clock, 
        (obj) => this.interactionSystem.isObjectInRange(obj),
        this.threeCamera
      );

      this.renderer.render(this.scene, this.threeCamera);
      requestAnimationFrame(animate);
    };
    animate();
  }

  updateUI() {
    this.uiManager.refreshZonesUI(
      (id) => {
        this.zoneManager.setCurrentZone(id, null, this.player, this.camera);
        this.updateUI();
      },
      (id) => this.zoneManager.synthZoneTitle(id)
    );
    
    this.uiManager.refreshPersonasUI(
      this.zoneManager.getCurrentZone(),
      (npc) => this.dialogSystem.openDialog(npc)
    );
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
    this.updateUI();
  }

  resize() {
    const rect = document.getElementById('viewport').getBoundingClientRect();
    this.renderer.setSize(rect.width, rect.height, false);
    this.threeCamera.aspect = rect.width/rect.height;
    this.threeCamera.updateProjectionMatrix();
  }
}
