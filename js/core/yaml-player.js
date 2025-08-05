// YAML Player System - Konfigurierbarer Avatar 
// Ersetzt den simplen playerMarker mit einem vollwertigen, YAML-definierten Avatar

import * as THREE from 'three';

export class YamlPlayer {
  constructor(playerConfig) {
    this.config = this.mergeWithDefaults(playerConfig);
    this.avatar = new THREE.Group();
    this.avatar.name = 'YamlPlayer';
    this.bodyParts = {};
    this.animations = {};
    this.clock = new THREE.Clock();
    this.isAnimating = false;
    
    this.buildAvatar();
    this.setupAnimations();
  }

  mergeWithDefaults(config) {
    const defaults = {
      appearance: {
        body_color: '#3366cc',
        skin_color: '#99ccff', 
        hair_color: '#222222',
        height: 0.5,  // Much smaller height to prevent sinking
        proportions: {
          head_size: 0.25,     // Smaller head
          torso_height: 0.7,   // Shorter torso
          arm_length: 0.5,     // Shorter arms
          leg_length: 0.6      // Shorter legs
        }
      },
      style: {
        hair_type: 'short', // Changed from 'hat' to 'short'
        clothing: 'basic', 
        accessories: []
      },
      animations: {
        idle: { arm_swing: 0.1, body_sway: 0.05 },
        walking: { arm_swing: 0.8, leg_swing: 0.8, speed: 10 },
        running: { arm_swing: 1.2, leg_swing: 1.2, speed: 15 }
      },
      position: [0, 0, 0],
      rotation: 0
    };

    return this.deepMerge(defaults, config || {});
  }

  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  buildAvatar() {
    const { appearance, style } = this.config;
    const scale = appearance.height;
    
    // Materials
    this.materials = {
      body: new THREE.MeshStandardMaterial({ 
        color: appearance.body_color, 
        metalness: 0.1, 
        roughness: 0.7 
      }),
      skin: new THREE.MeshStandardMaterial({ 
        color: appearance.skin_color, 
        metalness: 0.1, 
        roughness: 0.6 
      }),
      hair: new THREE.MeshStandardMaterial({ 
        color: appearance.hair_color, 
        roughness: 0.8 
      }),
      clothing: new THREE.MeshStandardMaterial({ 
        color: this.getClothingColor(style.clothing), 
        roughness: 0.7 
      })
    };

    // Build body parts
    this.buildTorso(scale);
    this.buildHead(scale);
    this.buildHair(style.hair_type, scale);
    this.buildArms(scale);
    this.buildLegs(scale);
    this.buildAccessories(style.accessories, scale);

    // Set initial position and rotation
    const [x, y, z] = this.config.position;
    // Set avatar at basic ground level - terrain following handled by Player class
    this.avatar.position.set(x, y, z);
    this.avatar.rotation.y = this.config.rotation;
  }

  buildTorso(scale) {
    const props = this.config.appearance.proportions;
    
    // Pelvis
    const pelvisGeom = new THREE.CylinderGeometry(0.3 * scale, 0.45 * scale, 0.5 * scale, 16);
    this.bodyParts.pelvis = new THREE.Mesh(pelvisGeom, this.materials.body);
    this.avatar.add(this.bodyParts.pelvis);

    // Chest
    const chestGeom = new THREE.CylinderGeometry(0.6 * scale, 0.35 * scale, props.torso_height * scale, 16);
    this.bodyParts.chest = new THREE.Mesh(chestGeom, this.materials.body);
    this.bodyParts.chest.position.y = 0.85 * scale;
    this.avatar.add(this.bodyParts.chest);

    // Neck
    const neckGeom = new THREE.CylinderGeometry(0.15 * scale, 0.15 * scale, 0.3 * scale, 16);
    this.bodyParts.neck = new THREE.Mesh(neckGeom, this.materials.skin);
    this.bodyParts.neck.position.y = this.bodyParts.chest.position.y + 0.75 * scale;
    this.avatar.add(this.bodyParts.neck);
  }

  buildHead(scale) {
    const headSize = this.config.appearance.proportions.head_size * scale;
    
    const headGeom = new THREE.SphereGeometry(headSize, 32, 16);
    this.bodyParts.head = new THREE.Mesh(headGeom, this.materials.skin);
    this.bodyParts.head.position.y = this.bodyParts.neck.position.y + 0.3 * scale;
    this.bodyParts.head.scale.y = 1.1;
    this.avatar.add(this.bodyParts.head);
  }

