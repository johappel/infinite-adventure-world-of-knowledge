import { InteractionAddon } from './base-addon.js';

/**
 * ObjectCatalogAddon - Ein Addon für einen visuellen Objektkatalog mit Drag & Drop
 * Ermöglicht die Auswahl und Platzierung von 3D-Objekten durch einen visuellen Katalog
 *
 * @extends InteractionAddon
 */
export class ObjectCatalogAddon extends InteractionAddon {
  /**
   * Erstellt eine neue ObjectCatalogAddon-Instanz
   * @param {PresetEditor} editor - Die PresetEditor-Instanz
   */
  constructor(editor) {
    super(editor);
    this.name = 'Objekt Katalog';
    this.description = 'Visueller Katalog für 3D-Objekte mit Drag & Drop';
    this.icon = '📦';
    
    // Katalog-Zustand
    this.isCatalogOpen = false;
    this.selectedObject = null;
    this.catalogData = this._getDefaultCatalogData();
    this.favorites = this._loadFavorites();
    
    // UI-Elemente
    this.catalogContainer = null;
    this.toggleButton = null;
    
    // Performance-Optimierung
    this.observers = []; // Für Intersection Observer
  }

  /**
   * Gibt die Standard-Katalogdaten zurück
   * @returns {Array} Array mit Objekt-Metadaten
   * @private
   */
  _getDefaultCatalogData() {
    return [
      // Gebäude
      {
        id: 'house_1',
        name: 'Einfamilienhaus',
        category: 'buildings',
        type: 'mesh',
        meshType: 'BoxGeometry',
        size: { width: 5, height: 4, depth: 5 },
        position: { x: 0, y: 2, z: 0 },
        material: { color: 0x88ccee, emissive: 0x224466 },
        thumbnail: '🏠',
        tags: ['wohnung', 'haus', 'gebäude']
      },
      {
        id: 'tower_1',
        name: 'Wachturm',
        category: 'buildings',
        type: 'mesh',
        meshType: 'CylinderGeometry',
        radius: 1.5,
        height: 8,
        position: { x: 0, y: 4, z: 0 },
        material: { color: 0xaa9977, emissive: 0x554433 },
        thumbnail: '🗼',
        tags: ['turm', 'wache', 'hoch']
      },
      
      // Vegetation
      {
        id: 'tree_1',
        name: 'Eiche',
        category: 'vegetation',
        type: 'mesh',
        meshType: 'ConeGeometry',
        radius: 1.2,
        height: 6,
        position: { x: 0, y: 3, z: 0 },
        material: { color: 0x336633, emissive: 0x113311 },
        thumbnail: '🌳',
        tags: ['baum', 'natur', 'wald']
      },
      {
        id: 'bush_1',
        name: 'Busch',
        category: 'vegetation',
        type: 'mesh',
        meshType: 'SphereGeometry',
        radius: 1,
        position: { x: 0, y: 1, z: 0 },
        material: { color: 0x44aa44, emissive: 0x226622 },
        thumbnail: '🌿',
        tags: ['strauch', 'pflanze', 'grün']
      },
      
      // Infrastruktur
      {
        id: 'bridge_1',
        name: 'Steinbrücke',
        category: 'infrastructure',
        type: 'mesh',
        meshType: 'BoxGeometry',
        size: { width: 8, height: 1, depth: 2 },
        position: { x: 0, y: 0.5, z: 0 },
        material: { color: 0x888888, emissive: 0x444444 },
        thumbnail: '🌉',
        tags: ['brücke', 'weg', 'verbindung']
      },
      {
        id: 'fence_1',
        name: 'Holzzaun',
        category: 'infrastructure',
        type: 'mesh',
        meshType: 'BoxGeometry',
        size: { width: 1, height: 2, depth: 0.2 },
        position: { x: 0, y: 1, z: 0 },
        material: { color: 0x8B4513, emissive: 0x45280D },
        thumbnail: '🚧',
        tags: ['zaun', 'grenze', 'holz']
      },
      
      // Dekoration
      {
        id: 'fountain_1',
        name: 'Springbrunnen',
        category: 'decoration',
        type: 'mesh',
        meshType: 'CylinderGeometry',
        radius: 2,
        height: 1,
        position: { x: 0, y: 0.5, z: 0 },
        material: { color: 0xCCCCCC, emissive: 0x666666 },
        thumbnail: '⛲',
        tags: ['brunnen', 'wasser', 'dekor']
      },
      {
        id: 'statue_1',
        name: 'Steinstatue',
        category: 'decoration',
        type: 'mesh',
        meshType: 'ConeGeometry',
        radius: 0.8,
        height: 3,
        position: { x: 0, y: 1.5, z: 0 },
        material: { color: 0x999999, emissive: 0x555555 },
        thumbnail: '🗿',
        tags: ['statue', 'kunst', 'stein']
      }
    ];
  }

