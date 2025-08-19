// ThreeJSManager - Verwaltung der Three.js-Szene und Rendering-Funktionalität
import * as THREE from 'three';
import { resolveWorldSpec } from '../../js/world-generation/resolve.js';
import { buildZoneFromSpec } from '../../js/world-generation/index.js';

export class ThreeJSManager {
    constructor(canvas) {
        console.log('[DEBUG] ThreeJSManager Konstruktor aufgerufen mit canvas:', canvas);
        
        this.canvas = canvas;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.currentZone = null;
        this.animationId = null;
        this.initialized = false;
        this.highlightedEntities = new Map();
        this.originalMaterials = new Map();

        // Kamera-Interaktionszustand (Orbit/Pan/Zoom ohne OrbitControls)
        this.camTarget = new THREE.Vector3(0, 0, 0);
        this.camDistance = 15;       // Zoom (Radius)
        this.camAzimuth = Math.PI/4; // Drehung um Y
        this.camPolar = Math.PI/3;   // Neigung (0..PI)
        this.camMinDistance = 3;
        this.camMaxDistance = 200;
        this.camMinPolar = 0.1;
        this.camMaxPolar = Math.PI - 0.1;

        // Maus/Keyboard State
        this._isDragging = false;
        this._dragButton = 0; // 0=left(rot), 2=right(pan)
        this._lastX = 0;
        this._lastY = 0;

        // Event-Handler gebunden (für remove bei dispose)
        this._boundHandlers = {};

        // Raycasting / Klick-Interaktion
        this.raycaster = new THREE.Raycaster();
        this._clickHandlers = new Set();
        this._mouseDownX = 0;
        this._mouseDownY = 0;
    }

