// PatchVisualizer - Verwaltung der Patch-Visualisierungsfunktionen
import { ThreeJSManager } from './three-js-manager.js';

export class PatchVisualizer {
    constructor(threeJSManager) {
        this.threeJSManager = threeJSManager;
        this.currentPatches = [];
        this.highlightedEntities = new Map();
        this.patchColors = {
            add: 0x00ff00,      // Grün für hinzugefügte Entities
            update: 0xffff00,   // Gelb für aktualisierte Entities
            delete: 0xff0000,   // Rot für gelöschte Entities
            conflict: 0xff00ff  // Magenta für Konflikte
        };

        // Visualisierungszustand
        this.showHighlights = true;   // Toggle für Hervorhebungen
        this.animationSpeed = 1;      // Faktor für zeitbasierte Animation (1x)
        this.timeMode = 'none';       // 'none' | 'step' | 'continuous'

        // Letzte Genesis-Daten für Lookups (z. B. gelöschte Entities)
        this.lastGenesis = null;
    }

    /**
     * Visualisiert die Auswirkungen von Patches auf eine Genesis-Welt
     * @param {Object} genesisData - Die Genesis-Welt
     * @param {Array} patches - Array von Patches
     * @param {Object} options - Optionen für die Visualisierung
     * @returns {Promise<Object>} - Informationen über die visualisierten Patches
     */
    async visualizePatches(genesisData, patches, options = {}) {
        if (!this.threeJSManager || !this.threeJSManager.initialized) {
            throw new Error('Three.js Manager nicht initialisiert');
        }

        try {
            // Setze alle vorherigen Hervorhebungen zurück
            this.resetVisualization();

            // Speichere die aktuellen Patches und Genesis-Referenz
            this.currentPatches = patches || [];
            this.lastGenesis = genesisData || null;

            // Wenn keine Patches vorhanden sind, rendere nur die Genesis-Welt
            if (!patches || patches.length === 0) {
                await this.threeJSManager.renderWorld(genesisData);
                return { appliedPatches: 0, conflicts: [] };
            }

            // Wende die Patches an und erhalte die Ergebnisse
            const patchResults = await this.applyPatchesForVisualization(genesisData, patches);

            // Rendere die resultierende Welt
            await this.threeJSManager.renderWorld(patchResults.state);

            // Visualisiere die Patch-Auswirkungen
            await this.visualizePatchEffects(patchResults.diffs, patchResults.conflicts, options);

            return {
                appliedPatches: patches.length,
                conflicts: patchResults.conflicts,
                diffs: patchResults.diffs
            };
        } catch (error) {
            console.error('Fehler bei der Patch-Visualisierung:', error);
            throw error;
        }
    }

