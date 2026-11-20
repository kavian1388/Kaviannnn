import * as THREE from './assets/three.module.js';

export const LANE_POSITIONS = [-4, 0, 4];
export const OBSTACLE_SPAWN_Z = -58;
export const COIN_LINE_START_Z = -48;
export const POWER_UP_TYPES = ['magnet', 'shield', 'slowMotion', 'doubleCoins'];

const POWER_UP_COLORS = {
  magnet: 0xf472b6,
  shield: 0x38bdf8,
  slowMotion: 0xa78bfa,
  doubleCoins: 0xfacc15
};

export class ObstacleManager {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.coins = [];
    this.powerUps = [];
    this.obstaclePools = new Map();
    this.obstacleAssets = new Map();
    this.coinPool = [];
    this.powerUpPools = new Map();
    this.powerUpAssets = new Map();
    this.coinGeometry = new THREE.TorusGeometry(0.42, 0.16, 10, 20);
    this.coinMaterial = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.9,
      metalness: 0.6
    });
    this.obstacleVisuals = {
      jumpArrowGeometry: new THREE.ConeGeometry(0.18, 0.34, 4),
      jumpArrowMaterial: new THREE.MeshStandardMaterial({ color: 0x67e8f9, emissive: 0x06b6d4, emissiveIntensity: 1.4 }),
      jumpStemGeometry: new THREE.BoxGeometry(0.09, 0.38, 0.09),
      slideSupportGeometry: new THREE.BoxGeometry(0.16, 1.15, 0.22),
      slideSupportMaterial: new THREE.MeshStandardMaterial({ color: 0x7f1d1d, emissive: 0xf43f5e, emissiveIntensity: 0.8 }),
      slideArrowGeometry: new THREE.ConeGeometry(0.18, 0.34, 4),
      slideArrowMaterial: new THREE.MeshStandardMaterial({ color: 0x67e8f9, emissive: 0x06b6d4, emissiveIntensity: 1.2 }),
      gapSideGeometry: new THREE.BoxGeometry(0.14, 0.1, 3.2),
      gapEndGeometry: new THREE.BoxGeometry(3.5, 0.1, 0.14),
      gapRimMaterial: new THREE.MeshStandardMaterial({ color: 0xfb7185, emissive: 0xe11d48, emissiveIntensity: 1.8 }),
      wallStripeGeometry: new THREE.BoxGeometry(3.32, 0.14, 0.08),
      wallStripeMaterial: new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xf97316, emissiveIntensity: 1.5 })
    };
    this.spawnCooldown = 0;
    this.difficulty = 1;
    this.distance = 0;
    this.worldSpeed = 17;
    this.environmentPalette = null;
    this.setEnvironment('neon-city');
  }

  reset() {
    this.items.forEach((item) => this.releaseObstacle(item));
    this.coins.forEach((coin) => this.releaseCoin(coin));
    this.powerUps.forEach((powerUp) => this.releasePowerUp(powerUp));
    this.items = [];
    this.coins = [];
    this.powerUps = [];
    this.spawnCooldown = 1.2;
    this.distance = 0;
    this.difficulty = 1;
    this.worldSpeed = 17;
  }

  removeCoin(coin) {
    const index = this.coins.indexOf(coin);
    if (index < 0) return;
    this.releaseCoin(coin);
    this.coins.splice(index, 1);
  }

  releaseObstacle(obstacle) {
    this.scene.remove(obstacle.mesh);
    obstacle.mesh.visible = false;
    obstacle.mesh.rotation.set(0, 0, 0);
    const pool = this.obstaclePools.get(obstacle.type) || [];
    pool.push(obstacle.mesh);
    this.obstaclePools.set(obstacle.type, pool);
  }

  releaseCoin(coin) {
    this.scene.remove(coin.mesh);
    coin.mesh.visible = false;
    coin.mesh.rotation.set(0, 0, 0);
    this.coinPool.push(coin.mesh);
  }

  releasePowerUp(powerUp) {
    this.scene.remove(powerUp.mesh);
    powerUp.mesh.visible = false;
    powerUp.mesh.rotation.set(0, 0, 0);
    const pool = this.powerUpPools.get(powerUp.type) || [];
    pool.push(powerUp.mesh);
    this.powerUpPools.set(powerUp.type, pool);
  }

  removePowerUp(powerUp) {
    const index = this.powerUps.indexOf(powerUp);
    if (index < 0) return;
    this.releasePowerUp(powerUp);
    this.powerUps.splice(index, 1);
  }

  update(dt, speed) {
    this.worldSpeed = speed;
    this.distance += speed * dt;
    this.spawnCooldown -= dt;

    for (const obstacle of [...this.items]) {
      obstacle.mesh.position.z += speed * dt;
      if (obstacle.type === 'spinner') obstacle.mesh.rotation.z += dt * (2 + this.difficulty * 0.4);
      if (obstacle.type === 'moving' || obstacle.type === 'moving-platform') {
        obstacle.mesh.position.x = obstacle.lane + Math.sin((this.distance + obstacle.offset) * 0.045) * (obstacle.type === 'moving-platform' ? 1.1 : 0.65);
      }
      if (obstacle.mesh.position.z > 18) {
        this.releaseObstacle(obstacle);
        this.items.splice(this.items.indexOf(obstacle), 1);
      }
    }

    for (const coin of [...this.coins]) {
      coin.mesh.position.z += speed * dt;
      coin.mesh.rotation.y += dt * 7;
      if (coin.mesh.position.z > 18) {
        this.releaseCoin(coin);
        this.coins.splice(this.coins.indexOf(coin), 1);
      }
    }

    for (const powerUp of [...this.powerUps]) {
      powerUp.mesh.position.z += speed * dt;
      powerUp.mesh.rotation.y += dt * 2.8;
      powerUp.mesh.position.y = powerUp.baseY + Math.sin(this.distance * 0.045 + powerUp.phase) * 0.16;
      if (powerUp.mesh.position.z > 18) {
        this.releasePowerUp(powerUp);
        this.powerUps.splice(this.powerUps.indexOf(powerUp), 1);
      }
    }

    if (this.spawnCooldown <= 0) {
      this.spawnPattern();
      this.spawnCooldown = Math.max(0.95, 1.9 - this.difficulty * 0.07 + Math.random() * 0.55);
    }
  }

  spawnPattern() {
    const lanes = [...LANE_POSITIONS].sort(() => Math.random() - 0.5);
    const pattern = Math.floor(Math.random() * 8);
    let occupied;

    if (pattern === 0) {
      occupied = [lanes[0]];
      this.spawnObstacle(lanes[0], 'laser');
    } else if (pattern === 1) {
      occupied = [lanes[0], lanes[1]];
      this.spawnObstacle(lanes[0], 'block');
      this.spawnObstacle(lanes[1], 'wall');
    } else if (pattern === 2) {
      occupied = [lanes[0]];
      this.spawnObstacle(lanes[0], 'spinner');
    } else if (pattern === 3) {
      occupied = [lanes[0]];
      this.spawnObstacle(lanes[0], 'gap');
    } else if (pattern === 4) {
      occupied = [lanes[0]];
      this.spawnObstacle(lanes[0], 'wall');
    } else if (pattern === 5) {
      occupied = [lanes[0], lanes[1]];
      this.spawnObstacle(lanes[0], 'moving');
      this.spawnObstacle(lanes[1], 'laser');
    } else if (pattern === 6) {
      occupied = [lanes[0], lanes[1]];
      this.spawnObstacle(lanes[0], 'block');
      this.spawnObstacle(lanes[1], 'spinner');
    } else {
      occupied = [lanes[0]];
      this.spawnObstacle(lanes[0], 'moving-platform');
    }

    const safeLane = lanes.find((lane) => !occupied.includes(lane));
    this.spawnCoins(safeLane, 4 + Math.floor(Math.random() * 3), COIN_LINE_START_Z - Math.random() * 4);
    if (Math.random() < 0.18) {
      const type = POWER_UP_TYPES[Math.floor(Math.random() * POWER_UP_TYPES.length)];
      this.spawnPowerUp(safeLane, type, COIN_LINE_START_Z - 12);
    }
    this.difficulty = Math.min(10, this.difficulty + 0.05);
  }

  spawnObstacle(lane, type) {
    const mesh = this.acquireObstacleMesh(type);
    let y = 0.9;
    if (type === 'laser') y = 1.25;
    else if (type === 'spinner') y = 1.02;
    else if (type === 'gap') y = -0.02;
    else if (type === 'wall') y = 2.2;
    else if (type === 'moving-platform') y = 0.32;
    else if (type === 'block' || type === 'moving') y = 0.75;
    mesh.position.set(lane, y, OBSTACLE_SPAWN_Z - Math.random() * 3);
    mesh.visible = true;
    this.scene.add(mesh);
    this.items.push({ mesh, type, lane, offset: Math.random() * 100 });
  }

  acquireObstacleMesh(type) {
    const pool = this.obstaclePools.get(type);
    if (pool?.length) return pool.pop();

    if (!this.obstacleAssets.has(type)) {
      let geometry;
      let material;
      if (type === 'laser') {
        geometry = new THREE.BoxGeometry(3.1, 0.22, 0.25);
        material = new THREE.MeshStandardMaterial({ color: 0xfb334f, emissive: 0xfb1742, emissiveIntensity: 2 });
      } else if (type === 'spinner') {
        geometry = new THREE.BoxGeometry(3.2, 0.2, 0.3);
        material = new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xea580c, emissiveIntensity: 1.2 });
      } else if (type === 'gap') {
        geometry = new THREE.BoxGeometry(3.5, 0.12, 3.2);
        material = new THREE.MeshBasicMaterial({ color: 0x020617 });
      } else if (type === 'wall') {
        geometry = new THREE.BoxGeometry(3.3, 5, 1.4);
        material = new THREE.MeshStandardMaterial({ color: 0x312e81, emissive: 0x7c3aed, emissiveIntensity: 0.8 });
      } else if (type === 'moving-platform') {
        geometry = new THREE.BoxGeometry(2.4, 0.42, 2.2);
        material = new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x0891b2, emissiveIntensity: 1.1, metalness: 0.5, roughness: 0.3 });
      } else {
        geometry = new THREE.BoxGeometry(2.2, 1.4, 1.7);
        material = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xb91c1c, emissiveIntensity: 0.8, metalness: 0.2, roughness: 0.4 });
      }
      this.applyObstaclePalette(type, material);
      this.obstacleAssets.set(type, { geometry, material });
    }

    const { geometry, material } = this.obstacleAssets.get(type);
    const mesh = new THREE.Mesh(geometry, material);
    this.addObstacleVisuals(mesh, type);
    return mesh;
  }

  addObstacleVisuals(mesh, type) {
    const visuals = this.obstacleVisuals;
    const addDetail = (geometry, material, x, y, z, rotationX = 0) => {
      const detail = new THREE.Mesh(geometry, material);
      detail.position.set(x, y, z);
      detail.rotation.x = rotationX;
      mesh.add(detail);
    };

    if (type === 'block' || type === 'moving' || type === 'moving-platform') {
      for (const x of [-0.55, 0, 0.55]) {
        addDetail(visuals.jumpStemGeometry, visuals.jumpArrowMaterial, x, 0.91, 0);
        addDetail(visuals.jumpArrowGeometry, visuals.jumpArrowMaterial, x, 1.27, 0);
      }
    } else if (type === 'laser' || type === 'spinner') {
      for (const x of [-1.4, 1.4]) {
        addDetail(visuals.slideSupportGeometry, visuals.slideSupportMaterial, x, -0.58, 0);
        addDetail(visuals.slideArrowGeometry, visuals.slideArrowMaterial, x * 0.36, -0.37, 0, Math.PI);
      }
    } else if (type === 'gap') {
      for (const x of [-1.68, 1.68]) {
        addDetail(visuals.gapSideGeometry, visuals.gapRimMaterial, x, 0.08, 0);
      }
      for (const z of [-1.53, 1.53]) {
        addDetail(visuals.gapEndGeometry, visuals.gapRimMaterial, 0, 0.08, z);
      }
      for (const x of [-0.45, 0.45]) {
        addDetail(visuals.jumpStemGeometry, visuals.jumpArrowMaterial, x, 0.56, 0.65);
        addDetail(visuals.jumpArrowGeometry, visuals.jumpArrowMaterial, x, 0.92, 0.65);
      }
    } else if (type === 'wall') {
      for (const y of [-0.9, 0, 0.9]) {
        addDetail(visuals.wallStripeGeometry, visuals.wallStripeMaterial, 0, y, 0.72);
      }
    }
  }

  spawnCoins(lane, count, zStart) {
    for (let i = 0; i < count; i += 1) {
      const mesh = this.coinPool.pop() || new THREE.Mesh(this.coinGeometry, this.coinMaterial);
      mesh.position.set(lane, i % 2 === 0 ? 1.15 : 1.65, zStart + i * 2.7);
      mesh.visible = true;
      mesh.rotation.x = Math.PI / 2;
      this.scene.add(mesh);
      this.coins.push({ mesh, lane, value: 1 });
    }
  }

  spawnPowerUp(lane, type, z = COIN_LINE_START_Z) {
    if (!POWER_UP_TYPES.includes(type)) return null;
    let mesh = this.powerUpPools.get(type)?.pop();
    if (!mesh) {
      if (!this.powerUpAssets.has(type)) {
        const color = POWER_UP_COLORS[type];
        const geometry = type === 'magnet'
          ? new THREE.TorusGeometry(0.52, 0.17, 8, 18, Math.PI * 1.55)
          : type === 'shield'
            ? new THREE.IcosahedronGeometry(0.55, 1)
            : type === 'slowMotion'
              ? new THREE.OctahedronGeometry(0.58, 0)
              : new THREE.TorusGeometry(0.44, 0.2, 8, 16);
        const material = new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 1.25,
          metalness: 0.35,
          roughness: 0.28
        });
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.72, 0.035, 6, 24),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75 })
        );
        this.powerUpAssets.set(type, { geometry, material, ring });
      }
      const asset = this.powerUpAssets.get(type);
      mesh = new THREE.Group();
      mesh.add(new THREE.Mesh(asset.geometry, asset.material));
      const ring = asset.ring.clone();
      ring.rotation.x = Math.PI / 2;
      mesh.add(ring);
      mesh.userData.powerUpType = type;
    }
    mesh.position.set(lane, 1.35, z);
    mesh.visible = true;
    this.scene.add(mesh);
    const powerUp = { mesh, type, lane, baseY: 1.35, phase: Math.random() * Math.PI * 2 };
    this.powerUps.push(powerUp);
    return powerUp;
  }

  setEnvironment(environment) {
    const palettes = {
      'neon-city': {
        obstacle: 0xfb334f, glow: 0xfb1742, laser: 0xfb334f, spinner: 0xf97316,
        platform: 0x22d3ee, jump: 0x67e8f9, slide: 0xf43f5e, gap: 0xe11d48, stripe: 0xf97316
      },
      'cyber-space': {
        obstacle: 0xa78bfa, glow: 0x7c3aed, laser: 0x22d3ee, spinner: 0xc084fc,
        platform: 0x818cf8, jump: 0x67e8f9, slide: 0x8b5cf6, gap: 0x7c3aed, stripe: 0x22d3ee
      },
      'lava-world': {
        obstacle: 0xff7a18, glow: 0xdc2626, laser: 0xf43f5e, spinner: 0xf97316,
        platform: 0xfacc15, jump: 0xfde047, slide: 0xef4444, gap: 0xdc2626, stripe: 0xfacc15
      }
    };
    this.environmentPalette = palettes[environment] || palettes['neon-city'];
    const visuals = this.obstacleVisuals;
    visuals.jumpArrowMaterial.color.setHex(this.environmentPalette.jump);
    visuals.jumpArrowMaterial.emissive.setHex(this.environmentPalette.jump);
    visuals.slideSupportMaterial.color.setHex(this.environmentPalette.slide);
    visuals.slideSupportMaterial.emissive.setHex(this.environmentPalette.slide);
    visuals.slideArrowMaterial.color.setHex(this.environmentPalette.jump);
    visuals.slideArrowMaterial.emissive.setHex(this.environmentPalette.jump);
    visuals.gapRimMaterial.color.setHex(this.environmentPalette.gap);
    visuals.gapRimMaterial.emissive.setHex(this.environmentPalette.gap);
    visuals.wallStripeMaterial.color.setHex(this.environmentPalette.stripe);
    visuals.wallStripeMaterial.emissive.setHex(this.environmentPalette.stripe);
    for (const [type, asset] of this.obstacleAssets) {
      this.applyObstaclePalette(type, asset.material);
    }
  }

  applyObstaclePalette(type, material) {
    if (!this.environmentPalette || type === 'gap') return;
    const color = type === 'laser'
      ? this.environmentPalette.laser
      : type === 'spinner'
        ? this.environmentPalette.spinner
        : type === 'moving-platform'
          ? this.environmentPalette.platform
          : this.environmentPalette.obstacle;
    material.color.setHex(color);
    material.emissive.setHex(type === 'moving-platform' ? color : this.environmentPalette.glow);
  }

  getCoinCollisionState(playerX, playerZ, playerY) {
    return this.coins.filter((coin) => (
      Math.abs(playerX - coin.mesh.position.x) < 1.2
      && Math.abs(playerZ - coin.mesh.position.z) < 1.5
      && Math.abs(playerY - coin.mesh.position.y) < 1.8
    ));
  }

  getObstacleCollisionState(playerX, playerZ, playerY, isSliding) {
    return this.items.filter((obstacle) => {
      if (Math.abs(playerX - obstacle.mesh.position.x) > 1.55 || Math.abs(playerZ - obstacle.mesh.position.z) > 1.35) {
        return false;
      }

      const playerHalfHeight = 0.55 * (isSliding ? 0.62 : 1);
      const playerBottom = playerY - playerHalfHeight;
      const playerTop = playerY + playerHalfHeight;
      if (obstacle.type === 'gap') return playerBottom < 0.55;

      const obstacleHalfHeight = obstacle.mesh.geometry.parameters.height / 2;
      const obstacleBottom = obstacle.mesh.position.y - obstacleHalfHeight;
      const obstacleTop = obstacle.mesh.position.y + obstacleHalfHeight;
      return playerBottom < obstacleTop && playerTop > obstacleBottom;
    });
  }
}
