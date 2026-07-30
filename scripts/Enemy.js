/**
 * Enemy.js
 * Minimal white humanoid silhouette. Supports a static variant and a
 * patrolling "moving" variant, plus an optional shield that must absorb
 * one bounce before the enemy can actually be killed.
 */
class Enemy {
  constructor(def) {
    this.x = def.x;
    this.y = def.y;
    this.spawnX = def.x;
    this.spawnY = def.y;
    this.radius = 15;
    this.type = def.type || 'static';
    this.path = def.path || null; // {x2,y2,speed}
    this.pathT = 0;
    this.pathDir = 1;
    this.shielded = this.type === 'shield';
    this.dead = false;
    this.deathT = 0;
    this.bob = Math.random() * 10;
    this.hitFlash = 0;
  }

  hit() {
    if (this.shielded) {
      this.shielded = false;
      this.hitFlash = 1;
      AudioEngine.sfx.shield();
      return false; // shield absorbed the hit, enemy survives
    }
    if (!this.dead) {
      this.dead = true;
      this.deathT = 0;
      return true;
    }
    return false;
  }

  update(dt) {
    this.bob += dt;
    this.hitFlash = Utils.lerp(this.hitFlash, 0, Math.min(1, dt * 6));
    if (this.dead) {
      this.deathT += dt;
      return;
    }
    if (this.type === 'moving' && this.path) {
      const speed = this.path.speed || 60;
      const dx = this.path.x2 - this.spawnX;
      const dy = this.path.y2 - this.spawnY;
      const len = Math.hypot(dx, dy) || 1;
      this.pathT += (speed / len) * dt * this.pathDir;
      if (this.pathT >= 1) { this.pathT = 1; this.pathDir = -1; }
      if (this.pathT <= 0) { this.pathT = 0; this.pathDir = 1; }
      this.x = Utils.lerp(this.spawnX, this.path.x2, this.pathT);
      this.y = Utils.lerp(this.spawnY, this.path.y2, this.pathT);
    }
  }

  render(ctx) {
    if (this.dead && this.deathT > 0.7) return;
    ctx.save();

    let alpha = 1;
    let fallRot = 0;
    let sink = 0;
    if (this.dead) {
      const t = Utils.clamp(this.deathT / 0.7, 0, 1);
      alpha = 1 - t;
      fallRot = t * (Math.PI / 2.2);
      sink = t * 10;
    }

    const bobY = Math.sin(this.bob * 2) * (this.dead ? 0 : 2);
    ctx.globalAlpha = alpha;
    ctx.translate(this.x, this.y + bobY + sink);
    ctx.rotate(fallRot);

    ctx.fillStyle = this.hitFlash > 0.05 ? '#ff2d4a' : '#e9e9ec';
    // Head
    ctx.beginPath();
    ctx.ellipse(0, -20, 7, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Torso
    ctx.beginPath();
    ctx.moveTo(-9, -2);
    ctx.quadraticCurveTo(-10, -14, -5, -18);
    ctx.quadraticCurveTo(0, -20, 5, -18);
    ctx.quadraticCurveTo(10, -14, 9, -2);
    ctx.closePath();
    ctx.fill();
    // Legs
    ctx.beginPath();
    ctx.moveTo(-8, -2);
    ctx.lineTo(-10, 18);
    ctx.lineTo(-3, 18);
    ctx.lineTo(-2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(8, -2);
    ctx.lineTo(10, 18);
    ctx.lineTo(3, 18);
    ctx.lineTo(2, 0);
    ctx.closePath();
    ctx.fill();

    if (this.shielded) {
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(0, -10, 24, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}
