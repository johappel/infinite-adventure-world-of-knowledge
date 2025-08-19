/**
 * Preview Renderer Module
 * Verwaltung der 3D-Vorschau und Rendering-Operationen
 *
 * Dieses Modul ist verantwortlich für die Verwaltung der 3D-Vorschau im PresetEditor.
 * Es bietet Funktionen zum Aktualisieren der Vorschau, Rendern von Worlds und Patches,
 * sowie zur Verwaltung von Kamera und Szene.
 *
 * @example
 * // Preview-Renderer initialisieren
 * const previewRenderer = new PreviewRenderer(editor);
 *
 * // Vorschau aus World-Objekt aktualisieren
 * await previewRenderer.updatePreviewFromObject(worldObject);
 *
 * // Vorschau aus Patch-Objekt aktualisieren
 * await previewRenderer.updatePreviewFromPatch(patchObject);
 *
 * // Vorschau zurücksetzen
 * previewRenderer.resetPreview();
 */
export class PreviewRenderer {
  /**
   * Erstellt eine neue PreviewRenderer-Instanz
   * @param {PresetEditor} editor - Die PresetEditor-Instanz
   */
  constructor(editor) {
    this.editor = editor;
  }

  async _initThreePreview() {
    try {
      // Importiere den ThreeJSManager
      const { ThreeJSManager } = await import('../three-js-manager.js');
      

      // Initialisiere den Three.js Manager
      this.editor.threeJSManager = new ThreeJSManager(this.editor.canvas);
      
      // Initialisiere die Szene
      await this.editor.threeJSManager.init();

      // Terrain-Klicks an den Editor weiterleiten (für YAML-Einfügen/Path-Aufbau)
      try {
        this.editor.threeJSManager.registerTerrainClickHandler((hitInfo) => {
          if (this.editor && typeof this.editor._handleTerrainClick === 'function') {
            this.editor._handleTerrainClick(hitInfo);
          }
        });
      } catch (e) {
        console.warn('[DEBUG] Konnte TerrainClickHandler nicht registrieren:', e);
      }
      
    } catch (error) {
      console.error('Fehler bei der Initialisierung des Three.js Previews:', error);
      this.editor._setStatus('Three.js Initialisierung fehlgeschlagen: ' + error.message, 'error');
    }
  }

