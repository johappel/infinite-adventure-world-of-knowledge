/**
 * Entity Interaction Addon für den PresetEditor
 *
 * Bietet Mouseover-Erkennung, Entity-Selektion und visuelle Bearbeitung
 * von Entities via Dialog-Formular mit Echtzeit-Vorschau.
 */

import { InteractionAddon } from './base-addon.js';
import * as THREE from 'three';

export class EntityInteractionAddon extends InteractionAddon {
  constructor(editor) {
    super(editor);
    this.name = 'Entity Interaktion';
    this.description = 'Entity-Selektion und Bearbeitung via Mouseover und Klick';
    this.icon = '🔍';
    
    // Zustandsvariablen
    this.hoveredEntity = null;
    this.selectedEntity = null;
    this.originalHoveredEntity = null; // Speichert die echte Entity (nicht das Hover-Mesh)
    this.hoverMesh = null;
    this.entityDialog = null;
    this.isMouseOverCanvas = false;
    
    // Debouncing für Mouseover
    this.mouseMoveTimeout = null;
    this.lastMousePosition = { x: 0, y: 0 };
  }
  
  /**
   * Wird aufgerufen wenn das Addon aktiviert wird
   */
  async activate() {
    await super.activate();
    console.log('[EntityInteraction] Addon aktiviert');
    
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
    
    console.log('[EntityInteraction] Addon deaktiviert');
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
   * Canvas Mouse-Move Handler
   * @param {MouseEvent} event
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
   * Canvas Mouse-Leave Handler
   * @private
   */
  _onCanvasMouseLeave() {
    this.isMouseOverCanvas = false;
    this._clearHover();
  }
  
  /**
   * Canvas Click Handler
   * @param {MouseEvent} event
   * @private
   */
  _onCanvasClick(event) {
    if (!this.isActive || !this.hoveredEntity) return;
    
    console.log('[EntityInteraction] Canvas Click, hoveredEntity:', this.hoveredEntity);
    console.log('[EntityInteraction] originalHoveredEntity:', this.originalHoveredEntity);
    
    // Entity selektieren und Dialog öffnen
    // Verwende die ursprüngliche Entity-Referenz, nicht das Hover-Mesh
    this.selectedEntity = this.originalHoveredEntity || this.hoveredEntity;
    console.log('[EntityInteraction] selectedEntity gesetzt:', this.selectedEntity);
    
    this._openEntityDialog();
  }
  
  /**
   * Führt Raycasting für Entity-Erkennung durch
   * @param {MouseEvent} event
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
    
    // Alle Objekte in der Szene durchsuchen (außer Terrain)
    const targets = [];
    threeJS.scene.traverse(child => {
      if (child.isMesh && child.visible) {
        // Terrain und Skybox ignorieren
        const isTerrain = child.userData?.isTerrain || 
                         (child.name && /terrain|ground|floor/i.test(child.name));
        const isSkybox = child.userData?.isSkybox;
        
        if (!isTerrain && !isSkybox) {
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
   * Behandelt Entity-Hover
   * @param {THREE.Object3D} entityObject
   * @private
   */
  _handleEntityHover(entityObject) {
    if (this.hoveredEntity === entityObject) return;
    
    this._clearHover();
    this.hoveredEntity = entityObject;
    
    // Speichere die ursprüngliche Entity-Referenz (nicht das Hover-Mesh)
    this.originalHoveredEntity = entityObject;
    
    // Hover-Mesh an Entity positionieren
    this._updateHoverMesh(entityObject);
  }
  
  /**
   * Entfernt Hover-Zustand
   * @private
   */
  _clearHover() {
    this.hoveredEntity = null;
    this._hideHoverMesh();
  }
  
  /**
   * Erstellt das Hover-Mesh für die Visualisierung
   * @private
   */
  _createHoverMesh() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({
      color: 0x0066ff,
      wireframe: true,
      transparent: true,
      opacity: 0.8,
      depthTest: false
    });
    
    this.hoverMesh = new THREE.Mesh(geometry, material);
    this.hoverMesh.visible = false;
    this.hoverMesh.renderOrder = 999; // Immer oben rendern
    
    if (this.editor.threeJSManager && this.editor.threeJSManager.scene) {
      this.editor.threeJSManager.scene.add(this.hoverMesh);
    }
  }
  