    /**
     * Wendet Patches an und gibt die Ergebnisse für die Visualisierung zurück
     * @param {Object} genesisData - Die Genesis-Welt
     * @param {Array} patches - Array von Patches
     * @returns {Promise<Object>} - Ergebnisse der Patch-Anwendung
     */
    async applyPatchesForVisualization(genesisData, patches) {
        // Importiere die PatchKit-API
        const { createPatchKitAPI } = await import('./patchkit-wiring.js');
        
        // Versuche, den NostrService aus dem PresetEditor zu bekommen
        let nostrService = null;
        let patchKit = null;
        
        // Debug-Informationen
        console.log('[DEBUG] applyPatchesForVisualization aufgerufen');
        console.log('[DEBUG] window.presetEditor verfügbar:', !!window.presetEditor);
        console.log('[DEBUG] window.NostrServiceFactory verfügbar:', !!window.NostrServiceFactory);
        console.log('[DEBUG] window.NostrService verfügbar:', !!window.NostrService);
        
        // Versuche 1: Hole den NostrService aus dem PresetEditor (falls verfügbar)
        try {
            if (window.presetEditor && window.presetEditor.nostrService) {
                nostrService = window.presetEditor.nostrService;
                console.log('[DEBUG] NostrService aus PresetEditor verwendet:', nostrService);
            } else {
                console.log('[DEBUG] Kein NostrService im PresetEditor gefunden');
            }
        } catch (e) {
            console.warn('Konnte NostrService nicht aus PresetEditor holen:', e);
        }
        
        // Versuche 2: Hole den NostrService aus der Factory
        if (!nostrService && window.NostrServiceFactory) {
            try {
                console.log('[DEBUG] Versuche NostrService über Factory zu erhalten');
                if (typeof window.NostrServiceFactory.create === 'function') {
                    nostrService = window.NostrServiceFactory.create();
                    console.log('[DEBUG] NostrService über Factory.create erstellt:', nostrService);
                } else if (typeof window.NostrServiceFactory.getNostrService === 'function') {
                    const maybe = window.NostrServiceFactory.getNostrService();
                    nostrService = (maybe && typeof maybe.then === 'function') ? await maybe : maybe;
                    console.log('[DEBUG] NostrService über Factory.getNostrService erhalten:', nostrService);
                } else {
                    console.log('[DEBUG] Factory hat weder create noch getNostrService Methode');
                }
            } catch (e) {
                console.warn('Konnte NostrService nicht über Factory erstellen:', e);
            }
        }
        
        // Versuche 3: Direkter Zugriff auf window.NostrService
        if (!nostrService && window.NostrService) {
            nostrService = window.NostrService;
            console.log('[DEBUG] NostrService direkt von window verwendet:', nostrService);
        }
        
        // Versuche 4: Verwende die PatchKit-API aus dem PresetEditor (falls verfügbar)
        if (!patchKit && window.presetEditor && window.presetEditor.patchKit) {
            patchKit = window.presetEditor.patchKit;
            console.log('[DEBUG] PatchKit-API aus PresetEditor verwendet:', patchKit);
        }
        
        // Erstelle die PatchKit-API, falls noch nicht vorhanden
        if (!patchKit) {
            if (!nostrService) {
                console.error('[DEBUG] Kein NostrService gefunden nach allen Versuchen');
                console.error('[DEBUG] Verfügbare globale Objekte:', Object.keys(window).filter(key => key.includes('Nostr') || key.includes('patch')));
                throw new Error('NostrService nicht verfügbar');
            }
            
            console.log('[DEBUG] Erstelle PatchKit-API mit NostrService');
            patchKit = await createPatchKitAPI(nostrService);
            console.log('[DEBUG] PatchKit-API über createPatchKitAPI erstellt:', patchKit);
        }

        // Wende die Patches an
        console.log('[DEBUG] Wende Patches an mit genesisData:', genesisData, 'und patches:', patches);
        const result = await patchKit.world.applyPatches(genesisData, patches);
        console.log('[DEBUG] Patch-Anwendungsergebnis:', result);
        
        return result;
    }

    /**
     * Visualisiert die Auswirkungen der Patches durch Hervorhebung der Entities
     * @param {Array} diffs - Die Diffs aus der Patch-Anwendung
     * @param {Array} conflicts - Die Konflikte aus der Patch-Anwendung
     * @param {Object} options - Optionen für die Visualisierung
     */
    async visualizePatchEffects(diffs, conflicts, options = {}) {
        const { showConflicts = true, highlightIntensity = 0.7 } = options;

        // Gruppiere die Diffs nach Operationstyp
        const entitiesByOperation = {
            add: [],
            update: [],
            delete: []
        };

        for (const diff of diffs) {
            if (entitiesByOperation[diff.kind]) {
                entitiesByOperation[diff.kind].push(diff.entity);
            }
        }

        // Hervorhebung der Entities nach Operationstyp
        if (this.showHighlights) {
            if (entitiesByOperation.add.length > 0) {
                this.threeJSManager.highlightEntities(
                    entitiesByOperation.add,
                    this.patchColors.add,
                    highlightIntensity
                );
            }

            if (entitiesByOperation.update.length > 0) {
                this.threeJSManager.highlightEntities(
                    entitiesByOperation.update,
                    this.patchColors.update,
                    highlightIntensity
                );
            }
        }

        if (entitiesByOperation.delete.length > 0) {
            // Für gelöschte Entities: Erstelle semi-transparente Repräsentationen
            await this.visualizeDeletedEntities(entitiesByOperation.delete);
        }

        // Visualisiere Konflikte
        if (showConflicts && conflicts.length > 0) {
            await this.visualizeConflicts(conflicts);
        }
    }