  buildHair(hairType, scale) {
    this.bodyParts.hairGroup = new THREE.Group();
    this.bodyParts.head.add(this.bodyParts.hairGroup);

    switch (hairType) {
      case 'spikes':
        this.buildSpikyHair(scale);
        break;
      case 'hat':
        this.buildHat(scale);
        break;
      case 'long':
        this.buildLongHair(scale);
        break;
      case 'short':
        this.buildShortHair(scale);
        break;
      case 'bald':
        // No hair
        break;
      default:
        this.buildHat(scale); // Default fallback
    }
  }

  buildSpikyHair(scale) {
    const spikeGeom = new THREE.ConeGeometry(0.12 * scale, 0.5 * scale, 8);
    
    // Central spike
    const spike1 = new THREE.Mesh(spikeGeom, this.materials.hair);
    spike1.position.y = 0.5 * scale;
    spike1.scale.set(0.9, 0.4, 0.9);
    this.bodyParts.hairGroup.add(spike1);
    
    // Side spikes
    const spike2 = new THREE.Mesh(spikeGeom, this.materials.hair);
    spike2.position.set(0.25 * scale, 0.3 * scale, 0);
    spike2.scale.set(0.9, 0.9, 0.9);
    spike2.rotation.z = -Math.PI / 5;
    this.bodyParts.hairGroup.add(spike2);

    const spike3 = new THREE.Mesh(spikeGeom, this.materials.hair);
    spike3.position.set(-0.25 * scale, 0.3 * scale, 0);
    spike3.scale.set(0.9, 0.9, 0.9);
    spike3.rotation.z = Math.PI / 5;
    this.bodyParts.hairGroup.add(spike3);
  }

  buildHat(scale) {
    const hatGeom = new THREE.CylinderGeometry(0.3 * scale, 0.4 * scale, 0.5 * scale, 16);
    const hat = new THREE.Mesh(hatGeom, this.materials.hair);
    hat.position.y = 0.45 * scale;
    hat.scale.y = 1.5;
    this.bodyParts.hairGroup.add(hat);
  }

  buildLongHair(scale) {
    // Create flowing hair using multiple cylinders
    const hairGeom = new THREE.CylinderGeometry(0.3 * scale, 0.2 * scale, 0.8 * scale, 12);
    const hair = new THREE.Mesh(hairGeom, this.materials.hair);
    hair.position.set(0, 0.2 * scale, -0.3 * scale);
    this.bodyParts.hairGroup.add(hair);
  }