  /**
   * Aktualisiert die Position des Hover-Mesh
   * @param {THREE.Object3D} entityObject
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
   * Entfernt das Hover-Mesh komplett
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
   * Öffnet den Entity-Bearbeitungs-Dialog
   * @private
   */
  _openEntityDialog() {
    console.log('[EntityInteraction] _openEntityDialog aufgerufen, selectedEntity:', this.selectedEntity);
    console.log('[EntityInteraction] hoveredEntity:', this.hoveredEntity);
    
    if (!this.selectedEntity) {
      console.error('[EntityInteraction] FEHLER: selectedEntity ist null!');
      
      // Fallback: Versuche hoveredEntity zu verwenden
      if (this.hoveredEntity) {
        console.log('[EntityInteraction] Verwende hoveredEntity als Fallback');
        this.selectedEntity = this.hoveredEntity;
      } else {
        console.error('[EntityInteraction] KEINE ENTITY GEFUNDEN! Dialog wird nicht geöffnet.');
        this._showToast('error', 'Keine Entity ausgewählt');
        return;
      }
    }
    
    console.log('[EntityInteraction] Öffne Dialog für Entity:', this.selectedEntity);
    
    this._closeDialog(); // Vorherigen Dialog schließen
    
    try {
      // Dialog erstellen
      this.entityDialog = this._createDialog();
      console.log('[EntityInteraction] Dialog erstellt:', this.entityDialog);
      
      document.body.appendChild(this.entityDialog);
      console.log('[EntityInteraction] Dialog zum DOM hinzugefügt');
      
      // Dialog-Inhalt füllen
      this._populateDialog();
      console.log('[EntityInteraction] Dialog-Inhalt erfolgreich befüllt');
      
    } catch (error) {
      console.error('[EntityInteraction] Fehler beim Öffnen des Dialogs:', error);
      
      // Fallback: Einfache Fehlermeldung anzeigen
      if (this.entityDialog && this.entityDialog.parentElement) {
        const errorMsg = document.createElement('div');
        errorMsg.textContent = `Dialog-Fehler: ${error.message}`;
        errorMsg.style.color = '#ff6666';
        errorMsg.style.padding = '20px';
        this.entityDialog.appendChild(errorMsg);
      } else {
        // Notfall-Fallback: Alert anzeigen
        alert(`Entity Dialog Fehler: ${error.message}\n\nBitte konsolen für Details öffnen.`);
      }
    }
  }
  