    /**
     * Visualisiert gelöschte Entities durch semi-transparente Repräsentationen
     * @param {Array} deletedEntities - Array der gelöschten Entities
     */
    async visualizeDeletedEntities(deletedEntities) {
        // Importiere die Builder-Funktionen
        const { buildObject, buildPersona, buildPortal } = await import('../../js/world-generation/builders.js');

        for (const entity of deletedEntities) {
            try {
                let mesh = null;

                // Original-Entity aus der Genesis finden
                const originalData = this.findEntityInGenesis(entity);
                if (!originalData) continue;

                // Erstelle eine semi-transparente Repräsentation der Entity
                if (entity.type === 'objects') {
                    mesh = buildObject(originalData, 'deleted_' + entity.id);
                } else if (entity.type === 'personas') {
                    mesh = buildPersona(originalData, 'deleted_' + entity.id);
                } else if (entity.type === 'portals') {
                    mesh = buildPortal(originalData, 'deleted_' + entity.id);
                }

                if (mesh) {
                    // Mache das Mesh semi-transparent und rot
                    mesh.traverse(child => {
                        if (child.isMesh) {
                            child.material = child.material.clone();
                            child.material.transparent = true;
                            child.material.opacity = 0.5;
                            child.material.emissive = new THREE.Color(this.patchColors.delete);
                            child.material.emissiveIntensity = 0.5;
                        }
                    });

                    // Füge das Mesh zur Szene hinzu
                    this.threeJSManager.scene.add(mesh);
                    
                    // Speichere die Referenz für späteres Zurücksetzen
                    this.highlightedEntities.set(`deleted_${entity.type}_${entity.id}`, mesh);
                }
            } catch (error) {
                console.warn(`Konnte gelöschte Entity nicht visualisieren: ${entity.type}:${entity.id}`, error);
            }
        }
    }

    /**
     * Visualisiert Konflikte zwischen Patches
     * @param {Array} conflicts - Array der Konflikte
     */
    async visualizeConflicts(conflicts) {
        for (const conflict of conflicts) {
            try {
                const entity = conflict.entity;
                
                // Finde das 3D-Objekt in der Szene
                const object = this.threeJSManager.findObjectByEntity(entity);
                if (object) {
                    // Erstelle ein pulsierendes Material für Konflikte
                    const pulsingMaterial = this.createPulsingMaterial(object, this.patchColors.conflict);

                    // Originalmaterial sichern, falls noch nicht vorhanden
                    object.userData = object.userData || {};
                    if (!object.userData.originalMaterial) {
                        object.userData.originalMaterial = object.material;
                    }
                    object.material = pulsingMaterial;
                    
                    // Speichere die Referenz für späteres Zurücksetzen
                    this.highlightedEntities.set(`conflict_${entity.type}_${entity.id}`, object);
                }
            } catch (error) {
                console.warn(`Konflikt konnte nicht visualisiert werden: ${conflict.kind}`, error);
            }
        }
    }

    /**
     * Erstellt ein pulsierendes Material für die Konfliktvisualisierung
     * @param {Object} object - Das 3D-Objekt
     * @param {number} color - Die Farbe für das Pulsieren
     * @returns {Object} - Das pulsierende Material
     */
    createPulsingMaterial(object, color) {
        let material;
        
        if (object.material) {
            if (Array.isArray(object.material)) {
                material = object.material.map(m => {
                    const newMaterial = m.clone();
                    newMaterial.emissive = new THREE.Color(color);
                    newMaterial.emissiveIntensity = 0.5;
                    return newMaterial;
                });
            } else {
                material = object.material.clone();
                material.emissive = new THREE.Color(color);
                material.emissiveIntensity = 0.5;
            }
        } else {
            material = new THREE.MeshLambertMaterial({ 
                color: 0xffffff,
                emissive: new THREE.Color(color),
                emissiveIntensity: 0.5
            });
        }
        
        // Speichere die Startzeit für das Pulsieren
        material.userData = { 
            pulseStartTime: Date.now(),
            isPulsing: true,
            baseEmissiveIntensity: material.emissiveIntensity
        };
        
        return material;
    }