    async init() {
        try {
           
            // Scene
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x87ceeb);

            // Make scene globally available for environment fog
            window.worldEditor = { scene: this.scene };

            // Camera
            this.camera = new THREE.PerspectiveCamera(75, this.canvas.clientWidth / this.canvas.clientHeight, 0.1, 2000);
            // Anfangsposition aus Sphärischen Koordinaten berechnen
            this._updateCameraFromSpherical();

            // Renderer
            this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
            this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            if (THREE.sRGBEncoding) {
                this.renderer.outputEncoding = THREE.sRGBEncoding;
            }

            // Lights
            const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
            this.scene.add(ambientLight);

            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(10, 20, 10);
            directionalLight.castShadow = true;
            this.scene.add(directionalLight);

            // Interaktions-Events binden
            this._initCameraControls();

            this.initialized = true;
            this.animate();
            return true;
        } catch (error) {
            console.error('THREE.js Initialisierung fehlgeschlagen:', error);
            return false;
        }
    }

    async renderWorld(worldData) {
        console.log('[DEBUG] ThreeJSManager.renderWorld aufgerufen mit worldData:', worldData);
        
        if (!this.initialized) {
            await this.init();
        }
        
        try {
            this.resetScene();
            
            // Konvertiere das Genesis-Format in das für die Weltgenerierung erwartete Format
            const convertedWorldData = this.convertGenesisToWorldFormat(worldData);
            const spec = resolveWorldSpec(convertedWorldData);
            
            const rng = Math.random;
            
            // Zone OHNE Umgebung bauen (nur Geometrie)
            const zoneInfo = buildZoneFromSpec(spec, { rng, skipEnvironment: true });
            zoneInfo.objectCount = convertedWorldData.objectCount || 0;
            
            this.currentZone = zoneInfo;
            this.scene.add(this.currentZone.group);
            
            // Prüfe, ob die Zone tatsächlich hinzugefügt wurde
            const zoneIndex = this.scene.children.indexOf(this.currentZone.group);
            
            // Umgebung (Skybox, Lichter, Nebel) auf die Hauptszene anwenden
            if (spec.environment) {
                const { applyEnvironment } = await import('../../js/world-generation/environment.js');
                applyEnvironment(spec.environment, this.scene);
            } else {
                console.log('ℹ️ [DEBUG] Keine Umgebung in Spec gefunden');
            }
            
            return zoneInfo;
        } catch (error) {
            console.error('❌ [Integrationstest] World Rendering Error:', error);
            console.error('[DEBUG] Detaillierter Fehler:', error.stack);
            throw error;
        }
    }

    resetScene() {
        // Entfernt die aktuelle Zone (group) komplett
        if (this.currentZone) {
            this.scene.remove(this.currentZone.group);
            this.currentZone.group.traverse(o => {
                if (o.geometry) o.geometry.dispose();
                if (o.material) {
                    if (Array.isArray(o.material)) {
                        o.material.forEach(m => m.dispose());
                    } else {
                        o.material.dispose();
                    }
                }
            });
            this.currentZone = null;
        }

        // Entfernt alle Skybox-Objekte aus der Szene
        const skyboxesToRemove = [];
        this.scene.traverse(obj => {
            if (obj.userData?.isSkybox) {
                skyboxesToRemove.push(obj);
            }
        });
        skyboxesToRemove.forEach(skybox => this.scene.remove(skybox));

        // Setzt den Nebel der Szene zurück
        this.scene.fog = null;

        // Setzt alle Hervorhebungen zurück
        this.resetHighlights();
    }

    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());

        // Kamera anhand aktueller Sphären- und Ziel-Parameter aktualisieren
        this._updateCameraFromSpherical();

        this.renderer.render(this.scene, this.camera);
    }

    // Methoden für die Patch-Visualisierung
    highlightEntities(entities, color = 0xff0000, intensity = 0.7) {
        if (!Array.isArray(entities)) {
            entities = [entities];
        }

        for (const entity of entities) {
            const entityKey = `${entity.type}_${entity.id}`;
            
            // Finde das 3D-Objekt in der Szene
            const object = this.findObjectByEntity(entity);
            if (object) {
                // Speichere das Original-Material
                if (!this.originalMaterials.has(entityKey)) {
                    if (object.material) {
                        if (Array.isArray(object.material)) {
                            this.originalMaterials.set(entityKey, object.material.map(m => m.clone()));
                        } else {
                            this.originalMaterials.set(entityKey, object.material.clone());
                        }
                    }
                }

                // Erstelle ein neues Material mit Hervorhebung
                const highlightMaterial = this.createHighlightMaterial(object, color, intensity);
                object.material = highlightMaterial;
                
                // Speichere die Hervorhebung
                this.highlightedEntities.set(entityKey, { object, originalMaterial: this.originalMaterials.get(entityKey) });
            }
        }
    }

    createHighlightMaterial(object, color, intensity) {
        let material;
        
        if (object.material) {
            if (Array.isArray(object.material)) {
                material = object.material.map(m => {
                    const newMaterial = m.clone();
                    newMaterial.emissive = new THREE.Color(color);
                    newMaterial.emissiveIntensity = intensity;
                    return newMaterial;
                });
            } else {
                material = object.material.clone();
                material.emissive = new THREE.Color(color);
                material.emissiveIntensity = intensity;
            }
        } else {
            // Standardmaterial, wenn kein Material vorhanden
            material = new THREE.MeshLambertMaterial({ 
                color: 0xffffff,
                emissive: new THREE.Color(color),
                emissiveIntensity: intensity
            });
        }
        
        return material;
    }

    findObjectByEntity(entity) {
        if (!this.scene || !entity) return null;
        
        let foundObject = null;
        
        this.scene.traverse(child => {
            if (foundObject) return; // Bereits gefunden
            
            // Prüfe, ob das Kind eine Entity-ID im userData hat
            if (child.userData && child.userData.entityId === entity.id) {
                foundObject = child;
                return;
            }
            
            // Prüfe, ob der Name des Objekts mit der Entity-ID übereinstimmt
            if (child.name && child.name.includes(entity.id)) {
                foundObject = child;
                return;
            }
            
            // Prüfe, ob der Typ des Objekts mit dem Entity-Typ übereinstimmt
            if (child.userData && child.userData.entityType === entity.type) {
                // Wenn mehrere Objekte des gleichen Typs existieren,
                // nimm das erste, das noch nicht zugeordnet wurde
                if (!foundObject) {
                    foundObject = child;
                }
            }
        });
        
        return foundObject;
    }

    resetHighlights() {
        // Setze alle Hervorhebungen auf die Original-Materialien zurück
        for (const [entityKey, highlightInfo] of this.highlightedEntities.entries()) {
            if (highlightInfo.object && highlightInfo.originalMaterial) {
                highlightInfo.object.material = highlightInfo.originalMaterial;
            }
        }
        
        this.highlightedEntities.clear();
        this.originalMaterials.clear();
    }

    // Kamera-Steuerung
    resetCamera() {
        this.camera.position.set(15, 15, 15);
        this.camera.lookAt(0, 0, 0);
    }

    focusOnObjects(objects) {
        if (!objects || objects.length === 0) return;
        
        // Berechne den Mittelpunkt der Objekte
        const center = new THREE.Vector3();
        const box = new THREE.Box3();
        
        objects.forEach(obj => {
            if (obj) {
                box.expandByObject(obj);
            }
        });
        
        box.getCenter(center);
        
        // Positioniere die Kamera
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const distance = maxDim * 2;
        
        this.camera.position.set(
            center.x + distance,
            center.y + distance,
            center.z + distance
        );
        this.camera.lookAt(center);
    }

    // Fenstergrößenänderung behandeln
    handleResize() {
        if (!this.camera || !this.renderer) return;
        
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    // Cleanup
    dispose() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        // Event-Listener entfernen
        const c = this.canvas || this.renderer?.domElement;
        if (c) {
            c.removeEventListener('wheel', this._boundHandlers.wheel, { passive: false });
            c.removeEventListener('mousedown', this._boundHandlers.mousedown);
            window.removeEventListener('mousemove', this._boundHandlers.mousemove);
            window.removeEventListener('mouseup', this._boundHandlers.mouseup);
            c.removeEventListener('contextmenu', this._boundHandlers.contextmenu);
            // Key-Events ebenfalls am Canvas entfernen (nicht global)
            c.removeEventListener('keydown', this._boundHandlers.keydown);
            // Klick-Handler entfernen
            c.removeEventListener('click', this._boundHandlers.click);
        }

        this.resetScene();

        if (this.renderer) {
            this.renderer.dispose();
        }

        this.initialized = false;
    }

    // Konvertiert das Genesis-Format in das für die Weltgenerierung erwartete Format
    convertGenesisToWorldFormat(genesisData) {
        console.log('[RENDER GENESIS] Konvertiere Genesis-Daten:', genesisData);

        if (!genesisData) {
            console.warn('⚠️ [Integrationstest] Keine genesisData übergeben, gebe leeres Objekt zurück');
            return {};
        }
        
        const worldData = {
            name: genesisData.metadata?.name || 'Unbenannte Welt',
            description: genesisData.metadata?.description || '',
            zone_id: genesisData.metadata?.id || 'default_zone'
        };
        
        
        const entities = genesisData.entities || {};
        
        // Environment
        if (entities.environment) {
            const envKeys = Object.keys(entities.environment);
            if (envKeys.length > 0) {
                worldData.environment = entities.environment[envKeys[0]];
            }
        }
        
        // Terrain
        if (entities.terrain) {
            const terrainKeys = Object.keys(entities.terrain);
            if (terrainKeys.length > 0) {
                worldData.terrain = entities.terrain[terrainKeys[0]];
            }
        }
        
        // Objects
        if (entities.objects) {
            const objectsArray = Object.values(entities.objects);
            worldData.objects = objectsArray;
        } else if (entities.object) {
            // Fallback für altes Format (Singular)
            const objectsArray = Object.values(entities.object);
            worldData.objects = objectsArray;
        } 
        
        // Personas
        if (entities.personas) {
            const personasArray = Object.values(entities.personas);
            worldData.personas = personasArray;
        } else if (entities.persona) {
            // Fallback für altes Format (Singular)
            const personasArray = Object.values(entities.persona);
            worldData.personas = personasArray;
        } 
        
        // Portals
        if (entities.portals) {
            const portalsArray = Object.values(entities.portals);
            worldData.portals = portalsArray;
        } else if (entities.portal) {
            // Fallback für altes Format (Singular)
            const portalsArray = Object.values(entities.portal);
            worldData.portals = portalsArray;
        } 

        // Zähle alle Objekte außer Terrain und Environment
        worldData.objectCount = (worldData.objects?.length || 0) + (worldData.personas?.length || 0) + (worldData.portals?.length || 0);
        
        
        // Extensions
        if (entities.extension) {
            worldData.extensions = {};
            for (const [key, extension] of Object.entries(entities.extension)) {
                if (extension.name) {
                    worldData.extensions[extension.name] = extension.value !== undefined ? extension.value : extension;
                }
            }
            console.log('🔧 [DEBUG GenesisToWorld] Extensions hinzugefügt:', Object.keys(worldData.extensions));
        }
        
        // Camera
        if (entities.camera) {
            const cameraKeys = Object.keys(entities.camera);
            console.log('📷 [DEBUG GenesisToWorld] Camera-Keys:', cameraKeys);
            if (cameraKeys.length > 0) {
                worldData.camera = entities.camera[cameraKeys[0]];
                console.log('✅ [DEBUG GenesisToWorld] Camera hinzugefügt:', worldData.camera);
            }
        }

        console.log('🎉 [DEBUG GenesisToWorld] worldData:', worldData);
        return worldData;
    }

    // Methode zur Visualisierung von Patches
    visualizePatch(patchData, options = {}) {
        if (!patchData || !this.currentZone) {
            console.warn('Keine Patch-Daten oder keine aktuelle Zone vorhanden');
            return;
        }

        const {
            addedColor = 0x00ff00,    // Grün für hinzugefügte Entities
            modifiedColor = 0xffff00, // Gelb für modifizierte Entities
            removedColor = 0xff0000,  // Rot für entfernte Entities
            intensity = 0.7
        } = options;

        // Setze vorherige Hervorhebungen zurück
        this.resetHighlights();

        // Verarbeite hinzugefügte Entities
        if (patchData.added) {
            for (const [type, entities] of Object.entries(patchData.added)) {
                const entityList = Array.isArray(entities) ? entities : Object.values(entities);
                for (const entity of entityList) {
                    this.highlightEntities({ type, id: entity.id || entity }, addedColor, intensity);
                }
            }
        }

        // Verarbeite modifizierte Entities
        if (patchData.modified) {
            for (const [type, entities] of Object.entries(patchData.modified)) {
                const entityList = Array.isArray(entities) ? entities : Object.values(entities);
                for (const entity of entityList) {
                    this.highlightEntities({ type, id: entity.id || entity }, modifiedColor, intensity);
                }
            }
        }

        // Verarbeite entfernte Entities (durch Durchsuchen der Szene)
        if (patchData.removed) {
            for (const [type, entities] of Object.entries(patchData.removed)) {
                const entityList = Array.isArray(entities) ? entities : Object.values(entities);
                for (const entity of entityList) {
                    // Für entfernte Entities, versuchen wir, sie in der Szene zu finden
                    // und sie mit einer anderen Visualisierung zu markieren
                    const object = this.findObjectByEntity({ type, id: entity.id || entity });
                    if (object) {
                        // Erstelle ein spezielles Material für entfernte Objekte
                        const removedMaterial = this.createHighlightMaterial(object, removedColor, intensity);
                        // Mache das Objekt halbtransparent
                        if (Array.isArray(removedMaterial)) {
                            removedMaterial.forEach(m => { m.transparent = true; m.opacity = 0.5; });
                        } else {
                            removedMaterial.transparent = true;
                            removedMaterial.opacity = 0.5;
                        }
                        object.material = removedMaterial;
                        
                        const entityKey = `${type}_${entity.id || entity}`;
                        this.highlightedEntities.set(entityKey, {
                            object,
                            originalMaterial: this.originalMaterials.get(entityKey)
                        });
                    }
                }
            }
        }
    }

    // Methode zur schrittweisen Anwendung eines Patches
    async applyPatchStepByStep(patchData, options = {}) {
        if (!patchData) {
            console.warn('Keine Patch-Daten vorhanden');
            return;
        }

        const {
            stepDelay = 1000, // Verzögerung zwischen den Schritten in Millisekunden
            onStepComplete = null, // Callback nach jedem Schritt
            onComplete = null // Callback nach Abschluss
        } = options;

        // Setze vorherige Hervorhebungen zurück
        this.resetHighlights();

        // Schritt 1: Zeige hinzugefügte Entities
        if (patchData.added) {
            for (const [type, entities] of Object.entries(patchData.added)) {
                const entityList = Array.isArray(entities) ? entities : Object.values(entities);
                for (const entity of entityList) {
                    this.highlightEntities({ type, id: entity.id || entity }, 0x00ff00, 0.7);
                }
            }
            if (onStepComplete) onStepComplete('added');
            await new Promise(resolve => setTimeout(resolve, stepDelay));
        }

        // Schritt 2: Zeige modifizierte Entities
        if (patchData.modified) {
            this.resetHighlights();
            for (const [type, entities] of Object.entries(patchData.modified)) {
                const entityList = Array.isArray(entities) ? entities : Object.values(entities);
                for (const entity of entityList) {
                    this.highlightEntities({ type, id: entity.id || entity }, 0xffff00, 0.7);
                }
            }
            if (onStepComplete) onStepComplete('modified');
            await new Promise(resolve => setTimeout(resolve, stepDelay));
        }

        // Schritt 3: Zeige entfernte Entities
        if (patchData.removed) {
            this.resetHighlights();
            for (const [type, entities] of Object.entries(patchData.removed)) {
                const entityList = Array.isArray(entities) ? entities : Object.values(entities);
                for (const entity of entityList) {
                    const object = this.findObjectByEntity({ type, id: entity.id || entity });
                    if (object) {
                        const removedMaterial = this.createHighlightMaterial(object, 0xff0000, 0.7);
                        if (Array.isArray(removedMaterial)) {
                            removedMaterial.forEach(m => { m.transparent = true; m.opacity = 0.5; });
                        } else {
                            removedMaterial.transparent = true;
                            removedMaterial.opacity = 0.5;
                        }
                        object.material = removedMaterial;
                        
                        const entityKey = `${type}_${entity.id || entity}`;
                        this.highlightedEntities.set(entityKey, {
                            object,
                            originalMaterial: this.originalMaterials.get(entityKey)
                        });
                    }
                }
            }
            if (onStepComplete) onStepComplete('removed');
            await new Promise(resolve => setTimeout(resolve, stepDelay));
        }

        // Abschluss
        if (onComplete) onComplete();
    }

    // Methode zur Visualisierung von Konflikten
    visualizeConflicts(conflicts, options = {}) {
        if (!conflicts || conflicts.length === 0) {
            console.warn('Keine Konflikte vorhanden');
            return;
        }

        const {
            conflictColor = 0xff00ff, // Magenta für Konflikte
            intensity = 0.9
        } = options;

        // Setze vorherige Hervorhebungen zurück
        this.resetHighlights();

        // Verarbeite jeden Konflikt
        for (const conflict of conflicts) {
            // Markiere die betroffenen Entities
            if (conflict.entities) {
                for (const entity of conflict.entities) {
                    this.highlightEntities(entity, conflictColor, intensity);
                }
            }
        }
    }

    // Zusätzliche Methoden für die Patch-Visualisierung
    setVisualizationMode(mode) {
        this.visualizationMode = mode;
        console.log('Visualisierungsmodus gesetzt auf:', mode);
    }

    setAnimationMode(mode) {
        this.animationMode = mode;
        console.log('Animationsmodus gesetzt auf:', mode);
    }

    setAnimationSpeed(speed) {
        this.animationSpeed = speed;
        console.log('Animationsgeschwindigkeit gesetzt auf:', speed);
    }

    setTransparency(transparency) {
        this.transparency = transparency;
        console.log('Transparenz gesetzt auf:', transparency);
    }

    async startAnimation() {
        if (!this.currentPatch) {
            console.warn('Kein Patch für Animation vorhanden');
            return;
        }
        
        if (this.animationMode === 'step') {
            await this.applyPatchStepByStep(this.currentPatch, {
                stepDelay: 1000 / this.animationSpeed
            });
        } else if (this.animationMode === 'continuous') {
            // Kontinuierliche Animation implementieren
            console.log('Kontinuierliche Animation gestartet');
        }
    }

    async resetVisualization() {
        this.resetHighlights();
        console.log('Visualisierung zurückgesetzt');
    }

    async focusOnChanges() {
        if (!this.highlightedEntities || this.highlightedEntities.size === 0) {
            console.warn('Keine hervorgehobenen Entitäten zum Fokussieren');
            return;
        }
        
        const objects = Array.from(this.highlightedEntities.values()).map(info => info.object);
        this.focusOnObjects(objects);
        console.log('Fokus auf Änderungen gesetzt');
    }

    async clearHighlights() {
        this.resetHighlights();
        console.log('Hervorhebungen gelöscht');
    }

    // Aktuellen Patch speichern für spätere Animationen
    setCurrentPatch(patch) {
        this.currentPatch = patch;
    }
    // === Kamera-Interaktion (Orbit/Pan/Zoom) ===

    _initCameraControls() {
        const el = this.canvas || this.renderer?.domElement;
        if (!el) return;

        // Canvas fokussierbar machen, damit Key-Events nur auf dem Canvas ankommen
        try {
            if (el.tabIndex === undefined || el.tabIndex < 0) {
                el.setAttribute('tabindex', '0');
            }
            // Fokus beim Klick setzen
            el.addEventListener('mousedown', () => { el.focus(); }, { capture: true });
            // optional: Fokusrahmen ausblenden
            el.style.outline = 'none';
        } catch (_) {}

        // Gebundene Handler speichern, um sie in dispose entfernen zu können
        this._boundHandlers.wheel = (e) => this._onWheel(e);
        this._boundHandlers.mousedown = (e) => this._onMouseDown(e);
        this._boundHandlers.mousemove = (e) => this._onMouseMove(e);
        this._boundHandlers.mouseup = (e) => this._onMouseUp(e);
        this._boundHandlers.keydown = (e) => this._onKeyDown(e);
        this._boundHandlers.contextmenu = (e) => e.preventDefault();
        this._boundHandlers.click = (e) => this._onCanvasClick(e);

        // Maus
        el.addEventListener('wheel', this._boundHandlers.wheel, { passive: false });
        el.addEventListener('mousedown', this._boundHandlers.mousedown);
        window.addEventListener('mousemove', this._boundHandlers.mousemove);
        window.addEventListener('mouseup', this._boundHandlers.mouseup);
        el.addEventListener('contextmenu', this._boundHandlers.contextmenu);
        // Klick (nach MouseUp) für Raycast auf Terrain
        el.addEventListener('click', this._boundHandlers.click);

        // Tastatur NUR am Canvas binden (nicht global), damit andere Panels Eingaben behalten
        el.addEventListener('keydown', this._boundHandlers.keydown);
    }

    _updateCameraFromSpherical() {
        // Begrenzen
        this.camDistance = Math.max(this.camMinDistance, Math.min(this.camMaxDistance, this.camDistance));
        this.camPolar = Math.max(this.camMinPolar, Math.min(this.camMaxPolar, this.camPolar));

        // Sphärisch -> Kartesisch
        const r = this.camDistance;
        const sinPhi = Math.sin(this.camPolar);
        const x = this.camTarget.x + r * sinPhi * Math.cos(this.camAzimuth);
        const y = this.camTarget.y + r * Math.cos(this.camPolar);
        const z = this.camTarget.z + r * sinPhi * Math.sin(this.camAzimuth);

        this.camera.position.set(x, y, z);
        this.camera.lookAt(this.camTarget);
    }

    _onWheel(e) {
        // Zoom (Mausrad)
        e.preventDefault();
        const delta = e.deltaY;
        const factor = Math.pow(1.0015, delta); // sanftes Zoomen
        this.camDistance *= factor;
    }

    _onMouseDown(e) {
        if (!this.renderer) return;
        this._isDragging = true;
        this._dragButton = e.button; // 0: rotieren, 2: pan
        this._lastX = e.clientX;
        this._lastY = e.clientY;
        this._mouseDownX = e.clientX;
        this._mouseDownY = e.clientY;
    }

    _onMouseMove(e) {
        if (!this._isDragging) return;

        const dx = e.clientX - this._lastX;
        const dy = e.clientY - this._lastY;
        this._lastX = e.clientX;
        this._lastY = e.clientY;

        if (this._dragButton === 0) {
            // Linke Maustaste: Orbit (Azimuth/Polar)
            const ROT_SPEED = 0.005;
            this.camAzimuth -= dx * ROT_SPEED;
            this.camPolar -= dy * ROT_SPEED;
        } else if (this._dragButton === 2) {
            // Rechte Maustaste: Pan (Verschieben des Targets)
            this._panCamera(dx, dy);
        }
    }

    _onMouseUp() {
        this._isDragging = false;
    }

    _onKeyDown(e) {
        // WASD zum Pannen auf XZ-Ebene, QE für Höhe, Pfeile zum Rotieren
        const PAN = 0.5 * (this.camDistance / 25); // skaliert mit Entfernung
        const ROT = 0.03;

        // Kamera-Basisvektoren
        const forward = new THREE.Vector3();
        const right = new THREE.Vector3();
        const up = new THREE.Vector3(0, 1, 0);

        forward.copy(this.camTarget).sub(this.camera.position).setY(0).normalize(); // XZ-Forward
        if (forward.lengthSq() < 1e-6) forward.set(0, 0, -1);
        right.crossVectors(forward, up).normalize();

        switch (e.key.toLowerCase()) {
            case 'w':
                this.camTarget.addScaledVector(forward, PAN);
                break;
            case 's':
                this.camTarget.addScaledVector(forward, -PAN);
                break;
            case 'a':
                this.camTarget.addScaledVector(right, -PAN);
                break;
            case 'd':
                this.camTarget.addScaledVector(right, PAN);
                break;
            case 'q':
                this.camTarget.y += PAN;
                break;
            case 'e':
                this.camTarget.y -= PAN;
                break;
            case 'arrowleft':
                this.camAzimuth += ROT;
                break;
            case 'arrowright':
                this.camAzimuth -= ROT;
                break;
            case 'arrowup':
                this.camPolar -= ROT;
                break;
            case 'arrowdown':
                this.camPolar += ROT;
                break;
            case 'r':
                // Reset
                this.camTarget.set(0, 0, 0);
                this.camDistance = 25;
                this.camAzimuth = Math.PI/4;
                this.camPolar = Math.PI/3;
                break;
            default:
                return;
        }
        e.preventDefault();
    }

    _panCamera(dx, dy) {
        // Bildschirmbewegung -> Weltverschiebung des Targets
        // Skaliere Pan-Geschwindigkeit mit Entfernung und Viewport
        const el = this.canvas || this.renderer?.domElement;
        const width = el?.clientWidth || 800;
        const height = el?.clientHeight || 600;

        const panX = (dx / width) * this.camDistance;
        const panY = (dy / height) * this.camDistance;

        // Kameraachsen berechnen
        const cam = this.camera;
        const right = new THREE.Vector3();
        const up = new THREE.Vector3();
        cam.getWorldDirection(up);            // up missbraucht hier für forward
        up.normalize();
        const worldUp = new THREE.Vector3(0,1,0);
        // Rechtsvektor als Kreuzprodukt aus forward und worldUp
        right.crossVectors(up, worldUp).normalize();
        // "Screen up" annähern als echte Welt-Up
        const screenUp = worldUp;

        // Pan nach rechts/oben im Bildschirm
        this.camTarget.addScaledVector(right, -panX * 2.0);
        this.camTarget.addScaledVector(screenUp, panY * 2.0);
    }

    // === Terrain-Klick-API ===

    /**
     * Registriert einen Handler, der bei Klick auf das Terrain die Intersections erhält.
     * @param {(info: { point: THREE.Vector3, object: THREE.Object3D, uv?: THREE.Vector2, face?: THREE.Face3, event: MouseEvent }) => void} cb
     */
    registerTerrainClickHandler(cb) {
        if (typeof cb === 'function') this._clickHandlers.add(cb);
    }

    /**
     * Entfernt einen zuvor registrierten Terrain-Klick-Handler.
     * @param {Function} cb
     */
    unregisterTerrainClickHandler(cb) {
        this._clickHandlers.delete(cb);
    }

    /**
     * Interner Klick-Handler: berechnet den Schnittpunkt auf dem Terrain und ruft die registrierten Handler auf.
     * Filtert Drags heraus (nur kleiner Mausweg wird als Klick akzeptiert).
     */
    _onCanvasClick(e) {
        try {
            // Drag-Gesten herausfiltern
            const moved =
                Math.abs(e.clientX - this._mouseDownX) > 5 ||
                Math.abs(e.clientY - this._mouseDownY) > 5;
            if (moved) return;

            if (!this.camera || !this.renderer) return;

            const el = this.canvas || this.renderer.domElement;
            const rect = el.getBoundingClientRect();

            // Mausposition in Normalized Device Coordinates [-1, 1]
            const ndc = new THREE.Vector2(
                ((e.clientX - rect.left) / rect.width) * 2 - 1,
                -((e.clientY - rect.top) / rect.height) * 2 + 1
            );

            this.raycaster.setFromCamera(ndc, this.camera);

            // Bevorzugt Terrain-Objekte, ansonsten alle Meshes
            const targets = this._collectRaycastTargets();
            if (!targets.length) return;

            const hits = this.raycaster.intersectObjects(targets, true);
            if (!hits || hits.length === 0) return;

            const hit = this._pickBestTerrainHit(hits);
            if (!hit) return;

            // Callbacks informieren
            for (const cb of this._clickHandlers) {
                try {
                    cb({
                        point: hit.point.clone(),
                        object: hit.object,
                        uv: hit.uv,
                        face: hit.face,
                        event: e
                    });
                } catch (err) {
                    console.error('[ThreeJSManager] Terrain-Klick-Callback-Fehler:', err);
                }
            }
        } catch (err) {
            console.error('[ThreeJSManager] Fehler bei Canvas-Klick:', err);
        }
    }

    /**
     * Sammelt bevorzugte Raycast-Ziele (Terrain), mit Fallback auf alle Meshes der Szene.
     */
    _collectRaycastTargets() {
        const targets = [];
        const prefer = [];
        const group = this.currentZone?.group || this.scene;

        if (!group) return targets;

        group.traverse(obj => {
            // Nur sichtbare Meshes beachten
            if (!obj || !obj.visible) return;
            // THREE.Mesh erkennen
            const isMesh = obj.isMesh === true || (obj.geometry && obj.material);
            if (!isMesh) return;

            // Heuristik: Terrain bevorzugen
            const isTerrain =
                obj.userData?.isTerrain === true ||
                (typeof obj.name === 'string' && /terrain|ground|floor/i.test(obj.name));

            if (isTerrain) prefer.push(obj);
            else targets.push(obj);
        });

        // Terrain zuerst testen
        return prefer.length ? prefer : targets;
    }

    /**
     * Wählt den "besten" Terrain-Treffer aus einer Liste von Intersections.
     * Aktuell: der nächste Treffer (kleinste distance).
     */
    _pickBestTerrainHit(intersections) {
        if (!Array.isArray(intersections) || intersections.length === 0) return null;
        // Falls mehrere Treffer: nehme den mit kleinster Entfernung
        let best = intersections[0];
        for (let i = 1; i < intersections.length; i++) {
            if (intersections[i].distance < best.distance) best = intersections[i];
        }
        return best;
    }
}