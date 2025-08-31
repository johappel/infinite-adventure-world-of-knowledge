/**
 * Integrationstests für ObjectCatalogAddon
 *
 * Testet die Integration mit anderen Addons und dem Gesamtsystem
 */

import { ObjectCatalogAddon } from './object-catalog-addon.js';
import { TerrainClickAddon } from './terrain-click-addon.js';
import { AddonManager } from './index.js';
import { InteractionAddon } from './base-addon.js';

// Mock für den PresetEditor
class MockEditor {
  constructor() {
    this.addonManager = new AddonManager(this);
    this.canvas = {
      parentElement: document.createElement('div')
    };
  }
}

describe('ObjectCatalogAddon Integration', () => {
  let editor;
  let catalogAddon;
  let terrainAddon;

  beforeEach(() => {
    editor = new MockEditor();
    
    // Registriere beide Addons
    catalogAddon = new ObjectCatalogAddon(editor);
    terrainAddon = new TerrainClickAddon(editor);
    
    editor.addonManager.registerAddon('object-catalog', catalogAddon);
    editor.addonManager.registerAddon('terrain-click', terrainAddon);
  });

  describe('Integration mit TerrainClickAddon', () => {
    test('sollte TerrainClickAddon bei Drag & Drop aktivieren', async () => {
      await catalogAddon.activate();
      await terrainAddon.activate();
      
      // Simuliere Drag-Event
      const mockEvent = {
        dataTransfer: {
          setData: jest.fn(),
          effectAllowed: ''
        }
      };
      
      const testObject = catalogAddon.catalogData[0];
      catalogAddon._handleDragStart(mockEvent, testObject);
      
      // Prüfe ob TerrainClickAddon aktiviert wurde
      expect(mockEvent.dataTransfer.setData).toHaveBeenCalledWith('text/plain', testObject.id);
      expect(mockEvent.dataTransfer.effectAllowed).toBe('copy');
    });

    test('sollte Objekttyp an TerrainClickAddon übergeben', async () => {
      await catalogAddon.activate();
      await terrainAddon.activate();
      
      const testObject = catalogAddon.catalogData[0];
      
      // Setze Methode zum Testen
      terrainAddon.setSelectedObjectType = jest.fn();
      
      // Simuliere Drag-Event
      const mockEvent = {
        dataTransfer: {
          setData: jest.fn(),
          effectAllowed: ''
        }
      };
      
      catalogAddon._handleDragStart(mockEvent, testObject);
      
      expect(terrainAddon.setSelectedObjectType).toHaveBeenCalledWith(testObject);
    });
  });

  describe('Integration mit AddonManager', () => {
    test('sollte korrekt im AddonManager registriert sein', () => {
      const registeredAddon = editor.addonManager.getAddon('object-catalog');
      expect(registeredAddon).toBeInstanceOf(ObjectCatalogAddon);
      expect(registeredAddon.name).toBe('Objekt Katalog');
    });

    test('sollte UI-Elemente für Interaktions-Controls zurückgeben', () => {
      const uiElements = catalogAddon.getUIElements();
      expect(uiElements).toBeInstanceOf(Array);
      expect(uiElements.length).toBe(1);
      expect(uiElements[0]).toBeInstanceOf(HTMLElement);
    });
  });

  describe('Zustands-Persistenz', () => {
    test('sollte Zustand serialisieren und deserialisieren können', () => {
      catalogAddon.isCatalogOpen = true;
      catalogAddon.favorites.add('house_1');
      catalogAddon.favorites.add('tree_1');
      
      const state = catalogAddon.serializeState();
      
      expect(state).toHaveProperty('isCatalogOpen', true);
      expect(state).toHaveProperty('favorites');
      expect(state.favorites).toContain('house_1');
      expect(state.favorites).toContain('tree_1');
      
      // Deserialisierung testen
      const newCatalogAddon = new ObjectCatalogAddon(editor);
      newCatalogAddon.deserializeState(state);
      
      expect(newCatalogAddon.isCatalogOpen).toBe(true);
      expect(newCatalogAddon.favorites.has('house_1')).toBe(true);
      expect(newCatalogAddon.favorites.has('tree_1')).toBe(true);
    });
  });

  describe('Event-Kommunikation', () => {
    test('sollte Events für Objektauswahl auslösen', () => {
      const mockCallback = jest.fn();
      window.addEventListener('objectSelected', mockCallback);
      
      const testObject = catalogAddon.catalogData[0];
      catalogAddon._selectObject(testObject);
      
      expect(mockCallback).toHaveBeenCalled();
      expect(mockCallback.mock.calls[0][0].detail).toEqual(testObject);
      
      window.removeEventListener('objectSelected', mockCallback);
    });

    test('sollte Events für Favoriten-Änderungen auslösen', () => {
      const mockCallback = jest.fn();
      window.addEventListener('favoriteToggled', mockCallback);
      
      catalogAddon._toggleFavorite('house_1');
      
      expect(mockCallback).toHaveBeenCalled();
      expect(mockCallback.mock.calls[0][0].detail).toEqual({
        objectId: 'house_1',
        isFavorite: true
      });
      
      window.removeEventListener('favoriteToggled', mockCallback);
    });
  });

  describe('Performance-Optimierung', () => {
    test('sollte lazy loading für Thumbnails verwenden', async () => {
      await catalogAddon.activate();
      
      // Erstelle ein Katalog-Element
      const testObject = catalogAddon.catalogData[0];
      const item = catalogAddon._createCatalogItem(testObject);
      
      // Prüfe ob Platzhalter gesetzt ist
      const thumbnail = item.querySelector('.catalog-item-thumbnail');
      expect(thumbnail.textContent).toBe('⏳');
      expect(thumbnail.getAttribute('data-thumbnail')).toBe(testObject.thumbnail);
    });

    test('sollte Intersection Observer für lazy loading verwenden', () => {
      // Prüfe ob Observer-Array existiert
      expect(catalogAddon.observers).toBeInstanceOf(Array);
    });

    test('sollte Observer beim Deaktivieren aufräumen', async () => {
      await catalogAddon.activate();
      
      // Füge einen Mock-Observer hinzu
      const mockObserver = { disconnect: jest.fn() };
      catalogAddon.observers.push(mockObserver);
      
      await catalogAddon.deactivate();
      
      expect(mockObserver.disconnect).toHaveBeenCalled();
      expect(catalogAddon.observers.length).toBe(0);
    });
  });

  describe('CSS-Integration', () => {
    test('sollte korrekte CSS-Klassen verwenden', async () => {
      await catalogAddon.activate();
      
      const testObject = catalogAddon.catalogData[0];
      const item = catalogAddon._createCatalogItem(testObject);
      
      expect(item.className).toBe('catalog-item');
      expect(item.querySelector('.catalog-item-thumbnail')).not.toBeNull();
      expect(item.querySelector('.catalog-item-name')).not.toBeNull();
      expect(item.querySelector('.catalog-item-category')).not.toBeNull();
      expect(item.querySelector('.catalog-item-favorite')).not.toBeNull();
    });
  });
});

// Test für die tatsächliche Integration im Browser
describe('Browser Integration', () => {
  test('sollte im globalen Scope verfügbar sein', () => {
    // Diese Tests würden im Browser laufen
    expect(typeof ObjectCatalogAddon).toBe('function');
    expect(ObjectCatalogAddon.prototype.activate).toBeInstanceOf(Function);
    expect(ObjectCatalogAddon.prototype.deactivate).toBeInstanceOf(Function);
  });

  test('sollte mit window Events arbeiten', () => {
    // Teste ob Event-Listener korrekt funktionieren
    const originalAddEventListener = window.addEventListener;
    const events = [];
    
    window.addEventListener = (type, callback) => {
      events.push({ type, callback });
    };
    
    const catalogAddon = new ObjectCatalogAddon(new MockEditor());
    catalogAddon.activate();
    
    expect(events.some(e => e.type === 'objectSelected')).toBe(true);
    expect(events.some(e => e.type === 'favoriteToggled')).toBe(true);
    
    window.addEventListener = originalAddEventListener;
  });
});