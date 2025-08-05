# Animation System

Das Animation System bietet ein robustes Framework für Player-Animationen mit smooth Transitions und State Management.

## Animation States

### Core States
- **Idle**: Ruhezustand mit subtilen Bewegungen
- **Walking**: Standard-Bewegungsanimation
- **Running**: Intensivere Bewegung (Shift + Movement)
- **Neutral**: Übergangsstate für smooth Returns

## State Transitions

### Three-Phase System
```
Movement → Neutral → Idle
```

1. **Movement Phase**: Aktive Lauf-/Renn-Animation
2. **Neutral Phase**: Smooth Return zur Grundposition
3. **Idle Phase**: Subtile Idle-Bewegungen

### Transition Logic
```javascript
// Bewegung erkannt
if (isMoving) {
  const animationType = isRunning ? 'running' : 'walking';
  yamlPlayer.startAnimation(animationType);
} else {
  // Stop movement und starte Neutral-Return
  yamlPlayer.stopAnimation();
}
```

## Animation Configuration

### YAML Format
```yaml
animations:
  idle:
    arm_swing: 0.1      # Subtle arm movement
    body_sway: 0.05     # Gentle body sway
  walking:
    arm_swing: 0.8      # Coordinated arm swing
    leg_swing: 0.8      # Leg movement intensity
    speed: 12           # Animation speed (fps)
  running:
    arm_swing: 1.2      # More intense arm movement
    leg_swing: 1.2      # More intense leg movement  
    speed: 18           # Faster animation speed
```

### Parameter Ranges
- **arm_swing**: 0.0 - 2.0 (Intensität der Armbewegung)
- **leg_swing**: 0.0 - 2.0 (Intensität der Beinbewegung)
- **body_sway**: 0.0 - 0.2 (Körperschwankung im Idle)
- **speed**: 8 - 24 (Animationsgeschwindigkeit)

## Implementation Details

### Update Loop
```javascript
// 60fps Update-Zyklus
update() {
  const time = Date.now() * 0.001; // Zeit in Sekunden
  
  if (this.animationState === 'neutral') {
    this.smoothReturnToNeutral();
    return;
  }
  
  this.updateActiveAnimation(time);
}
```

### Smooth Return Algorithm
```javascript
smoothReturnToNeutral() {
  const returnSpeed = 0.8; // Schnelle Rückkehr
  const threshold = 0.02;  // Snap-Threshold
  
  // Interpoliere alle Rotationen zur neutralen Position
  this.interpolateToNeutral(returnSpeed);
  
  // Snap to neutral wenn nahe genug
  if (this.isNearNeutralPosition(threshold)) {
    this.setNeutralPosition();
    this.startAnimation('idle');
  }
}
```

### Movement Speed Synchronization
```javascript
// Movement Speed passt sich Animation an
const baseSpeed = 2.0;
const runningMultiplier = 1.8;
const currentSpeed = isRunning ? baseSpeed * runningMultiplier : baseSpeed;
```

## Animation Components

### Body Parts
- **Head**: Subtle head bobbing
- **Torso**: Main body rotation and sway
- **Arms**: Coordinated swinging motion
- **Legs**: Walking/running leg movement

### Rotation Calculations
```javascript
// Arm swing basiert auf Sinus-Wellen
const armSwing = Math.sin(time * speed) * intensity;
this.leftArm.rotation.x = armSwing;
this.rightArm.rotation.x = -armSwing;
```

## Key Detection Integration

### InputManager Integration
```javascript
// Shift-Key für Running Detection
const isRunning = inputManager.keys.has('shift') || inputManager.keys.has('Shift');
```

### Movement State Detection
```javascript
// Player.move() returnt Movement State
const isMoving = this.player.move(dt, keys, mouseDown, yaw, rotationCallback);
```

## Performance Optimizations

### Animation Caching
- Berechnete Rotationen werden gecacht
- Vermeidung redundanter Sinus-Berechnungen

### State Management
- Minimale State Changes
- Efficient Transition Detection

### Update Frequency
- Delta-time basierte Updates
- Consistent Animation unabhängig von Framerate

## Debugging

### Animation State Logging
```javascript
console.log('Animation State:', this.animationState);
console.log('Current Animation:', this.currentAnimation);
console.log('Return Progress:', this.neutralReturnProgress);
```

### Visual Debugging
- Animation State Display in UI
- Rotation Value Overlays
- Transition Timeline

## Best Practices

### Configuration
1. **Idle Animations**: Subtle (0.05 - 0.15 intensity)
2. **Walking**: Moderate (0.6 - 1.0 intensity)
3. **Running**: Intense (1.0 - 1.5 intensity)
4. **Speed Sync**: Animation speed sollte Movement speed matchen

### Implementation
1. **State Checks**: Immer current state prüfen before changes
2. **Smooth Transitions**: Neutral phase für clean transitions
3. **Error Handling**: Fallbacks für failed animations
4. **Performance**: Update nur wenn State changes

### Troubleshooting
- **Jerky Transitions**: Neutral phase implementieren
- **Speed Mismatch**: Animation speed mit movement speed synchronisieren
- **Stuck Animations**: State reset mechanism
- **Performance Issues**: Update frequency optimieren