  /**
   * Lädt gespeicherte Favoriten aus localStorage
   * @returns {Set} Set mit favorisierten Objekt-IDs
   * @private
   */
  _loadFavorites() {
    try {
      const saved = localStorage.getItem('objectCatalog_favorites');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (e) {
      console.warn('Could not load favorites:', e);
      return new Set();
    }
  }

  /**
   * Speichert Favoriten in localStorage
   * @private
   */
  _saveFavorites() {
    try {
      localStorage.setItem('objectCatalog_favorites', JSON.stringify([...this.favorites]));
    } catch (e) {
      console.warn('Could not save favorites:', e);
    }
  }

  /**
   * Wird beim Aktivieren des Addons aufgerufen
   */
  async activate() {
    await super.activate();
    this._createCatalogUI();
    console.log('ObjectCatalogAddon aktiviert');
  }

  /**
   * Wird beim Deaktivieren des Addons aufgerufen
   */
  async deactivate() {
    await super.deactivate();
    this._cleanupObservers();
    this._removeCatalogUI();
    console.log('ObjectCatalogAddon deaktiviert');
  }

  /**
   * Erstellt die Katalog-UI
   * @private
   */
  _createCatalogUI() {
    // Hauptcontainer für den Katalog
    this.catalogContainer = document.createElement('div');
    this.catalogContainer.className = 'object-catalog';
    this.catalogContainer.style.cssText = `
      position: fixed;
      right: 20px;
      top: 100px;
      width: 300px;
      max-height: 60vh;
      background: #2d3748;
      border: 1px solid #4a5568;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 1000;
      display: none;
      flex-direction: column;
      overflow: hidden;
    `;

    // Header mit Titel und Schließen-Button
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 12px;
      background: #4a5568;
      color: white;
      font-weight: bold;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #718096;
    `;
    header.innerHTML = `
      <span>📦 Objekt Katalog</span>
      <button style="background: none; border: none; color: white; cursor: pointer; font-size: 16px;">×</button>
    `;

    // Schließen-Button Event
    header.querySelector('button').addEventListener('click', () => {
      this.toggleCatalog();
    });

    // Suchleiste
    const searchContainer = document.createElement('div');
    searchContainer.style.cssText = `
      padding: 8px;
      background: #4a5568;
      border-bottom: 1px solid #718096;
    `;
    searchContainer.innerHTML = `
      <input type="text" placeholder="🔍 Objekte suchen..." 
             style="width: 100%; padding: 6px; border: 1px solid #718096; border-radius: 4px; background: #2d3748; color: white;">
    `;

    // Kategorien-Filter
    const categories = ['alle', 'buildings', 'vegetation', 'infrastructure', 'decoration', 'favorites'];
    const filterContainer = document.createElement('div');
    filterContainer.style.cssText = `
      padding: 8px;
      background: #4a5568;
      border-bottom: 1px solid #718096;
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    `;

    categories.forEach(category => {
      const button = document.createElement('button');
      button.textContent = this._getCategoryLabel(category);
      button.style.cssText = `
        padding: 4px 8px;
        border: 1px solid #718096;
        border-radius: 4px;
        background: #2d3748;
        color: white;
        cursor: pointer;
        font-size: 11px;
      `;
      button.addEventListener('click', () => this._filterByCategory(category));
      filterContainer.appendChild(button);
    });

    // Objekt-Grid Container
    const gridContainer = document.createElement('div');
    gridContainer.className = 'object-grid';
    gridContainer.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 8px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      background: #1a202c;
    `;

    // Füge alle Elemente zum Container hinzu
    this.catalogContainer.appendChild(header);
    this.catalogContainer.appendChild(searchContainer);
    this.catalogContainer.appendChild(filterContainer);
    this.catalogContainer.appendChild(gridContainer);

    // Füge den Container zum Body hinzu
    document.body.appendChild(this.catalogContainer);

    // Fülle den Katalog mit Objekten
    this._populateCatalog();
  }

  /**
   * Entfernt die Katalog-UI
   * @private
   */
  _removeCatalogUI() {
    if (this.catalogContainer) {
      this.catalogContainer.remove();
      this.catalogContainer = null;
    }
  }

  /**
   * Gibt das Label für eine Kategorie zurück
   * @param {string} category - Die Kategorie
   * @returns {string} Angezeigter Name
   * @private
   */
  _getCategoryLabel(category) {
    const labels = {
      'alle': 'Alle',
      'buildings': '🏢 Gebäude',
      'vegetation': '🌿 Vegetation',
      'infrastructure': '🛣️ Infrastruktur',
      'decoration': '🎨 Dekoration',
      'favorites': '⭐ Favoriten'
    };
    return labels[category] || category;
  }

  /**
   * Filtert den Katalog nach Kategorie
   * @param {string} category - Die zu filternde Kategorie
   * @private
   */
  _filterByCategory(category) {
    console.log('Filter by category:', category);
    // Wird in _populateCatalog implementiert
    this._populateCatalog(category);
  }

  /**
   * Füllt den Katalog mit Objekten mit virtuellen Scrolling
   * @param {string} filterCategory - Optional: Kategorie zum Filtern
   * @private
   */
  _populateCatalog(filterCategory = 'alle') {
    const gridContainer = this.catalogContainer.querySelector('.object-grid');
    if (!gridContainer) return;

    // Vorherige Observer entfernen
    this._cleanupObservers();
    
    gridContainer.innerHTML = '';

    const filteredObjects = this.catalogData.filter(obj => {
      if (filterCategory === 'alle') return true;
      if (filterCategory === 'favorites') return this.favorites.has(obj.id);
      return obj.category === filterCategory;
    });

    if (filteredObjects.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'object-grid-empty';
      emptyState.innerHTML = `
        <div class="object-grid-empty-icon">📦</div>
        <div>Keine Objekte gefunden</div>
      `;
      gridContainer.appendChild(emptyState);
      return;
    }

    // Virtuelles Scrolling: Nur erste 20 Elemente sofort rendern
    const initialBatch = filteredObjects.slice(0, 20);
    const remainingObjects = filteredObjects.slice(20);

    initialBatch.forEach(obj => {
      const item = this._createCatalogItem(obj);
      gridContainer.appendChild(item);
    });

    // Restliche Elemente später laden
    if (remainingObjects.length > 0) {
      const loadMoreObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            remainingObjects.forEach(obj => {
              const item = this._createCatalogItem(obj);
              gridContainer.appendChild(item);
            });
            loadMoreObserver.disconnect();
            entry.target.remove();
          }
        });
      });

      const sentinel = document.createElement('div');
      sentinel.style.height = '1px';
      sentinel.style.visibility = 'hidden';
      gridContainer.appendChild(sentinel);
      
      setTimeout(() => {
        if (sentinel.isConnected) {
          loadMoreObserver.observe(sentinel);
          this.observers.push(loadMoreObserver);
        }
      }, 0);
    }
  }

  /**
   * Räumt alle Intersection Observer auf
   * @private
   */
  _cleanupObservers() {
    this.observers.forEach(observer => {
      observer.disconnect();
    });
    this.observers = [];
  }

  /**
   * Erstellt ein Katalog-Element für ein Objekt mit lazy loading
   * @param {Object} obj - Das Objekt-Metadaten
   * @returns {HTMLElement} Das erstellte Element
   * @private
   */
  _createCatalogItem(obj) {
    const item = document.createElement('div');
    item.className = 'catalog-item';
    item.dataset.objectId = obj.id;
    item.setAttribute('draggable', 'true');

    // Thumbnail mit lazy loading
    const thumbnail = document.createElement('div');
    thumbnail.className = 'catalog-item-thumbnail';
    thumbnail.setAttribute('data-thumbnail', obj.thumbnail);
    thumbnail.textContent = '⏳'; // Platzhalter während des Ladens

    // Objektname
    const name = document.createElement('div');
    name.className = 'catalog-item-name';
    name.textContent = obj.name;

    // Kategorie
    const category = document.createElement('div');
    category.className = 'catalog-item-category';
    category.textContent = obj.category;

    // Favoriten-Button
    const favoriteBtn = document.createElement('button');
    favoriteBtn.className = 'catalog-item-favorite';
    favoriteBtn.innerHTML = this.favorites.has(obj.id) ? '★' : '☆';
    favoriteBtn.title = this.favorites.has(obj.id) ? 'Von Favoriten entfernen' : 'Zu Favoriten hinzufügen';
    
    favoriteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._toggleFavorite(obj.id);
    });

    // Drag & Drop Event
    item.addEventListener('dragstart', (e) => {
      this._handleDragStart(e, obj);
    });

    // Hover Effects
    item.addEventListener('mouseenter', () => {
      item.style.transform = 'translateY(-2px)';
      item.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
    });

    item.addEventListener('mouseleave', () => {
      item.style.transform = 'translateY(0)';
      item.style.boxShadow = 'none';
    });

    // Intersection Observer für lazy loading
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Thumbnail laden, wenn sichtbar
          thumbnail.textContent = obj.thumbnail;
          observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '100px 0px', // 100px Vorladebereich
      threshold: 0.1
    });

    // Observer starten
    setTimeout(() => {
      if (thumbnail.isConnected) {
        observer.observe(thumbnail);
        this.observers.push(observer);
      }
    }, 0);

    // Alles zusammenbauen
    item.appendChild(thumbnail);
    item.appendChild(name);
    item.appendChild(category);
    item.appendChild(favoriteBtn);

    return item;
  }

  /**
   * Behandelt den Start des Drag & Drop
   * @param {DragEvent} e - Das Drag-Event
   * @param {Object} obj - Das gezogene Objekt
   * @private
   */
  _handleDragStart(e, obj) {
    this.selectedObject = obj;
    e.dataTransfer.setData('text/plain', obj.id);
    e.dataTransfer.effectAllowed = 'copy';
    
    // Wechsle zum TerrainClickAddon für die Platzierung
    if (this.editor.addonManager) {
      this.editor.addonManager.activateAddon('terrain-click');
      const terrainAddon = this.editor.addonManager.getAddon('terrain-click');
      if (terrainAddon && terrainAddon.setSelectedObjectType) {
        terrainAddon.setSelectedObjectType(obj);
      }
    }
  }

  /**
   * Schaltet einen Favoriten um
   * @param {string} objectId - Die Objekt-ID
   * @private
   */
  _toggleFavorite(objectId) {
    if (this.favorites.has(objectId)) {
      this.favorites.delete(objectId);
    } else {
      this.favorites.add(objectId);
    }
    this._saveFavorites();
    this._populateCatalog(); // Aktualisiere die Anzeige
  }

  /**
   * Schaltet den Katalog ein/aus
   */
  toggleCatalog() {
    this.isCatalogOpen = !this.isCatalogOpen;
    if (this.catalogContainer) {
      this.catalogContainer.style.display = this.isCatalogOpen ? 'flex' : 'none';
    }
  }

  /**
   * Gibt die UI-Elemente für die Interaktions-Controls zurück
   * @returns {HTMLElement[]} Array von UI-Elementen
   */
  getUIElements() {
    if (!this.toggleButton) {
      this.toggleButton = document.createElement('button');
      this.toggleButton.textContent = '📦 Katalog';
      this.toggleButton.title = 'Objekt-Katalog öffnen/schließen';
      this.toggleButton.style.cssText = `
        padding: 4px 8px;
        border: 1px solid #4a5568;
        border-radius: 4px;
        background: #2d3748;
        color: white;
        cursor: pointer;
        font-size: 12px;
      `;
      
      this.toggleButton.addEventListener('click', () => {
        this.toggleCatalog();
      });
    }

    return [this.toggleButton];
  }

  /**
   * Serialisiert den Zustand für Persistenz
   * @returns {Object} Der serialisierte Zustand
   */
  serializeState() {
    return {
      ...super.serializeState(),
      isCatalogOpen: this.isCatalogOpen,
      favorites: [...this.favorites]
    };
  }

  /**
   * Deserialisiert den Zustand aus Persistenz
   * @param {Object} state - Der zu deserialisierende Zustand
   */
  deserializeState(state) {
    super.deserializeState(state);
    this.isCatalogOpen = state.isCatalogOpen || false;
    this.favorites = new Set(state.favorites || []);
    
    if (this.isCatalogOpen && this.catalogContainer) {
      this.catalogContainer.style.display = 'flex';
    }
  }
}