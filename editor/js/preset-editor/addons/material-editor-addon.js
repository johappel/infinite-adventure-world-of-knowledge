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
    this.description = 'Erweiterte Material-Bearbeitung mit PBR-Eigenschaften';
    this.icon = '🎨';
    
    // Zustandsvariablen
    this.selectedMaterial = null;
    this.materialDialog = null;
    this.originalMaterial = null;
  }
  
  /**
   * Wird aufgerufen wenn das Addon aktiviert wird
   */
  async activate() {
    await super.activate();
    console.log('[MaterialEditor] Addon aktiviert');
  }
  
  /**
   * Wird aufgerufen wenn das Addon deaktiviert wird
   */
  async deactivate() {
    await super.deactivate();
    
    // Aufräumen
    this._closeDialog();
    
    console.log('[MaterialEditor] Addon deaktiviert');
  }
  
  /**
   * Terrain-Click Handler - wird für Material-Selektion verwendet
   * @param {Object} hitInfo
   */
  async onTerrainClick(hitInfo) {
    if (!this.isActive) return;
    
    try {
      if (hitInfo.object && hitInfo.object.material) {
        this.selectedMaterial = hitInfo.object.material;
        this._openMaterialDialog();
      }
    } catch (e) {
      console.error('[MaterialEditor] Fehler bei Material-Selektion:', e);
      this._showToast('error', 'Material konnte nicht ausgewählt werden');
    }
  }
  
  /**
   * Öffnet den Material-Bearbeitungs-Dialog
   * @private
   */
  _openMaterialDialog() {
    if (!this.selectedMaterial) return;
    
    this._closeDialog(); // Vorherigen Dialog schließen
    this.originalMaterial = this.selectedMaterial.clone();
    
    // Dialog erstellen
    this.materialDialog = this._createDialog();
    document.body.appendChild(this.materialDialog);
    
    // Dialog-Inhalt füllen
    this._populateDialog();
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
      min-width: 350px;
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
   * Füllt den Dialog mit Material-Eigenschaften
   * @private
   */
  _populateDialog() {
    if (!this.materialDialog || !this.selectedMaterial) return;
    
    const material = this.selectedMaterial;
    
    // Titel
    const title = document.createElement('h3');
    title.textContent = 'Material Editor';
    title.style.marginTop = '0';
    title.style.color = '#ff3366';
    
    // Color Picker für Base Color
    const colorSection = this._createColorControl('Base Color', material.color, (color) => {
      material.color.set(color);
      material.needsUpdate = true;
    });
    
    // Color Picker für Emissive Color
    const emissiveSection = this._createColorControl('Emissive Color', material.emissive, (color) => {
      material.emissive.set(color);
      material.needsUpdate = true;
    });
    
    // Slider für PBR-Eigenschaften
    const roughnessSection = this._createSliderControl('Roughness', material.roughness, 0, 1, 0.01, (value) => {
      material.roughness = value;
      material.needsUpdate = true;
    });
    
    const metalnessSection = this._createSliderControl('Metalness', material.metalness, 0, 1, 0.01, (value) => {
      material.metalness = value;
      material.needsUpdate = true;
    });
    
    const emissiveIntensitySection = this._createSliderControl('Emissive Intensity', material.emissiveIntensity, 0, 5, 0.1, (value) => {
      material.emissiveIntensity = value;
      material.needsUpdate = true;
    });
    
    const opacitySection = this._createSliderControl('Opacity', material.opacity, 0, 1, 0.01, (value) => {
      material.opacity = value;
      material.transparent = value < 1;
      material.needsUpdate = true;
    });
    
    // Button Group
    const buttonGroup = document.createElement('div');
    buttonGroup.style.display = 'flex';
    buttonGroup.style.gap = '10px';
    buttonGroup.style.marginTop = '20px';
    
    // Apply Button
    const applyBtn = document.createElement('button');
    applyBtn.textContent = 'Apply';
    applyBtn.style.cssText = `
      background: #00cc66;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      flex: 1;
    `;
    applyBtn.addEventListener('click', () => this._applyMaterialChanges());
    
    // Reset Button
    const resetBtn = document.createElement('button');
    resetBtn.textContent = 'Reset';
    resetBtn.style.cssText = `
      background: #ff6666;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      flex: 1;
    `;
    resetBtn.addEventListener('click', () => this._resetMaterial());
    
    // Close Button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
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
    
    buttonGroup.appendChild(applyBtn);
    buttonGroup.appendChild(resetBtn);
    buttonGroup.appendChild(closeBtn);
    
    // Dialog-Inhalt zusammenbauen
    this.materialDialog.appendChild(title);
    this.materialDialog.appendChild(colorSection);
    this.materialDialog.appendChild(emissiveSection);
    this.materialDialog.appendChild(roughnessSection);
    this.materialDialog.appendChild(metalnessSection);
    this.materialDialog.appendChild(emissiveIntensitySection);
    this.materialDialog.appendChild(opacitySection);
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
   * Wendet die Material-Änderungen permanent an
   * @private
   */
  async _applyMaterialChanges() {
    this._showToast('success', 'Material erfolgreich aktualisiert');
    this._closeDialog();
  }
  
  /**
   * Setzt das Material auf den Originalzustand zurück
   * @private
   */
  _resetMaterial() {
    if (!this.selectedMaterial || !this.originalMaterial) return;
    
    // Eigenschaften zurücksetzen
    this.selectedMaterial.color.copy(this.originalMaterial.color);
    this.selectedMaterial.emissive.copy(this.originalMaterial.emissive);
    this.selectedMaterial.roughness = this.originalMaterial.roughness;
    this.selectedMaterial.metalness = this.originalMaterial.metalness;
    this.selectedMaterial.emissiveIntensity = this.originalMaterial.emissiveIntensity;
    this.selectedMaterial.opacity = this.originalMaterial.opacity;
    this.selectedMaterial.transparent = this.originalMaterial.transparent;
    this.selectedMaterial.needsUpdate = true;
    
    this._showToast('info', 'Material zurückgesetzt');
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
    this.selectedMaterial = null;
    this.originalMaterial = null;
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
    hint.textContent = 'Klick auf ein Objekt: Material bearbeiten';
    hint.style.margin = '0';
    hint.style.color = '#ff3366';
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
      ...super.serializeState()
      // Material-Zustand wird nicht serialisiert, da temporär
    };
  }
  
  /**
   * Deserialisiert einen gespeicherten Zustand
   * @param {Object} state
   */
  deserializeState(state) {
    super.deserializeState(state);
    // Material-Zustand wird nicht deserialisiert
  }
}