  /**
   * Erstellt den Dialog-Container
   * @returns {HTMLElement}
   * @private
   */
  _createDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'entity-dialog';
    dialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #2a2a2a;
      border: 2px solid #0066ff;
      border-radius: 8px;
      padding: 20px;
      z-index: 1000;
      min-width: 300px;
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
   * Füllt den Dialog mit Inhalt
   * @private
   */
  _populateDialog() {
    console.log('[EntityInteraction] Starte Dialog-Befüllung für Entity:', this.selectedEntity);
    if (!this.entityDialog || !this.selectedEntity) return;

    try {
      console.log('[EntityInteraction] Starte Dialog-Befüllung für Entity:', this.selectedEntity);
      
      const entity = this.selectedEntity;
      const worldPos = new THREE.Vector3();
      entity.getWorldPosition(worldPos);
      console.log('[EntityInteraction] World Position:', worldPos);

      // Vereinfachte Implementierung mit innerHTML
      const rotation = new THREE.Euler().setFromQuaternion(entity.quaternion);
      
      this.entityDialog.innerHTML = `
        <h3 style="margin-top: 0; color: #0066ff;">Entity Bearbeiten</h3>
        
        <div style="margin-bottom: 15px; font-size: 12px; opacity: 0.8;">
          Type: ${entity.userData?.entityType || 'Unknown'}<br>
          ID: ${entity.userData?.entityId || 'N/A'}
        </div>
        
        <h4 style="margin: 0 0 10px 0; font-size: 14px;">Position</h4>
        <div style="display: grid; grid-template-columns: 30px 1fr; gap: 8px; align-items: center; margin-bottom: 15px;">
          <span style="text-align: right; opacity: 0.7;">X</span>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="range" min="-100" max="100" step="0.1" value="${worldPos.x}" data-axis="x" style="width: 100%;">
            <span style="font-size: 12px; min-width: 40px; text-align: right;">${worldPos.x.toFixed(2)}</span>
          </div>
          <span style="text-align: right; opacity: 0.7;">Y</span>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="range" min="-100" max="100" step="0.1" value="${worldPos.y}" data-axis="y" style="width: 100%;">
            <span style="font-size: 12px; min-width: 40px; text-align: right;">${worldPos.y.toFixed(2)}</span>
          </div>
          <span style="text-align: right; opacity: 0.7;">Z</span>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="range" min="-100" max="100" step="0.1" value="${worldPos.z}" data-axis="z" style="width: 100%;">
            <span style="font-size: 12px; min-width: 40px; text-align: right;">${worldPos.z.toFixed(2)}</span>
          </div>
        </div>
        
        <h4 style="margin: 0 0 10px 0; font-size: 14px;">Rotation</h4>
        <div style="display: grid; grid-template-columns: 30px 1fr; gap: 8px; align-items: center; margin-bottom: 15px;">
          <span style="text-align: right; opacity: 0.7;">X</span>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="range" min="-180" max="180" step="1" value="${THREE.MathUtils.radToDeg(rotation.x)}" data-axis="x" style="width: 100%;">
            <span style="font-size: 12px; min-width: 40px; text-align: right;">${THREE.MathUtils.radToDeg(rotation.x).toFixed(2)}</span>
          </div>
          <span style="text-align: right; opacity: 0.7;">Y</span>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="range" min="-180" max="180" step="1" value="${THREE.MathUtils.radToDeg(rotation.y)}" data-axis="y" style="width: 100%;">
            <span style="font-size: 12px; min-width: 40px; text-align: right;">${THREE.MathUtils.radToDeg(rotation.y).toFixed(2)}</span>
          </div>
          <span style="text-align: right; opacity: 0.7;">Z</span>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="range" min="-180" max="180" step="1" value="${THREE.MathUtils.radToDeg(rotation.z)}" data-axis="z" style="width: 100%;">
            <span style="font-size: 12px; min-width: 40px; text-align: right;">${THREE.MathUtils.radToDeg(rotation.z).toFixed(2)}</span>
          </div>
        </div>
        
        <h4 style="margin: 0 0 10px 0; font-size: 14px;">Scale</h4>
        <div style="display: grid; grid-template-columns: 30px 1fr; gap: 8px; align-items: center; margin-bottom: 15px;">
          <span style="text-align: right; opacity: 0.7;">X</span>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="range" min="0.1" max="10" step="0.1" value="${entity.scale.x}" data-axis="x" style="width: 100%;">
            <span style="font-size: 12px; min-width: 40px; text-align: right;">${entity.scale.x.toFixed(2)}</span>
          </div>
          <span style="text-align: right; opacity: 0.7;">Y</span>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="range" min="0.1" max="10" step="0.1" value="${entity.scale.y}" data-axis="y" style="width: 100%;">
            <span style="font-size: 12px; min-width: 40px; text-align: right;">${entity.scale.y.toFixed(2)}</span>
          </div>
          <span style="text-align: right; opacity: 0.7;">Z</span>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="range" min="0.1" max="10" step="0.1" value="${entity.scale.z}" data-axis="z" style="width: 100%;">
            <span style="font-size: 12px; min-width: 40px; text-align: right;">${entity.scale.z.toFixed(2)}</span>
          </div>
        </div>
        
        <button style="background: #0066ff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-top: 20px; width: 100%;" id="applyChangesBtn">
          Apply Changes
        </button>
      `;

      // Event-Listener für den Apply-Button
      const applyBtn = this.entityDialog.querySelector('#applyChangesBtn');
      if (applyBtn) {
        applyBtn.addEventListener('click', () => this._applyChanges());
      }

      // Event-Listener für die Slider
      const sliders = this.entityDialog.querySelectorAll('input[type="range"]');
      sliders.forEach(slider => {
        slider.addEventListener('input', (e) => {
          const axis = e.target.dataset.axis;
          const value = parseFloat(e.target.value);
          const valueDisplay = e.target.nextElementSibling;
          if (valueDisplay) {
            valueDisplay.textContent = value.toFixed(2);
          }
          this._updateLivePreview(axis, value);
        });
      });

      console.log('[EntityInteraction] Dialog erfolgreich mit innerHTML befüllt');
      console.log('[EntityInteraction] Dialog Children:', this.entityDialog.children.length);

    } catch (error) {
      console.error('[EntityInteraction] Fehler beim Befüllen des Dialogs:', error);
      
      // Fallback: Zeige Fehlermeldung im Dialog
      this.entityDialog.innerHTML = `
        <div style="color: #ff6666; padding: 20px; text-align: center;">
          <h3>Fehler beim Laden des Dialogs</h3>
          <p>${error.message}</p>
          <p style="font-size: 12px; opacity: 0.7;">Bitte konsolen für Details öffnen.</p>
        </div>
      `;
    }
  }
  
