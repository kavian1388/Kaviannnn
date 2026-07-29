/**
 * Level.js
 * Owns the live grid of Tile instances for the level currently being played,
 * builds it from compact JSON level data, and performs the whole-city
 * 90-degree rotation (the core mechanic).
 */
(function (RC) {
  'use strict';

  function Level(data) {
    this.id = data.id;
    this.size = data.grid.length;
    this.start = { r: data.start[0], c: data.start[1] };
    this.startDir = data.startDir || 'S';
    this.finish = { r: data.finish[0], c: data.finish[1] };
    this.coinTarget = 0;
    this.grid = this._buildGrid(data.grid);
  }

  /**
   * Build a Level directly from a Generator.js output, which already
   * contains live Tile instances (used for Endless Mode) rather than the
   * compact JSON encoding used by the 100 handcrafted/static levels.
   */
  Level.fromGenerated = function (data) {
    const lvl = Object.create(Level.prototype);
    lvl.id = data.id;
    lvl.size = data.size;
    lvl.start = { r: data.start.r, c: data.start.c };
    lvl.startDir = data.startDir || 'S';
    lvl.finish = { r: data.finish.r, c: data.finish.c };
    lvl.grid = data.grid;
    lvl.coinTarget = 0;
    for (let r = 0; r < lvl.size; r++) {
      for (let c = 0; c < lvl.size; c++) {
        if (lvl.grid[r][c].mod === 'coin') lvl.coinTarget++;
      }
    }
    return lvl;
  };

  // Compact cell encoding: [shapeCode, rotation, modCode, extra]
  const SHAPE_CODE = { S: 'straight', C: 'corner', X: 'cross', T: 't', D: 'dead', B: 'bridge', G: 'goal' };
  const MOD_CODE = { i: 'ice', v: 'speed', o: 'coin', l: 'collapse', p: 'teleport', g: 'goal' };

  Level.prototype._buildGrid = function (raw) {
    const grid = [];
    for (let r = 0; r < raw.length; r++) {
      const row = [];
      for (let c = 0; c < raw[r].length; c++) {
        const cell = raw[r][c];
        const shape = SHAPE_CODE[cell[0]] || 'straight';
        const rotation = cell[1] || 0;
        const mod = cell[2] ? MOD_CODE[cell[2]] : null;
        const extra = cell[3] != null ? { teleportId: cell[3] } : null;
        const tile = RC.makeTile(shape, rotation, mod, extra);
        if (mod === 'coin') this.coinTarget++;
        row.push(tile);
      }
      grid.push(row);
    }
    return grid;
  };

  Level.prototype.tileAt = function (r, c) {
    if (r < 0 || c < 0 || r >= this.size || c >= this.size) return null;
    return this.grid[r][c];
  };

  /**
   * Rotate the entire city 90 degrees. `dir` is 'left' (CCW) or 'right' (CW).
   * Returns the new {r,c} of any tracked point (e.g. the car) so callers can
   * remap positions consistently with the grid transform.
   */
  Level.prototype.rotate = function (dir) {
    const N = this.size;
    const cw = dir === 'right';
    this.grid = cw ? RC.rotateMatrixCW(this.grid) : RC.rotateMatrixCCW(this.grid);
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const t = this.grid[r][c];
        t.rotation = ((t.rotation + (cw ? 1 : -1)) % 4 + 4) % 4;
      }
    }
  };

  /** Remap a single (r,c) coordinate the same way rotate() remaps the grid. */
  Level.prototype.remapCoord = function (r, c, dir) {
    const N = this.size;
    return dir === 'right' ? RC.coordAfterCW(r, c, N) : RC.coordAfterCCW(r, c, N);
  };

  /** Find the paired teleport tile matching `id`, excluding (r,c) itself. */
  Level.prototype.findTeleportPair = function (id, r, c) {
    for (let rr = 0; rr < this.size; rr++) {
      for (let cc = 0; cc < this.size; cc++) {
        if (rr === r && cc === c) continue;
        const t = this.grid[rr][cc];
        if (t.mod === 'teleport' && t.teleportId === id) return { r: rr, c: cc };
      }
    }
    return null;
  };

  RC.Level = Level;

})(window.RC = window.RC || {});