  async updatePreviewFromObject(normalizedWorldObj) {
    try {
      
      
      if (!this.editor.threeJSManager || !this.editor.threeJSManager.initialized) {
        if (this.editor.threeJSManager && !this.editor.threeJSManager.initialized) {
          await this.editor.threeJSManager.init();
        } else {
          return;
        }
      }
      
      // Das Objekt sollte bereits normalisiert sein, wenn es hier ankommt.
      // Direkt an den Three.js Manager weiterleiten.
      console.log("[DEBUG updatePreviewFromObject] Normalized World Object:", normalizedWorldObj);
      const result = await this.editor.threeJSManager.renderWorld(normalizedWorldObj);
      if (result) {
        document.getElementById('objectCount').innerText = `Anzahl Objekte: ${result.objectCount}`;
      }
      
      // Ladeindikator ausblenden
      const loadingIndicator = document.getElementById('loadingIndicator');
      if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
      }
      
      
      // Prüfe, ob die Zone zur Szene hinzugefügt wurde
      if (this.editor.threeJSManager?.currentZone?.group) {
        const zoneInScene = this.editor.threeJSManager.scene.children.includes(
          this.editor.threeJSManager.currentZone.group
        );
      }
      console.log('[DEBUG] Vorschau aktualisiert');
    } catch (error) {
      this.editor._setStatus('Vorschau-Fehler: ' + error.message, 'error');
    }
  }

  async renderWorld() {
    try {
      if (!this.editor.threeJSManager || !this.editor.threeJSManager.initialized) {
        throw new Error('Three.js Manager nicht initialisiert');
      }
      
      // Parse die YAML-Daten
      const obj = this.editor.yamlProcessor.parseYaml();
      if (!obj) {
        throw new Error('Ungültiges YAML');
      }
      
      // Normalisiere das YAML-Objekt
      const normalized = this.editor.yamlProcessor.normalizeUserYaml(obj);
      
      // Aktualisiere die Vorschau
      await this.updatePreviewFromObject(normalized);
      
      if (window.showToast) window.showToast('success', 'Welt gerendert');
      this.editor._setStatus('Welt gerendert', 'success');
    } catch (e) {
      console.error(e);
      if (window.showToast) window.showToast('error', 'Rendern fehlgeschlagen: ' + e.message);
      this.editor._setStatus('Rendern fehlgeschlagen: ' + e.message, 'error');
    }
  }

  async resetWorld() {
    try {
      if (!this.editor.threeJSManager || !this.editor.threeJSManager.initialized) {
        throw new Error('Three.js Manager nicht initialisiert');
      }
      
      // Setze die Welt zurück
      await this.editor.threeJSManager.resetWorld();
      
      if (window.showToast) window.showToast('success', 'Welt zurückgesetzt');
      this.editor._setStatus('Welt zurückgesetzt', 'success');
    } catch (e) {
      console.error(e);
      if (window.showToast) window.showToast('error', 'Zurücksetzen fehlgeschlagen: ' + e.message);
      this.editor._setStatus('Zurücksetzen fehlgeschlagen: ' + e.message, 'error');
    }
  }

  _handleWindowResize() {
    try {
      if (this.editor.threeJSManager && this.editor.threeJSManager.initialized) {
        this.editor.threeJSManager.handleResize();
      }
    } catch (error) {
      console.error('Fehler bei der Fenstergrößenänderung:', error);
    }
  }

  /**
   * Lädt die aktuellen Genesis-Daten
   * @returns {Object|null} - Die Genesis-Daten oder null bei Fehler
   */
  async _getCurrentGenesisData() {
    try {
      if (!this.editor.worldId) {
        return null;
      }
      // Lade die Genesis direkt vom Server (nicht aus dem aktuellen YAML-Text, da das ein Patch sein könnte)
      const genesisEvt = await this.editor.patchKit.io?.genesisPort?.getById
        ? await this.editor.patchKit.io.genesisPort.getById(this.editor.worldId)
        : null;
      
      if (genesisEvt) {
        console.log('[DEBUG] Genesis-Event-Object:', genesisEvt.yaml);
        const extractedYaml = genesisEvt.yaml || genesisEvt.originalYaml;
        if(extractedYaml){
            return extractedYaml;
        }else{
          console.error('Kein gültiges YAML in _getCurrentGenesisData gefunden');
        }
      
      }
            
      return null;
    } catch (error) {
      console.error('Fehler beim Laden der Genesis-Daten:', error);
      return null;
    }
  }
  async _getCurrentGenesisYaml() {
    try {
      const data = await this._getCurrentGenesisData();
      if (data) {
        return this.editor.yamlProcessor.writeWorldYAMLToString(data);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Genesis-YAML:', error);
    }
    return null;
  }

  /**
   * Konvertiert einen Patch in ein Genesis-Format für die Vorschau
   * @param {Object} patch - Der zu konvertierende Patch
   * @returns {Object} - Das Genesis-Format
   */
  _convertPatchToGenesisFormat(patch) {
    try {
      if (!patch || !patch.operations) {
        return {
          metadata: {
            schema_version: 'patchkit/1.0',
            id: 'preview_' + Math.random().toString(36).slice(2, 10),
            name: 'Patch-Vorschau',
            description: 'Vorschau eines Patches',
            author_npub: 'npub0',
            created_at: Math.floor(Date.now() / 1000)
          },
          entities: {
            objects: {},
            portals: {},
            personas: {}
          },
          environment: {
            ambient_light: { color: '#ffffff', intensity: 0.5 },
            directional_light: { color: '#ffffff', intensity: 0.8, position: [10, 20, 10] }
          },
          terrain: {
            type: 'plane',
            size: [100, 100],
            color: '#1a4a1a'
          },
          camera: {
            position: [0, 5, 10],
            target: [0, 0, 0]
          }
        };
      }
      
      // Erstelle ein Genesis-Objekt
      const genesis = {
        metadata: {
          schema_version: 'patchkit/1.0',
          id: 'preview_' + Math.random().toString(36).slice(2, 10),
          name: patch.metadata?.name || 'Patch-Vorschau',
          description: patch.metadata?.description || 'Vorschau eines Patches',
          author_npub: patch.metadata?.author_npub || 'npub0',
          created_at: patch.metadata?.created_at || Math.floor(Date.now() / 1000)
        },
        entities: {
          objects: {},
          portals: {},
          personas: {}
        },
        environment: {
          ambient_light: { color: '#ffffff', intensity: 0.5 },
          directional_light: { color: '#ffffff', intensity: 0.8, position: [10, 20, 10] }
        },
        terrain: {
          type: 'plane',
          size: [100, 100],
          color: '#1a4a1a'
        },
        camera: {
          position: [0, 5, 10],
          target: [0, 0, 0]
        }
      };
      
      // Konvertiere die Operationen in Genesis-Entitäten
      for (const op of patch.operations) {
        if (op.type === 'add' && op.entity_type && op.payload) {
          // Behandle sowohl Singular als auch Plural entity_type
          let entityTypeName = op.entity_type;
          if (!entityTypeName.endsWith('s')) {
            entityTypeName = entityTypeName + 's'; // Plural form
          }
          
          if (genesis.entities[entityTypeName]) {
            // Vereinheitliche Attributnamen: kind → type
            const payload = { ...op.payload };
            if (payload.kind && !payload.type) payload.type = payload.kind;
            delete payload.kind;
            
            // Füge die Entität hinzu
            const entityId = op.entity_id || op.entity_type.replace('s', '') + '_' + Math.random().toString(36).slice(2, 8);
            genesis.entities[entityTypeName][entityId] = payload;
          }
        } else if (op.type === 'update' && op.entity_type && op.changes) {
          // Spezialbehandlung für environment, terrain und camera
          if (op.entity_type === 'environment') {
            genesis.environment = { ...genesis.environment, ...op.changes };
          } else if (op.entity_type === 'terrain') {
            genesis.terrain = { ...genesis.terrain, ...op.changes };
          } else if (op.entity_type === 'camera') {
            genesis.camera = { ...genesis.camera, ...op.changes };
          }
        }
      }
      
      return genesis;
    } catch (error) {
      console.error('Fehler bei der Konvertierung des Patches in Genesis-Format:', error);
      return null;
    }
  }
}