  /**
   * Erstellt Vektor-Kontrollen (X/Y/Z Slider)
   * @param {string} label
   * @param {Object} values
   * @param {Array} range
   * @param {number} step
   * @returns {HTMLElement}
   * @private
   */
  _createVectorControl(label, values, range, step) {
    try {
      console.log(`[EntityInteraction] Erstelle Vektor-Control: ${label}`, values);
      
      const section = document.createElement('div');
      section.style.marginBottom = '15px';
      
      const heading = document.createElement('h4');
      heading.textContent = label;
      heading.style.margin = '0 0 10px 0';
      heading.style.fontSize = '14px';
      
      const controls = document.createElement('div');
      controls.style.display = 'grid';
      controls.style.gridTemplateColumns = '30px 1fr';
      controls.style.gap = '8px';
      controls.style.alignItems = 'center';
      
      ['x', 'y', 'z'].forEach(axis => {
        console.log(`[EntityInteraction] Verarbeite Axis: ${axis}, Wert:`, values[axis]);
        
        const axisLabel = document.createElement('span');
        axisLabel.textContent = axis.toUpperCase();
        axisLabel.style.textAlign = 'right';
        axisLabel.style.opacity = '0.7';
        
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = range[0];
        slider.max = range[1];
        slider.step = step;
        slider.value = values[axis] || 0; // Fallback auf 0 falls undefined
        slider.dataset.axis = axis;
        
        const valueDisplay = document.createElement('span');
        valueDisplay.textContent = (values[axis] || 0).toFixed(2);
        valueDisplay.style.fontSize = '12px';
        valueDisplay.style.minWidth = '40px';
        valueDisplay.style.textAlign = 'right';
        
        slider.addEventListener('input', (e) => {
          const newValue = parseFloat(e.target.value);
          valueDisplay.textContent = newValue.toFixed(2);
          this._updateLivePreview(axis, newValue);
        });
        
        controls.appendChild(axisLabel);
        
        const sliderContainer = document.createElement('div');
        sliderContainer.style.display = 'flex';
        sliderContainer.style.alignItems = 'center';
        sliderContainer.style.gap = '8px';
        sliderContainer.appendChild(slider);
        sliderContainer.appendChild(valueDisplay);
        
        controls.appendChild(sliderContainer);
      });
      
      section.appendChild(heading);
      section.appendChild(controls);
      
      console.log(`[EntityInteraction] Vektor-Control ${label} erfolgreich erstellt`);
      return section;
      
    } catch (error) {
      console.error(`[EntityInteraction] Fehler beim Erstellen von Vektor-Control ${label}:`, error);
      
      // Fallback: Einfache Fehlermeldung
      const errorSection = document.createElement('div');
      errorSection.innerHTML = `
        <h4 style="color: #ff6666; margin: 0 0 10px 0; font-size: 14px;">${label} (Fehler)</h4>
        <div style="color: #ff6666; font-size: 12px;">${error.message}</div>
      `;
      return errorSection;
    }
  }
  
  /**
   * Erstellt eine einfache Fehler-Control
   * @param {string} label
   * @param {string} message
   * @returns {HTMLElement}
   * @private
   */
  _createSimpleControl(label, message) {
    const section = document.createElement('div');
    section.style.marginBottom = '15px';
    
    const heading = document.createElement('h4');
    heading.textContent = label;
    heading.style.margin = '0 0 10px 0';
    heading.style.fontSize = '14px';
    heading.style.color = '#ff6666';
    
    const messageDiv = document.createElement('div');
    messageDiv.textContent = message;
    messageDiv.style.color = '#ff6666';
    messageDiv.style.fontSize = '12px';
    
    section.appendChild(heading);
    section.appendChild(messageDiv);
    return section;
  }

