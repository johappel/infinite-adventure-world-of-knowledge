/**
 * PresetEditor Module Index
 * Exportiert alle Module und stellt den Haupt-Export bereit
 */

// Importiere alle Klassen
import { PresetEditor, bootstrapPresetEditor } from './core.js';
import { YamlProcessor } from './yaml-processor.js';
import { WorldManager } from './world-manager.js';
import { PatchManager } from './patch-manager.js';
import { PreviewRenderer } from './preview-renderer.js';
import { UIManager } from './ui-manager.js';

// Exportiere alle Klassen
export { PresetEditor, bootstrapPresetEditor, YamlProcessor, WorldManager, PatchManager, PreviewRenderer, UIManager };

// Standard-Export
export default {
  PresetEditor,
  bootstrapPresetEditor,
  YamlProcessor,
  WorldManager,
  PatchManager,
  PreviewRenderer,
  UIManager
};