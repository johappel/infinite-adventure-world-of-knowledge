# YAML Player System

Das YAML Player System ermöglicht die Definition von 3D-Avataren direkt in YAML-Zone-Konfigurationen.

## Features

- **Konfigurierbares Aussehen**: Körperfarbe, Hautfarbe, Haarfarbe, Größe
- **Proportionen**: Kopfgröße, Rumpfhöhe, Arm- und Beinlänge
- **Stil-Optionen**: Frisur, Accessoires (Cape, Brille, etc.)
- **Animation System**: Idle, Lauf- und Renn-Animationen
- **Terrain-Anpassung**: Automatische Höhenanpassung an das Terrain

## YAML Konfiguration

```yaml
player:
  appearance:
    body_color: "#3366cc"     # Körperfarbe
    skin_color: "#f4c2a1"    # Hautfarbe  
    hair_color: "#8b4513"    # Haarfarbe
    height: 0.8              # Gesamthöhe des Avatars
    proportions:
      head_size: 0.3         # Relative Kopfgröße
      torso_height: 0.7      # Relative Rumpfhöhe
      arm_length: 0.5        # Relative Armlänge
      leg_length: 0.6        # Relative Beinlänge
  style:
    hair_type: "short"       # "short", "long", "spikes"
    accessories: ["cape"]    # "cape", "glasses"
  animations:
    idle:
      arm_swing: 0.1         # Armschwingungs-Intensität
      body_sway: 0.05        # Körper-Schwankung
    walking:
      arm_swing: 0.8         # Armschwingungs-Intensität beim Gehen
      leg_swing: 0.8         # Beinschwingungs-Intensität
      speed: 12              # Animationsgeschwindigkeit
    running:
      arm_swing: 1.2         # Intensivere Armbewegung beim Rennen
      leg_swing: 1.2         # Intensivere Beinbewegung
      speed: 18              # Schnellere Animation
```

## Standard-Konfiguration

Falls keine Player-Konfiguration in der YAML-Zone definiert ist, wird automatisch ein Standard-Avatar erstellt:

- Blaue Körperfarbe
- Kurze braune Haare
- Normale Proportionen
- Basis-Animationen

## Animation States

### Bewegungs-Animationen
- **Idle**: Subtile Körperbewegungen im Stand
- **Walking**: Koordinierte Arm- und Beinbewegungen
- **Running**: Intensivere, schnellere Bewegungen (aktiviert mit Shift+Bewegung)

### Transitions
- **Smooth Return**: Beim Stoppen kehrt der Avatar sanft zur neutralen Position zurück
- **State Management**: Drei-Phasen-System (Bewegung → Neutral → Idle)

## Terrain Integration

Der YAML Player nutzt das erweiterte Terrain-System:
- **Multi-Sampling**: Mehrere Höhen-Messpunkte für stabile Positionierung
- **Automatische Anpassung**: Kontinuierliche Höhenanpassung beim Bewegen
- **Kollisionsvermeidung**: Integration mit dem Kollisionssystem

## Technische Details

- **Avatar-Komponenten**: Kopf, Hals, Rumpf, Arme, Beine
- **Material System**: PBR-basierte Materialien mit konfigurierbaren Farben
- **Animation Loop**: 60fps-Update-Zyklus mit Delta-Time-basierter Animation
- **Memory Management**: Effiziente Mesh-Wiederverwendung

## Verwendung im Code

```javascript
// YAML Player wird automatisch erstellt bei Zone-Load
const result = buildZoneFromSpec(worldData);
const yamlPlayer = result.player; // YamlPlayer Instanz

// Animation Control
yamlPlayer.startAnimation('walking');
yamlPlayer.stopAnimation(); // Kehrt zu neutral/idle zurück
yamlPlayer.update(); // Update-Loop aufrufen
```
