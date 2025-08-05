# Terrain System

Das Terrain System bietet erweiterte Höhenberechnung und Multi-Sampling für stabile Player-Positionierung auf hügeligem Terrain.

## Features

- **Multi-Sampling**: Mehrere Messpunkte um den Player für stabile Höhenberechnung
- **Gewichtetes Averaging**: Zentrum hat höchstes Gewicht, Ränder niedrigeres
- **Bilineare Interpolation**: Smooth Übergänge zwischen Terrain-Punkten
- **Fallback System**: Robuste Einzelpunkt-Messung als Backup

## Terrain Types

### Flat Terrain
```yaml
terrain:
  type: "flat"
  size: [50, 50]
  color: "#4CAF50"
```

### Hills Terrain
```yaml
terrain:
  type: "hills"
  size: [60, 60]
  amplitude: 5.0        # Hügelhöhe
  flat_radius: 3        # Flacher Bereich um Zentrum
  blend_radius: 12      # Übergangsbereich
```

### Path System
```yaml
terrain:
  paths:
    - points:
        - [-25, 0, -20]
        - [0, 0, 0]
        - [25, 0, 20]
      smooth: true
  path_options:
    pathWidth: 12
```

## Multi-Sampling Algorithm

### Sample Pattern
```
    N
  NW ╬ NE
W ← ● → E    (● = Player Position)
  SW ╬ SE
    S
```

Das System nimmt 9 Samples in einem Radius von 0.3 Einheiten um den Player:
1. **Center** (Gewicht: 4.0)
2. **Cardinal Directions** (Gewicht: 2.0) - N, S, E, W
3. **Diagonal Corners** (Gewicht: 1.0) - NE, NW, SE, SW

### Weighted Average
```javascript
// Gewichteter Durchschnitt für smooth Höhe
finalHeight = weightedSum / totalWeight;
```

## Höhenberechnung API

### `getTerrainHeightAt(x, z, useSampling = true)`

```javascript
// Mit Multi-Sampling (empfohlen für hügeliges Terrain)
const height = player.getTerrainHeightAt(x, z, true);

// Einzelpunkt-Sampling (schneller, für flaches Terrain)
const height = player.getTerrainHeightAt(x, z, false);
```

### Return Values
- **Number**: Terrain-Höhe an der Position
- **null**: Keine gültige Höhe gefunden (außerhalb Terrain)

## Koordinaten-System

### World zu Terrain Mapping
```
World Coordinates:    Terrain Coordinates:
Player (0,0,0)   →   Terrain Center
Player (-25,0,25) →  Terrain (0,50) [für 50x50 Terrain]
```

### Bilineare Interpolation
Für Positionen zwischen Terrain-Grid-Punkten:
```javascript
// Finde 4 nächste Grid-Punkte
// Interpoliere X-Richtung zwischen den Paaren
// Interpoliere Y-Richtung zwischen den Ergebnissen
```

## Performance Optimierungen

### Sample Caching
- Vermeidung redundanter Berechnungen
- Effiziente Gewichtung

### Boundary Checks
- Schnelle Außerhalb-Terrain-Erkennung
- Frühe Returns für ungültige Koordinaten

### Fallback Strategy
```javascript
if (multiSampling.failed) {
  return singlePointSampling();
}
```

## Integration mit Player System

### Kontinuierliche Updates
```javascript
// Im Player move() Loop
const terrainHeight = this.getTerrainHeightAt(newX, newZ, true);
if (terrainHeight !== null) {
  this.marker.position.y = terrainHeight + this.heightOffset;
}
```

### Smooth Transitions
- Delta-time basierte Interpolation
- Verhindert abrupte Höhensprünge
- Stabile Animation bei Terrain-Übergängen

## Debugging

### Console Output
```javascript
// Aktiviere Debug-Modus
console.log('Terrain height at', x, z, ':', height);
console.log('Valid samples:', validHeights.length);
```

### Visual Debugging
- Grid-Visualisierung im Development Mode
- Sample-Point Markers
- Height-Map Overlay

## Best Practices

1. **Hügeliges Terrain**: Immer Multi-Sampling verwenden
2. **Flaches Terrain**: Einzelpunkt-Sampling für Performance
3. **Sample Radius**: 0.3 ist optimal für Player-Größe
4. **Update Frequency**: Einmal pro Frame im Movement Loop
5. **Error Handling**: Null-Checks für robuste Implementation