  buildShortHair(scale) {
    // Short hair cap
    const hairGeom = new THREE.SphereGeometry(0.42 * scale, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const hair = new THREE.Mesh(hairGeom, this.materials.hair);
    hair.position.y = 0.1 * scale;
    this.bodyParts.hairGroup.add(hair);
  }

  buildArms(scale) {
    const armLength = this.config.appearance.proportions.arm_length * scale;
    
    // Left arm
    this.bodyParts.leftArmGroup = new THREE.Group();
    this.bodyParts.leftArmGroup.position.set(0.7 * scale, this.bodyParts.chest.position.y + 0.45 * scale, 0);
    this.avatar.add(this.bodyParts.leftArmGroup);

    const upperArmGeom = new THREE.CylinderGeometry(0.15 * scale, 0.12 * scale, 0.8 * armLength, 16);
    const foreArmGeom = new THREE.CylinderGeometry(0.12 * scale, 0.08 * scale, 0.7 * armLength, 16);
    const handGeom = new THREE.SphereGeometry(0.1 * scale, 16, 8);

    const leftUpperArm = new THREE.Mesh(upperArmGeom, this.materials.body);
    leftUpperArm.position.y = -0.4 * armLength;
    const leftForeArm = new THREE.Mesh(foreArmGeom, this.materials.body);
    leftForeArm.position.y = leftUpperArm.position.y - 0.7 * armLength;
    const leftHand = new THREE.Mesh(handGeom, this.materials.skin);
    leftHand.position.y = leftForeArm.position.y - 0.4 * armLength;

    this.bodyParts.leftArmGroup.add(leftUpperArm, leftForeArm, leftHand);

    // Right arm (mirror)
    this.bodyParts.rightArmGroup = new THREE.Group();
    this.bodyParts.rightArmGroup.position.set(-0.7 * scale, this.bodyParts.chest.position.y + 0.45 * scale, 0);
    this.avatar.add(this.bodyParts.rightArmGroup);

    const rightUpperArm = new THREE.Mesh(upperArmGeom, this.materials.body);
    rightUpperArm.position.y = -0.4 * armLength;
    const rightForeArm = new THREE.Mesh(foreArmGeom, this.materials.body);
    rightForeArm.position.y = rightUpperArm.position.y - 0.7 * armLength;
    const rightHand = new THREE.Mesh(handGeom, this.materials.skin);
    rightHand.position.y = rightForeArm.position.y - 0.4 * armLength;

    this.bodyParts.rightArmGroup.add(rightUpperArm, rightForeArm, rightHand);
  }

  buildLegs(scale) {
    const legLength = this.config.appearance.proportions.leg_length * scale;
    
    // Left leg
    this.bodyParts.leftLegGroup = new THREE.Group();
    this.bodyParts.leftLegGroup.position.set(0.25 * scale, 0.1 * scale, 0);
    this.avatar.add(this.bodyParts.leftLegGroup);

    const upperLegGeom = new THREE.CylinderGeometry(0.2 * scale, 0.15 * scale, 1.0 * legLength, 16);
    const lowerLegGeom = new THREE.CylinderGeometry(0.15 * scale, 0.1 * scale, 1.0 * legLength, 16);
    const footGeom = new THREE.CylinderGeometry(0.1 * scale, 0.15 * scale, 0.3 * scale, 16);

    const leftUpperLeg = new THREE.Mesh(upperLegGeom, this.materials.body);
    leftUpperLeg.position.y = -0.5 * legLength;
    const leftLowerLeg = new THREE.Mesh(lowerLegGeom, this.materials.body);
    leftLowerLeg.position.y = leftUpperLeg.position.y - 1.0 * legLength;
    const leftFoot = new THREE.Mesh(footGeom, this.materials.skin);
    leftFoot.position.y = leftLowerLeg.position.y - 0.6 * legLength;
    leftFoot.rotation.x = -Math.PI / 2;

    this.bodyParts.leftLegGroup.add(leftUpperLeg, leftLowerLeg, leftFoot);

    // Right leg (mirror)
    this.bodyParts.rightLegGroup = new THREE.Group();
    this.bodyParts.rightLegGroup.position.set(-0.25 * scale, 0.1 * scale, 0);
    this.avatar.add(this.bodyParts.rightLegGroup);

    const rightUpperLeg = new THREE.Mesh(upperLegGeom, this.materials.body);
    rightUpperLeg.position.y = -0.5 * legLength;
    const rightLowerLeg = new THREE.Mesh(lowerLegGeom, this.materials.body);
    rightLowerLeg.position.y = rightUpperLeg.position.y - 1.0 * legLength;
    const rightFoot = new THREE.Mesh(footGeom, this.materials.skin);
    rightFoot.position.y = rightLowerLeg.position.y - 0.6 * legLength;
    rightFoot.rotation.x = -Math.PI / 2;

    this.bodyParts.rightLegGroup.add(rightUpperLeg, rightLowerLeg, rightFoot);
  }

  buildAccessories(accessories, scale) {
    accessories.forEach(accessory => {
      switch (accessory) {
        case 'cape':
          this.buildCape(scale);
          break;
        case 'glasses':
          this.buildGlasses(scale);
          break;
        case 'weapon':
          this.buildWeapon(scale);
          break;
      }
    });
  }

  buildCape(scale) {
    const capeGeom = new THREE.PlaneGeometry(1.2 * scale, 1.5 * scale);
    const cape = new THREE.Mesh(capeGeom, new THREE.MeshStandardMaterial({ 
      color: '#8b0000', 
      side: THREE.DoubleSide 
    }));
    cape.position.set(0, this.bodyParts.chest.position.y - 0.2 * scale, -0.3 * scale);
    this.avatar.add(cape);
    this.bodyParts.cape = cape;
  }

  buildGlasses(scale) {
    const glassesGroup = new THREE.Group();
    const lensGeom = new THREE.RingGeometry(0.08 * scale, 0.12 * scale, 16);
    const lensMaterial = new THREE.MeshStandardMaterial({ 
      color: '#333333', 
      transparent: true, 
      opacity: 0.3 
    });
    
    const leftLens = new THREE.Mesh(lensGeom, lensMaterial);
    leftLens.position.set(0.15 * scale, 0.1 * scale, 0.35 * scale);
    const rightLens = new THREE.Mesh(lensGeom, lensMaterial);
    rightLens.position.set(-0.15 * scale, 0.1 * scale, 0.35 * scale);
    
    glassesGroup.add(leftLens, rightLens);
    this.bodyParts.head.add(glassesGroup);
    this.bodyParts.glasses = glassesGroup;
  }

  buildWeapon(scale) {
    const swordGeom = new THREE.CylinderGeometry(0.02 * scale, 0.02 * scale, 1.2 * scale, 8);
    const sword = new THREE.Mesh(swordGeom, new THREE.MeshStandardMaterial({ 
      color: '#c0c0c0', 
      metalness: 0.8, 
      roughness: 0.2 
    }));
    sword.position.set(0, -0.6 * scale, -0.2 * scale);
    sword.rotation.z = Math.PI / 6;
    this.bodyParts.rightArmGroup.add(sword);
    this.bodyParts.weapon = sword;
  }

  getClothingColor(clothingType) {
    const colors = {
      basic: '#4169e1',
      armor: '#708090',
      robe: '#800080',
      casual: '#228b22'
    };
    return colors[clothingType] || colors.basic;
  }

  setupAnimations() {
    const animConfig = this.config.animations;
    
    this.animations = {
      idle: () => this.animateIdle(animConfig.idle),
      walking: () => this.animateWalking(animConfig.walking),
      running: () => this.animateRunning(animConfig.running)
    };
  }

  animateIdle(config) {
    const time = this.clock.getElapsedTime();
    const armSwing = config?.arm_swing || 0.1;
    const bodySway = config?.body_sway || 0.05;
    
    // Gentle arm movement
    if (this.bodyParts.leftArmGroup) {
      this.bodyParts.leftArmGroup.rotation.x = Math.sin(time * 2) * armSwing;
      this.bodyParts.rightArmGroup.rotation.x = -Math.sin(time * 2) * armSwing;
    }
    
    // Gentle body sway
    this.avatar.rotation.z = Math.sin(time * 1.5) * bodySway;
  }

  animateWalking(config) {
    const time = this.clock.getElapsedTime();
    const speed = config?.speed || 10;
    const armSwing = config?.arm_swing || 0.8;
    const legSwing = config?.leg_swing || 0.8;
    
    if (this.bodyParts.leftArmGroup && this.bodyParts.leftLegGroup) {
      // Walking animation
      const swingAngle = Math.PI / 4;
      
      this.bodyParts.leftArmGroup.rotation.x = Math.sin(time * speed) * swingAngle * armSwing;
      this.bodyParts.rightArmGroup.rotation.x = -Math.sin(time * speed) * swingAngle * armSwing;
      this.bodyParts.leftLegGroup.rotation.x = -Math.sin(time * speed) * swingAngle * legSwing;
      this.bodyParts.rightLegGroup.rotation.x = Math.sin(time * speed) * swingAngle * legSwing;
    }
  }

  animateRunning(config) {
    const time = this.clock.getElapsedTime();
    const speed = config?.speed || 15;
    const armSwing = config?.arm_swing || 1.2;
    const legSwing = config?.leg_swing || 1.2;
    
    if (this.bodyParts.leftArmGroup && this.bodyParts.leftLegGroup) {
      // Running animation (more intense)
      const swingAngle = Math.PI / 3;
      
      this.bodyParts.leftArmGroup.rotation.x = Math.sin(time * speed) * swingAngle * armSwing;
      this.bodyParts.rightArmGroup.rotation.x = -Math.sin(time * speed) * swingAngle * armSwing;
      this.bodyParts.leftLegGroup.rotation.x = -Math.sin(time * speed) * swingAngle * legSwing;
      this.bodyParts.rightLegGroup.rotation.x = Math.sin(time * speed) * swingAngle * legSwing;
      
      // Add body lean for running
      this.avatar.rotation.z = Math.sin(time * speed * 0.5) * 0.1;
    }
  }

  // Public animation control methods
  startAnimation(type = 'idle') {
    this.isAnimating = true;
    this.currentAnimation = type;
  }

  stopAnimation() {
    this.isAnimating = false;
    this.currentAnimation = 'neutral'; // Special state for returning to neutral
    this.neutralReturnTime = 0; // Track how long we've been returning to neutral
  }

  smoothReturnToNeutral() {
    const returnSpeed = 0.8; // Noch schnellere Rückkehr
    const threshold = 0.02;  // Größerer Threshold für schnelleres Snapping
    
    if (this.bodyParts.leftArmGroup) {
      // Arms
      this.bodyParts.leftArmGroup.rotation.x *= returnSpeed;
      this.bodyParts.rightArmGroup.rotation.x *= returnSpeed;
      
      // Legs  
      this.bodyParts.leftLegGroup.rotation.x *= returnSpeed;
      this.bodyParts.rightLegGroup.rotation.x *= returnSpeed;
      
      // Snap to zero when close to avoid infinite tiny movements
      if (Math.abs(this.bodyParts.leftArmGroup.rotation.x) < threshold) {
        this.bodyParts.leftArmGroup.rotation.x = 0;
        this.bodyParts.rightArmGroup.rotation.x = 0;
      }
      
      if (Math.abs(this.bodyParts.leftLegGroup.rotation.x) < threshold) {
        this.bodyParts.leftLegGroup.rotation.x = 0;
        this.bodyParts.rightLegGroup.rotation.x = 0;
      }
    }
    
    // Body rotation
    this.avatar.rotation.z *= returnSpeed;
    if (Math.abs(this.avatar.rotation.z) < threshold) {
      this.avatar.rotation.z = 0;
    }
  }

  isNearNeutralPosition() {
    const threshold = 0.05; // Small threshold for "close enough"
    
    if (!this.bodyParts.leftArmGroup) return true;
    
    return (
      Math.abs(this.bodyParts.leftArmGroup.rotation.x) < threshold &&
      Math.abs(this.bodyParts.rightArmGroup.rotation.x) < threshold &&
      Math.abs(this.bodyParts.leftLegGroup.rotation.x) < threshold &&
      Math.abs(this.bodyParts.rightLegGroup.rotation.x) < threshold &&
      Math.abs(this.avatar.rotation.z) < threshold
    );
  }

  update() {
    if (this.isAnimating && this.animations[this.currentAnimation]) {
      this.animations[this.currentAnimation]();
    } else if (this.currentAnimation === 'neutral') {
      // Handle neutral return phase
      this.smoothReturnToNeutral();
      
      // Track time in neutral phase
      this.neutralReturnTime = (this.neutralReturnTime || 0) + 0.016; // ~60fps
      
      // Check if we're close enough to neutral position
      const isNearNeutral = this.isNearNeutralPosition();
      
      // After enough time or when near neutral, switch to idle
      if (this.neutralReturnTime > 0.5 || isNearNeutral) {
        this.currentAnimation = 'idle';
        this.isAnimating = true;
        this.neutralReturnTime = 0;
      }
    } else {
      // Fallback - should not happen normally
      this.smoothReturnToNeutral();
    }
  }

  // Position and rotation control (replacing playerMarker functionality)
  setPosition(x, y, z) {
    this.avatar.position.set(x, y, z);
  }

  getPosition() {
    return this.avatar.position;
  }

  setRotation(yaw) {
    this.avatar.rotation.y = yaw;
  }

  getRotation() {
    return this.avatar.rotation.y;
  }

  // Get the THREE.js object for adding to scene
  getObject3D() {
    return this.avatar;
  }

  // Update configuration dynamically
  updateConfig(newConfig) {
    const oldConfig = this.config;
    this.config = this.mergeWithDefaults(newConfig);
    
    // Rebuild if appearance changed significantly
    if (this.hasSignificantChanges(oldConfig, this.config)) {
      this.rebuildAvatar();
    } else {
      this.updateMaterials();
    }
  }

  hasSignificantChanges(oldConfig, newConfig) {
    return (
      oldConfig.appearance.height !== newConfig.appearance.height ||
      oldConfig.style.hair_type !== newConfig.style.hair_type ||
      oldConfig.style.clothing !== newConfig.style.clothing ||
      JSON.stringify(oldConfig.style.accessories) !== JSON.stringify(newConfig.style.accessories)
    );
  }

  rebuildAvatar() {
    // Clear existing avatar
    this.avatar.clear();
    this.bodyParts = {};
    
    // Rebuild with new configuration
    this.buildAvatar();
    this.setupAnimations();
  }

  updateMaterials() {
    // Update material colors without rebuilding geometry
    const { appearance } = this.config;
    
    if (this.materials.body) {
      this.materials.body.color.set(appearance.body_color);
      this.materials.skin.color.set(appearance.skin_color);
      this.materials.hair.color.set(appearance.hair_color);
    }
  }
}
