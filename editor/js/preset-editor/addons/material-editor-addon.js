/**
 * Material Editor Addon für den PresetEditor
 *
 * Bietet erweiterte Material-Bearbeitung mit ColorPickern und Slidern
 * für physikalisch basierte Rendering (PBR) Eigenschaften.
 */

import { InteractionAddon } from './base-addon.js';
import * as THREE from 'three';

export class MaterialEditorAddon extends InteractionAddon {
  constructor(editor) {
    super(editor);
    this.name = 'Material Editor';
    this.description = 'Material zu Entities hinzufügen und bearbeiten';
    this.icon = '🎨';
    
    // Zustandsvariablen für Entity-Interaktion
    this.hoveredEntity = null;
    this.selectedEntity = null;
    this.hoverMesh = null;
    this.materialDialog = null;
    this.isMouseOverCanvas = false;
    
    // Debouncing für Mouseover
    this.mouseMoveTimeout = null;
    this.lastMousePosition = { x: 0, y: 0 };
    
    // Material-Vorlagen
    this.materialTemplates = {
      'Standard': new THREE.MeshStandardMaterial({ color: 0x888888 }),
      'Metallic': new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.2 }),
      'Plastic': new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.1, roughness: 0.4 }),
      'Wood': new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 }),
      'Stone': new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.9 }),
      'Glass': new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }),
      'Emissive': new THREE.MeshStandardMaterial({ color: 0x888888, emissive: 0xff6600, emissiveIntensity: 0.5 })
    };
  }
  
  /**
   * Wird aufgerufen wenn das Addon aktiviert wird
   */
  async activate() {
    await super.activate();
    console.log('[MaterialEditor] Addon aktiviert');
    
    // Event-Listener für Canvas-Mouseover
    this._bindCanvasEvents();
    
    // Erstelle Hover-Mesh für die Visualisierung
    this._createHoverMesh();
  }
  
  /**
   * Wird aufgerufen wenn das Addon deaktiviert wird
   */
  async deactivate() {
    await super.deactivate();
    
    // Aufräumen
    this._removeHoverMesh();
    this._unbindCanvasEvents();
    this._closeDialog();
    
    console.log('[MaterialEditor] Addon deaktiviert');
  }
  
  /**
   * Bindet Event-Listener für den Canvas
   * @private
   */
  _bindCanvasEvents() {
    const canvas = this.editor.canvas;
    if (!canvas) return;
    
    this._boundMouseMove = (e) => this._onCanvasMouseMove(e);
    this._boundMouseLeave = () => this._onCanvasMouseLeave();
    this._boundClick = (e) => this._onCanvasClick(e);
    
    canvas.addEventListener('mousemove', this._boundMouseMove);
    canvas.addEventListener('mouseleave', this._boundMouseLeave);
    canvas.addEventListener('click', this._boundClick);
    
    this.isMouseOverCanvas = true;
  }
  
  /**
   * Entfernt Event-Listener
   * @private
   */
  _unbindCanvasEvents() {
    const canvas = this.editor.canvas;
    if (!canvas || !this._boundMouseMove) return;
    
    canvas.removeEventListener('mousemove', this._boundMouseMove);
    canvas.removeEventListener('mouseleave', this._boundMouseLeave);
    canvas.removeEventListener('click', this._boundClick);
    
    this.isMouseOverCanvas = false;
  }
  
  /**
   * Handler für Mausbewegungen auf dem Canvas
   * @param {MouseEvent} event - Das Mausbewegungs-Ereignis
   * @private
   */
  _onCanvasMouseMove(event) {
    if (!this.isActive) return;
    
    this.lastMousePosition = { x: event.clientX, y: event.clientY };
    
    // Debouncing für Raycasting
    if (this.mouseMoveTimeout) {
      clearTimeout(this.mouseMoveTimeout);
    }
    
    this.mouseMoveTimeout = setTimeout(() => {
      this._performRaycast(event);
    }, 50);
  }
  
  /**
   * Handler für Mausverlassen des Canvas
   * @private
   */
  _onCanvasMouseLeave() {
    this.isMouseOverCanvas = false;
    this._clearHover();
  }
  
  /**
   * Handler für Mausklicks auf dem Canvas
   * @param {MouseEvent} event - Das Mausklick-Ereignis
   * @private
   */
  _onCanvasClick(event) {
    if (!this.isActive || !this.hoveredEntity) return;
    
    // Verwende die hoveredEntity, die bereits aufgelöst ist
    this.selectedEntity = this._resolveEditableEntity(this.hoveredEntity);
    
    this._openMaterialDialog();
  }
  
  /**
   * Führt Raycasting für die Entity-Erkennung durch
   * @param {MouseEvent} event - Das Mausereignis für die Raycaster-Position
   * @private
   */
  _performRaycast(event) {
    if (!this.editor.threeJSManager || !this.isMouseOverCanvas) return;
    
    const threeJS = this.editor.threeJSManager;
    const canvas = this.editor.canvas;
    const rect = canvas.getBoundingClientRect();
    
    // Normalized Device Coordinates
    const mouse = {
      x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
      y: -((event.clientY - rect.top) / rect.height) * 2 + 1
    };
    
    // Raycaster für Entity-Erkennung
    threeJS.raycaster.setFromCamera(mouse, threeJS.camera);
    
    // Alle Objekte in der Szene durchsuchen (außer Terrain, Skybox und Hover-Hilfsmesh)
    const targets = [];
    threeJS.scene.traverse(child => {
      if (child.isMesh && child.visible) {
        const isTerrain = child.userData?.isTerrain ||
                         (child.name && /terrain|ground|floor/i.test(child.name));
        const isSkybox = child.userData?.isSkybox;
        const isHoverHelper = child === this.hoverMesh || child.userData?.isHoverHelper === true;
        
        if (!isTerrain && !isSkybox && !isHoverHelper) {
          targets.push(child);
        }
      }
    });
    
    const intersects = threeJS.raycaster.intersectObjects(targets, true);
    
    if (intersects.length > 0) {
      const hit = intersects[0];
      this._handleEntityHover(hit.object);
    } else {
      this._clearHover();
    }
  }
  
  /**
   * Behandelt das Hover-Ereignis für eine Entity
   * @param {THREE.Object3D} entityObject - Das angehoverte 3D-Objekt
   * @private
   */
  _handleEntityHover(entityObject) {
    // Ermittle die tatsächlich bearbeitbare Entity (nicht das Hover-Mesh oder Hilfsmeshes)
    const target = this._resolveEditableEntity(entityObject);
    if (this.hoveredEntity === target) return;
    
    this._clearHover();
    this.hoveredEntity = target;
    
    // Hover-Mesh an der Ziel-Entity positionieren
    this._updateHoverMesh(target);
  }
  
  /**
   * Entfernt den Hover-Zustand und versteckt das Hover-Mesh
   * @private
   */
  _clearHover() {
    this.hoveredEntity = null;
    this._hideHoverMesh();
  }
  
  /**
   * Erstellt das Hover-Mesh für die visuelle Hervorhebung von Entities
   * @private
   */
  _createHoverMesh() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff3366,
      wireframe: true,
      transparent: true,
      opacity: 0.8,
      depthTest: false
    });
    
    this.hoverMesh = new THREE.Mesh(geometry, material);
    this.hoverMesh.visible = false;
    this.hoverMesh.renderOrder = 999; // Immer oben rendern
    this.hoverMesh.userData.isHoverHelper = true;
    
    if (this.editor.threeJSManager && this.editor.threeJSManager.scene) {
      this.editor.threeJSManager.scene.add(this.hoverMesh);
    }
  }
  
  /**
   * Aktualisiert die Position und Größe des Hover-Mesh basierend auf der Entity
   * @param {THREE.Object3D} entityObject - Die Entity, für die das Hover-Mesh angepasst werden soll
   * @private
   */
  _updateHoverMesh(entityObject) {
    if (!this.hoverMesh) return;
    
    // World-Position und Bounding Box der Entity
    const worldPos = new THREE.Vector3();
    entityObject.getWorldPosition(worldPos);
    
    const box = new THREE.Box3().setFromObject(entityObject);
    const size = box.getSize(new THREE.Vector3());
    
    // Hover-Mesh anpassen
    this.hoverMesh.position.copy(worldPos);
    this.hoverMesh.scale.copy(size).multiplyScalar(1.1); // 10% größer
    this.hoverMesh.visible = true;
  }
  
  /**
   * Versteckt das Hover-Mesh
   * @private
   */
  _hideHoverMesh() {
    if (this.hoverMesh) {
      this.hoverMesh.visible = false;
    }
  }
  
  /**
   * Entfernt das Hover-Mesh komplett aus der Szene und gibt Ressourcen frei
   * @private
   */
  _removeHoverMesh() {
    if (this.hoverMesh && this.editor.threeJSManager && this.editor.threeJSManager.scene) {
      this.editor.threeJSManager.scene.remove(this.hoverMesh);
      this.hoverMesh.geometry.dispose();
      this.hoverMesh.material.dispose();
      this.hoverMesh = null;
    }
  }
  
  /**
   * Findet die bearbeitbare Entity ausgehend von einem getroffenen Objekt.
   * - Ignoriert Hover-/Hilfsmeshes
   * - Klettert zu einem Elternteil mit semantischem Typ in userData
   * @param {THREE.Object3D} obj - Das ursprünglich getroffene Objekt
   * @returns {THREE.Object3D} Die bearbeitbare Entity-Referenz
   * @private
   */
  _resolveEditableEntity(obj) {
    if (!obj) return null;

    // Wenn es sich um das Hover-Hilfsmesh oder einen Helper handelt, nimm stattdessen dessen Parent
    if (obj === this.hoverMesh || obj.userData?.isHoverHelper) {
      obj = obj.parent || obj;
    }

    // Klettere zu einem Parent, der eine sinnvollere Entität beschreibt
    let current = obj;
    while (current) {
      const userData = current.userData || {};
      // Prüfe auf semantische Typen (entityType oder objectType)
      const hasSemanticType = !!(userData.entityType || userData.objectType);
      if (hasSemanticType || !current.parent) {
        return current;
      }
      current = current.parent;
    }
    
    return obj; // Fallback: gib das ursprüngliche Objekt zurück
  }
  
  /**
   * Öffnet den Material-Bearbeitungs-Dialog für die ausgewählte Entity
   * @private
   */
  _openMaterialDialog() {
    console.log('[MaterialEditor] _openMaterialDialog aufgerufen');
    
    if (!this.selectedEntity) {
      console.error('[MaterialEditor] Keine selectedEntity vorhanden');
      this._showToast('error', 'Keine Entity ausgewählt');
      return;
    }
    
    console.log('[MaterialEditor] selectedEntity:', this.selectedEntity);
    console.log('[MaterialEditor] selectedEntity.userData:', this.selectedEntity.userData);
    
    // Speichere die Entity-Referenz bevor der Dialog geschlossen wird
    const selectedEntity = this.selectedEntity;
    
    // Vorherigen Dialog schließen (setzt selectedEntity auf null)
    this._closeDialog();
    
    // Entity-Referenz wiederherstellen
    this.selectedEntity = selectedEntity;
    
    // Speichere die originale Position für die YAML-Zuordnung
    this.originalEntityPosition = new THREE.Vector3();
    this.selectedEntity.getWorldPosition(this.originalEntityPosition);
    console.log('[MaterialEditor] Originale Position gespeichert:', this.originalEntityPosition);
    
    // Versuche entity_id aus dem YAML anhand der Position zu finden
    if (!this.selectedEntity.userData.entityId) {
      const entityIdFromYaml = this._findEntityIdFromYamlByPosition(this.originalEntityPosition);
      if (entityIdFromYaml) {
        this.selectedEntity.userData.entityId = entityIdFromYaml;
        console.log('[MaterialEditor] entity_id aus YAML übernommen:', entityIdFromYaml);
      } else {
        console.log('[MaterialEditor] Keine entity_id im YAML gefunden, generiere neue');
        const newEntityId = this._generateEntityId();
        
        // Erstelle eine Kopie der Entity mit der neuen entity_id
        const clone = this.selectedEntity.clone();
        clone.userData.entityId = newEntityId;
        
        // Ersetze die originale Entity durch die Kopie in der Szene
        const parent = this.selectedEntity.parent;
        if (parent) {
          parent.remove(this.selectedEntity);
          parent.add(clone);
        }
        
        // Aktualisiere Referenzen
        this.selectedEntity = clone;
        if (this.hoveredEntity === this.selectedEntity) {
          this.hoveredEntity = clone;
        }
        
        console.log('[MaterialEditor] Entity durch Kopie ersetzt mit neuer entity_id:', newEntityId);
      }
    } else {
      console.log('[MaterialEditor] Entity hat bereits entityId:', this.selectedEntity.userData.entityId);
    }
    
    // Dialog erstellen
    this.materialDialog = this._createDialog();
    document.body.appendChild(this.materialDialog);
    
    // Dialog-Inhalt füllen
    this._populateDialog();
    
    // Fallback: Wenn Dialog nach 100ms noch leer ist, Fehlermeldung anzeigen
    setTimeout(() => {
      if (this.materialDialog && this.materialDialog.children.length === 0) {
        console.error('[MaterialEditor] Dialog blieb leer, zeige Fehlermeldung');
        const errorMsg = document.createElement('div');
        errorMsg.innerHTML = `
          <div style="color: #ff6666; padding: 20px; text-align: center;">
            <h3>Fehler beim Laden des Material-Dialogs</h3>
            <p>Bitte Konsole für Details öffnen.</p>
            <p style="font-size: 12px;">Entity: ${this.selectedEntity?.name || 'Unbekannt'}</p>
          </div>
        `;
        this.materialDialog.appendChild(errorMsg);
      }
    }, 100);
  }
  
  /**
   * Erstellt den Dialog-Container
   * @returns {HTMLElement}
   * @private
   */
  _createDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'material-dialog';
    dialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #2a2a2a;
      border: 2px solid #ff3366;
      border-radius: 8px;
      padding: 20px;
      z-index: 1000;
      min-width: 400px;
      max-width: 90vw;
      max-height: 80vh;
      overflow-y: auto;
      color: white;
      font-family: system-ui, sans-serif;
    `;
    
    // Overlay für Hintergrund
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.7);
      z-index: 999;
    `;
    overlay.addEventListener('click', () => this._closeDialog());
    document.body.appendChild(overlay);
    
    this.dialogOverlay = overlay;
    return dialog;
  }
  
  /**
   * Findet die entity_id im YAML basierend auf der Weltposition
   * @param {THREE.Vector3} position - Die Weltposition der Entity
   * @returns {string|null} Die entity_id oder null wenn nicht gefunden
   * @private
   */
  _findEntityIdFromYamlByPosition(position) {
    try {
      const currentYaml = this._parseCurrentYaml();
      if (!currentYaml || !currentYaml.objects) return null;
      
      // Durchsuche alle Objekte im YAML
      for (const obj of currentYaml.objects) {
        if (obj.position && Array.isArray(obj.position) && obj.entity_id) {
          // Vergleiche Positionen mit erhöhter Toleranz (0.5 statt 0.15)
          const tolerance = 0.5;
          const objX = obj.position[0];
          const objY = obj.position[1];
          const objZ = obj.position[2];
          
          if (Math.abs(objX - position.x) < tolerance &&
              Math.abs(objY - position.y) < tolerance &&
              Math.abs(objZ - position.z) < tolerance) {
            console.log('[MaterialEditor] entity_id im YAML gefunden:', obj.entity_id);
            return obj.entity_id;
          }
        }
      }
    } catch (error) {
      console.error('[MaterialEditor] Fehler beim Suchen der entity_id im YAML:', error);
    }
    
    return null;
  }
  
  /**
   * Füllt den Dialog mit Material-Vorlagen und Auswahloptionen
   * @private
   */
  _populateDialog() {
    console.log('[MaterialEditor] _populateDialog aufgerufen');
    
    if (!this.materialDialog) {
      console.error('[MaterialEditor] Kein materialDialog vorhanden');
      return;
    }
    
    if (!this.selectedEntity) {
      console.error('[MaterialEditor] Keine selectedEntity in _populateDialog');
      return;
    }
    
    const entity = this.selectedEntity;
    console.log('[MaterialEditor] Entity-Details:', {
      name: entity.name,
      uuid: entity.uuid,
      userData: entity.userData,
      isMesh: entity.isMesh,
      material: entity.material
    });
    
    // Extrahiere Entity-Informationen mit Fallbacks
    const entityType = entity.userData?.objectType ||
                      entity.userData?.type ||
                      entity.userData?.entityType ||
                      entity.name ||
                      'Unknown';
    
    // Verwende die korrekte entity_id aus userData (wird in _openMaterialDialog gesetzt)
    const entityId = entity.userData?.entityId || 'N/A';
    
    // Titel
    const title = document.createElement('h3');
    title.textContent = 'Material zu Entity hinzufügen';
    title.style.marginTop = '0';
    title.style.color = '#ff3366';
    
    // Entity-Info
    const infoSection = document.createElement('div');
    infoSection.style.marginBottom = '20px';
    infoSection.style.fontSize = '14px';
    infoSection.style.opacity = '0.8';
    infoSection.innerHTML = `
      <div><strong>Typ:</strong> ${entityType}</div>
      <div><strong>ID:</strong> ${entityId}</div>
    `;
    
    // Material-Vorlagen Auswahl
    const templatesSection = document.createElement('div');
    templatesSection.style.marginBottom = '20px';
    
    const templatesTitle = document.createElement('h4');
    templatesTitle.textContent = 'Material-Vorlagen';
    templatesTitle.style.margin = '0 0 10px 0';
    templatesTitle.style.fontSize = '16px';
    
    const templatesGrid = document.createElement('div');
    templatesGrid.style.display = 'grid';
    templatesGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(150px, 1fr))';
    templatesGrid.style.gap = '10px';
    
    // Erstelle Buttons für jede Material-Vorlage
    Object.entries(this.materialTemplates).forEach(([name, material]) => {
      const templateBtn = document.createElement('button');
      templateBtn.textContent = name;
      templateBtn.style.cssText = `
        background: #444;
        color: white;
        border: 2px solid #666;
        border-radius: 6px;
        padding: 12px;
        cursor: pointer;
        transition: all 0.2s;
        text-align: center;
      `;
      
      // Vorschau des Materials als Hintergrund
      templateBtn.style.background = `linear-gradient(45deg, #${material.color.getHexString()} 0%, #${material.emissive?.getHexString() || material.color.getHexString()} 100%)`;
      
      templateBtn.addEventListener('mouseenter', () => {
        templateBtn.style.borderColor = '#ff3366';
        templateBtn.style.transform = 'translateY(-2px)';
      });
      
      templateBtn.addEventListener('mouseleave', () => {
        templateBtn.style.borderColor = '#666';
        templateBtn.style.transform = 'translateY(0)';
      });
      
      templateBtn.addEventListener('click', () => {
        this._applyMaterialToEntity(material.clone(), name);
      });
      
      templatesGrid.appendChild(templateBtn);
    });
    
    templatesSection.appendChild(templatesTitle);
    templatesSection.appendChild(templatesGrid);
    
    // Benutzerdefinierte Material-Optionen
    const customSection = document.createElement('div');
    customSection.style.marginBottom = '20px';
    
    const customTitle = document.createElement('h4');
    customTitle.textContent = 'Benutzerdefiniertes Material';
    customTitle.style.margin = '0 0 10px 0';
    customTitle.style.fontSize = '16px';
    
    const customBtn = document.createElement('button');
    customBtn.textContent = 'Eigenes Material erstellen';
    customBtn.style.cssText = `
      background: #0066ff;
      color: white;
      border: none;
      border-radius: 6px;
      padding: 12px;
      cursor: pointer;
      width: 100%;
    `;
    
    customBtn.addEventListener('click', () => {
      this._openCustomMaterialEditor();
    });
    
    customSection.appendChild(customTitle);
    customSection.appendChild(customBtn);
    
    // Button Group
    const buttonGroup = document.createElement('div');
    buttonGroup.style.display = 'flex';
    buttonGroup.style.gap = '10px';
    buttonGroup.style.marginTop = '20px';
    
    // Close Button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Schließen';
    closeBtn.style.cssText = `
      background: #666;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      flex: 1;
    `;
    closeBtn.addEventListener('click', () => this._closeDialog());
    
    buttonGroup.appendChild(closeBtn);
    
    // Dialog-Inhalt zusammenbauen
    this.materialDialog.appendChild(title);
    this.materialDialog.appendChild(infoSection);
    this.materialDialog.appendChild(templatesSection);
    this.materialDialog.appendChild(customSection);
    this.materialDialog.appendChild(buttonGroup);
  }
  
  /**
   * Erstellt Color-Picker Control
   * @param {string} label
   * @param {THREE.Color} color
   * @param {Function} onChange
   * @returns {HTMLElement}
   * @private
   */
  _createColorControl(label, color, onChange) {
    const section = document.createElement('div');
    section.style.marginBottom = '15px';
    
    const heading = document.createElement('h4');
    heading.textContent = label;
    heading.style.margin = '0 0 10px 0';
    heading.style.fontSize = '14px';
    
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.gap = '10px';
    
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = this._colorToHex(color);
    colorInput.style.width = '60px';
    colorInput.style.height = '30px';
    colorInput.style.padding = '0';
    colorInput.style.border = 'none';
    colorInput.style.borderRadius = '4px';
    
    const valueDisplay = document.createElement('span');
    valueDisplay.textContent = this._colorToHex(color);
    valueDisplay.style.fontSize = '12px';
    valueDisplay.style.fontFamily = 'monospace';
    
    colorInput.addEventListener('input', (e) => {
      const newColor = e.target.value;
      valueDisplay.textContent = newColor;
      onChange(newColor);
    });
    
    container.appendChild(colorInput);
    container.appendChild(valueDisplay);
    
    section.appendChild(heading);
    section.appendChild(container);
    return section;
  }
  
  /**
   * Erstellt Slider Control
   * @param {string} label
   * @param {number} value
   * @param {number} min
   * @param {number} max
   * @param {number} step
   * @param {Function} onChange
   * @returns {HTMLElement}
   * @private
   */
  _createSliderControl(label, value, min, max, step, onChange) {
    const section = document.createElement('div');
    section.style.marginBottom = '15px';
    
    const heading = document.createElement('h4');
    heading.textContent = label;
    heading.style.margin = '0 0 10px 0';
    heading.style.fontSize = '14px';
    
    const container = document.createElement('div');
    container.style.display = 'grid';
    container.style.gridTemplateColumns = '1fr 60px';
    container.style.gap = '10px';
    container.style.alignItems = 'center';
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = min;
    slider.max = max;
    slider.step = step;
    slider.value = value;
    slider.style.width = '100%';
    
    const valueDisplay = document.createElement('span');
    valueDisplay.textContent = value.toFixed(2);
    valueDisplay.style.fontSize = '12px';
    valueDisplay.style.textAlign = 'right';
    valueDisplay.style.fontFamily = 'monospace';
    
    slider.addEventListener('input', (e) => {
      const newValue = parseFloat(e.target.value);
      valueDisplay.textContent = newValue.toFixed(2);
      onChange(newValue);
    });
    
    container.appendChild(slider);
    container.appendChild(valueDisplay);
    
    section.appendChild(heading);
    section.appendChild(container);
    return section;
  }
  
  /**
   * Konvertiert THREE.Color zu Hex-String
   * @param {THREE.Color} color
   * @returns {string}
   * @private
   */
  _colorToHex(color) {
    return '#' + color.getHexString();
  }
  
  /**
   * Wendet ein Material auf die ausgewählte Entity an
   * @param {THREE.Material} material - Das anzuwendende Material
   * @param {string} materialName - Der Name des Materials
   * @private
   */
  async _applyMaterialToEntity(material, materialName) {
    if (!this.selectedEntity || !this.selectedEntity.isMesh) {
      this._showToast('error', 'Kann Material nur auf Mesh-Entities anwenden');
      return;
    }
    
    try {
      // Material auf die Entity anwenden
      this.selectedEntity.material = material;
      this.selectedEntity.material.needsUpdate = true;
      
      // Entity-ID für YAML-Referenz sicherstellen
      if (!this.selectedEntity.userData.entityId) {
        this.selectedEntity.userData.entityId = this._generateEntityId();
      }
      
      // YAML aktualisieren
      await this._updateYamlWithMaterial(
        this.selectedEntity.userData.entityId,
        materialName,
        material
      );
      
      this._showToast('success', `Material "${materialName}" erfolgreich angewendet`);
      this._closeDialog();
      
    } catch (error) {
      console.error('[MaterialEditor] Fehler beim Anwenden des Materials:', error);
      this._showToast('error', 'Fehler: ' + error.message);
    }
  }
  
  /**
   * Öffnet den erweiterten Material-Editor für benutzerdefinierte Materialien
   * @private
   */
  _openCustomMaterialEditor() {
    // Hier könnte ein komplexerer Material-Editor geöffnet werden
    // Für jetzt verwenden wir eine einfache Standard-Material-Vorlage
    const customMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.5,
      metalness: 0.2
    });
    
    this._applyMaterialToEntity(customMaterial, 'Benutzerdefiniert');
  }
  
  /**
   * Aktualisiert das YAML mit den Material-Informationen
   * @param {string} entityId - Die ID der Entity
   * @param {string} materialName - Der Name des Materials
   * @param {THREE.Material} material - Das Material-Objekt
   * @private
   */
  async _updateYamlWithMaterial(entityId, materialName, material) {
    try {
      // Verwende das originale YAML-Objekt, um Metadaten zu erhalten
      let yamlObj = this._parseCurrentYaml();
      if (!yamlObj || typeof yamlObj !== 'object') {
        yamlObj = this._createNewYamlObject();
      }
      
      // Bestimme den aktuellen Tab (world oder patch)
      const isPatchTab = this.editor.activeTab === 'patch';
      
      if (isPatchTab) {
        // Patch-Format: Direkt im autorfreundlichen Format arbeiten
        await this._updatePatchYamlWithMaterial(yamlObj, entityId, materialName, material);
      } else {
        // World-Format: Entities-Struktur verwenden
        await this._updateWorldYamlWithMaterial(yamlObj, entityId, materialName, material);
      }
      
    } catch (error) {
      console.error('[MaterialEditor] Fehler beim Aktualisieren des YAML:', error);
      this._showToast('error', 'YAML-Update fehlgeschlagen: ' + error.message);
    }
  }
  
  /**
   * Aktualisiert World-YAML mit Material-Informationen
   * @param {Object} yamlObj - Das YAML-Objekt
   * @param {string} entityId - Die ID der Entity
   * @param {string} materialName - Der Name des Materials
   * @param {THREE.Material} material - Das Material-Objekt
   * @private
   */
  async _updateWorldYamlWithMaterial(yamlObj, entityId, materialName, material) {
    // Sicherstellen, dass objects Array existiert
    if (!yamlObj.objects || !Array.isArray(yamlObj.objects)) {
      yamlObj.objects = [];
    }
    
    // Entity im YAML finden oder erstellen
    let entityIndex = yamlObj.objects.findIndex(obj => obj.entity_id === entityId);
    
    if (entityIndex === -1) {
      // Neue Entity mit Material erstellen
      const worldPos = new THREE.Vector3();
      this.selectedEntity.getWorldPosition(worldPos);
      
      const newEntity = {
        entity_id: entityId,
        type: this.selectedEntity.userData?.type || 'object',
        position: [worldPos.x, worldPos.y, worldPos.z],
        material: this._materialToYaml(material, materialName)
      };
      
      yamlObj.objects.push(newEntity);
    } else {
      // Bestehende Entity aktualisieren
      yamlObj.objects[entityIndex].material = this._materialToYaml(material, materialName);
    }
    
    // YAML serialisieren und anwenden
    const yamlText = this._serializeToYaml(yamlObj);
    await this._applyYamlChange(yamlText);
  }
  
  /**
   * Aktualisiert Patch-YAML mit Material-Informationen
   * @param {Object} yamlObj - Das YAML-Objekt
   * @param {string} entityId - Die ID der Entity
   * @param {string} materialName - Der Name des Materials
   * @param {THREE.Material} material - Das Material-Objekt
   * @private
   */
  async _updatePatchYamlWithMaterial(yamlObj, entityId, materialName, material) {
    // Sicherstellen, dass objects Array existiert
    if (!yamlObj.objects || !Array.isArray(yamlObj.objects)) {
      yamlObj.objects = [];
    }
    
    // Entity im YAML finden oder erstellen
    let entityIndex = yamlObj.objects.findIndex(obj => obj.entity_id === entityId);
    
    if (entityIndex === -1) {
      // Neue Entity mit Material erstellen
      const worldPos = new THREE.Vector3();
      this.selectedEntity.getWorldPosition(worldPos);
      
      const newEntity = {
        entity_id: entityId,
        type: this.selectedEntity.userData?.type || 'object',
        position: [worldPos.x, worldPos.y, worldPos.z],
        material: this._materialToYaml(material, materialName)
      };
      
      yamlObj.objects.push(newEntity);
    } else {
      // Bestehende Entity aktualisieren
      yamlObj.objects[entityIndex].material = this._materialToYaml(material, materialName);
    }
    
    // YAML serialisieren und anwenden
    const yamlText = this._serializeToYaml(yamlObj);
    await this._applyYamlChange(yamlText);
  }
  
  /**
   * Konvertiert ein THREE.Material zu YAML-kompatiblen Daten
   * @param {THREE.Material} material - Das Material-Objekt
   * @param {string} materialName - Der Name des Materials
   * @returns {Object} YAML-kompatible Material-Daten
   * @private
   */
  _materialToYaml(material, materialName) {
    return {
      name: materialName,
      type: 'standard',
      color: '#' + material.color.getHexString(),
      roughness: material.roughness,
      metalness: material.metalness,
      emissive: material.emissive ? '#' + material.emissive.getHexString() : '#000000',
      emissiveIntensity: material.emissiveIntensity || 0,
      opacity: material.opacity || 1,
      transparent: material.transparent || false
    };
  }
  
  /**
   * Generiert eine eindeutige Entity-ID
   * @returns {string} Eine zufällig generierte Entity-ID
   * @private
   */
  _generateEntityId() {
    return 'entity_' + Math.random().toString(36).substr(2, 9);
  }
  
  
  /**
   * Schließt den Dialog
   * @private
   */
  _closeDialog() {
    if (this.materialDialog && this.materialDialog.parentElement) {
      this.materialDialog.parentElement.removeChild(this.materialDialog);
    }
    
    if (this.dialogOverlay && this.dialogOverlay.parentElement) {
      this.dialogOverlay.parentElement.removeChild(this.dialogOverlay);
    }
    
    this.materialDialog = null;
    this.dialogOverlay = null;
    this.selectedEntity = null;
  }
  
  /**
   * Gibt UI-Elemente für die Addon-Konfiguration zurück
   * @returns {HTMLElement[]}
   */
  getUIElements() {
    const container = document.createElement('div');
    container.style.marginTop = '10px';
    container.style.padding = '8px';
    container.style.background = '#2a2a2a';
    container.style.borderRadius = '4px';
    
    const title = document.createElement('h4');
    title.textContent = 'Material Editor';
    title.style.margin = '0 0 8px 0';
    title.style.color = '#fff';
    
    const desc = document.createElement('p');
    desc.textContent = this.description;
    desc.style.margin = '0 0 8px 0';
    desc.style.color = '#ccc';
    desc.style.fontSize = '12px';
    
    const hint = document.createElement('p');
    hint.textContent = 'Mouseover: Entity hervorheben | Klick: Material hinzufügen';
    hint.style.margin = '0';
    hint.style.color = '#ff3366';
    hint.style.fontSize = '11px';
    hint.style.fontStyle = 'italic';
    
    // Toggle für Aktivierung der Selektion
    const toggleRow = document.createElement('div');
    toggleRow.style.display = 'flex';
    toggleRow.style.alignItems = 'center';
    toggleRow.style.gap = '8px';
    toggleRow.style.margin = '8px 0';
    
    const toggleButton = document.createElement('button');
    toggleButton.textContent = 'Reaktiviere Entity Auswahl';
    toggleButton.style.marginLeft = '8px';
    toggleButton.addEventListener('click', () => {
      this._unbindCanvasEvents();
      this._bindCanvasEvents();
    });
    
    toggleRow.appendChild(toggleButton);
    
    container.appendChild(title);
    container.appendChild(desc);
    container.appendChild(hint);
    container.appendChild(toggleRow);
    
    return [container];
  }
  
  /**
   * Serialisiert den aktuellen Zustand
   * @returns {Object}
   */
  serializeState() {
    return {
      ...super.serializeState(),
      hoveredEntity: this.hoveredEntity ? this._serializeObjectRef(this.hoveredEntity) : null,
      selectedEntity: this.selectedEntity ? this._serializeObjectRef(this.selectedEntity) : null
    };
  }
  
  /**
   * Serialisiert eine Object3D-Referenz für die Persistenz
   * @param {THREE.Object3D} object - Das Three.js-Objekt
   * @returns {Object} Serialisierte Objektreferenz
   * @private
   */
  _serializeObjectRef(object) {
    return {
      uuid: object.uuid,
      name: object.name,
      userData: object.userData
    };
  }
  
  /**
   * Deserialisiert einen gespeicherten Zustand
   * @param {Object} state
   */
  deserializeState(state) {
    super.deserializeState(state);
    
    if (state) {
      // Object-Referenzen können nicht direkt deserialisiert werden,
      // da die Three.js-Objekte neu erstellt werden
      // Wir setzen sie auf null und verlassen uns auf Neuerkennung
      this.hoveredEntity = null;
      this.selectedEntity = null;
    }
  }
}