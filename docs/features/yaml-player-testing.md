# YAML Player System - Test Guide

Das YAML Player System ersetzt den simplen blauen Kegel-Marker durch einen vollständig konfigurierbaren 3D-Avatar.

## ✅ Implementiert

### 1. **Core System**
- ✅ `YamlPlayer` Klasse mit vollständigem Avatar-Building
- ✅ `buildPlayer()` Funktion in builders.js
- ✅ `resolvePlayerConfig()` in resolve.js
- ✅ Integration in `buildZoneFromSpec()`

### 2. **WisdomWorld Integration**
- ✅ Automatischer Austausch von `playerMarker` → `yamlPlayer.avatar`
- ✅ Kamera-System updated für neuen Player
- ✅ Bewegungs-System angepasst
- ✅ Fallback zu Standard-Marker wenn kein Player-Config

### 3. **Animation System**
- ✅ Idle-Animation (Armschwingen, Körperschaukeln)
- ✅ Walking-Animation basierend auf Bewegung
- ✅ Konfigurierbarer Animations-Speed
- ✅ Player dreht sich in Bewegungsrichtung

### 4. **YAML Schema Support**
```yaml
player:
  appearance:
    body_color: "#ff6b6b"
    skin_color: "#f4c2a1"  
    hair_color: "#8b4513"
    height: 1.2
    proportions:
      head_size: 0.45
      torso_height: 1.1
      arm_length: 0.8
      leg_length: 1.0
  
  style:
    hair_type: "spikes"     # spikes, hat, long, short, bald
    clothing: "basic"
    accessories: ["cape"]   # cape, glasses, weapon
  
  animations:
    idle:
      arm_swing: 0.15
      body_sway: 0.08
    walking:
      arm_swing: 1.0
      leg_swing: 0.9
      speed: 12
```

## 🧪 Test Instructions

### Test 1: Preset Editor
1. Öffne `preset-editor.html`
2. Wähle **"YAML Player Test"** Template
3. **Erwartung**: Siehst du einen rötlichen Avatar mit Stachel-Haar und Umhang?
4. **Erwartung**: Avatar animiert beim "Rendern" (sollte idle Animation zeigen)

### Test 2: Hauptanwendung
```javascript
// In Browser-Konsole von index.html:
yamlHelpers.loadZone('worlds/zone-player-test.yaml')
```
**Erwartung**: 
- Blauer Kegel verschwindet
- Roter Avatar mit Spikes und Cape erscheint
- Avatar schwebt über Terrain
- Bei Bewegung (W/S) animiert der Avatar

### Test 3: Fallback-Test
```javascript
// Lade Zone ohne Player-Config:
yamlHelpers.loadZone('worlds/zone-start.yaml')
```
**Erwartung**: System fällt zurück auf blauen Kegel-Marker

### Test 4: Live-Konfiguration
```javascript
// Ändere Player-Aussehen zur Laufzeit:
yamlHelpers.loadZone('worlds/zone-player-test.yaml')
// Dann editiere zone-player-test.yaml und lade neu
```

## 🎨 Player Customization Options

### Hair Types
- `"spikes"` - Stachel-Frisur (3 Spikes)
- `"hat"` - Zylinder-Hut (Standard)
- `"long"` - Langes Haar
- `"short"` - Kurze Kappe
- `"bald"` - Glatze

### Accessories
- `"cape"` - Roter Umhang
- `"glasses"` - Brille
- `"weapon"` - Schwert (geplant)

### Proportions
- `head_size`: 0.2 - 0.6 (Standard: 0.4)
- `torso_height`: 0.8 - 1.5 (Standard: 1.2)
- `arm_length`: 0.5 - 1.2 (Standard: 0.8)
- `leg_length`: 0.8 - 1.3 (Standard: 1.0)

### Animation Tuning
- `arm_swing`: 0.0 - 2.0 (Intensität)
- `leg_swing`: 0.0 - 2.0 (nur walking)
- `body_sway`: 0.0 - 0.2 (nur idle)
- `speed`: 5 - 20 (Animation-Geschwindigkeit)

## 🔧 Advanced Examples

### Minimal Player
```yaml
player:
  appearance:
    body_color: "#00ff00"
  style:
    hair_type: "bald"
```

### Fantasy Character
```yaml
player:
  appearance:
    body_color: "#8b4513"
    skin_color: "#90ee90"
    hair_color: "#ffffff"
    height: 0.8
    proportions:
      head_size: 0.5
  style:
    hair_type: "long"
    accessories: ["cape", "glasses"]
  animations:
    walking:
      arm_swing: 0.5
      speed: 8
```

### Energetic Character
```yaml
player:
  appearance:
    body_color: "#ff1493"
    height: 1.4
  style:
    hair_type: "spikes"
  animations:
    idle:
      arm_swing: 0.3
      body_sway: 0.15
    walking:
      arm_swing: 1.5
      leg_swing: 1.3
      speed: 15
```

## 🐛 Troubleshooting

### Player nicht sichtbar?
- Check Browser-Konsole für Fehler
- Verify YamlPlayer import in builders.js
- Ensure `player` section in YAML ist korrekt eingerückt

### Animation funktioniert nicht?
- Check das Player movement system in player.js
- Verify yamlPlayer.update() wird aufgerufen
- Test mit anderen Animations-Werten

### Kamera folgt nicht?
- Check wisdom-world.js updatePlayerFromZone()
- Verify this.currentPlayerObject wurde korrekt gesetzt
- Check ThirdPersonCamera.playerMarker assignment

## 🚀 Future Enhancements

- **Clothing System**: Verschiedene Kleidung-Styles
- **Equipment System**: Sichtbare Waffen/Tools
- **Expression System**: Gesichtsausdrücke
- **Color Picker UI**: Visueller Editor für Farben
- **Animation Presets**: Vordefinierte Charakter-Typen
- **Import/Export**: Player-Konfiguration teilen

Das System ist vollständig modular und kann einfach erweitert werden ohne Breaking Changes.
