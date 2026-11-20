import * as THREE from './assets/three.module.js';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.pool = [];
    this.maxParticles = 180;
    this.createPool();
  }

  createPool() {
    for (let i = 0; i < this.maxParticles; i += 1) {
      const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 6), material);
      mesh.visible = false;
      this.scene.add(mesh);
      this.pool.push({ mesh, velocity: new THREE.Vector3(), life: 0, maxLife: 0 });
    }
  }

  spawnBurst(position, color = 0xffd166, count = 14, spread = 3) {
    for (let i = 0; i < count; i += 1) {
      const particle = this.pool.find((item) => !item.mesh.visible);
      if (!particle) return;

      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread
      );

      particle.mesh.position.copy(position).add(offset);
      particle.mesh.material.color.setHex(color);
      particle.mesh.visible = true;
      particle.mesh.scale.setScalar(1 + Math.random() * 0.7);
      particle.velocity.set((Math.random() - 0.5) * 2.5, (Math.random() - 0.5) * 2.5, (Math.random() - 0.5) * 2.5);
      particle.life = 0.3 + Math.random() * 0.6;
      particle.maxLife = particle.life;
    }
  }

  update(dt) {
    for (const item of this.pool) {
      if (!item.mesh.visible) continue;
      item.life -= dt;
      if (item.life <= 0) {
        item.mesh.visible = false;
        continue;
      }
      item.mesh.position.addScaledVector(item.velocity, dt);
      item.velocity.multiplyScalar(0.94);
      item.mesh.material.opacity = Math.max(0, item.life / item.maxLife);
    }
  }
}
