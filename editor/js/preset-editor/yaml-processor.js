/**
 * YAML Processor Module
 * Verwaltung von YAML-Parsing, Serialisierung und Normalisierung
 *
 * Dieses Modul ist verantwortlich für die Verarbeitung von YAML-Daten im PresetEditor.
 * Es bietet Funktionen zum Parsen, Serialisieren und Normalisieren von YAML-Daten
 * für Worlds und Patches.
 *
 * @example
 * // YAML-Processor initialisieren
 * const yamlProcessor = new YamlProcessor(editor);
 *
 * // YAML parsen
 * const obj = yamlProcessor.parseYaml();
 *
 * // YAML serialisieren
 * const yamlText = yamlProcessor.serializeYaml(obj);
 *
 * // World-YAML normalisieren
 * const normalized = yamlProcessor.normalizeUserYaml(obj);
 *
 * // World-YAML denormalisieren
 * const denormalized = yamlProcessor.denormalizeUserYaml(normalized);
 */
export class YamlProcessor {
  /**
   * Erstellt eine neue YamlProcessor-Instanz
   * @param {PresetEditor} editor - Die PresetEditor-Instanz
   */
  constructor(editor) {
    this.editor = editor;
  }

  /**
   * Parst den aktuellen YAML-Text
   * @returns {Object|null} - Das geparste Objekt oder null bei Fehler
   */
  parseYaml() {
    try {
      const yamlText = this.editor.getYamlText();
      if (!yamlText) {
        return null;
      }
      
      const obj = jsyaml.load(yamlText);
      if (!obj) {
        return null;
      }
      
      return obj;
    } catch (e) {
      console.error('YAML-Parsing-Fehler:', e);
      this.editor._setStatus('YAML-Parsing-Fehler: ' + e.message, 'error');
      return null;
    }
  }

  /**
   * Serialisiert ein Objekt zu YAML-Text
   * @param {Object} obj - Das zu serialisierende Objekt
   * @returns {string} - Der serialisierte YAML-Text
   */
  serializeYaml(obj) {
    try {
      if (!obj) {
        return '';
      }
      
      const yamlText = jsyaml.dump(obj, {
        indent: 2,
        lineWidth: 120,
        noRefs: true,
        sortKeys: false
      });
      
      return yamlText;
    } catch (e) {
      console.error('YAML-Serialisierungs-Fehler:', e);
      this.editor._setStatus('YAML-Serialisierungs-Fehler: ' + e.message, 'error');
      return '';
    }
  }

  /**
   * Entfernt die ID aus einem World-Objekt
   * @param {Object} obj - Das World-Objekt
   * @returns {Object} Das World-Objekt ohne ID
   */
  stripWorldId(obj) {
    if (obj && typeof obj === 'object' && obj.id) {
      const copy = { ...obj };
      delete copy.id;
      return copy;
    }
    return obj;
  }

