// ThreeJSManager - Verwaltung der Three.js-Szene und Rendering-Funktionalität
import * as THREE from 'three';
import { resolveWorldSpec } from '../../js/world-generation/resolve.js';
import { buildZoneFromSpec } from '../../js/world-generation/index.js';

export class ThreeJSManager {
    constructor(canvas) {
        console.log('[DEBUG] ThreeJSManager Konstruktor aufgerufen mit canvas:', canvas);
        console.log('[DEBUG] Canvas-Typ:', typeof canvas);
        if (canvas) {
            console.log('[DEBUG] Canvas-Tag-Name:', canvas.tagName);
            console.log('[DEBUG] Canvas-Client-Width:', canvas.clientWidth);
            console.log('[DEBUG] Canvas-Client-Height:', canvas.clientHeight);
            console.log('[DEBUG] Canvas-addEventListener-Funktion:', typeof canvas.addEventListener);
        }
        this.canvas = canvas;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.currentZone = null;
        this.animationId = null;
        this.initialized = false;
        this.highlightedEntities = new Map();
        this.originalMaterials = new Map();
    }

    async init() {
        try {
            console.log('[DEBUG] ThreeJSManager.init() aufgerufen');
            console.log('[DEBUG] Canvas in init():', this.canvas);
            if (this.canvas) {
                console.log('[DEBUG] Canvas-Tag-Name in init():', this.canvas.tagName);
                console.log('[DEBUG] Canvas-Client-Width in init():', this.canvas.clientWidth);
                console.log('[DEBUG] Canvas-Client-Height in init():', this.canvas.clientHeight);
                console.log('[DEBUG] Canvas-addEventListener-Funktion in init():', typeof this.canvas.addEventListener);
            }
            
            // Scene
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x87ceeb);

            // Make scene globally available for environment fog
            window.worldEditor = { scene: this.scene };

            // Camera
            this.camera = new THREE.PerspectiveCamera(75, this.canvas.clientWidth / this.canvas.clientHeight, 0.1, 1000);
            this.camera.position.set(15, 15, 15);
            this.camera.lookAt(0, 0, 0);

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

            this.initialized = true;
            this.animate();
            return true;
        } catch (error) {
            console.error('THREE.js Initialisierung fehlgeschlagen:', error);
            return false;
        }
    }

    async renderWorld(worldData) {
        console.log('🌍 [Integrationstest] ThreeJSManager.renderWorld aufgerufen mit worldData:', worldData);
        console.log('[DIAGNOSE] renderWorld - Initialisierungsstatus:', this.initialized);
        console.log('[DIAGNOSE] renderWorld - Szene vorhanden:', !!this.scene);
        console.log('[DIAGNOSE] renderWorld - Kamera vorhanden:', !!this.camera);
        console.log('[DIAGNOSE] renderWorld - Renderer vorhanden:', !!this.renderer);
        
        if (!this.initialized) {
            console.log('🔄 [Integrationstest] Three.js nicht initialisiert, initialisiere jetzt...');
            await this.init();
            console.log('[DIAGNOSE] Nach Initialisierung - Initialisierungsstatus:', this.initialized);
        }
        
        try {
            console.log('🧹 [Integrationstest] Setze Szene zurück');
            this.resetScene();
            console.log('[DIAGNOSE] Nach resetScene - Szene-Objekte:', this.scene?.children?.length || 0);
            
            // Konvertiere das Genesis-Format in das für die Weltgenerierung erwartete Format
            console.log('🔄 [Integrationstest] Konvertiere Genesis-Format in World-Format');
            const convertedWorldData = this.convertGenesisToWorldFormat(worldData);
            console.log('✅ [Integrationstest] Konvertierte Daten:', convertedWorldData);
            console.log('[DIAGNOSE] Konvertiertes World-Format:', JSON.stringify(convertedWorldData, null, 2));
            
            console.log('🔍 [Integrationstest] Rufe resolveWorldSpec auf');
            console.log('🔍 [Integrationstest] convertedWorldData vor resolveWorldSpec:', JSON.stringify(convertedWorldData, null, 2));
            const spec = resolveWorldSpec(convertedWorldData);
            console.log('✅ [Integrationstest] World-Spec:', spec);
            console.log('🔍 [Integrationstest] World-Spec objects:', spec.objects);
            console.log('🔍 [Integrationstest] World-Spec personas:', spec.personas);
            console.log('🔍 [Integrationstest] World-Spec portals:', spec.portals);
            console.log('[DIAGNOSE] Nach resolveWorldSpec - Objekte in Spec:', spec.objects?.length || 0);
            
            const rng = Math.random;
            
            // Zone OHNE Umgebung bauen (nur Geometrie)
            console.log('🏗️ [Integrationstest] Baue Zone ohne Umgebung');
            const zoneInfo = buildZoneFromSpec(spec, { rng, skipEnvironment: true });
            console.log('✅ [Integrationstest] Zone gebaut:', zoneInfo);
            console.log('[DIAGNOSE] Zone-Info:', {
                hasGroup: !!zoneInfo?.group,
                groupChildren: zoneInfo?.group?.children?.length || 0,
                zoneType: typeof zoneInfo
            });
            
            this.currentZone = zoneInfo;
            this.scene.add(this.currentZone.group);
            console.log('📦 [Integrationstest] Zone zur Szene hinzugefügt');
            console.log('[DIAGNOSE] Nach Hinzufügen zur Szene - Szene-Objekte:', this.scene.children.length);
            
            // Prüfe, ob die Zone tatsächlich hinzugefügt wurde
            const zoneIndex = this.scene.children.indexOf(this.currentZone.group);
            console.log('[DIAGNOSE] Zone-Index in Szene:', zoneIndex);
            
            // Umgebung (Skybox, Lichter, Nebel) auf die Hauptszene anwenden
            if (spec.environment) {
                console.log('🌅 [Integrationstest] Wende Umgebung an');
                const { applyEnvironment } = await import('../../js/world-generation/environment.js');
                applyEnvironment(spec.environment, this.scene);
                console.log('✅ [Integrationstest] Umgebung angewendet');
            } else {
                console.log('ℹ️ [Integrationstest] Keine Umgebung in Spec gefunden');
            }
            
            console.log('[DIAGNOSE] Vor Abschluss - Szene-Objekte:', this.scene.children.length);
            console.log('[DIAGNOSE] Vor Abschluss - Aktive Zone vorhanden:', !!this.currentZone);
            console.log('[DIAGNOSE] Vor Abschluss - Animation ID:', this.animationId);
            
            console.log('🎉 [Integrationstest] renderWorld erfolgreich abgeschlossen, gebe zoneInfo zurück:', zoneInfo);
            return zoneInfo;
        } catch (error) {
            console.error('❌ [Integrationstest] World Rendering Error:', error);
            console.error('[DIAGNOSE] Detaillierter Fehler:', error.stack);
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
        
        // Einfache Kamerafahrt für die Vorschau
        if (this.currentZone) {
            const time = Date.now() * 0.0005;
            this.camera.position.x = Math.cos(time) * 20;
            this.camera.position.z = Math.sin(time) * 20;
            this.camera.lookAt(0, 0, 0);
        }

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
        
        this.resetScene();
        
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        this.initialized = false;
    }

    // Konvertiert das Genesis-Format in das für die Weltgenerierung erwartete Format
    convertGenesisToWorldFormat(genesisData) {
        console.log('🔄 [Integrationstest] convertGenesisToWorldFormat aufgerufen mit genesisData:', genesisData);
        
        if (!genesisData) {
            console.warn('⚠️ [Integrationstest] Keine genesisData übergeben, gebe leeres Objekt zurück');
            return {};
        }
        
        const worldData = {
            name: genesisData.metadata?.name || 'Unbenannte Welt',
            description: genesisData.metadata?.description || '',
            zone_id: genesisData.metadata?.id || 'default_zone'
        };
        
        console.log('📋 [Integrationstest] Basis-Welt-Daten erstellt:', worldData);
        
        const entities = genesisData.entities || {};
        console.log('📦 [Integrationstest] Entities gefunden:', Object.keys(entities));
        
        // Environment
        if (entities.environment) {
            const envKeys = Object.keys(entities.environment);
            console.log('🌅 [Integrationstest] Environment-Keys:', envKeys);
            if (envKeys.length > 0) {
                worldData.environment = entities.environment[envKeys[0]];
                console.log('✅ [Integrationstest] Environment hinzugefügt:', worldData.environment);
            }
        }
        
        // Terrain
        if (entities.terrain) {
            const terrainKeys = Object.keys(entities.terrain);
            console.log('🏔️ [Integrationstest] Terrain-Keys:', terrainKeys);
            if (terrainKeys.length > 0) {
                worldData.terrain = entities.terrain[terrainKeys[0]];
                console.log('✅ [Integrationstest] Terrain hinzugefügt:', worldData.terrain);
            }
        }
        
        // Objects
        if (entities.objects) {
            const objectsArray = Object.values(entities.objects);
            console.log('📦 [Integrationstest] Objects gefunden:', objectsArray);
            worldData.objects = objectsArray;
            console.log('📦 [Integrationstest] Objects hinzugefügt:', worldData.objects.length, 'Objekte');
        } else if (entities.object) {
            // Fallback für altes Format (Singular)
            const objectsArray = Object.values(entities.object);
            console.log('📦 [Integrationstest] Objects (Fallback) gefunden:', objectsArray);
            worldData.objects = objectsArray;
            console.log('📦 [Integrationstest] Objects (Fallback) hinzugefügt:', worldData.objects.length, 'Objekte');
        } else {
            console.log('📦 [Integrationstest] Keine Objects gefunden in entities:', Object.keys(entities));
        }
        
        // Personas
        if (entities.personas) {
            const personasArray = Object.values(entities.personas);
            console.log('👤 [Integrationstest] Personas gefunden:', personasArray);
            worldData.personas = personasArray;
            console.log('👤 [Integrationstest] Personas hinzugefügt:', worldData.personas.length, 'Personas');
        } else if (entities.persona) {
            // Fallback für altes Format (Singular)
            const personasArray = Object.values(entities.persona);
            console.log('👤 [Integrationstest] Personas (Fallback) gefunden:', personasArray);
            worldData.personas = personasArray;
            console.log('👤 [Integrationstest] Personas (Fallback) hinzugefügt:', worldData.personas.length, 'Personas');
        } else {
            console.log('👤 [Integrationstest] Keine Personas gefunden in entities:', Object.keys(entities));
        }
        
        // Portals
        if (entities.portals) {
            const portalsArray = Object.values(entities.portals);
            console.log('🌀 [Integrationstest] Portals gefunden:', portalsArray);
            worldData.portals = portalsArray;
            console.log('🌀 [Integrationstest] Portals hinzugefügt:', worldData.portals.length, 'Portale');
        } else if (entities.portal) {
            // Fallback für altes Format (Singular)
            const portalsArray = Object.values(entities.portal);
            console.log('🌀 [Integrationstest] Portals (Fallback) gefunden:', portalsArray);
            worldData.portals = portalsArray;
            console.log('🌀 [Integrationstest] Portals (Fallback) hinzugefügt:', worldData.portals.length, 'Portale');
        } else {
            console.log('🌀 [Integrationstest] Keine Portals gefunden in entities:', Object.keys(entities));
        }
        
        // Extensions
        if (entities.extension) {
            worldData.extensions = {};
            for (const [key, extension] of Object.entries(entities.extension)) {
                if (extension.name) {
                    worldData.extensions[extension.name] = extension.value !== undefined ? extension.value : extension;
                }
            }
            console.log('🔧 [Integrationstest] Extensions hinzugefügt:', Object.keys(worldData.extensions));
        }
        
        // Camera
        if (entities.camera) {
            const cameraKeys = Object.keys(entities.camera);
            console.log('📷 [Integrationstest] Camera-Keys:', cameraKeys);
            if (cameraKeys.length > 0) {
                worldData.camera = entities.camera[cameraKeys[0]];
                console.log('✅ [Integrationstest] Camera hinzugefügt:', worldData.camera);
            }
        }
        
        console.log('🎉 [Integrationstest] Konvertierung abgeschlossen, gebe worldData zurück:', worldData);
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
}