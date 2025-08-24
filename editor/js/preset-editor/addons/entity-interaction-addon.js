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
    this.hoverMesh = null;
    this.entityDialog = null;
    this.isMouseOverCanvas = false;
    
    // Debouncing für Mouseover
    this.mouseMoveTimeout = null;
    this.lastMousePosition = { x: 0, y: 0 };
    
    // Debug-Einstellungen
    this.debug = false; // Setzen Sie true für Debug-Logging
  }
  
  /**
   * Wird aufgerufen wenn das Addon aktiviert wird
   */
  async activate() {
    await super.activate();
    if (this.debug) console.log('[EntityInteraction] Addon aktiviert');
    
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
    
    if (this.debug) console.log('[EntityInteraction] Addon deaktiviert');
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
    
    if (this.debug) {
      console.log('[EntityInteraction] Canvas Click, hoveredEntity:', this.hoveredEntity);
    }

    // Verwende die hoveredEntity, die bereits aufgelöst ist
    this.selectedEntity = this._resolveEditableEntity(this.hoveredEntity);
    if (this.debug) console.log('[EntityInteraction] selectedEntity gesetzt:', this.selectedEntity);
    
    this._openEntityDialog();
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
      color: 0x0066ff,
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
   * Öffnet den Dialog zur Bearbeitung der ausgewählten Entity
   * @private
   */
  _openEntityDialog() {
    if (this.debug) {
      console.log('[EntityInteraction] _openEntityDialog aufgerufen, selectedEntity:', this.selectedEntity);
      console.log('[EntityInteraction] hoveredEntity:', this.hoveredEntity);
    }

    // 1) Ermittele die zu bearbeitende Entity
    let entity = this.selectedEntity || this.hoveredEntity;
    if (!entity) {
      console.error('[EntityInteraction] KEINE ENTITY GEFUNDEN! Dialog wird nicht geöffnet.');
      this._showToast('error', 'Keine Entity ausgewählt');
      return;
    }

    if (this.debug) console.log('[EntityInteraction] Öffne Dialog für Entity:', entity);

    // 2) Vorherigen Dialog schließen (setzt selectedEntity aktuell auf null)
    this._closeDialog();

    // 3) Nach dem Schließen die Entity-Referenz wiederherstellen
    this.selectedEntity = entity;

    // 4) Speichere die originale Position für die YAML-Zuordnung
    this.originalEntityPosition = new THREE.Vector3();
    entity.getWorldPosition(this.originalEntityPosition);
    if (this.debug) console.log('[EntityInteraction] Originale Position gespeichert:', this.originalEntityPosition);

    // 5) Versuche entity_id aus dem YAML anhand der Position zu finden
    if (!this.selectedEntity.userData.entityId) {
      const entityIdFromYaml = this._findEntityIdFromYamlByPosition(this.originalEntityPosition);
      if (entityIdFromYaml) {
        this.selectedEntity.userData.entityId = entityIdFromYaml;
        if (this.debug) console.log('[EntityInteraction] entity_id aus YAML übernommen:', entityIdFromYaml);
      } else {
        if (this.debug) console.log('[EntityInteraction] Keine entity_id im YAML gefunden, generiere neue');
        this.selectedEntity.userData.entityId = this._generateEntityId();
      }
    } else {
      if (this.debug) console.log('[EntityInteraction] Entity hat bereits entityId:', this.selectedEntity.userData.entityId);
    }

    try {
      // 6) Dialog erstellen
      this.entityDialog = this._createDialog();
      if (this.debug) console.log('[EntityInteraction] Dialog erstellt:', this.entityDialog);

      document.body.appendChild(this.entityDialog);
      if (this.debug) console.log('[EntityInteraction] Dialog zum DOM hinzugefügt');

      // 7) Dialog-Inhalt füllen (selectedEntity ist gesetzt)
      this._populateDialog();
      if (this.debug) console.log('[EntityInteraction] Dialog-Inhalt erfolgreich befüllt');

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
        alert(`Entity Dialog Fehler: ${error.message}\n\nBitte Konsole für Details öffnen.`);
      }
    }
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
          // Vergleiche Positionen mit erhöhter Toleranz (0.15 statt 0.01)
          const tolerance = 0.15;
          const objX = obj.position[0];
          const objY = obj.position[1];
          const objZ = obj.position[2];
          
          if (Math.abs(objX - position.x) < tolerance &&
              Math.abs(objY - position.y) < tolerance &&
              Math.abs(objZ - position.z) < tolerance) {
            if (this.debug) console.log('[EntityInteraction] entity_id im YAML gefunden:', obj.entity_id);
            return obj.entity_id;
          }
        }
      }
    } catch (error) {
      console.error('[EntityInteraction] Fehler beim Suchen der entity_id im YAML:', error);
    }
    
    return null;
  }

  /**
   * Erstellt den Dialog-Container für die Entity-Bearbeitung
   * @returns {HTMLElement} Das Dialog-HTML-Element
   * @private
   */
  _createDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'entity-dialog';
    dialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 25%;
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
      width: 50vw;
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
   * Füllt den Dialog mit Formularfeldern für die Entity-Bearbeitung
   * @private
   */
  _populateDialog() {
    if (this.debug) console.log('[EntityInteraction] Starte Dialog-Befüllung für Entity:', this.selectedEntity);
    if (!this.entityDialog || !this.selectedEntity) return;

    try {
      if (this.debug) console.log('[EntityInteraction] Starte Dialog-Befüllung für Entity:', this.selectedEntity);
      
      const entity = this.selectedEntity;
      // Lokale Werte verwenden, damit Slider direkt wirken
      const localPos = entity.position.clone();
      const rotDeg = {
        x: THREE.MathUtils.radToDeg(entity.rotation.x),
        y: THREE.MathUtils.radToDeg(entity.rotation.y),
        z: THREE.MathUtils.radToDeg(entity.rotation.z),
      };
      const typeLabel = entity.userData?.entityType || entity.userData?.objectType || entity.type || 'Unknown';
      const idLabel = entity.userData?.entityId || 'N/A';
      
      this.entityDialog.innerHTML = `
        <h3 style="margin-top: 0; color: #0066ff;">Entity Bearbeiten</h3>
        
        <div style="margin-bottom: 15px; font-size: 12px; opacity: 0.8;">
          Type: ${typeLabel}<br>
          ID: ${idLabel}
        </div>
        
        <h4 style="margin: 0 0 10px 0; font-size: 14px;">Position</h4>
        <div style="display: grid; grid-template-columns: 30px 1fr; gap: 8px; align-items: center; margin-bottom: 15px;">
          <span style="text-align: right; opacity: 0.7;">X</span>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="range" min="-100" max="100" step="0.1" value="${localPos.x}" data-section="position" data-axis="x" style="width: 100%;">
            <span style="font-size: 12px; min-width: 40px; text-align: right;">${localPos.x.toFixed(2)}</span>
          </div>
          <span style="text-align: right; opacity: 0.7;">Y</span>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="range" min="-100" max="100" step="0.1" value="${localPos.y}" data-section="position" data-axis="y" style="width: 100%;">
            <span style="font-size: 12px; min-width: 40px; text-align: right;">${localPos.y.toFixed(2)}</span>
          </div>
          <span style="text-align: right; opacity: 0.7;">Z</span>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="range" min="-100" max="100" step="0.1" value="${localPos.z}" data-section="position" data-axis="z" style="width: 100%;">
            <span style="font-size: 12px; min-width: 40px; text-align: right;">${localPos.z.toFixed(2)}</span>
          </div>
        </div>
        
        <h4 style="margin: 0 0 10px 0; font-size: 14px;">Rotation</h4>
        <div style="display: grid; grid-template-columns: 30px 1fr; gap: 8px; align-items: center; margin-bottom: 15px;">
          <span style="text-align: right; opacity: 0.7;">X</span>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="range" min="-180" max="180" step="1" value="${rotDeg.x}" data-section="rotation" data-axis="x" style="width: 100%;">
            <span style="font-size: 12px; min-width: 40px; text-align: right;">${rotDeg.x.toFixed(2)}</span>
          </div>
          <span style="text-align: right; opacity: 0.7;">Y</span>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="range" min="-180" max="180" step="1" value="${rotDeg.y}" data-section="rotation" data-axis="y" style="width: 100%;">
            <span style="font-size: 12px; min-width: 40px; text-align: right;">${rotDeg.y.toFixed(2)}</span>
          </div>
          <span style="text-align: right; opacity: 0.7;">Z</span>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="range" min="-180" max="180" step="1" value="${rotDeg.z}" data-section="rotation" data-axis="z" style="width: 100%;">
            <span style="font-size: 12px; min-width: 40px; text-align: right;">${rotDeg.z.toFixed(2)}</span>
          </div>
        </div>
        
        <h4 style="margin: 0 0 10px 0; font-size: 14px;">Scale</h4>
        <div style="display: grid; grid-template-columns: 30px 1fr; gap: 8px; align-items: center; margin-bottom: 15px;">
          <span style="text-align: right; opacity: 0.7;">X</span>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="range" min="0.1" max="10" step="0.1" value="${entity.scale.x}" data-section="scale" data-axis="x" style="width: 100%;">
            <span style="font-size: 12px; min-width: 40px; text-align: right;">${entity.scale.x.toFixed(2)}</span>
          </div>
          <span style="text-align: right; opacity: 0.7;">Y</span>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="range" min="0.1" max="10" step="0.1" value="${entity.scale.y}" data-section="scale" data-axis="y" style="width: 100%;">
            <span style="font-size: 12px; min-width: 40px; text-align: right;">${entity.scale.y.toFixed(2)}</span>
          </div>
          <span style="text-align: right; opacity: 0.7;">Z</span>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="range" min="0.1" max="10" step="0.1" value="${entity.scale.z}" data-section="scale" data-axis="z" style="width: 100%;">
            <span style="font-size: 12px; min-width: 40px; text-align: right;">${entity.scale.z.toFixed(2)}</span>
          </div>
        </div>
        
        <button style="background: #0066ff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-top: 20px; width: 100%;" id="applyChangesBtn">
          Änderungen anwenden
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
          const section = e.target.dataset.section;
          const axis = e.target.dataset.axis;
          const value = parseFloat(e.target.value);
          const valueDisplay = e.target.nextElementSibling;
          if (valueDisplay) {
            valueDisplay.textContent = value.toFixed(2);
          }
          this._updateLivePreview(section, axis, value);
        });
      });

      if (this.debug) {
        console.log('[EntityInteraction] Dialog erfolgreich mit innerHTML befüllt');
        console.log('[EntityInteraction] Dialog Children:', this.entityDialog.children.length);
      }

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
   * Aktualisiert die Live-Vorschau der Entity basierend auf Slider-Änderungen
   * @param {string} sectionOrAxis - Der Abschnitt (position/rotation/scale) oder Achse
   * @param {string|number} axisOrValue - Die Achse oder der Wert
   * @param {number} [maybeValue] - Optionaler Wert (für alte Signatur)
   * @private
   */
  _updateLivePreview(sectionOrAxis, axisOrValue, maybeValue) {
    if (!this.selectedEntity) return;

    // Backward-compat: Falls alte Aufrufsignatur (axis, value) genutzt wird
    let section, axis, value;
    if (typeof maybeValue === 'number') {
      section = sectionOrAxis;
      axis = axisOrValue;
      value = maybeValue;
    } else {
      section = 'position';
      axis = sectionOrAxis;
      value = axisOrValue;
    }

    const entity = this.selectedEntity;

    if (section === 'position') {
      entity.position[axis] = value;
    } else if (section === 'rotation') {
      // value kommt in Grad -> in Radiant umwandeln
      const rad = THREE.MathUtils.degToRad(value);
      entity.rotation[axis] = rad;
    } else if (section === 'scale') {
      entity.scale[axis] = value;
    }

    entity.matrixWorldNeedsUpdate = true;
    if (this.editor?.threeJSManager?.renderer) {
      // Optional: sofort neu rendern, falls nötig
      // this.editor.threeJSManager.renderer.render(this.editor.threeJSManager.scene, this.editor.threeJSManager.camera);
    }

    if (this.debug) console.log(`Live Preview: section=${section}, ${axis} = ${value}`);
  }
  
  /**
   * Wendet die Änderungen an der Entity an und aktualisiert das YAML
   * @private
   */
  async _applyChanges() {
    if (!this.selectedEntity) return;
    
    try {
      // Entity-ID verwenden oder generieren und in der Entity speichern
      if (!this.selectedEntity.userData.entityId) {
        this.selectedEntity.userData.entityId = this._generateEntityId();
      }
      const entityId = this.selectedEntity.userData.entityId;
      if (this.debug) console.log('[EntityInteraction] Verwende Entity-ID:', entityId);
      
      // Entity-Daten sammeln
      const worldPos = new THREE.Vector3();
      this.selectedEntity.getWorldPosition(worldPos);
      
      const rotation = new THREE.Euler().setFromQuaternion(this.selectedEntity.quaternion);
      const scale = this.selectedEntity.scale.clone();
      
      // Entity-Typ ableiten und auf Schema normalisieren
      let entityType = this.selectedEntity.userData?.entityType || this.selectedEntity.userData?.objectType || 'objects';
      if (entityType === 'object') entityType = 'objects';

      const entityData = {
        type: entityType,
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
   * @returns {string} Eine zufällig generierte Entity-ID
   * @private
   */
  _generateEntityId() {
    return 'entity_' + Math.random().toString(36).substr(2, 9);
  }
  
  /**
   * Aktualisiert das YAML mit den Entity-Daten
   * @param {string} entityId - Die ID der Entity
   * @param {Object} entityData - Die Entity-Daten (Position, Rotation, Scale)
   * @private
   */
  async _updateYamlWithEntity(entityId, entityData) {
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
        await this._updatePatchYamlDirectly(yamlObj, entityId, entityData);
      } else {
        // World-Format: Entities-Struktur verwenden
        await this._updateWorldYamlWithEntity(yamlObj, entityId, entityData);
      }
    } catch (error) {
      console.error('[EntityInteraction] Fehler beim Aktualisieren des YAML:', error);
      this._showToast('error', 'YAML-Update fehlgeschlagen: ' + error.message);
    }
  }

  /**
   * Aktualisiert World-YAML mit Entity (klassische Entities-Struktur)
   * @param {Object} yamlObj - Das YAML-Objekt
   * @param {string} entityId - Die ID der Entity
   * @param {Object} entityData - Die Entity-Daten
   * @private
   */
  async _updateWorldYamlWithEntity(yamlObj, entityId, entityData) {
    // Sicherstellen, dass die Struktur vorhanden ist
    if (!yamlObj.entities || typeof yamlObj.entities !== 'object') {
      yamlObj.entities = {};
    }

    // Entity in die entsprechende Kategorie einfügen
    const entityType = entityData.type || 'objects';
    if (!yamlObj.entities[entityType] || typeof yamlObj.entities[entityType] !== 'object') {
      yamlObj.entities[entityType] = {};
    }
    
    // Entity-Daten setzen (kopiere alle Felder außer 'type')
    const { type, ...entityProps } = entityData;
    yamlObj.entities[entityType][entityId] = {
      ...entityProps,
      entity_id: entityId
    };
    
    // YAML serialisieren und anwenden
    const yamlText = this._serializeToYaml(yamlObj);
    if (this.debug) console.log('[EntityInteraction] World-YAML aktualisiert:', yamlText);
    
    await this._applyYamlChange(yamlText);
  }

  /**
   * Aktualisiert Patch-YAML direkt im autorfreundlichen Format
   * @param {Object} yamlObj - Das YAML-Objekt
   * @param {string} entityId - Die ID der Entity
   * @param {Object} entityData - Die Entity-Daten
   * @private
   */
  async _updatePatchYamlDirectly(yamlObj, entityId, entityData) {
    // Sicherstellen, dass objects Array existiert
    if (!yamlObj.objects || !Array.isArray(yamlObj.objects)) {
      yamlObj.objects = [];
    }
    
    // 1) Zuerst nach entity_id suchen (höchste Priorität)
    let existingIndex = yamlObj.objects.findIndex(obj => obj.entity_id === entityId);
    
    // 2) Falls nicht gefunden, nach legacy 'id' Feld suchen (für Abwärtskompatibilität)
    if (existingIndex === -1) {
      existingIndex = yamlObj.objects.findIndex(obj => obj.id === entityId);
      if (existingIndex !== -1) {
        if (this.debug) console.log('[EntityInteraction] Gefundenes Objekt mit legacy id-Feld:', yamlObj.objects[existingIndex]);
      }
    }
    
    // 3) Falls immer noch nicht gefunden, nach Position suchen (nur für Objekte ohne entity_id)
    if (existingIndex === -1 && this.originalEntityPosition) {
      existingIndex = yamlObj.objects.findIndex(obj => {
        if (obj.position && Array.isArray(obj.position)) {
          const distance = Math.sqrt(
            Math.pow(obj.position[0] - this.originalEntityPosition.x, 2) +
            Math.pow(obj.position[1] - this.originalEntityPosition.y, 2) +
            Math.pow(obj.position[2] - this.originalEntityPosition.z, 2)
          );
          return distance < 0.1;
        }
        return false;
      });
      
      if (existingIndex !== -1) {
        if (this.debug) console.log('[EntityInteraction] Gefundenes Objekt an ursprünglicher Position:', yamlObj.objects[existingIndex]);
      }
    }
    
    if (existingIndex !== -1) {
      // Aktualisiere bestehendes Objekt
      const existingObj = yamlObj.objects[existingIndex];
      
      // Verwende die entity_id aus dem bestehenden Objekt, falls vorhanden
      const targetEntityId = existingObj.entity_id || entityId;
      
      // Behalte alle bestehenden Eigenschaften bei und aktualisiere nur Position, Rotation, Scale
      const updatedObj = {
        ...existingObj,
        entity_id: targetEntityId,
        position: entityData.position,
        rotation: entityData.rotation,
        scale: entityData.scale
      };
      
      // Entferne legacy 'id' Feld falls vorhanden
      if (updatedObj.id !== undefined) {
        delete updatedObj.id;
      }
      
      yamlObj.objects[existingIndex] = updatedObj;
      if (this.debug) console.log('[EntityInteraction] Bestehendes Objekt aktualisiert:', yamlObj.objects[existingIndex]);
      
      // Aktualisiere die entityId in der Entity für zukünftige Referenzen
      if (this.selectedEntity) {
        this.selectedEntity.userData.entityId = targetEntityId;
      }
    } else {
      // Füge neues Objekt hinzu (nur wenn wirklich neu)
      const { type, ...entityProps } = entityData;
      const newObj = {
        type: type || 'box',
        ...entityProps,
        entity_id: entityId
      };
      
      yamlObj.objects.push(newObj);
      if (this.debug) console.log('[EntityInteraction] Neues Objekt hinzugefügt:', newObj);
    }
    
    // YAML serialisieren und anwenden
    const yamlText = this._serializeToYaml(yamlObj);
    if (this.debug) console.log('[EntityInteraction] Patch-YAML direkt aktualisiert:', yamlText);
    
    await this._applyYamlChange(yamlText);
  }

  /**
   * Findet den Index einer Entity-Operation im Patch-YAML
   * @param {Object} patchYaml - Das Patch-YAML-Objekt
   * @param {string} entityId - Die ID der Entity
   * @param {string} entityType - Der Typ der Entity
   * @returns {number} Index der Operation oder -1 wenn nicht gefunden
   * @private
   */
  _findEntityIndexInPatch(patchYaml, entityId, entityType) {
    if (!patchYaml.operations || !Array.isArray(patchYaml.operations)) {
      return -1;
    }
    
    // Durchsuche alle Add-Operationen nach der Entity
    for (let i = 0; i < patchYaml.operations.length; i++) {
      const operation = patchYaml.operations[i];
      if (operation.type === 'add' &&
          operation.entity_type === entityType + 's' && // Plural für entity_type
          operation.payload &&
          operation.payload.entity_id === entityId) {
        return i;
      }
    }
    
    return -1;
  }

  /**
   * Aktualisiert eine bestehende Patch-Operation mit neuen Entity-Daten
   * @param {Object} patchYaml - Das Patch-YAML-Objekt
   * @param {number} operationIndex - Der Index der Operation
   * @param {Object} entityData - Die neuen Entity-Daten
   * @private
   */
  _updatePatchOperation(patchYaml, operationIndex, entityData) {
    if (!patchYaml.operations || !Array.isArray(patchYaml.operations) ||
        operationIndex < 0 || operationIndex >= patchYaml.operations.length) {
      return;
    }
    
    const operation = patchYaml.operations[operationIndex];
    if (operation.type === 'add' && operation.payload) {
      // Behalte alle bestehenden Eigenschaften bei und aktualisiere nur Position, Rotation, Scale
      operation.payload.position = entityData.position;
      operation.payload.rotation = entityData.rotation;
      operation.payload.scale = entityData.scale;
      
      // Behalte type, color, kind und andere Eigenschaften bei
      if (this.debug) console.log('[EntityInteraction] Operation aktualisiert:', operation);
    }
  }

  /**
   * Fügt eine Add-Operation zum Patch hinzu
   * @param {Object} patchYaml - Das Patch-YAML-Objekt
   * @param {string} entityId - Die ID der Entity
   * @param {string} entityType - Der Typ der Entity
   * @param {Object} entityData - Die Entity-Daten
   * @private
   */
  _addPatchAddOperation(patchYaml, entityId, entityType, entityData) {
    // Sicherstellen, dass operations Array existiert
    if (!patchYaml.operations || !Array.isArray(patchYaml.operations)) {
      patchYaml.operations = [];
    }
    
    // Entity-Daten für Payload vorbereiten (kopiere alle Felder außer 'type')
    const { type, ...payload } = entityData;
    
    // Add-Operation hinzufügen
    patchYaml.operations.push({
      type: 'add',
      entity_type: entityType + 's', // Plural für entity_type
      entity_id: entityId,
      payload: {
        ...payload,
        id: entityId
      }
    });
  }

  /**
   * Fügt eine Update-Operation zum Patch hinzu
   * @param {Object} patchYaml - Das Patch-YAML-Objekt
   * @param {string} entityId - Die ID der Entity
   * @param {string} entityType - Der Typ der Entity
   * @param {Object} entityData - Die Entity-Daten
   * @private
   */
  _addPatchUpdateOperation(patchYaml, entityId, entityType, entityData) {
    // Sicherstellen, dass operations Array existiert
    if (!patchYaml.operations || !Array.isArray(patchYaml.operations)) {
      patchYaml.operations = [];
    }
    
    // Entity-Daten für Changes vorbereiten (kopiere alle Felder außer 'type' und 'id')
    const { type, id, ...changes } = entityData;
    
    // Update-Operation hinzufügen
    patchYaml.operations.push({
      type: 'update',
      entity_type: entityType + 's', // Plural für entity_type
      entity_id: entityId,
      changes: changes
    });
  }
  
  /**
   * Schließt den Entity-Bearbeitungs-Dialog und räumt auf
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
   * @returns {HTMLElement[]} Array von HTML-Elementen für die UI
   */
  getUIElements() {
    if (this.debug) console.log('[EntityInteraction] getUIElements aufgerufen');
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
    
    // Toggle für Aktivierung der Selektion (separat von Addon Aktivierung)
    const toggleRow = document.createElement('div');
    toggleRow.style.display = 'flex';
    toggleRow.style.alignItems = 'center';
    toggleRow.style.gap = '8px';
    toggleRow.style.margin = '8px 0';
    
    const toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.id = 'entity-selection-toggle';
    toggleInput.checked = !!this.selectionEnabled;
    toggleInput.title = 'Enable entity selection (hover + click)';
    
    const toggleLabel = document.createElement('label');
    toggleLabel.htmlFor = 'entity-selection-toggle';
    toggleLabel.textContent = 'Entity Auswahl aktivieren';
    toggleLabel.style.color = '#fff';
    toggleLabel.style.fontSize = '12px';
    
    toggleRow.appendChild(toggleInput);
    toggleRow.appendChild(toggleLabel);
    
    // Hinweistext
    const hint = document.createElement('p');
    hint.textContent = 'Mouseover: Entity hervorheben | Klick: Entity bearbeiten';
    hint.style.margin = '0';
    hint.style.color = '#0066ff';
    hint.style.fontSize = '11px';
    hint.style.fontStyle = 'italic';
    
    // Verhalten: bind/unbind Canvas-Events je nach Toggle
    const applyToggleState = (enabled) => {
      this.selectionEnabled = !!enabled;
      if (this.selectionEnabled) {
        this._bindCanvasEvents();
      } else {
        this._unbindCanvasEvents();
      }
    };
    
    toggleInput.addEventListener('change', (e) => {
      applyToggleState(e.target.checked);
    });
    
    // Beim Öffnen des Dialogs soll Auswahl deaktiviert werden.
    // Wir patchen _openEntityDialog minimal: falls es noch nicht gepatcht wurde, überschreiben wir es sicher.
    if (!this.__patchedOpenDialog) {
      this.__patchedOpenDialog = true;
      const originalOpen = this._openEntityDialog.bind(this);
      this._openEntityDialog = () => {
        // Vor Öffnen Events deaktivieren damit keine weiteren Selektionen stattfinden
        this._unbindCanvasEvents();
        originalOpen();
        // Dialog bleibt offen; _closeDialog wird zuständig sein, wieder zu aktivieren
      };
    }
    
    // Patch _closeDialog so dass nach Schließen die Auswahl wieder aktiviert wird, falls Toggle gesetzt.
    if (!this.__patchedCloseDialog) {
      this.__patchedCloseDialog = true;
      const originalClose = this._closeDialog.bind(this);
      this._closeDialog = () => {
        originalClose();
        // Nach Schließen Dialogs Auswahl wieder herstellen je nach Toggle
        if (this.selectionEnabled) {
          this._bindCanvasEvents();
        } else {
          this._unbindCanvasEvents();
        }
      };
    }
    
    container.appendChild(title);
    container.appendChild(desc);
    container.appendChild(toggleRow);
    container.appendChild(hint);
    
    // set initial state according to current flag
    if (typeof this.selectionEnabled === 'undefined') {
      this.selectionEnabled = true;
    }
    // Apply current state (bind/unbind accordingly)
    if (this.selectionEnabled) {
      this._bindCanvasEvents();
    } else {
      this._unbindCanvasEvents();
    }
    
    return [container];
  }
  
  /**
   * Serialisiert den aktuellen Zustand des Addons
   * @returns {Object} Der serialisierte Zustand
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
   * @param {Object} state - Der serialisierte Zustand
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
}


