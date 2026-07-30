/**
 * Particles.js
 * A single pooled particle system used for every visual effect in the
 * game (bullet trail, reflection sparks, impact splash, ambient dust,
 * smoke, confetti). Object pooling keeps this allocation-free during
 * gameplay so it stays smooth on low-end Android devices.
 */
class ParticleSystem {
  constructor(maxParticles = 600) {
    this.pool = new Array(maxParticles);
    for (let i = 0; i < maxParticles; i++) this.pool[i] = this._blank();
    this.cursor = 0;
  }

  _blank() {
    return {
      active: false,
      x: 0, y: 0, vx: 0, vy: 0,
      life: 0, maxLife: 1,
      size: 2, color: '#ffffff',
      gravity: 0, drag: 1, glow: 0,
      shape: 'circle', // circle | rect | spark
      rotation: 0, vrot: 0,
      alphaCurve: 'linear',
    };
  }

  spawn(opts) {
    const p = this.pool[this.cursor];
    this.cursor = (this.cursor + 1) % this.pool.length;
    Object.assign(p, this._blank(), opts, { active: true });
    return p;
  }

  emitTrail(x, y, color, glow = 1) {
    this.spawn({
      x, y, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20,
      life: 0, maxLife: Utils.randRange(Math.random, 0.25, 0.4),
      size: Utils.randRange(Math.random, 2, 4), color, glow, drag: 0.9,
      shape: 'circle',
    });
  }

  emitSpark(x, y, count, color) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = Utils.randRange(Math.random, 120, 340);
      this.spawn({
        x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        life: 0, maxLife: Utils.randRange(Math.random, 0.25, 0.55),
        size: Utils.randRange(Math.random, 1.5, 3), color, glow: 1, drag: 0.92,
        shape: 'spark', rotation: a,
      });
    }
  }

  emitImpact(x, y) {
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = Utils.randRange(Math.random, 60, 260);
      this.spawn({
        x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        life: 0, maxLife: Utils.randRange(Math.random, 0.3, 0.6),
        size: Utils.randRange(Math.random, 2, 6), color: '#ff2d4a', glow: 0.4,
        gravity: 260, drag: 0.94, shape: 'circle',
      });
    }
  }

  emitDust(x, y, w, h) {
    this.spawn({
      x: x + Math.random() * w, y: y + Math.random() * h,
      vx: Utils.randRange(Math.random, -6, 6), vy: Utils.randRange(Math.random, -14, -4),
      life: 0, maxLife: Utils.randRange(Math.random, 3, 6),
      size: Utils.randRange(Math.random, 1, 2.4), color: 'rgba(255,255,255,0.35)',
      glow: 0, drag: 0.995, shape: 'circle',
    });
  }

  emitConfetti(x, y) {
    const colors = ['#ffffff', '#00f6ff', '#8fe9ff', '#d0d0d0'];
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.4;
      const speed = Utils.randRange(Math.random, 220, 480);
      this.spawn({
        x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        life: 0, maxLife: Utils.randRange(Math.random, 1.2, 2),
        size: Utils.randRange(Math.random, 3, 6), color: Utils.choice(Math.random, colors),
        glow: 0.3, gravity: 420, drag: 0.985, shape: 'rect',
        rotation: Math.random() * Math.PI, vrot: (Math.random() - 0.5) * 8,
      });
    }
  }

  update(dt) {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) { p.active = false; continue; }
      p.vy += p.gravity * dt;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.vrot * dt;
    }
  }

  render(ctx) {
    for (const p of this.pool) {
      if (!p.active) continue;
      const t = p.life / p.maxLife;
      const alpha = 1 - t;
      ctx.save();
      ctx.globalAlpha = Utils.clamp(alpha, 0, 1);
      if (p.glow > 0) {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 12 * p.glow;
      }
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      const size = p.size * (1 - t * 0.4);
      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'rect') {
        ctx.fillRect(-size / 2, -size / 2, size, size * 1.6);
      } else if (p.shape === 'spark') {
        ctx.fillRect(-size * 2, -size / 2, size * 4, size);
      }
      ctx.restore();
    }
  }

  clear() {
    for (const p of this.pool) p.active = false;
  }
}
