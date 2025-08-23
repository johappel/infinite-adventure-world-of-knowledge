# PresetEditor Addon System

## 📖 Übersicht

Das Addon-System ermöglicht die Erweiterung des PresetEditors mit verschiedenen Interaktionsmodi für die YAML-Bearbeitung. Jedes Addon bietet spezifische Funktionalitäten wie Objekt-Platzierung, Pfad-Erstellung oder Drag & Drop.

## 🏗️ Architektur

### Basis-Interface
```javascript
import { InteractionAddon } from './base-addon.js';

class MyAddon extends InteractionAddon {
  constructor(editor) {
    super(editor);
    this.name = 'Mein Addon';
    this.description = 'Beschreibung';
    this.icon = '⚡';
  }
  
  async activate() { /* Aktivierungslogik */ }
  async onTerrainClick(hitInfo) { /* Click-Handler */ }
}
```

### Addon-Registrierung
Addons werden im `AddonManager` registriert und können dynamisch aktiviert/deaktiviert werden.

## 📦 Verfügbare Addons

### Terrain-Click Addon
- **ID**: `terrain-click`
- **Funktionalität**: Objekt-Platzierung und Pfad-Erstellung via Terrain-Klicks
- **UI-Integration**: Standardmäßig aktiviert

## 🚀 Eigene Addons erstellen

### 1. Addon-Klasse erstellen
```javascript
// my-addon.js
import { InteractionAddon } from './base-addon.js';

export class MyAddon extends InteractionAddon {
  constructor(editor) {
    super(editor);
    this.name = 'Mein Custom Addon';
    this.description = 'Meine beschreibung';
  }
  
  async activate() {
    await super.activate();
    // Custom Aktivierungslogik
  }
  
  async onTerrainClick(hitInfo) {
    // Custom Click-Handler
  }
}
```

### 2. Addon registrieren
```javascript
// In index.js
import { MyAddon } from './my-addon.js';

// Zur bestehenden Registrierung hinzufügen
this.registerAddon('my-addon', new MyAddon(this.editor));
```

### 3. UI-Integration
Das Addon wird automatisch im Addon-Dropdown der Interaktions-Controls angezeigt.

## 🔧 API-Referenz

### InteractionAddon Basis-Klasse

#### Properties
- `name`: Anzeigename des Addons
- `description`: Beschreibung für UI
- `icon`: Optionales Icon (Emoji)
- `isActive`: Aktivierungsstatus

#### Methods
- `activate()`: Wird bei Aktivierung aufgerufen
- `deactivate()`: Wird bei Deaktivierung aufgerufen  
- `onTerrainClick(hitInfo)`: Terrain-Click Handler
- `onMouseMove(event)`: Mouse-Move Handler
- `onKeyPress(event)`: Key-Press Handler
- `getUIElements()`: Gibt UI-Elemente zurück
- `serializeState()`: Serialisiert den Zustand
- `deserializeState(state)`: Deserialisiert Zustand

### AddonManager

#### Methods
- `registerAddon(id, addon)`: Registriert ein Addon
- `activateAddon(id)`: Aktiviert ein Addon
- `deactivateAddon()`: Deaktiviert aktuelles Addon
- `getAllAddons()`: Gibt alle Addons zurück
- `getActiveAddon()`: Gibt aktives Addon zurück

## 🎨 UI-Integration

Addons werden automatisch in die Interaktions-Controls integriert:
1. Dropdown-Menü für Addon-Auswahl
2. Automatische Aktivierung/Deaktivierung
3. Event-Delegation an aktives Addon

## 🔄 Event-Flow

```
ThreeJSManager → Core._handleTerrainClick() → AddonManager.handleTerrainClick() → Aktives Addon.onTerrainClick()
```

## 💾 Zustands-Persistenz

Addon-Zustände werden automatisch serialisiert und können für Session-Persistenz genutzt werden.

## 🧪 Testing

```javascript
// Addon testen
const addon = new MyAddon(editor);
await addon.activate();
await addon.onTerrainClick(testHitInfo);
await addon.deactivate();
```

## 📝 Best Practices

1. **Klar abgegrenzte Funktionalität**: Jedes Addon sollte eine spezifische Aufgabe haben
2. **Fehlerbehandlung**: Immer try/catch in async Methoden verwenden
3. **Zustandslosigkeit**: Wo möglich, Zustand externalisieren
4. **UI-Konsistenz**: An bestehendes Design anpassen