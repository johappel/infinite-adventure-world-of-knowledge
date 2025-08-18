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
      // Tiefe Kopie und Delegation an die zentrale Routine, die terrain.size korrekt einrückt
      const objToSerialize = JSON.parse(JSON.stringify(obj));
      return YamlProcessor.safeYamlDump(objToSerialize);
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
    if (!userYaml || typeof userYaml !== 'object') {
      return null;
    }

    // Wenn das Objekt bereits normalisiert aussieht, gib es direkt zurück.
    if (userYaml.metadata && userYaml.entities) {
      return userYaml;
    }

    try {
      const normalized = {
        metadata: {
          schema_version: 'patchkit/1.0',
          id: userYaml.id || 'world_' + Math.random().toString(36).slice(2, 10),
          name: userYaml.name || 'Unbenannte Welt',
          description: userYaml.description || '',
          author_npub: userYaml.author_npub || 'npub1anonymous', // Fügt Standard-Autor hinzu
          created_at: userYaml.created_at || Math.floor(Date.now() / 1000), // Fügt Zeitstempel hinzu
        },
        entities: {},
        rules: userYaml.rules || {},
      };

      // Konvertiere Arrays (benutzerfreundlich) in Objekte mit IDs (intern)
      const entityTypes = ['objects', 'portals', 'personas'];
      for (const type of entityTypes) {
        if (Array.isArray(userYaml[type])) {
          normalized.entities[type] = {};
          userYaml[type].forEach((item, index) => {
            const entityId = item.id || `${type.slice(0, -1)}_${index + 1}`;
            normalized.entities[type][entityId] = item;
          });
        }
      }

      // Behandle einzelne Entitäten
      const singleEntityTypes = ['environment', 'terrain', 'camera', 'player', 'extensions'];
      for (const type of singleEntityTypes) {
        if (userYaml[type]) {
          // Diese werden als Objekt mit einer einzigen, bekannten ID gespeichert
          normalized.entities[type] = { [`${type}_1`]: userYaml[type] };
        }
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
      if (!userYaml) return null;

      // 1) Kopie erstellen
      const src = JSON.parse(JSON.stringify(userYaml));

      // 2) Metadaten sicherstellen
      const normalized = {
        metadata: {
          schema_version: 'patchkit/1.0',
          id: src?.metadata?.id || 'patch_' + Math.random().toString(36).slice(2, 10),
          name: (src?.metadata?.name || src?.name || 'Patch'),
          description: (src?.metadata?.description || src?.description || ''),
          author_npub: (src?.metadata?.author_npub || src?.author_npub || 'npub0'),
          created_at: (src?.metadata?.created_at || Math.floor(Date.now() / 1000)),
          version: (src?.metadata?.version || src?.version || '')
          // targets_world wird außerhalb (z. B. PatchManager) gesetzt
        },
        operations: []
      };

      // 3) Falls bereits eine gültige operations-Liste im Autorformat existiert, validieren und übernehmen
      const isArrayOps = Array.isArray(src.operations);
      if (isArrayOps && src.operations.length > 0 && src.operations.every(op => typeof op === 'object')) {
        // Validieren und ggf. einfache Normalisierung der Felder
        for (const op of src.operations) {
          if (!op.type || !op.entity_type) throw new Error('Ungültige Operation: type und entity_type sind erforderlich');
          if (op.type === 'add') {
            if (!op.payload || typeof op.payload !== 'object') throw new Error('Add-Operation erfordert ein payload-Objekt');
            // optional: type->kind Angleichung, hier lassen wir payload unverändert
            normalized.operations.push({
              type: 'add',
              entity_type: op.entity_type,   // erwartet PLURAL, z. B. "objects"
              entity_id: op.entity_id || undefined,
              payload: op.payload
            });
          } else if (op.type === 'update') {
            if (!op.entity_id) throw new Error('Update-Operation erfordert entity_id');
            if (!op.changes || typeof op.changes !== 'object') throw new Error('Update-Operation erfordert changes-Objekt');
            normalized.operations.push({
              type: 'update',
              entity_type: op.entity_type,
              entity_id: op.entity_id,
              changes: op.changes
            });
          } else if (op.type === 'delete' || op.type === 'remove') {
            if (!op.entity_id) throw new Error('Delete-Operation erfordert entity_id');
            normalized.operations.push({
              type: 'delete',
              entity_type: op.entity_type,
              entity_id: op.entity_id
            });
          } else {
            throw new Error('Unbekannter Operationstyp: ' + op.type);
          }
        }
        return normalized;
      }

      // 4) Aus dem benutzerfreundlichen YAML-Editor-Format ableiten (z. B. ohne operations-Liste)
      // Hilfsfunktion: fügt eine Operation hinzu
      const addOp = (op) => normalized.operations.push(op);

      // Mapping: Editor-Abschnitt → plural entity_type
      const entityArraySections = [
        { key: 'objects',   entity_type: 'objects'   },
        { key: 'portals',   entity_type: 'portals'   },
        { key: 'personas',  entity_type: 'personas'  }
      ];

      // 4.1) Arrays (objects/portals/personas)
      for (const section of entityArraySections) {
        const arr = src[section.key];
        if (!Array.isArray(arr)) continue;

        arr.forEach((item, index) => {
          const hasId = !!item.id;
          const isDelete = item.delete === true || item.type === 'delete';
          // Klone und entferne Steuerfelder
          const payload = JSON.parse(JSON.stringify(item));
          delete payload.id;
          delete payload.delete;

          // Editor verwendet häufig "type" für Objekt-Typen → intern optional als payload.kind behalten
          if (payload.type && !payload.kind) {
            payload.kind = payload.type;
          }

          if (isDelete) {
            // delete benötigt entity_id
            if (!hasId) return; // ohne id keine delete-Operation
            addOp({
              type: 'delete',
              entity_type: section.entity_type,    // PLURAL!
              entity_id: item.id
            });
          } else if (hasId) {
            // update: Änderungen = verbleibende Felder
            if (Object.keys(payload).length > 0) {
              addOp({
                type: 'update',
                entity_type: section.entity_type,  // PLURAL!
                entity_id: item.id,
                changes: payload
              });
            }
          } else {
            // add: payload sind die Eigenschaften des neuen Objekts
            addOp({
              type: 'add',
              entity_type: section.entity_type,    // PLURAL!
              entity_id: undefined,                // optional; wird beim Anwenden generiert
              payload
            });
          }
        });
      }

      // 4.2) Einzelobjekte (environment, terrain, camera, extensions)
      // Diese werden als Updates auf stabile IDs betrachtet (z. B. env1/t1/cam1), aber für applyPatches
      // reicht ein Update ohne vorhandenes Objekt – es wird als Konflikt behandelt, wenn nicht vorhanden.
      const singleSections = [
        { key: 'environment', entity_type: 'environment', entity_id: 'env1' },
        { key: 'terrain',     entity_type: 'terrain',     entity_id: 't1'   },
        { key: 'camera',      entity_type: 'camera',      entity_id: 'cam1' }
      ];
      for (const s of singleSections) {
        if (src[s.key] && typeof src[s.key] === 'object') {
          addOp({
            type: 'update',
            entity_type: s.entity_type, // SINGULAR Schlüssel erlaubt (Bucket wird bei Bedarf erzeugt)
            entity_id: s.entity_id,
            changes: JSON.parse(JSON.stringify(src[s.key]))
          });
        }
      }

      // 4.3) extensions als Key-Map behandeln (add/update/delete je nach Differenz zum leeren Zustand)
      if (src.extensions && typeof src.extensions === 'object') {
        for (const [name, value] of Object.entries(src.extensions)) {
          // add/update als add (payload enthält name und value/objekt)
          const payload = typeof value === 'object' ? { ...value, name } : { name, value };
          addOp({
            type: 'add',
            entity_type: 'extension',
            entity_id: `extension_${name}`,
            payload
          });
        }
      }

      // 5) Fallback: wenn keine Operationen abgeleitet wurden, aber der Nutzer im Kopf "operations: add" o. ä. gesetzt hat,
      // dann versuchen wir minimal aus objects einen add abzuleiten
      if (normalized.operations.length === 0 && Array.isArray(src.objects) && src.objects.length > 0) {
        for (const item of src.objects) {
          const payload = JSON.parse(JSON.stringify(item));
          delete payload.id;
          delete payload.delete;
          if (payload.type && !payload.kind) payload.kind = payload.type;
          addOp({
            type: 'add',
            entity_type: 'objects',
            entity_id: undefined,
            payload
          });
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

  /**
   * Statische Methode zum sicheren YAML-Parsing
   * @param {string} str - Der zu parsende YAML-String
   * @returns {Object} - Das geparste Objekt
   * @throws {Error} - Bei Parsing-Fehlern
   */
  static safeYamlParse(str) {
    try {
      return jsyaml.load(str);
    } catch (e) {
      throw new Error('YAML-Fehler: ' + e.message);
    }
  }

  /**
   * Statische Methode zum sicheren YAML-Dumping
   * @param {Object} obj - Das zu serialisierende Objekt
   * @returns {string} - Der serialisierte YAML-Text
   * @throws {Error} - Bei Serialisierungs-Fehlern
   */
  static safeYamlDump(obj) {
    try {
      // Spezielle Behandlung für terrain.size - immer als Flow-Array
      // Prüfe sowohl direkte terrain.size als auch normalisierte Struktur (terrain.terrain_1.size)
      let terrainSize = null;
      let objCopy = JSON.parse(JSON.stringify(obj));
      
      // Fall 1: Direkte terrain.size Struktur
      if (objCopy && objCopy.terrain && Array.isArray(objCopy.terrain.size)) {
        terrainSize = objCopy.terrain.size;
        delete objCopy.terrain.size;
      }
      // Fall 2: Normalisierte Struktur mit terrain.terrain_1.size
      else if (objCopy && objCopy.terrain) {
        // Suche nach terrain_X Schlüsseln
        const terrainKeys = Object.keys(objCopy.terrain).filter(key => key.startsWith('terrain_'));
        if (terrainKeys.length > 0) {
          const firstTerrainKey = terrainKeys[0];
          const terrainObj = objCopy.terrain[firstTerrainKey];
          if (terrainObj && Array.isArray(terrainObj.size)) {
            terrainSize = terrainObj.size;
            delete objCopy.terrain[firstTerrainKey].size;
          }
        }
      }
      
      if (terrainSize) {
        // Erstelle YAML mit Standard-Einstellungen
        let yamlText = jsyaml.dump(objCopy, {
          lineWidth: 120,
          indent: 2,
          noRefs: true,
          sortKeys: false,
          flowLevel: 3
        });
        
        // terrain.size manuell als Flow-Array einfügen mit korrekter Einrückung
        const sizeYaml = `  size: [${terrainSize.join(', ')}]`;
        
        // Verschiedene Regex-Patterns für verschiedene Strukturen
        const directTerrainRegex = /terrain:\s*\n((?:  [^\n]+\n)*)/;
        const normalizedTerrainRegex = /terrain:\s*\n\s+terrain_\d+:\s*\n((?:    [^\n]+\n)*)/;
        
        if (normalizedTerrainRegex.test(yamlText)) {
          // Normalisierte Struktur: terrain.terrain_1.size
          yamlText = yamlText.replace(
            normalizedTerrainRegex,
            (match, content) => {
              const lines = content.split('\n').filter(line => line.trim());
              const indentedSize = `    size: [${terrainSize.join(', ')}]`;
              return match + indentedSize + '\n';
            }
          );
        } else if (directTerrainRegex.test(yamlText)) {
          // Direkte Struktur: terrain.size
          yamlText = yamlText.replace(
            directTerrainRegex,
            `terrain:\n$1${sizeYaml}\n`
          );
        } else {
          // Fallback: terrain.size am Ende des terrain-Blocks einfügen
          yamlText = yamlText.replace(
            /(terrain:[\s\S]*?)(?=\n\w+:|$)/,
            `$1\n${sizeYaml}`
          );
        }
        
        return yamlText;
      }
      
      // Standard-Fall für alle anderen Objekte
      return jsyaml.dump(obj, {
        lineWidth: 120,
        indent: 2,
        noRefs: true,
        sortKeys: false,
        flowLevel: 3
      });
    } catch (e) {
      throw new Error('YAML-Serialize-Fehler: ' + e.message);
    }
  }

  /**
   * Statische Methode zum Entfernen der Root-ID aus einem Objekt
   * @param {Object} obj - Das Objekt
   * @returns {Object} Das Objekt ohne Root-ID
   */
  static stripRootId(obj) {
    if (obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, 'id')) {
      try { delete obj.id; } catch {}
    }
    return obj;
  }

  /**
   * Prüft, ob ein Objekt dem Factory-Schema entspricht
   * @param {Object} obj - Das zu prüfende Objekt
   * @returns {boolean} - True, wenn es ein Factory-Schema ist
   */
  static isFactorySchema(obj) {
    try {
      return !!(
        obj &&
        typeof obj === 'object' &&
        obj.metadata &&
        typeof obj.metadata.schema_version === 'string' &&
        obj.metadata.schema_version.startsWith('patchkit/')
      );
    } catch {
      return false;
    }
  }

  /**
   * Konvertiert Factory-/PatchKit-JSON in das vom Autor erwartete YAML-Schema
   * @param {Object} obj - Das Factory-Objekt
   * @returns {Object|null} - Das konvertierte Autor-Schema oder null
   */
  static factoryToAuthorSpec(obj) {
    if (!obj || typeof obj !== 'object' || !YamlProcessor.isFactorySchema(obj)) return null;
    const md = obj.metadata || {};
    const entities = obj.entities || {};

    // Erstes Value aus Map (z. B. environment_1, terrain_1)
    const firstValue = (m) => {
      if (!m || typeof m !== 'object') return undefined;
      const vals = Object.values(m);
      return vals.length ? vals[0] : undefined;
    };

    // Map -> Array
    const mapToArray = (m) => {
      if (!m || typeof m !== 'object') return undefined;
      const arr = Object.values(m);
      return arr.length ? arr : undefined;
    };

    const spec = {
      name: md.name || '',
      description: md.description || '',
      id: md.id || undefined,
    };

    const environment = firstValue(entities.environment);
    if (environment && typeof environment === 'object') {
      spec.environment = environment;
    }

    const terrain = firstValue(entities.terrain);
    if (terrain && typeof terrain === 'object') {
      spec.terrain = terrain;
    }

    const objects = mapToArray(entities.objects);
    if (objects) spec.objects = objects;

    const portals = mapToArray(entities.portals);
    if (portals) spec.portals = portals;

    const personas = mapToArray(entities.personas);
    if (personas) spec.personas = personas;

    if (obj.rules && typeof obj.rules === 'object' && Object.keys(obj.rules).length) {
      spec.rules = obj.rules;
    }

    if (!spec.id) delete spec.id;

    return spec;
  }

  /**
   * Generiert eine eindeutige Kopie-ID basierend auf einer Basis-ID
   * @param {string} baseId - Die Basis-ID
   * @returns {string} - Die generierte eindeutige ID
   */
  static deriveCopyId(baseId) {
    const short = crypto.randomUUID().split('-')[0];
    const sanitized = String(baseId || 'world').toLowerCase().replace(/[^a-z0-9-_]/g,'-');
    return `${sanitized}-${short}`;
  }

  /**
   * Verarbeitet einen String (nostrservice.yaml) zu YAML
   * @param {string} str - Der zu verarbeitende String
   * @returns {string|null} - Der verarbeitete YAML-String oder null
   */
  static processStringToYaml(str) {
    if (typeof str !== 'string') return null;

    try {
      const parsed = JSON.parse(str);

      // Patch-Event: payload enthält den ursprünglichen YAML-Text
      if (parsed && typeof parsed.payload === 'string') {
        return parsed.payload;
      }

      // Factory-/Genesis-Objekt im PatchKit-Schema -> in Autor-Schema mappen
      const mapped = YamlProcessor.factoryToAuthorSpec(parsed);
      if (mapped) {
        return YamlProcessor.safeYamlDump(mapped);
      }

      // Fallback: JSON -> YAML (Autorformat)
      return YamlProcessor.safeYamlDump(parsed);
    } catch {
      // Kein JSON -> vermutlich YAML, unverändert zurückgeben
      return str;
    }
  }
}