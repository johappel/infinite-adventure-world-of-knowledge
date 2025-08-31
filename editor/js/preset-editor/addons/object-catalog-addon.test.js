/**
 * Unit Tests für ObjectCatalogAddon
 * 
 * Testet die Kernfunktionalität des Objektkatalog-Addons
 */

import { ObjectCatalogAddon } from './object-catalog-addon.js';

// Mock für den PresetEditor
class MockEditor {
  constructor() {
    this.addonManager = {
      activateAddon: jest.fn(),
      getAddon: jest.fn()
    };
    this.canvas = {
      parentElement: document.createElement('div')
    };
  }
}

describe('ObjectCatalogAddon', () => {
  let addon;
  let mockEditor;

  beforeEach(() => {
    mockEditor = new MockEditor();
    addon = new ObjectCatalogAddon(mockEditor);
    
    // Mock localStorage
    Storage.prototype.getItem = jest.fn();
    Storage.prototype.setItem = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Konstruktor', () => {
    test('sollte korrekt initialisiert werden', () => {
      expect(addon).toBeInstanceOf(ObjectCatalogAddon);
      expect(addon.name).toBe('ObjectCatalogAddon');
      expect(addon.favorites).toBeInstanceOf(Set);
      expect(addon.catalogData).toBeInstanceOf(Array);
      expect(addon.catalogData.length).toBeGreaterThan(0);
    });

    test('sollte Favoriten aus localStorage laden', () => {
      const mockFavorites = ['house_1', 'tree_1'];
      Storage.prototype.getItem.mockReturnValue(JSON.stringify(mockFavorites));
      
      addon = new ObjectCatalogAddon(mockEditor);
      
      expect(Storage.prototype.getItem).toHaveBeenCalledWith('objectCatalog_favorites');
      expect(addon.favorites.has('house_1')).toBe(true);
      expect(addon.favorites.has('tree_1')).toBe(true);
    });

    test('sollte leere Favoriten bei Fehler behandeln', () => {
      Storage.prototype.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      addon = new ObjectCatalogAddon(mockEditor);
      
      expect(addon.favorites.size).toBe(0);
    });
  });

  describe('Katalog-Daten', () => {
    test('sollte korrekte Katalog-Daten enthalten', () => {
      const catalog = addon.catalogData;
      
      expect(catalog).toBeInstanceOf(Array);
      expect(catalog.length).toBeGreaterThan(0);
      
      // Prüfe Struktur der ersten Einträge
      catalog.forEach(obj => {
        expect(obj).toHaveProperty('id');
        expect(obj).toHaveProperty('name');
        expect(obj).toHaveProperty('category');
        expect(obj).toHaveProperty('thumbnail');
        expect(obj).toHaveProperty('tags');
      });
    });

    test('sollte verschiedene Kategorien enthalten', () => {
      const categories = new Set(addon.catalogData.map(obj => obj.category));
      
      expect(categories.has('buildings')).toBe(true);
      expect(categories.has('vegetation')).toBe(true);
      expect(categories.has('infrastructure')).toBe(true);
      expect(categories.has('decoration')).toBe(true);
    });
  });

  describe('UI-Erstellung', () => {
    test('sollte UI-Elemente erstellen können', () => {
      const uiElements = addon.getUIElements();
      
      expect(uiElements).toBeInstanceOf(Array);
      expect(uiElements.length).toBe(1);
      expect(uiElements[0]).toBeInstanceOf(HTMLElement);
    });

    test('sollte Katalog-UI erstellen', () => {
      addon._createCatalogUI();
      
      expect(addon.catalogContainer).toBeInstanceOf(HTMLElement);
      expect(addon.catalogContainer.className).toBe('object-catalog');
    });
  });

  describe('Favoriten-Funktionalität', () => {
    test('sollte Favoriten umschalten können', () => {
      const objectId = 'house_1';
      
      // Erstes Mal: Favorit hinzufügen
      addon._toggleFavorite(objectId);
      expect(addon.favorites.has(objectId)).toBe(true);
      expect(Storage.prototype.setItem).toHaveBeenCalled();
      
      // Zweites Mal: Favorit entfernen
      addon._toggleFavorite(objectId);
      expect(addon.favorites.has(objectId)).toBe(false);
      expect(Storage.prototype.setItem).toHaveBeenCalledTimes(2);
    });

    test('sollte Favoriten speichern', () => {
      addon.favorites.add('test_object');
      addon._saveFavorites();
      
      expect(Storage.prototype.setItem).toHaveBeenCalledWith(
        'objectCatalog_favorites',
        JSON.stringify(['test_object'])
      );
    });
  });

  describe('Filter-Funktionalität', () => {
    test('sollte nach Kategorien filtern können', () => {
      const buildings = addon.catalogData.filter(obj => obj.category === 'buildings');
      const vegetation = addon.catalogData.filter(obj => obj.category === 'vegetation');
      
      expect(buildings.length).toBeGreaterThan(0);
      expect(vegetation.length).toBeGreaterThan(0);
    });

    test('sollte Favoriten-Filter funktionieren', () => {
      addon.favorites.add('house_1');
      addon.favorites.add('tree_1');
      
      // Mock für die UI-Methode
      addon._populateCatalog = jest.fn();
      
      addon._filterByCategory('favorites');
      
      expect(addon._populateCatalog).toHaveBeenCalledWith('favorites');
    });
  });

  describe('Drag & Drop', () => {
    test('sollte Drag-Event vorbereiten', () => {
      const mockEvent = {
        dataTransfer: {
          setData: jest.fn(),
          effectAllowed: ''
        }
      };
      
      const testObject = addon.catalogData[0];
      addon._handleDragStart(mockEvent, testObject);
      
      expect(mockEvent.dataTransfer.setData).toHaveBeenCalledWith('text/plain', testObject.id);
      expect(mockEvent.dataTransfer.effectAllowed).toBe('copy');
      expect(mockEditor.addonManager.activateAddon).toHaveBeenCalledWith('terrain-click');
    });
  });

  describe('Zustandsverwaltung', () => {
    test('sollte Zustand serialisieren können', () => {
      addon.isCatalogOpen = true;
      addon.favorites.add('test_object');
      
      const state = addon.serializeState();
      
      expect(state).toHaveProperty('isCatalogOpen', true);
      expect(state).toHaveProperty('favorites');
      expect(state.favorites).toContain('test_object');
    });

    test('sollte Zustand deserialisieren können', () => {
      const state = {
        isCatalogOpen: true,
        favorites: ['test_object_1', 'test_object_2']
      };
      
      addon.deserializeState(state);
      
      expect(addon.isCatalogOpen).toBe(true);
      expect(addon.favorites.has('test_object_1')).toBe(true);
      expect(addon.favorites.has('test_object_2')).toBe(true);
    });
  });

  describe('Aktivierung/Deaktivierung', () => {
    test('sollte aktivieren und deaktivieren können', async () => {
      addon._createCatalogUI = jest.fn();
      addon._removeCatalogUI = jest.fn();
      
      await addon.activate();
      expect(addon._createCatalogUI).toHaveBeenCalled();
      
      await addon.deactivate();
      expect(addon._removeCatalogUI).toHaveBeenCalled();
    });
  });
});

// Einfache Integrationstests
describe('Integration - ObjectCatalogAddon', () => {
  test('sollte mit AddonManager integriert sein', () => {
    // Importiere den AddonManager um zu prüfen, ob das Addon registriert ist
    const { AddonManager } = require('./index.js');
    
    const mockEditor = new MockEditor();
    const manager = new AddonManager(mockEditor);
    
    const catalogAddon = manager.getAddon('object-catalog');
    expect(catalogAddon).toBeDefined();
    expect(catalogAddon).toBeInstanceOf(ObjectCatalogAddon);
  });
});