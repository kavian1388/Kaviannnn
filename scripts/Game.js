/**
 * Game.js
 * The conductor. Owns the game loop, the current RuntimeLevel, the
 * player/bullet/camera/particles, and every gameplay rule: aiming,
 * firing, bounce counting, combos, perfect shots, star scoring, coin
 * rewards, and wiring results back into Save/Mission/Achievement
 * managers. UI.js only ever gets told *what* to show, never *why*.
 */
class Game {
  constructor(canvas) {
    this.renderer = new Renderer(canvas);
    this.camera = new Camera();
    this.slowMo = new SlowMotion();
    this.particles = new ParticleSystem(500);

    this.state = 'menu'; // menu | aiming | flying | won | lost
    this.level = null;
    this.player = null;
    this.bullet = null;
    this.levelId = 1;

    this.roundStartTime = 0;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.roundEnemiesKilled = 0;
    this.roundCoins = 0;
    this.roundPerfectShots = 0;
    this.roundHadFail = false;

    this.input = new InputController(canvas, this.renderer, {
      onDragStart: () => { if (this.state === 'aiming') this._aimVec = { x: 0, y: 0 }; },
      onDragMove: (dx, dy) => this.onAimMove(dx, dy),
      onDragEnd: (dx, dy) => this.onFire(dx, dy),
    });

    this._lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  // ---------------- Level lifecycle ----------------
  loadLevel(id) {
    this.levelId = id;
    this.level = LevelManager.buildRuntime(id);
    this.player = new Player(this.level.playerStart.x, this.level.playerStart.y);
    this.bullet = null;
    this.particles.clear();
    this.camera.reset();
    this.slowMo.reset();
    this.state = 'aiming';
    this._aimVec = { x: 0, y: 0 };
    this._predicted = null;

    this.comboCount = 0;
    this.comboTimer = 0;
    this.roundEnemiesKilled = 0;
    this.roundCoins = 0;
    this.roundPerfectShots = 0;
    this.roundHadFail = false;
    this.roundStartTime = performance.now();

    UI.setHudLevel(id);
    UI.setHudCoins(Save.get().coins);
    UI.setHudBounces(0, this.level.maxBounces);
    this.input.setEnabled(true);
    UI.show('game');
  }

  restartLevel() {
    this.roundHadFail = true; // a retry within the round counts against "no fail" mission
    this.loadLevel(this.levelId);
  }

  pause() {
    this.paused = true;
    this.input.setEnabled(false);
  }

  resume() {
    this.paused = false;
    if (this.state === 'aiming') this.input.setEnabled(true);
    this._lastTime = performance.now();
  }

  // ---------------- Aiming ----------------
  onAimMove(dx, dy) {
    if (this.state !== 'aiming') return;
    this._aimVec = { x: dx, y: dy };
    const angle = Math.atan2(dy, dx);
    this.player.setAim(angle);

    const power = Utils.clamp(Math.hypot(dx, dy) * 3.2, Physics.MIN_LAUNCH_SPEED, Physics.MAX_LAUNCH_SPEED);
    const vx = Math.cos(angle) * power;
    const vy = Math.sin(angle) * power;
    this._predicted = Bullet.simulate(this.player.x, this.player.y - 14, vx, vy, this.level);
  }

  onFire(dx, dy) {
    if (this.state !== 'aiming') return;
    const dist = Math.hypot(dx, dy);
    if (dist < 12) { this._predicted = null; return; } // ignore accidental taps

    const angle = Math.atan2(dy, dx);
    const power = Utils.clamp(dist * 3.2, Physics.MIN_LAUNCH_SPEED, Physics.MAX_LAUNCH_SPEED);
    const vx = Math.cos(angle) * power;
    const vy = Math.sin(angle) * power;

    this.player.setAim(angle);
    this.player.fireRecoil();
    this.player.weapon.triggerMuzzleFlash();
    AudioEngine.sfx.shoot();
    this.camera.shake(4, 0.12);

    this.bullet = new Bullet(this.player.x, this.player.y - 14, vx, vy);
    this._predicted = null;
    this.state = 'flying';
    this.input.setEnabled(false);

    Save.update((s) => { s.stats.bulletsFired += 1; });
  }

  // ---------------- Round resolution ----------------
  onEnemyKilled() {
    this.roundEnemiesKilled += 1;
    this.comboCount += 1;
    this.comboTimer = 0.45;
    if (this.comboCount >= 2) {
      UI.showCombo(this.comboCount);
      AudioEngine.sfx.combo(this.comboCount);
      Save.update((s) => { s.stats.longestCombo = Math.max(s.stats.longestCombo, this.comboCount); });
    }
    const coinGain = 10 + (this.comboCount > 1 ? this.comboCount * 5 : 0);
    this.roundCoins += coinGain;
    Save.update((s) => { s.coins += coinGain; });
    UI.setHudCoins(Save.get().coins);
    UI.flashCoins(coinGain);
    Save.update((s) => { s.stats.enemiesDestroyed += 1; });
  }

  computeStars(bounces, elapsedSec) {
    const par = this.level.par;
    const target = this.level.timeTarget;
    const bouncesOk3 = bounces <= par;
    const timeOk3 = elapsedSec <= target;
    if (bouncesOk3 && timeOk3) return 3;
    const bouncesOk2 = bounces <= par + 2;
    const timeOk2 = elapsedSec <= target * 1.5;
    if (bouncesOk2 || timeOk2) return 2;
    return 1;
  }

  finishWin() {
    this.state = 'won';
    this.input.setEnabled(false);
    const elapsedSec = (performance.now() - this.roundStartTime) / 1000;
    const bounces = this.bullet ? this.bullet.bounces : 0;
    const perfect = bounces <= this.level.par;
    const stars = this.computeStars(bounces, elapsedSec);

    let bonus = 0;
    if (perfect) {
      bonus += 40;
      this.roundPerfectShots += 1;
      UI.showPerfect();
      Save.update((s) => { s.stats.perfectShots += 1; });
    }
    bonus += stars * 15;
    this.roundCoins += bonus;

    Save.update((s) => {
      s.coins += bonus;
      s.stats.levelsCompleted += 1;
      s.stats.totalPlayTimeSec += elapsedSec;
      const prevStars = s.levelStars[this.levelId] || 0;
      s.levelStars[this.levelId] = Math.max(prevStars, stars);
      if (this.levelId === s.currentLevel && s.currentLevel < LevelManager.totalLevels()) {
        s.currentLevel += 1;
      }
    });

    AudioEngine.sfx.win();
    if (navigator.vibrate && Save.get().settings.haptics) navigator.vibrate([20, 40, 20]);
    for (let i = 0; i < 3; i++) {
      setTimeout(() => this.particles.emitConfetti(this.level.width / 2, this.level.height / 2), i * 90);
    }
    AchievementManager.checkAll();
    MissionManager.reportRoundResult({
      won: true,
      enemiesKilled: this.roundEnemiesKilled,
      coinsEarned: this.roundCoins,
      perfectShots: this.roundPerfectShots,
      noFail: !this.roundHadFail,
    });

    UI.showWin({
      levelId: this.levelId,
      stars,
      coinsEarned: this.roundCoins,
      perfect,
      bounces,
      par: this.level.par,
    });
  }

  finishLose() {
    this.state = 'lost';
    this.input.setEnabled(false);
    AudioEngine.sfx.lose();
    if (navigator.vibrate && Save.get().settings.haptics) navigator.vibrate(80);
    MissionManager.reportRoundResult({
      won: false,
      enemiesKilled: this.roundEnemiesKilled,
      coinsEarned: this.roundCoins,
      perfectShots: 0,
      noFail: false,
    });
    UI.showLose(this.levelId);
  }

  // ---------------- Main loop ----------------
  loop(now) {
    const rawDt = Math.min(0.033, (now - this._lastTime) / 1000);
    this._lastTime = now;
    const dt = rawDt * this.slowMo.scale;

    this.renderer.renderBackground(rawDt);

    if (this.level) {
      if (!this.paused) {
        this.level.update(dt);
        this.player.update(dt, this.state === 'aiming');
        this.player.weapon.update(dt);

        if (this.state === 'flying' && this.bullet) {
          const events = this.bullet.step(dt, this.level, this.particles);
          this.handleBulletEvents(events);
        }

        if (this.comboTimer > 0) {
          this.comboTimer -= rawDt;
          if (this.comboTimer <= 0) this.comboCount = 0;
        }

        this.particles.update(dt);
      }

      this.renderScene();
    } else {
      this.renderer.beginWorldTransform(this.camera);
      this.renderer.renderAmbientParticles();
      this.renderer.endWorldTransform();
    }

    requestAnimationFrame((t) => this.loop(t));
  }

  handleBulletEvents(events) {
    for (const ev of events) {
      if (ev.type === 'bounce') {
        AudioEngine.sfx.bounce(1 + Math.min(this.bullet.bounces * 0.05, 0.6));
        this.particles.emitSpark(ev.x, ev.y, 10, SkinManager.getEquippedSkinData().glow);
        this.camera.shake(6, 0.15);
        this.camera.punchZoom(0.03, 0.25);
        this.slowMo.pulse(0.2, 0.03, 0.28);
        if (navigator.vibrate && Save.get().settings.haptics) navigator.vibrate(8);
        UI.setHudBounces(this.bullet.bounces, this.level.maxBounces);
        if (this.bullet.bounces > this.level.maxBounces && this.state === 'flying') {
          this.state = 'ended-pending-lose';
          this.bullet.alive = false; // the bullet has run out of energy and stops
        }
      } else if (ev.type === 'teleport') {
        AudioEngine.sfx.teleport();
        this.particles.emitSpark(ev.x, ev.y, 16, '#00f6ff');
      } else if (ev.type === 'enemyHit') {
        AudioEngine.sfx.hit();
        this.particles.emitImpact(ev.x, ev.y);
        this.camera.shake(9, 0.18);
        if (ev.killed) this.onEnemyKilled();
      } else if (ev.type === 'died') {
        if (this.state === 'flying' || this.state === 'ended-pending-lose') {
          this.state = 'ended-pending-lose';
        }
      }
    }

    if (this.level.allEnemiesDead() && (this.state === 'flying' || this.state === 'ended-pending-lose')) {
      this.finishWin();
      return;
    }
    if (this.state === 'ended-pending-lose' && !this.bullet.alive) {
      this.finishLose();
    }
  }

  renderScene() {
    this.renderer.beginWorldTransform(this.camera);
    const ctx = this.renderer.ctx;

    this.renderer.renderAmbientParticles();
    this.level.renderZones(ctx);
    this.level.renderWalls(ctx);
    this.level.renderTeleporters(ctx, performance.now() / 1000);

    for (const enemy of this.level.enemies) enemy.render(ctx);

    if (this._predicted && this.state === 'aiming') {
      this.renderer.renderTrajectory(this._predicted.points, this._predicted.bounceMarkers, SkinManager.getEquippedSkinData().glow);
    }

    this.player.render(ctx);
    if (this.bullet) this.bullet.render(ctx);
    this.particles.render(ctx);

    this.renderer.endWorldTransform();
  }
}
