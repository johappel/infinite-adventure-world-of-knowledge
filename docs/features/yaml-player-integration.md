# YAML Player Integration Konzept

Das Ziel ist es, den simplen `playerMarker` (blauer Kegel) durch einen vollständig YAML-konfigurierbaren 3D-Avatar zu ersetzen, der auf dem bestehenden `player.html` Konzept basiert.

## 1. YAML Player Schema

```yaml
# Player-Konfiguration in Zone-YAML
player:
  appearance:
    body_color: "#3366cc"      # Körperfarbe  
    skin_color: "#99ccff"      # Hautfarbe
    hair_color: "#222222"      # Haarfarbe
    height: 1.2                # Skalierung (Standard: 1.0)
    proportions:
      head_size: 0.4           # Kopfgröße relativ
      torso_height: 1.2        # Rumpfhöhe
      arm_length: 0.8          # Armlänge  
      leg_length: 1.0          # Beinlänge
  
  style:
    hair_type: "hat"           # spikes, bald, hat, long, short
    clothing: "basic"          # basic, armor, robe, casual
    accessories: ["cape"]      # cape, glasses, weapon
  
  animations:
    idle:
      arm_swing: 0.1           # Armschwin gen im Idle
      body_sway: 0.05          # Körperschaukeln
    walking:
      arm_swing: 0.8           # Armschwingen beim Gehen
      leg_swing: 0.8           # Beinschwingen
      speed: 10                # Animationsgeschwindigkeit
  
  position: [0, 0, 0]          # Startposition (optional)
  rotation: 0                  # Startrotation (optional)
```

## 2. Integration Points

### A) World Generation (`js/world-generation/index.js`)
- Neue `buildPlayer()` Funktion ähnlich `buildPersona()`
- Prüft ob Zone `player` Konfiguration hat
- Erstellt YamlPlayer anstatt simplen Marker

### B) WisdomWorld (`js/wisdom-world.js`) 
- Ersetzt `this.playerMarker` durch `this.yamlPlayer`
- Kamera-System referenziert neuen Player
- Player-Movement System anpassen

### C) Player Class (`js/core/player.js`)
- Erweitern um YamlPlayer Support
- Animation Triggers für Bewegung
- Terrain-Following für Avatar

## 3. Implementierung Steps

### Step 1: Schema & Defaults
```javascript
// In resolve.js - Player config resolver  
export function resolvePlayerConfig(cfg){
  const defaults = {
    appearance: { /* ... */ },
    style: { /* ... */ },
    animations: { /* ... */ }
  };
  return deepMerge(defaults, cfg || {});
}
```

### Step 2: Builder Integration
```javascript
// In builders.js - Player builder
export function buildPlayer(cfg, index) {
  if (!cfg) return null; // Fallback zu Standard-Marker
  
  const playerConfig = resolvePlayerConfig(cfg);
  const yamlPlayer = new YamlPlayer(playerConfig);
  
  // Position und Rotation
  if (cfg.position) yamlPlayer.avatar.position.set(...cfg.position);
  if (cfg.rotation) yamlPlayer.avatar.rotation.y = cfg.rotation;
  
  return yamlPlayer;
}
```

### Step 3: Zone Integration
```javascript
// In index.js - Zone building
export function buildZoneFromSpec(worldData, options={}){
  // ... existing code ...
  
  // Player (replaces simple marker if configured)
  let player = null;
  if (spec.player) {
    player = buildPlayer(spec.player, 'main');
    if (player) {
      group.add(player.avatar);
    }
  }
  
  return { group, personas, portals, objects, player, spec };
}
```

### Step 4: WisdomWorld Integration 
```javascript
// In wisdom-world.js
loadZone(zoneSpec) {
  const result = buildZoneFromSpec(zoneSpec);
  
  // Replace playerMarker with yamlPlayer if available
  if (result.player) {
    this.scene.remove(this.playerMarker);
    this.currentPlayerObject = result.player.avatar;
    
    // Update camera to track new player
    this.thirdPersonCamera.playerMarker = this.currentPlayerObject;
  } else {
    // Fallback to standard marker
    this.currentPlayerObject = this.playerMarker;
  }
}
```

## 4. Animation System

### Idle Animation
- Sanftes Armschaukeln
- Leichtes Körperwiegen  
- Atmungsanimation

### Movement Animation
- Armschwingen synchron zu Bewegung
- Beinschwingen/Laufanimation
- Geschwindigkeitsabhängige Intensität

### Implementation
```javascript
// In YamlPlayer class
update(deltaTime, isMoving, movementSpeed) {
  if (isMoving) {
    this.playWalkingAnimation(deltaTime, movementSpeed);
  } else {
    this.playIdleAnimation(deltaTime);
  }
}

// Player class triggers
move(dt, keys, isRightMouseDown, yaw, onRotationChange) {
  // ... movement logic ...
  
  // Trigger player animation
  if (this.yamlPlayer) {
    const isMoving = moveDir !== 0;
    this.yamlPlayer.update(dt, isMoving, this.speed);
    
    // Rotate player to face movement direction
    this.yamlPlayer.avatar.rotation.y = yaw;
  }
}
```

## 5. Features

### ✅ Vollständige YAML-Konfiguration
- Aussehen, Proportionen, Farben
- Frisuren und Accessoires  
- Animationsparameter

### ✅ Modular & Erweiterbar
- Neue Frisuren-Typen einfach hinzufügbar
- Kleidung und Accessoires erweiterbar
- Animation-System flexibel

### ✅ Rückwärtskompatibel
- Zonen ohne `player` Config nutzen Standard-Marker
- Graduelle Migration möglich
- Kein Breaking Change für bestehende Welten

### ✅ Performance-Optimiert  
- Wiederverwendung von Geometrien
- Effiziente Materialien
- Optimierte Animationen

## 6. Beispiel YAML

```yaml
# Minimale Player-Config (nutzt Defaults)
player:
  appearance:
    body_color: "#ff6b6b"
    height: 1.3
  style:
    hair_type: "spikes"

# Vollständige Player-Config
player:
  appearance:
    body_color: "#2d5aa0"
    skin_color: "#f4c2a1" 
    hair_color: "#8b4513"
    height: 0.9
    proportions:
      head_size: 0.5
      torso_height: 1.0
  style:
    hair_type: "long"
    clothing: "armor"
    accessories: ["cape", "glasses"]
  animations:
    walking:
      arm_swing: 1.2
      leg_swing: 1.0
      speed: 12
```

## 7. Benefits

1. **Personalisierung**: Jede Zone kann einen einzigartigen Player haben
2. **Immersion**: 3D-Avatar statt abstrakter Marker erhöht Immersion  
3. **Flexibilität**: YAML-Config ermöglicht einfache Anpassungen
4. **Erweiterbarkeit**: System für neue Features vorbereitet
5. **Konsistenz**: Nutzt bestehende Architektur (Presets, Builders, etc.)