  /**
   * Validiert ein YAML-Objekt
   * @param {Object} yamlObj - Das zu validierende YAML-Objekt
   * @param {boolean} isPatch - True, wenn es sich um ein Patch-Objekt handelt
   * @returns {Object} - Ein Objekt mit valid: boolean und errors: Array
   */
  validateYaml(yamlObj, isPatch = false) {
    try {
      if (!yamlObj) {
        return { valid: false, errors: ['Kein YAML-Objekt zum Validieren'] };
      }
      
      const errors = [];
      
      // Validiere die Metadaten
      if (!yamlObj.metadata) {
        errors.push('Metadaten fehlen');
      } else {
        if (!yamlObj.metadata.schema_version) {
          errors.push('Schema-Version fehlt');
        } else if (yamlObj.metadata.schema_version !== 'patchkit/1.0') {
          errors.push('Ungültige Schema-Version: ' + yamlObj.metadata.schema_version);
        }
      }
      
      if (isPatch) {
        // Validiere die Patch-Struktur
        if (!yamlObj.operations) {
          errors.push('Operationen fehlen');
        } else if (!Array.isArray(yamlObj.operations)) {
          errors.push('Operationen müssen ein Array sein');
        } else {
          // Validiere jede Operation
          for (let i = 0; i < yamlObj.operations.length; i++) {
            const operation = yamlObj.operations[i];
            
            if (!operation.type) {
              errors.push(`Operation ${i}: Typ fehlt`);
            } else if (!['add', 'update', 'remove'].includes(operation.type)) {
              errors.push(`Operation ${i}: Ungültiger Typ: ${operation.type}`);
            }
            
            if (!operation.entity_type) {
              errors.push(`Operation ${i}: entity_type fehlt`);
            } else if (!['object', 'portal', 'persona'].includes(operation.entity_type)) {
              errors.push(`Operation ${i}: Ungültiger entity_type: ${operation.entity_type}`);
            }
            
            if (!operation.entity_id) {
              errors.push(`Operation ${i}: entity_id fehlt`);
            }
            
            // Validiere die Operationsspezifischen Felder
            switch (operation.type) {
              case 'add':
                if (!operation.payload) {
                  errors.push(`Operation ${i}: payload fehlt`);
                }
                break;
                
              case 'update':
                if (!operation.changes) {
                  errors.push(`Operation ${i}: changes fehlt`);
                } else if (typeof operation.changes !== 'object' || Array.isArray(operation.changes)) {
                  errors.push(`Operation ${i}: changes muss ein Objekt sein`);
                }
                break;
                
              case 'remove':
                // Remove-Operationen benötigen keine zusätzlichen Felder
                break;
            }
          }
        }
      } else {
        // Validiere die World-Struktur
        if (!yamlObj.entities) {
          errors.push('Entitäten fehlen');
        } else {
          if (!yamlObj.entities.objects) {
            errors.push('Objekte fehlen');
          }
          
          if (!yamlObj.entities.portals) {
            errors.push('Portale fehlen');
          }
          
          if (!yamlObj.entities.personas) {
            errors.push('Personas fehlen');
          }
        }
        
        if (!yamlObj.environment) {
          errors.push('Umgebung fehlt');
        } else {
          if (!yamlObj.environment.ambient_light) {
            errors.push('Ambientes Licht fehlt');
          }
          
          if (!yamlObj.environment.directional_light) {
            errors.push('Directionales Licht fehlt');
          }
        }
        
        if (!yamlObj.terrain) {
          errors.push('Terrain fehlt');
        } else {
          if (!yamlObj.terrain.type) {
            errors.push('Terrain-Typ fehlt');
          } else if (!['plane', 'box'].includes(yamlObj.terrain.type)) {
            errors.push('Ungültiger Terrain-Typ: ' + yamlObj.terrain.type);
          }
        }
        
        if (!yamlObj.camera) {
          errors.push('Kamera fehlt');
        } else {
          if (!yamlObj.camera.position) {
            errors.push('Kamera-Position fehlt');
          }
          
          if (!yamlObj.camera.target) {
            errors.push('Kamera-Ziel fehlt');
          }
        }
      }
      
      return {
        valid: errors.length === 0,
        errors: errors
      };
    } catch (e) {
      console.error('Fehler bei der Validierung des YAML:', e);
      return { valid: false, errors: ['Validierungsfehler: ' + e.message] };
    }
  }