    /**
     * Findet eine Entity in den Genesis-Daten
     * @param {Object} entity - Die zu findende Entity
     * @returns {Object|null} - Die gefundene Entity oder null
     */
    findEntityInGenesis(entity) {
        // Erwartetes Format: entity = { type: 'objects'|'portals'|'personas'|..., id: string }
        if (!this.lastGenesis || !this.lastGenesis.entities) return null;
        const t = entity?.type;
        const id = entity?.id;
        if (!t || !id) return null;
        const bucket = this.lastGenesis.entities[t];
        if (!bucket) return null;
        const original = bucket[id];
        return original ? JSON.parse(JSON.stringify(original)) : null; // defensive clone
    }

    /**
     * Setzt die Visualisierung zurück
     */
    resetVisualization() {
        // Setze alle Hervorhebungen im Three.js Manager zurück
        this.threeJSManager.resetHighlights();

        // Entferne alle speziellen Visualisierungen (gelöschte Entities, Konflikte)
        for (const [key, object] of this.highlightedEntities.entries()) {
            if (key.startsWith('deleted_')) {
                // Entferne gelöschte Entity-Repräsentationen
                this.threeJSManager.scene.remove(object);
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(m => m.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            } else if (key.startsWith('conflict_')) {
                // Setze Konflikt-Materialien zurück
                if (object.userData.originalMaterial) {
                    object.material = object.userData.originalMaterial;
                }
            }
        }

        this.highlightedEntities.clear();
        this.currentPatches = [];
    }

    /**
     * Aktualisiert die Pulsier-Animation für Konflikt-Materialien
     */
    updatePulsingAnimations() {
        const time = Date.now();
        
        for (const [key, object] of this.highlightedEntities.entries()) {
            if (key.startsWith('conflict_') && object.material) {
                const materials = Array.isArray(object.material) ? object.material : [object.material];
                
                for (const material of materials) {
                    if (material.userData.isPulsing) {
                        const elapsed = (time - material.userData.pulseStartTime) / 1000;
                        // Geschwindigkeit skalieren
                        const speed = Math.max(0.1, Number(this.animationSpeed) || 1);
                        const intensity = material.userData.baseEmissiveIntensity +
                                       Math.sin(elapsed * 3 * speed) * 0.3;
                        material.emissiveIntensity = Math.max(0.1, Math.min(1.0, intensity));
                    }
                }
            }
        }
    }

    /**
     * Gibt Informationen über die aktuellen Patches zurück
     * @returns {Object} - Informationen über die aktuellen Patches
     */
    getPatchInfo() {
        return {
            patchCount: this.currentPatches.length,
            highlightedEntities: this.highlightedEntities.size,
            hasConflicts: Array.from(this.highlightedEntities.keys()).some(key => key.startsWith('conflict_'))
        };
    }

    // Zusätzliche Steuer-APIs (MVP-Implementationen)

    toggleHighlights() {
        this.showHighlights = !this.showHighlights;
        return this.showHighlights;
    }

    setAnimationSpeed(speed) {
        const val = Number(speed);
        if (!Number.isFinite(val) || val <= 0) return this.animationSpeed;
        this.animationSpeed = val;
        return this.animationSpeed;
    }

    toggleTimeBasedApplication(mode) {
        // Optional: 'none' | 'step' | 'continuous' (MVP: nur Status setzen)
        if (!mode) {
            this.timeMode = (this.timeMode === 'none') ? 'step' : (this.timeMode === 'step' ? 'continuous' : 'none');
        } else {
            this.timeMode = mode;
        }
        return this.timeMode;
    }
}