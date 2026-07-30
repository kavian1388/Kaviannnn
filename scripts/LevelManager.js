/**
 * LevelManager.js
 * Converts the pure-data level definitions (levels/levels.js -> window.LEVELS,
 * effectively JSON, inlined as a JS file so the game works from file://
 * without hitting fetch() CORS restrictions) into a live RuntimeLevel with
 * ticking walls, enemies, zones and teleporters.
 */
class RuntimeWall {
  constructor(def) {
    Object.assign(this, def);
    this.broken = false;
    if (this.type === 'breakable' && this.hp == null) this.hp = 1;
    if (this.type === 'moving') {
      this.baseX = this.x;
      this.baseY = this.y;
      this.t = 0;
      this.dir = 1;
    }
    if (this.type === 'rotating') {
      this.angle = this.angle || 0;
    }
  }

  update(dt) {
    if (this.broken) return;
    if (this.type === 'moving' && this.path) {
      const speed = this.path.speed || 40;
      const dx = this.path.x2 - this.baseX;
      const dy = this.path.y2 - this.baseY;
      const len = Math.hypot(dx, dy) || 1;
      this.t += (speed / len) * dt * this.dir;
      if (this.t >= 1) { this.t = 1; this.dir = -1; }
      if (this.t <= 0) { this.t = 0; this.dir = 1; }
      this.x = Utils.lerp(this.baseX, this.path.x2, this.t);
      this.y = Utils.lerp(this.baseY, this.path.y2, this.t);
    } else if (this.type === 'rotating') {
      this.angle += (this.angularSpeed || 1) * dt;
    }
  }

  getCollisionRect() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  render(ctx) {
    if (this.broken) return;
    ctx.save();
    if (this.type === 'rotating') {
      ctx.translate(this.cx, this.cy);
      ctx.rotate(this.angle);
      ctx.fillStyle = '#3d3d42';
      ctx.strokeStyle = '#5c5c63';
      ctx.lineWidth = 1;
      ctx.fillRect(-this.length / 2, -this.thickness / 2, this.length, this.thickness);
      ctx.strokeRect(-this.length / 2, -this.thickness / 2, this.length, this.thickness);
    } else {
      let fill = '#333338';
      let stroke = '#4c4c52';
      if (this.type === 'breakable') { fill = '#4a3838'; stroke = '#7a5a5a'; }
      if (this.type === 'magnetic') { fill = '#26333d'; stroke = '#3f6a86'; }
      ctx.fillStyle = fill;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      ctx.fillRect(this.x, this.y, this.w, this.h);
      ctx.strokeRect(this.x, this.y, this.w, this.h);
      if (this.type === 'breakable') {
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        for (let i = 1; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(this.x, this.y + (this.h / 3) * i);
          ctx.lineTo(this.x + this.w, this.y + (this.h / 3) * i);
          ctx.stroke();
        }
      }
      if (this.type === 'magnetic') {
        ctx.strokeStyle = 'rgba(80,180,255,0.5)';
        ctx.beginPath();
        ctx.arc(this.x + this.w / 2, this.y + this.h / 2, 60, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}

class RuntimeLevel {
  constructor(def) {
    this.id = def.id;
    this.par = def.par;
    this.maxBounces = def.par + 3;
    this.timeTarget = def.timeTarget;
    this.width = def.width;
    this.height = def.height;
    this.playerStart = { ...def.player };

    this.walls = def.walls.map((w) => new RuntimeWall(w));
    // Screen boundary walls so the arena always contains the bullet.
    const b = 40;
    this.walls.push(new RuntimeWall({ type: 'normal', x: -b, y: -b, w: this.width + b * 2, h: b, boundary: true }));
    this.walls.push(new RuntimeWall({ type: 'normal', x: -b, y: this.height, w: this.width + b * 2, h: b, boundary: true }));
    this.walls.push(new RuntimeWall({ type: 'normal', x: -b, y: -b, w: b, h: this.height + b * 2, boundary: true }));
    this.walls.push(new RuntimeWall({ type: 'normal', x: this.width, y: -b, w: b, h: this.height + b * 2, boundary: true }));

    this.enemies = def.enemies.map((e) => new Enemy(e));
    this.zones = (def.zones || []).map((z) => ({ ...z }));
    this.teleporters = (def.teleporters || []).map((t) => ({ ...t, radius: t.radius || 22 }));
  }

  update(dt) {
    for (const w of this.walls) w.update(dt);
    for (const e of this.enemies) e.update(dt);
  }

  allEnemiesDead() {
    return this.enemies.every((e) => e.dead);
  }

  renderWalls(ctx) {
    for (const w of this.walls) if (!w.boundary) w.render(ctx);
  }

  renderTeleporters(ctx, t) {
    for (const tp of this.teleporters) {
      ctx.save();
      ctx.translate(tp.x, tp.y);
      ctx.rotate(t * 2);
      ctx.strokeStyle = 'rgba(0,246,255,0.8)';
      ctx.shadowColor = '#00f6ff';
      ctx.shadowBlur = 14;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.arc(0, 0, tp.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  renderZones(ctx) {
    for (const z of this.zones) {
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = z.type === 'gravity' ? '#8e6bff' : '#00f6ff';
      ctx.fillRect(z.x, z.y, z.w, z.h);
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = z.type === 'gravity' ? '#8e6bff' : '#00f6ff';
      ctx.setLineDash([4, 6]);
      ctx.strokeRect(z.x, z.y, z.w, z.h);
      ctx.restore();
    }
  }
}

const LevelManager = (() => {
  function totalLevels() {
    return window.LEVELS.length;
  }

  function getDef(id) {
    return window.LEVELS[id - 1];
  }

  function buildRuntime(id) {
    const def = getDef(id);
    if (!def) return null;
    return new RuntimeLevel(def);
  }

  function isUnlocked(id) {
    const save = Save.get();
    return id <= save.currentLevel;
  }

  function getStars(id) {
    return Save.get().levelStars[id] || 0;
  }

  return { totalLevels, getDef, buildRuntime, isUnlocked, getStars };
})();