  /**
   * Aktualisiert die Live-Vorschau
   * @param {string} axis
   * @param {number} value
   * @private
   */
  _updateLivePreview(axis, value) {
    if (!this.selectedEntity) return;
    
    // Je nach aktiver Sektion unterschiedlich behandeln
    // (Wird in der finalen Implementierung erweitert)
    console.log(`Live Preview: ${axis} = ${value}`);
  }
  
  /**
   * Wendet die Änderungen an und aktualisiert das YAML
   * @private
   */
  async _applyChanges() {
    if (!this.selectedEntity) return;
    
    try {
      // Hier wird die YAML-Integration implementiert
      // Entity-ID generieren oder verwenden
      const entityId = this.selectedEntity.userData?.entityId || this._generateEntityId();
      
      // Entity-Daten sammeln
      const worldPos = new THREE.Vector3();
      this.selectedEntity.getWorldPosition(worldPos);
      
      const rotation = new THREE.Euler().setFromQuaternion(this.selectedEntity.quaternion);
      const scale = this.selectedEntity.scale.clone();
      
      const entityData = {
        type: this.selectedEntity.userData?.entityType || 'object',
        position: [worldPos.x, worldPos.y, worldPos.z],
        rotation: [
          THREE.MathUtils.radToDeg(rotation.x),
          THREE.MathUtils.radToDeg(rotation.y), 
          THREE.MathUtils.radToDeg(rotation.z)
        ],
        scale: [scale.x, scale.y, scale.z]
      };
      
      // YAML aktualisieren
      await this._updateYamlWithEntity(entityId, entityData);
      
      this._showToast('success', 'Entity erfolgreich aktualisiert');
      this._closeDialog();
      
    } catch (error) {
      console.error('[EntityInteraction] Fehler beim Anwenden der Änderungen:', error);
      this._showToast('error', 'Fehler: ' + error.message);
    }
  }
  
  /**
   * Generiert eine eindeutige Entity-ID
   * @returns {string}
   * @private
   */
  _generateEntityId() {
    return 'entity_' + Math.random().toString(36).substr(2, 9);
  }
  
  /**
   * Aktualisiert das YAML mit der Entity
   * @param {string} entityId
   * @param {Object} entityData
   * @private
   */
  async _updateYamlWithEntity(entityId, entityData) {
    let yamlObj = this._parseCurrentYaml();
    if (!yamlObj) {
      yamlObj = this._createNewYamlObject();
    }
    
    // Entity in die entsprechende Kategorie einfügen
    const entityType = entityData.type;
    if (!yamlObj.entities[entityType]) {
      yamlObj.entities[entityType] = {};
    }
    
    // Entity-Daten setzen
    yamlObj.entities[entityType][entityId] = {
      ...entityData,
      id: entityId
    };
    
    // YAML serialisieren und anwenden
    const yamlText = this._serializeToYaml(yamlObj);
    await this._applyYamlChange(yamlText);
  }
  
  /**
   * Schließt den Dialog
   * @private
   */
  _closeDialog() {
    if (this.entityDialog && this.entityDialog.parentElement) {
      this.entityDialog.parentElement.removeChild(this.entityDialog);
    }
    
    if (this.dialogOverlay && this.dialogOverlay.parentElement) {
      this.dialogOverlay.parentElement.removeChild(this.dialogOverlay);
    }
    
    this.entityDialog = null;
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
    title.textContent = 'Entity Interaktion';
    title.style.margin = '0 0 8px 0';
    title.style.color = '#fff';
    
    const desc = document.createElement('p');
    desc.textContent = this.description;
    desc.style.margin = '0 0 8px 0';
    desc.style.color = '#ccc';
    desc.style.fontSize = '12px';
    
    const hint = document.createElement('p');
    hint.textContent = 'Mouseover: Entity hervorheben | Klick: Entity bearbeiten';
    hint.style.margin = '0';
    hint.style.color = '#0066ff';
    hint.style.fontSize = '11px';
    hint.style.fontStyle = 'italic';
    
    container.appendChild(title);
    container.appendChild(desc);
    container.appendChild(hint);
    
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
   * @param {THREE.Object3D} object
   * @returns {Object}
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


