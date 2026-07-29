/**
 * Car.js
 * The car never receives player input. Each tick it either interpolates
 * smoothly between its current tile and a target tile, or - once it has
 * arrived - asks the tile-resolution rules (Tile.js) what happens next:
 * continue to the next tile, collect a coin, teleport, hit the goal, or
 * fall (no valid road under it).
 */
(function (RC) {
  'use strict';

  // Cosmetic skins. Each is drawn procedurally (no image assets), so there is
  // nothing that can ever be "missing" offline. Cost is in coins; 'sports' is
  // unlocked from the start.
  RC.SKINS = [
    { id: 'sports',   name: 'Sports Car', color: '#2D6CDF', cost: 0 },
    { id: 'taxi',     name: 'Taxi',       color: '#F5C518', cost: 50 },
    { id: 'police',   name: 'Police',     color: '#2E3A46', cost: 80 },
    { id: 'fire',     name: 'Fire Truck', color: '#E4432B', cost: 80 },
    { id: 'electric', name: 'Electric',   color: '#28C39B', cost: 120 },
    { id: 'retro',    name: 'Retro',      color: '#B15CDE', cost: 150 }
  ];

  RC.skinColor = function (id) {
    const s = RC.SKINS.find(function (s) { return s.id === id; });
    return s ? s.color : RC.SKINS[0].color;
  };

  const BASE_SPEED = 2.6;   // tiles per second
  const ICE_SPEED_MULT = 1.6;
  const BOOST_SPEED_MULT = 1.9;

  function Car(level, skin) {
    this.level = level;
    this.skin = skin || 'sports';
    this.r = level.start.r;
    this.c = level.start.c;
    this.dir = level.startDir;
    this.fromR = this.r;
    this.fromC = this.c;
    this.toR = this.r;
    this.toC = this.c;
    this.progress = 1; // 1 = settled on current tile, ready to resolve next move
    this.angle = RC.dirToAngle(this.dir);
    this.fromAngle = this.angle;
    this.toAngle = this.angle;
    this.wheelSpin = 0;
    this.state = 'idle'; // idle -> moving -> (falling | finished)
    this.speedMult = 1;
    this.coins = 0;
    this.alive = true;
  }

  RC.dirToAngle = function (dir) {
    return { N: -Math.PI / 2, E: 0, S: Math.PI / 2, W: Math.PI }[dir];
  };

  /** Shortest-path angle lerp helper (avoids the car spinning the long way). */
  function lerpAngle(a, b, t) {
    let diff = b - a;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return a + diff * t;
  }

  /**
   * Attempt to resolve the tile the car is currently standing on and begin
   * moving toward the next cell. Returns an event string describing what
   * happened: 'move' | 'fall' | 'goal' | 'blocked-edge'.
   */
  Car.prototype.resolveTile = function () {
    const level = this.level;
    const tile = level.tileAt(this.r, this.c);
    if (!tile) return 'fall';

    // Collect coin.
    if (tile.mod === 'coin' && !tile.collected) {
      tile.collected = true;
      this.coins++;
      RC.Events.emit('coin');
    }

    if (tile.mod === 'goal') {
      return 'goal';
    }

    const entrySide = RC.opposite(this.dir);
    const exitSide = RC.resolveExit(tile, entrySide, this.dir);
    if (!exitSide) return 'fall';

    let targetR = this.r, targetC = this.c, teleported = false;

    if (tile.mod === 'teleport' && tile.teleportId != null) {
      const pair = level.findTeleportPair(tile.teleportId, this.r, this.c);
      if (pair) {
        targetR = pair.r; targetC = pair.c; teleported = true;
      }
    }

    if (tile.mod === 'collapse') tile.broken = true;

    const delta = RC.DIR_DELTA[exitSide];
    const nextR = teleported ? targetR + delta.dr : this.r + delta.dr;
    const nextC = teleported ? targetC + delta.dc : this.c + delta.dc;

    if (nextR < 0 || nextC < 0 || nextR >= level.size || nextC >= level.size) {
      return 'blocked-edge';
    }

    // Speed modifiers apply based on the tile we are LEAVING.
    if (tile.mod === 'ice') this.speedMult = ICE_SPEED_MULT;
    else if (tile.mod === 'speed') this.speedMult = BOOST_SPEED_MULT;
    else this.speedMult = 1;

    this.fromR = teleported ? targetR : this.r;
    this.fromC = teleported ? targetC : this.c;
    this.toR = nextR;
    this.toC = nextC;
    this.dir = exitSide;
    this.fromAngle = this.angle;
    this.toAngle = RC.dirToAngle(exitSide);
    // Keep visual continuity: if teleporting, snap position without a long spin.
    if (teleported) this.fromAngle = this.toAngle;
    this.progress = 0;
    this.state = 'moving';
    return 'move';
  };

  /** Advance the car simulation by dt seconds. Returns an event, if any. */
  Car.prototype.update = function (dt) {
    if (!this.alive || this.state === 'finished') return null;

    if (this.progress >= 1) {
      const event = this.resolveTile();
      if (event === 'fall' || event === 'blocked-edge') {
        this.alive = false;
        this.state = 'falling';
        return 'fall';
      }
      if (event === 'goal') {
        this.state = 'finished';
        return 'goal';
      }
      // 'move' falls through to interpolation below on next call.
      return null;
    }

    const speed = BASE_SPEED * this.speedMult;
    this.progress = Math.min(1, this.progress + dt * speed);
    const t = RC.easeInOutQuad(this.progress);
    this.r = RC.lerp(this.fromR, this.toR, t);
    this.c = RC.lerp(this.fromC, this.toC, t);
    this.angle = lerpAngle(this.fromAngle, this.toAngle, t);
    this.wheelSpin += dt * speed * 8;
    return null;
  };

  /** Remap car coordinates when the whole world rotates (see Level.rotate). */
  Car.prototype.remapForRotation = function (dir) {
    const level = this.level;
    const a = level.remapCoord(Math.round(this.fromR), Math.round(this.fromC), dir);
    const b = level.remapCoord(Math.round(this.toR), Math.round(this.toC), dir);
    const cur = level.remapCoord(this.r, this.c, dir);
    this.fromR = a.r; this.fromC = a.c;
    this.toR = b.r; this.toC = b.c;
    this.r = cur.r; this.c = cur.c;
    // dir (screen-space facing) intentionally stays the same - the car does
    // not turn just because the city rotated around it.
  };

  RC.Car = Car;

})(window.RC = window.RC || {});
