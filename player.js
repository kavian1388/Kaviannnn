import * as THREE from './assets/three.module.js';
import { getSkinById } from './save.js';

export const GROUND_Y = 0.62;
export const MAX_WORLD_SPEED = 100;

export class Player {
  constructor(scene, skinId = 'classic') {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.position.set(0, GROUND_Y, 0);
    this.scene.add(this.group);

    this.body = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 1.1, 1.1),
      new THREE.MeshStandardMaterial({ color: 0x7dd3fc, emissive: 0x38bdf8, emissiveIntensity: 0.8, metalness: 0.15, roughness: 0.35 })
    );
    this.body.castShadow = true;
    this.body.receiveShadow = true;
    this.group.add(this.body);

    this.edgeLines = new THREE.LineSegments(
      new THREE.EdgesGeometry(this.body.geometry),
      new THREE.LineBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.95 })
    );
    this.edgeLines.scale.setScalar(1.015);
    this.group.add(this.edgeLines);

    this.innerGlow = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.9, 0.9),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.9, transparent: true, opacity: 0.5 })
    );
    this.group.add(this.innerGlow);

    this.velocityY = 0;
    this.baseJumpStrength = 11.5;
    this.baseGravity = 36;
    this.jumpStrength = this.baseJumpStrength;
    this.gravity = this.baseGravity;
    this.slideDuration = 0.56;
    this.laneMoveDuration = 0.085;
    this.speedProgress = 0;
    this.laneIndex = 1;
    this.currentLaneX = 0;
    this.isSliding = false;
    this.slideTimer = 0;
    this.targetRotation = 0;
    this.setSkin(skinId);
  }

  setSkin(skinId) {
    const skin = getSkinById(skinId);
    const finishes = {
      classic: [0.18, 0.38, 0.65],
      'neon-blue': [0.45, 0.2, 1.5],
      fire: [0.12, 0.3, 1.4],
      electric: [0.35, 0.22, 1.8],
      toxic: [0.1, 0.28, 1.1],
      golden: [0.82, 0.18, 0.85],
      diamond: [0.7, 0.12, 0.6],
      galaxy: [0.4, 0.24, 1.3],
      rainbow: [0.3, 0.2, 1.2],
      shadow: [0.05, 0.65, 0.45],
      cyber: [0.5, 0.2, 1.3],
      legendary: [0.62, 0.14, 1.6]
    };
    const [metalness, roughness, emissiveIntensity] = finishes[skin.id] || finishes.classic;
    const material = new THREE.MeshStandardMaterial({
      color: skin.color,
      emissive: skin.accent,
      emissiveIntensity,
      metalness,
      roughness
    });
    this.body.material.dispose();
    this.body.material = material;
    this.innerGlow.material.dispose();
    this.innerGlow.material = new THREE.MeshStandardMaterial({
      color: skin.accent,
      emissive: skin.accent,
      emissiveIntensity: skin.id === 'shadow' ? 0.2 : 1.5,
      transparent: true,
      opacity: 0.4
    });
    this.edgeLines.material.color.set(skin.accent);
    this.currentSkinId = skin.id;
    this.group.rotation.y = 0;
  }

  reset() {
    this.group.position.set(0, GROUND_Y, 0);
    this.velocityY = 0;
    this.currentLaneX = 0;
    this.group.rotation.x = 0;
    this.group.rotation.z = 0;
    this.isSliding = false;
    this.slideTimer = 0;
    this.group.scale.y = 1;
    this.group.position.y = GROUND_Y;
  }

  moveLane(direction) {
    const clampedIndex = Math.max(0, Math.min(2, this.laneIndex + direction));
    this.laneIndex = clampedIndex;
    this.currentLaneX = [-4, 0, 4][this.laneIndex];
  }

  setWorldSpeed(speed) {
    this.speedProgress = THREE.MathUtils.clamp((speed - 17) / (MAX_WORLD_SPEED - 17), 0, 1);
    this.jumpStrength = this.baseJumpStrength * (1 + this.speedProgress * 0.1);
    this.gravity = this.baseGravity * (1 + this.speedProgress * 0.18);
    this.slideDuration = 0.56 * (1 - this.speedProgress * 0.12);
    this.laneMoveDuration = 0.085 * (1 - this.speedProgress * 0.15);
  }

  jump() {
    if (this.group.position.y <= GROUND_Y + 0.05) {
      this.isSliding = false;
      this.slideTimer = 0;
      this.group.scale.y = 1;
      this.group.position.y = GROUND_Y;
      this.velocityY = this.jumpStrength;
      return true;
    }
    return false;
  }

  slide() {
    if (this.group.position.y <= GROUND_Y + 0.05) {
      this.isSliding = true;
      this.slideTimer = this.slideDuration;
      this.group.scale.y = 0.62;
      this.group.position.y = 0.34;
      return true;
    }
    return false;
  }

  update(dt) {
    const laneBase = [-4, 0, 4][this.laneIndex];
    const laneAlpha = 1 - Math.exp(-dt / this.laneMoveDuration);
    const moveX = THREE.MathUtils.lerp(this.group.position.x, laneBase, laneAlpha);
    this.group.position.x = moveX;

    this.group.position.y += this.velocityY * dt;
    this.velocityY -= this.gravity * dt;

    const groundY = this.isSliding ? 0.34 : GROUND_Y;
    if (this.group.position.y <= groundY) {
      this.group.position.y = groundY;
      this.velocityY = 0;
    }

    if (this.isSliding) {
      this.slideTimer -= dt;
      if (this.slideTimer <= 0) {
        this.isSliding = false;
        this.group.scale.y = 1;
        this.group.position.y = GROUND_Y;
      }
    }

    this.group.rotation.z = THREE.MathUtils.lerp(this.group.rotation.z, -this.group.position.x * 0.12, 0.12);
    this.group.rotation.x = THREE.MathUtils.lerp(this.group.rotation.x, this.velocityY * 0.08, 0.18);
    this.group.rotation.y += 0.06 + Math.abs(this.group.position.x) * 0.003;
    if (this.currentSkinId === 'rainbow') {
      const hue = (performance.now() * 0.00015) % 1;
      this.body.material.color.setHSL(hue, 0.85, 0.58);
      this.body.material.emissive.setHSL(hue, 0.9, 0.35);
    } else if (this.currentSkinId === 'fire' || this.currentSkinId === 'electric') {
      this.body.material.emissiveIntensity = 1.1 + Math.sin(performance.now() * 0.008) * 0.45;
    }
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
      else if (object.material) object.material.dispose();
    });
  }
}
