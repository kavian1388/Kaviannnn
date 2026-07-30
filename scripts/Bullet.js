/**
 * Bullet.js
 * The single most important entity in the game. Handles substepped
 * movement + collision so fast shots can't tunnel through thin walls,
 * counts bounces, and exposes a static simulate() used both by the live
 * bullet and by the "Time Echo" trajectory preview.
 */
class Bullet {
  constructor(x, y, vx, vy) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = 7;
    this.bounces = 0;
    this.alive = true;
    this.trailTimer = 0;
    this.history = [];
  }

  /**
   * Advances the bullet by dt seconds, resolving wall/enemy/teleporter
   * collisions. Returns a list of events that happened this step so the
   * Game loop can trigger camera shake, slowmo, sfx, particles, scoring.
   */
  step(dt, level, particles) {
    const events = [];
    const substeps = 4;
    const subDt = dt / substeps;

    for (let s = 0; s < substeps; s++) {
      if (!this.alive) break;

      const zoneRes = Physics.applyZones(this.vx, this.vy, subDt, level.zones, this.x, this.y);
      this.vx = zoneRes.vx;
      this.vy = zoneRes.vy;
      const magRes = Physics.applyMagnets(this.vx, this.vy, subDt, level.walls, this.x, this.y);
      this.vx = magRes.vx;
      this.vy = magRes.vy;

      const nextX = this.x + this.vx * subDt;
      const nextY = this.y + this.vy * subDt;

      const wallHit = Collision.testWalls({ x: nextX, y: nextY, vx: this.vx, vy: this.vy, radius: this.radius }, level.walls);
      if (wallHit) {
        this.x = wallHit.res.x;
        this.y = wallHit.res.y;
        this.vx = wallHit.res.vx;
        this.vy = wallHit.res.vy;
        this.bounces++;
        events.push({ type: 'bounce', x: this.x, y: this.y, wall: wallHit.wall });

        if (wallHit.wall.type === 'breakable') {
          wallHit.wall.hp = (wallHit.wall.hp ?? 1) - 1;
          if (wallHit.wall.hp <= 0) wallHit.wall.broken = true;
        }

        if (this.bounces > Physics.MAX_BOUNCES_BEFORE_DEATH) {
          this.alive = false;
          events.push({ type: 'died' });
        }
      } else {
        this.x = nextX;
        this.y = nextY;
      }

      const tp = Collision.testTeleporters({ x: this.x, y: this.y }, level.teleporters || []);
      if (tp && (!this.lastTeleport || this.lastTeleport !== tp.id)) {
        const pair = level.teleporters.find((t) => t.pairId === tp.id && t !== tp) ||
          level.teleporters.find((t) => t !== tp);
        if (pair) {
          this.x = pair.x;
          this.y = pair.y;
          this.lastTeleport = pair.id;
          events.push({ type: 'teleport', x: pair.x, y: pair.y });
        }
      } else if (!tp) {
        this.lastTeleport = null;
      }

      const enemyHits = Collision.testEnemies(this, level.enemies);
      for (const enemy of enemyHits) {
        const killed = enemy.hit();
        events.push({ type: 'enemyHit', enemy, killed, x: enemy.x, y: enemy.y });
      }

      if (Collision.outOfBounds(this.x, this.y, level.width, level.height)) {
        this.alive = false;
        events.push({ type: 'died' });
      }

      if (!this.alive) break;
    }

    this.trailTimer -= dt;
    if (this.trailTimer <= 0 && particles) {
      particles.emitTrail(this.x, this.y, SkinManager.getEquippedSkinData().glow);
      this.trailTimer = 0.012;
    }
    this.history.push({ x: this.x, y: this.y });
    if (this.history.length > 40) this.history.shift();

    return events;
  }

  /**
   * Pure simulation (no side effects, no particles) used to draw the
   * pre-shot trajectory prediction line. Runs a lightweight clone of the
   * world for a fixed horizon and returns an array of {x,y} points plus
   * bounce markers.
   */
  static simulate(x, y, vx, vy, level, maxBounces = 6, maxTime = 3.5) {
    const points = [{ x, y }];
    const bounceMarkers = [];
    let bx = x, by = y, bvx = vx, bvy = vy;
    let bounces = 0;
    let t = 0;
    const dt = 1 / 120;

    while (t < maxTime && bounces <= maxBounces) {
      const zoneRes = Physics.applyZones(bvx, bvy, dt, level.zones, bx, by);
      bvx = zoneRes.vx;
      bvy = zoneRes.vy;
      const magRes = Physics.applyMagnets(bvx, bvy, dt, level.walls, bx, by);
      bvx = magRes.vx;
      bvy = magRes.vy;

      const nx = bx + bvx * dt;
      const ny = by + bvy * dt;

      const wallHit = Collision.testWalls({ x: nx, y: ny, vx: bvx, vy: bvy, radius: 7 }, level.walls);
      if (wallHit) {
        bx = wallHit.res.x;
        by = wallHit.res.y;
        bvx = wallHit.res.vx;
        bvy = wallHit.res.vy;
        bounces++;
        bounceMarkers.push({ x: bx, y: by });
      } else {
        bx = nx;
        by = ny;
      }

      if (Collision.outOfBounds(bx, by, level.width, level.height)) break;

      points.push({ x: bx, y: by });
      t += dt;
    }

    return { points, bounceMarkers };
  }

  render(ctx) {
    const skin = SkinManager.getEquippedSkinData();

    // Trail (fading glowing line through recent history)
    if (this.history.length > 1) {
      ctx.save();
      ctx.lineCap = 'round';
      for (let i = 1; i < this.history.length; i++) {
        const a = i / this.history.length;
        ctx.globalAlpha = a * 0.5;
        ctx.strokeStyle = skin.glow;
        ctx.lineWidth = 3 * a;
        ctx.shadowColor = skin.glow;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(this.history[i - 1].x, this.history[i - 1].y);
        ctx.lineTo(this.history[i].x, this.history[i].y);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Bullet core with bloom
    ctx.save();
    ctx.shadowColor = skin.glow;
    ctx.shadowBlur = 26;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.55, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 18;
    ctx.fillStyle = skin.glow;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
