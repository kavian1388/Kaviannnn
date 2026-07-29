/**
 * Game.js
 * Ties every module together: owns the canvas render loop, the state
 * machine (menu/playing/paused/win/fail), the rotation animation, and
 * simple particle effects (confetti on win, explosion on fail).
 *
 * Rendering approach: tile "shapes" are never drawn from hand-authored
 * sprites - each open side just becomes a thick rounded line from the tile
 * center to that edge's midpoint. Whatever combination of sides is open
 * automatically reads as a straight road, corner, T-junction, crossroad or
 * dead end. This means there are zero external image assets, so nothing
 * can ever be "missing" when the game is opened offline.
 */
(function (RC) {
  'use strict';

  const COLORS = {
    bg: '#F5F7FA',
    road: '#444444',
    roadEdge: '#33393f',
    danger: '#E5484D',
    goal: '#2FB380',
    coin: '#F5C518',
    ice: '#8ECBEA',
    speed: '#F5C518',
    teleport: '#8B5CF6'
  };

  function Game(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ui = new RC.UI(this);
    this.input = new RC.Input(canvas, this);

    this.state = 'loading'; // loading | playing | paused | win | fail
    this.level = null;
    this.car = null;
    this.levelNumber = 1;
    this.carSkin = RC.Save.data.selectedCar || 'sports';

    this.rotAnim = null;   // { from, elapsed, duration }
    this.particles = [];
    this.lastTime = 0;
    this._resize();
    window.addEventListener('resize', this._resize.bind(this));

    RC.Audio.setMuted(!RC.Save.data.settings.sound);
    this.ui.el.soundToggle.textContent = RC.Save.data.settings.sound ? 'Sound: On' : 'Sound: Off';

    requestAnimationFrame(this._tick.bind(this));
  }

  Game.prototype._resize = function () {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.viewW = w;
    this.viewH = h;
  };

  // ---------------------------------------------------------------------
  // Level lifecycle
  // ---------------------------------------------------------------------

  Game.prototype.loadLevelNumber = function (n) {
    this.levelNumber = n;
    let levelData;
    if (n <= RC_LEVELS.length) {
      levelData = RC_LEVELS[n - 1];
      this.level = new RC.Level(levelData);
    } else {
      const seed = 1000003 * n + 7;
      const gen = RC.generateLevel(n, seed);
      this.level = RC.Level.fromGenerated(gen);
    }
    this.car = new RC.Car(this.level, this.carSkin);
    this.state = 'playing';
    this.particles = [];
    this.rotAnim = null;
    this.ui.updateHUD(this.levelNumber, RC.Save.data.coins);
    RC.Save.setCurrentLevel(n);
  };

  Game.prototype.restartLevel = function () {
    this.loadLevelNumber(this.levelNumber);
  };

  Game.prototype.nextLevel = function () {
    this.loadLevelNumber(this.levelNumber + 1);
  };

  Game.prototype.setCarSkin = function (id) {
    this.carSkin = id;
    if (this.car) this.car.skin = id;
  };

  Game.prototype.pause = function () {
    if (this.state === 'playing') this.state = 'paused';
  };

  Game.prototype.resume = function () {
    if (this.state === 'paused') this.state = 'playing';
  };

  Game.prototype.canAcceptInput = function () {
    return this.state === 'playing' && !this.rotAnim;
  };

  // ---------------------------------------------------------------------
  // Rotation
  // ---------------------------------------------------------------------

  Game.prototype.rotateWorld = function (dir) {
    if (!this.canAcceptInput()) return;
    this.level.rotate(dir);
    this.car.remapForRotation(dir);
    this.rotAnim = {
      from: dir === 'right' ? -Math.PI / 2 : Math.PI / 2,
      elapsed: 0,
      duration: 0.2
    };
    RC.Events.emit('rotate');
  };

  // ---------------------------------------------------------------------
  // Main loop
  // ---------------------------------------------------------------------

  Game.prototype._tick = function (now) {
    const dt = Math.min(0.05, (now - (this.lastTime || now)) / 1000);
    this.lastTime = now;

    if (this.state === 'playing') this._update(dt);
    this._updateParticles(dt);
    this._render();

    requestAnimationFrame(this._tick.bind(this));
  };

  Game.prototype._update = function (dt) {
    if (this.rotAnim) {
      this.rotAnim.elapsed += dt;
      if (this.rotAnim.elapsed >= this.rotAnim.duration) this.rotAnim = null;
      return; // car holds still for the brief spin animation
    }

    const event = this.car.update(dt);
    this.ui.updateHUD(this.levelNumber, RC.Save.data.coins + this.car.coins);

    if (event === 'goal') this._onWin();
    else if (event === 'fall') this._onFail();
  };

  Game.prototype._onWin = function () {
    this.state = 'win';
    RC.Save.addCoins(this.car.coins);
    RC.Save.setStars(this.level.id, 3);
    RC.Events.emit('win');
    this._spawnConfetti();
    RC.Ads.notifyLevelComplete();
    const self = this;
    setTimeout(function () { self.ui.showWin(self.car.coins); }, 550);
  };

  Game.prototype._onFail = function () {
    this.state = 'fail';
    RC.Events.emit('lose');
    this._spawnExplosion();
    const self = this;
    setTimeout(function () { self.ui.showFail(); }, 500);
  };

  // ---------------------------------------------------------------------
  // Particles (confetti / explosion) - simple pooled arrays, no GC churn
  // ---------------------------------------------------------------------

  Game.prototype._spawnConfetti = function () {
    const cx = this.viewW / 2, cy = this.viewH * 0.35;
    const colors = ['#2D6CDF', '#F5C518', '#2FB380', '#E4432B', '#B15CDE'];
    for (let i = 0; i < 60; i++) {
      this.particles.push({
        type: 'confetti', x: cx, y: cy,
        vx: (Math.random() - 0.5) * 260, vy: -Math.random() * 260 - 60,
        g: 420, life: 1.4 + Math.random() * 0.6, age: 0,
        size: 5 + Math.random() * 5, color: colors[i % colors.length],
        rot: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 10
      });
    }
  };

  Game.prototype._spawnExplosion = function () {
    const cx = this._carScreenX, cy = this._carScreenY;
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      const speed = 120 + Math.random() * 180;
      this.particles.push({
        type: 'spark', x: cx, y: cy,
        vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - 60,
        g: 500, life: 0.6 + Math.random() * 0.4, age: 0,
        size: 3 + Math.random() * 4, color: Math.random() < 0.5 ? COLORS.danger : '#FFB020'
      });
    }
  };

  Game.prototype._updateParticles = function (dt) {
    this.particles = this.particles.filter(function (p) { return p.age < p.life; });
    this.particles.forEach(function (p) {
      p.age += dt;
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.rot != null) p.rot += p.vr * dt;
    });
  };

  // ---------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------

  Game.prototype._layout = function () {
    const level = this.level;
    if (!level) return null;
    const pad = 18;
    const availW = this.viewW - pad * 2;
    const availH = this.viewH - pad * 2 - 120; // room for HUD/bottom bar
    const tile = Math.floor(Math.min(availW, availH) / level.size);
    const gridPx = tile * level.size;
    const originX = (this.viewW - gridPx) / 2;
    const originY = pad + 70 + (availH - gridPx) / 2;
    return { tile, originX, originY, gridPx };
  };

  Game.prototype._render = function () {
    const ctx = this.ctx;
    ctx.save();
    ctx.clearRect(0, 0, this.viewW, this.viewH);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, this.viewW, this.viewH);

    const layout = this._layout();
    if (layout && this.level) {
      ctx.save();
      const cx = layout.originX + layout.gridPx / 2;
      const cy = layout.originY + layout.gridPx / 2;
      if (this.rotAnim) {
        const t = RC.easeInOutQuad(this.rotAnim.elapsed / this.rotAnim.duration);
        const angle = RC.lerp(this.rotAnim.from, 0, t);
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.translate(-cx, -cy);
      }
      this._drawGrid(ctx, layout);
      this._drawCar(ctx, layout);
      ctx.restore();
    }

    this._drawParticles(ctx);
    ctx.restore();
  };

  Game.prototype._drawGrid = function (ctx, layout) {
    const level = this.level;
    const t = layout.tile;
    for (let r = 0; r < level.size; r++) {
      for (let c = 0; c < level.size; c++) {
        const x = layout.originX + c * t;
        const y = layout.originY + r * t;
        this._drawTile(ctx, level.grid[r][c], x, y, t);
      }
    }
  };

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  Game.prototype._drawTile = function (ctx, tile, x, y, size) {
    const pad = size * 0.06;
    // Tile base.
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, x + pad, y + pad, size - pad * 2, size - pad * 2, size * 0.14);
    ctx.fill();
    ctx.save();
    ctx.shadowColor = 'rgba(20,20,30,0.06)';
    ctx.shadowBlur = size * 0.08;
    ctx.fill();
    ctx.restore();

    if (tile.broken) return; // collapsed tiles show only their empty base

    const openings = RC.getOpenings(tile);
    const cx = x + size / 2, cy = y + size / 2;
    const roadColor = tile.mod === 'ice' ? COLORS.ice : (tile.mod === 'speed' ? '#FFD24C' : COLORS.road);
    const w = size * 0.32;

    ctx.strokeStyle = roadColor;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';

    // Bridge: draw one axis first, then the crossing axis with a visible
    // gap at the centre so it reads as an over/under-pass, not a crossroad.
    if (tile.shape === 'bridge') {
      this._strokeAxis(ctx, cx, cy, size, 'N', 'S', w);
      ctx.save();
      ctx.beginPath();
      roundRect(ctx, cx - w * 0.75, cy - w * 0.55, w * 1.5, w * 1.1, w * 0.3);
      ctx.clip();
      ctx.clearRect(x, y, size, size);
      ctx.restore();
      this._strokeAxis(ctx, cx, cy, size, 'E', 'W', w);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy, w * 0.62, 0, Math.PI * 2);
      ctx.fill();
    } else {
      openings.forEach(function (dir) {
        const d = RC.DIR_DELTA[dir];
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + d.dc * size / 2, cy + d.dr * size / 2);
        ctx.stroke();
      });
      ctx.fillStyle = roadColor;
      ctx.beginPath();
      ctx.arc(cx, cy, w / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Modifier overlays.
    if (tile.mod === 'goal') {
      ctx.fillStyle = COLORS.goal;
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = (size * 0.22) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('\u2691', cx, cy + size * 0.01);
    } else if (tile.mod === 'coin' && !tile.collected) {
      ctx.fillStyle = COLORS.coin;
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (tile.mod === 'speed') {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.06, cy - size * 0.14);
      ctx.lineTo(cx + size * 0.07, cy);
      ctx.lineTo(cx - size * 0.02, cy);
      ctx.lineTo(cx + size * 0.06, cy + size * 0.14);
      ctx.lineTo(cx - size * 0.09, cy + size * 0.02);
      ctx.lineTo(cx - size * 0.01, cy + size * 0.02);
      ctx.closePath();
      ctx.fill();
    } else if (tile.mod === 'teleport') {
      ctx.strokeStyle = COLORS.teleport;
      ctx.lineWidth = size * 0.05;
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.16, 0, Math.PI * 2);
      ctx.stroke();
    } else if (tile.mod === 'collapse') {
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.1, cy - size * 0.12);
      ctx.lineTo(cx + size * 0.04, cy + size * 0.02);
      ctx.lineTo(cx - size * 0.02, cy + size * 0.14);
      ctx.stroke();
    }
  };

  Game.prototype._strokeAxis = function (ctx, cx, cy, size, d1, d2, w) {
    const a = RC.DIR_DELTA[d1], b = RC.DIR_DELTA[d2];
    ctx.beginPath();
    ctx.moveTo(cx + a.dc * size / 2, cy + a.dr * size / 2);
    ctx.lineTo(cx + b.dc * size / 2, cy + b.dr * size / 2);
    ctx.stroke();
  };

  Game.prototype._drawCar = function (ctx, layout) {
    if (!this.car) return;
    const t = layout.tile;
    const x = layout.originX + this.car.c * t + t / 2;
    const y = layout.originY + this.car.r * t + t / 2;
    this._carScreenX = x; this._carScreenY = y;

    if (this.car.state === 'falling') return; // hidden, explosion plays instead

    const size = t * 0.5;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.car.angle);

    const color = RC.skinColor(this.car.skin);

    // Wheels (rotate for a subtle "rolling" cue).
    ctx.fillStyle = '#222';
    [[-size * 0.32, -size * 0.28], [-size * 0.32, size * 0.28],
     [size * 0.32, -size * 0.28], [size * 0.32, size * 0.28]].forEach(function (wp) {
      ctx.save();
      ctx.translate(wp[0], wp[1]);
      ctx.rotate(this.car.wheelSpin);
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(-size * 0.09, -size * 0.05, size * 0.18, size * 0.1, size * 0.03)
                    : roundRect(ctx, -size * 0.09, -size * 0.05, size * 0.18, size * 0.1, size * 0.03);
      ctx.fill();
      ctx.restore();
    }, this);

    // Body.
    ctx.fillStyle = color;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = size * 0.15;
    ctx.shadowOffsetY = size * 0.06;
    roundRect(ctx, -size * 0.5, -size * 0.32, size, size * 0.64, size * 0.2);
    ctx.fill();
    ctx.restore();

    // Cabin.
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    roundRect(ctx, -size * 0.16, -size * 0.26, size * 0.5, size * 0.34, size * 0.12);
    ctx.fill();

    // Headlight nub to show facing direction.
    ctx.fillStyle = '#FFE9A8';
    ctx.beginPath();
    ctx.arc(size * 0.48, 0, size * 0.06, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  Game.prototype._drawParticles = function (ctx) {
    this.particles.forEach(function (p) {
      const alpha = RC.clamp(1 - p.age / p.life, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      if (p.type === 'confetti') {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  };

  RC.Game = Game;

})(window.RC = window.RC || {});
