# Collections Kollisionserkennung

Das Collections-System wurde um ein modulares Kollisionssystem erweitert, das verhindert, dass automatisch generierte Objekte mit NPCs oder anderen Objekten überlappen.

## Features

- **Automatische Kollisionserkennung**: Verhindert Überlappungen zwischen Collections-Objekten
- **NPC-Pufferabstand**: Hält automatisch Abstand zu NPCs (standardmäßig 3 Einheiten)
- **Objekt-Pufferabstand**: Verhindert Überlappung zwischen Objekten (standardmäßig 1 Einheit)
- **Modularer Aufbau**: Funktioniert sowohl in `index.html` als auch `preset-editor.html`
- **Vanilla ES6**: Keine externen Abhängigkeiten

## Verwendung in YAML

### Basis-Collections mit Kollisionserkennung
```yaml
objects:
  - collections: ["village", "forest_objects"]
    count: 15
    enable_collision_detection: true  # Standard: true
    npc_buffer_distance: 4           # Abstand zu NPCs (Standard: 3)
    object_buffer_distance: 2        # Abstand zwischen Objekten (Standard: 1)
```

### Collections ohne Kollisionserkennung (Legacy-Modus)
```yaml
objects:
  - collections: ["trees"]
    count: 20
    enable_collision_detection: false  # Deaktiviert Kollisionserkennung
```

### Kombiniert mit manuellen Objekten
```yaml
objects:
  # Collections mit Kollisionserkennung
  - collections: ["village"]
    count: 10
    enable_collision_detection: true
    
  # Manuell platzierte Objekte (ignorieren Kollisionserkennung)
  - preset: "well"
    position: [0, 0, 0]
    enable_collision_detection: false
```

## Reihenfolge wichtig

Das System platziert Entitäten in folgender Reihenfolge:

1. **NPCs/Personas** - werden zuerst platziert
2. **Collections-Objekte** - berücksichtigen NPCs und bereits platzierte Objekte
3. **Manuelle Objekte** - werden ohne Kollisionsprüfung platziert

## Technische Details

### Bounding Box Berechnung
Das System berechnet automatisch Bounding Boxes basierend auf Objekt-/NPC-Typ:
- **NPCs**: 1x1 Einheiten
- **Häuser**: 6x8 bis 8x6 Einheiten  
- **Bäume**: 3x3 Einheiten
- **Kleine Objekte**: 1x1 bis 2x2 Einheiten

### Skalierung berücksichtigt
Objekt-Scale wird in die Kollisionsberechnung einbezogen:
```yaml
objects:
  - preset: "tree_simple"
    scale: [2, 2, 2]  # Verdoppelte Kollisionsgröße
```

### Seeded Placement
Die Kollisionserkennung verwendet deterministische Zufallszahlen basierend auf:
- Zone-ID
- Object-Index  
- Seed-Parameter

## Beispiel: Dorf mit Kollisionserkennung

```yaml
name: "Sicheres Dorf"
terrain:
  preset: "grass_flat"
  size: [50, 50]

personas:
  - preset: "npc_guardian"
    position: [0, 0, 0]
  - preset: "npc_plain" 
    position: [10, 0, 10]

objects:
  # Village Buildings mit großem NPC-Abstand
  - collections: ["village"]
    count: 8
    npc_buffer_distance: 5
    object_buffer_distance: 3
    
  # Dekorative Objekte mit kleinerem Abstand
  - collections: ["forest_objects"]
    count: 15  
    npc_buffer_distance: 2
    object_buffer_distance: 1
```

## Modulare Architektur

### Collision Detection Module (`js/utils/collision-detection.js`)
```javascript
import { applySafePlacement, checkCollision, getEntityBounds } from '../utils/collision-detection.js';
```

**Hauptfunktionen:**
- `getEntityBounds(entity)` - Berechnet Bounding Box
- `checkCollision(entity, existingEntities, options)` - Prüft Kollisionen
- `findNonCollidingPosition(entity, existingEntities, options)` - Findet sichere Position
- `applySafePlacement(entities, existingEntities, options)` - Platziert mehrere Entitäten sicher

### Integration in Collections (`js/presets/index.js`)
Die `generateFromCollections` Funktion wurde erweitert um:
- `existingEntities` Parameter für bereits platzierte NPCs/Objekte
- `enableCollisionDetection` Flag zum An-/Ausschalten
- Buffer-Distance Parameter für NPCs und Objekte

## Testing

### Preset Editor Test
1. Öffne `preset-editor.html`
2. Wähle "Kollisions-Test" Template
3. Beobachte wie Collections automatisch Abstand zu NPCs halten

### Vollständiger Test
1. Öffne `index.html`
2. Lade `zone-collision-test.yaml`
3. Überprüfe dass keine Objekte mit NPCs überlappen

## Performance

- **Deterministische Platzierung**: Gleiche Seeds erzeugen identische Layouts
- **Intelligente Bounding Boxes**: Realistische Größen basierend auf Objekt-Typ
- **Effiziente Algorithmen**: O(n²) Kollisionsprüfung mit frühem Ausstieg
- **Konfigurierbare Versuche**: `maxAttempts` Parameter verhindert Endlosschleifen

## Compatibility

- ✅ **index.html**: Vollständige Integration
- ✅ **preset-editor.html**: Live-Preview mit Kollisionserkennung  
- ✅ **Vanilla ES6**: Keine externen Dependencies
- ✅ **Legacy Support**: Kann deaktiviert werden für Rückwärtskompatibilität

Das System ist vollständig rückwärtskompatibel - bestehende YAML-Dateien funktionieren unverändert, mit aktivierter Kollisionserkennung als Standard für neue Collections.