  /**
   * Normalisiert ein benutzerdefiniertes YAML-Objekt
   * Stellt sicher, dass alle erforderlichen Felder vorhanden sind
   * @param {Object} userYaml - Das zu normalisierende YAML-Objekt
   * @returns {Object|null} - Das normalisierte Objekt oder null bei Fehler
   */
  normalizeUserYaml(userYaml) {
    try {
      if (!userYaml) {
        return null;
      }
      
      // Erstelle eine Kopie des Objekts
      const normalized = JSON.parse(JSON.stringify(userYaml));
      
      // Stelle sicher, dass die Metadaten vorhanden sind
      if (!normalized.metadata) {
        normalized.metadata = {};
      }
      
      // Setze die Schema-Version
      normalized.metadata.schema_version = 'patchkit/1.0';
      
      // Stelle sicher, dass die Entitäts-Struktur vorhanden ist
      if (!normalized.entities) {
        normalized.entities = {};
      }
      
      if (!normalized.entities.objects) {
        normalized.entities.objects = {};
      }
      
      if (!normalized.entities.portals) {
        normalized.entities.portals = {};
      }
      
      if (!normalized.entities.personas) {
        normalized.entities.personas = {};
      }
      
      // Stelle sicher, dass die Umgebung vorhanden ist
      if (!normalized.environment) {
        normalized.environment = {
          ambient_light: { color: '#ffffff', intensity: 0.5 },
          directional_light: { color: '#ffffff', intensity: 0.8, position: [10, 20, 10] }
        };
      }
      
      // Stelle sicher, dass das Terrain vorhanden ist
      if (!normalized.terrain) {
        normalized.terrain = {
          type: 'plane',
          size: [100, 100],
          color: '#1a4a1a'
        };
      }
      
      // Stelle sicher, dass die Kamera vorhanden ist
      if (!normalized.camera) {
        normalized.camera = {
          position: [0, 5, 10],
          target: [0, 0, 0]
        };
      }
      
      return normalized;
    } catch (e) {
      console.error('Fehler bei der Normalisierung des YAML:', e);
      this.editor._setStatus('Fehler bei der Normalisierung des YAML: ' + e.message, 'error');
      return null;
    }
  }

  /**
   * Denormalisiert ein normalisiertes YAML-Objekt
   * Entfernt leere Objekte für eine bessere Lesbarkeit
   * @param {Object} normalizedYaml - Das zu denormalisierende YAML-Objekt
   * @returns {Object|null} - Das denormalisierte Objekt oder null bei Fehler
   */
  denormalizeUserYaml(normalizedYaml) {
    try {
      if (!normalizedYaml) {
        return null;
      }
      
      // Erstelle eine Kopie des Objekts
      const denormalized = JSON.parse(JSON.stringify(normalizedYaml));
      
      // Entferne leere Objekte
      if (denormalized.entities && Object.keys(denormalized.entities).length === 0) {
        delete denormalized.entities;
      }
      
      if (denormalized.entities && denormalized.entities.objects && Object.keys(denormalized.entities.objects).length === 0) {
        delete denormalized.entities.objects;
      }
      
      if (denormalized.entities && denormalized.entities.portals && Object.keys(denormalized.entities.portals).length === 0) {
        delete denormalized.entities.portals;
      }
      
      if (denormalized.entities && denormalized.entities.personas && Object.keys(denormalized.entities.personas).length === 0) {
        delete denormalized.entities.personas;
      }
      
      // Entferne die Entitäten-Struktur, wenn sie leer ist
      if (denormalized.entities && Object.keys(denormalized.entities).length === 0) {
        delete denormalized.entities;
      }
      
      return denormalized;
    } catch (e) {
      console.error('Fehler bei der Denormalisierung des YAML:', e);
      this.editor._setStatus('Fehler bei der Denormalisierung des YAML: ' + e.message, 'error');
      return null;
    }
  }

