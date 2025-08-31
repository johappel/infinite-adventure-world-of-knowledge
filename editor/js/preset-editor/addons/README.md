# ObjectCatalogAddon

Ein visueller Objektkatalog für den PresetEditor, der das Hinzufügen von 3D-Objekten per Drag & Drop ermöglicht.

## Übersicht

Das `ObjectCatalogAddon` bietet eine benutzerfreundliche Oberfläche zum Durchsuchen, Auswählen und Platzieren von 3D-Objekten in der Welt. Es erweitert die Funktionalität des PresetEditors um eine visuelle Objektbibliothek mit Kategorien, Favoriten und Suchfunktion.

## Features

- **Visuelle Objektbibliothek**: Rasteransicht mit Thumbnails und Metadaten
- **Kategorien**: Organisierte Objektgruppen (Gebäude, Vegetation, Infrastruktur, Dekoration)
- **Drag & Drop**: Intuitive Objektplatzierung durch Ziehen aus dem Katalog
- **Favoriten**: Häufig verwendete Objekte markieren und schnell finden
- **Suche & Filter**: Volltextsuche und Kategoriefilterung
- **Responsive Design**: Anpassbare UI für verschiedene Bildschirmgrößen
- **Persistenz**: Automatische Speicherung von Benutzereinstellungen

## Installation

Das Addon ist bereits im `AddonManager` registriert und wird automatisch geladen. Es erscheint als Option "📦 Objekt Katalog" in den Interaktions-Controls.

## Verwendung

1. **Katalog öffnen**: Wähle "📦 Objekt Katalog" aus dem Tool-Dropdown
2. **Objekt auswählen**: Klicke auf den Toggle-Button oder verwende das Dropdown
3. **Durchsuchen**: Nutze die Suchleiste und Filter für spezifische Objekte
4. **Platzieren**: Ziehe ein Objekt per Drag & Drop in die 3D-Vorschau
5. **Favorisieren**: Klicke auf den Stern, um häufig verwendete Objekte zu markieren

## Objekt-Metadaten

Jedes Objekt verfügt über folgende Metadaten:

```javascript
{
  id: "unique-identifier",
  name: "Anzeigename",
  category: "buildings|vegetation|infrastructure|decoration",
  icon: "emoji-icon",
  yamlTemplate: "YAML-Konfiguration",
  tags: ["tag1", "tag2"]
}
```

## API

### Methoden

- `activate()`: Aktiviert das Addon und zeigt die UI
- `deactivate()`: Deaktiviert das Addon und versteckt die UI
- `getUIElements()`: Gibt UI-Elemente für die Toolbar zurück
- `onTerrainClick(hitInfo)`: Verarbeitet Terrain-Clicks für Objektplatzierung
- `serializeState()`: Serialisiert den Addon-Zustand
- `deserializeState(state)`: Deserialisiert einen gespeicherten Zustand

### Events

- `objectSelected`: Wird ausgelöst, wenn ein Objekt ausgewählt wird
- `objectPlaced`: Wird ausgelöst, wenn ein Objekt platziert wurde
- `favoriteToggled`: Wird ausgelöst, wenn ein Favorit geändert wird

## Konfiguration

### Objekt-Definitionen

Objekte werden im `OBJECT_CATALOG` Array definiert. Jedes Objekt benötigt:

- **id**: Eindeutiger Identifier (konsistent mit Preset-Namen)
- **name**: Anzeigename für die UI
- **category**: Kategorie für die Filterung
- **icon**: Emoji oder Bild-URL für die Visualisierung
- **yamlTemplate**: YAML-Template für die Objekt-Erstellung

### Kategorien

- `buildings`: Gebäude und Strukturen
- `vegetation`: Bäume, Pflanzen, Natur
- `infrastructure`: Wege, Brücken, technische Objekte  
- `decoration`: Dekorative Elemente und Details

## Beispiele

### Objekt hinzufügen

```javascript
const newObject = {
  id: "custom-object",
  name: "Mein Objekt",
  category: "decoration",
  icon: "⭐",
  yamlTemplate: `objects:
  - type: mesh
    mesh: custom.obj
    position: {x: 0, y: 0, z: 0}`
};
```

### Event-Handling

```javascript
window.addEventListener('objectPlaced', (event) => {
  console.log('Objekt platziert:', event.detail);
});
```

## Entwicklung

### Neue Objekte hinzufügen

1. Erweitere den `OBJECT_CATALOG` Array in `object-catalog-addon.js`
2. Stelle sicher, dass die YAML-Templates korrekt sind
3. Teste die Objektplatzierung in verschiedenen Szenarien

### UI-Anpassungen

Das CSS-Styling befindet sich in `object-catalog.css`. Die UI verwendet CSS-Grid für das responsive Layout.

### Performance-Optimierung

- Lazy Loading für Thumbnails
- Virtuelles Scrolling für große Objektmengen
- Debouncing für Suchanfragen

## Troubleshooting

### Objekt wird nicht angezeigt
- Prüfe die YAML-Syntax im Template
- Stelle sicher, dass die Mesh-Dateien verfügbar sind

### Katalog öffnet nicht
- Überprüfe die Addon-Registrierung in `addons/index.js`
- Prüfe die Browser-Konsole auf Fehler

### Drag & Drop funktioniert nicht
- Stelle sicher, dass der Canvas-Container korrekt referenziert wird

## Lizenz

Teil des PresetEditor Projekts. Siehe Hauptprojekt-Lizenz für Details.