  /**
   * Normalisiert ein benutzerdefiniertes Patch-YAML-Objekt
   * Stellt sicher, dass alle erforderlichen Felder vorhanden sind
   * @param {Object} userYaml - Das zu normalisierende Patch-YAML-Objekt
   * @returns {Object|null} - Das normalisierte Objekt oder null bei Fehler
   */
  normalizePatchYaml(userYaml) {
    try {
      if (!userYaml) {
        return null;
      }
      
      // Erstelle eine Kopie des Objekts
      const normalized = JSON.parse(JSON.stringify(userYaml));
      
      // Stelle sicher, dass die Metadaten vorhanden sind
      if (!normalized.metadata) {
        normalized.metadata = {};
      }
      
      // Setze die Schema-Version
      normalized.metadata.schema_version = 'patchkit/1.0';
      
      // Stelle sicher, dass die Operationen vorhanden sind
      if (!normalized.operations) {
        normalized.operations = [];
      }
      
      // Validiere jede Operation
      for (const operation of normalized.operations) {
        if (!operation.type || !operation.entity_type || !operation.entity_id) {
          throw new Error('Ungültige Operation: type, entity_type und entity_id sind erforderlich');
        }
        
        // Stelle sicher, dass die Operation die richtigen Felder hat
        switch (operation.type) {
          case 'add':
            if (!operation.payload) {
              throw new Error('Add-Operation erfordert ein payload-Feld');
            }
            break;
            
          case 'update':
            if (!operation.changes) {
              throw new Error('Update-Operation erfordert ein changes-Feld');
            }
            break;
            
          case 'remove':
            // Remove-Operationen benötigen keine zusätzlichen Felder
            break;
            
          default:
            throw new Error('Unbekannter Operationstyp: ' + operation.type);
        }
      }
      
      return normalized;
    } catch (e) {
      console.error('Fehler bei der Normalisierung des Patch-YAML:', e);
      this.editor._setStatus('Fehler bei der Normalisierung des Patch-YAML: ' + e.message, 'error');
      return null;
    }
  }
  /**
   * Denormalisiert ein normalisiertes Patch-YAML-Objekt
   * Entfernt leere Arrays für eine bessere Lesbarkeit
   * @param {Object} normalizedYaml - Das zu denormalisierende Patch-YAML-Objekt
   * @returns {Object|null} - Das denormalisierte Objekt oder null bei Fehler
   */
  denormalizePatchYaml(normalizedYaml) {
    try {
      if (!normalizedYaml) {
        return null;
      }
      
      // Erstelle eine Kopie des Objekts
      const denormalized = JSON.parse(JSON.stringify(normalizedYaml));
      
      // Entferne leere Arrays
      if (denormalized.operations && denormalized.operations.length === 0) {
        delete denormalized.operations;
      }
      
      return denormalized;
    } catch (e) {
      console.error('Fehler bei der Denormalisierung des Patch-YAML:', e);
      this.editor._setStatus('Fehler bei der Denormalisierung des Patch-YAML: ' + e.message, 'error');
      return null;
    }
  }

  /**
   * Validiert den aktuellen YAML-Content des Editors
   * Zeigt das Ergebnis in der UI an und aktualisiert die Vorschau
   */
  validateYamlInEditor() {
    try {
      const rawText = this.editor.getYamlText();
      const obj = this.parseYaml();
      if (!obj) {
        this.editor._setStatus('Kein YAML-Inhalt zum Validieren.', 'info');
        return;
      }
      const normalized = this.normalizeUserYaml(this.stripWorldId(obj));
      
      // Prüfe, ob eine Validierungsfunktion verfügbar ist
      if (!this.editor.patchKit || !this.editor.patchKit.genesis || typeof this.editor.patchKit.genesis.validate !== 'function') {
        console.warn('Keine Validierungsfunktion verfügbar, überspringe Validierung');
        this.editor._setStatus('YAML-Validierung nicht verfügbar', 'info');
        this.editor.uiManager._setValidationErrorsUI([]);
        this.editor.previewRenderer.updatePreviewFromObject(normalized);
        return;
      }
      
      const resMaybe = this.editor.patchKit.genesis.validate(normalized);

      const handle = (res) => {
        try {
          const valid = res?.valid === true || res === true;
          // EINZIGER Status: über Statusbar
          if (valid) {
            this.editor._setStatus('YAML gültig', 'success');
            this.editor.uiManager._setValidationErrorsUI([]);
            this.editor.previewRenderer.updatePreviewFromObject(normalized);
          } else {
            const errors = Array.isArray(res?.errors) ? res.errors : [];
            this.editor._setStatus('YAML ungültig', 'error');
            this.editor.uiManager._setValidationErrorsUI(errors, rawText);
          }
        } catch (e) {
          console.error('[Validator] Handle Exception:', e);
          this.editor._setStatus('Validierungsfehler: ' + e.message, 'error');
        }
      };

      if (resMaybe && typeof resMaybe.then === 'function') {
        resMaybe.then(handle).catch(e => {
          console.error('[Validator] Promise Exception:', e);
          this.editor._setStatus('Validierungsfehler: ' + e.message, 'error');
        });
      } else {
        handle(resMaybe);
      }
    } catch (e) {
      console.error('[Validator] Parse/Normalize Exception:', e);
      this.editor._setStatus('YAML-Parsefehler: ' + e.message, 'error');
    }
  }
}