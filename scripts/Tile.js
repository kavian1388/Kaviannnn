/**
 * Tile.js
 * Defines the tile "shapes" (which sides are physically open at rotation 0)
 * and tile "modifiers" (gameplay effects layered on top of a shape: ice,
 * speed, coin, collapse, teleport, goal).
 */
(function (RC) {
  'use strict';

  // Base openings per shape at rotation 0. 'bridge' is special: it has two
  // independent through-paths (N-S and E-W) that do NOT connect to each other.
  RC.SHAPES = {
    straight: { open: ['N', 'S'] },
    corner:   { open: ['N', 'E'] },
    cross:    { open: ['N', 'E', 'S', 'W'] },
    t:        { open: ['N', 'E', 'S'] },
    dead:     { open: ['N'] },
    bridge:   { open: ['N', 'S', 'E', 'W'], bridge: true },
    goal:     { open: ['N', 'E', 'S', 'W'] } // accepts arrival from any side
  };

  /** Tile instance factory. */
  RC.makeTile = function (shape, rotation, mod, extra) {
    return {
      shape: shape,
      rotation: ((rotation % 4) + 4) % 4,
      mod: mod || null,           // 'ice' | 'speed' | 'coin' | 'collapse' | 'teleport' | 'goal' | null
      teleportId: extra && extra.teleportId != null ? extra.teleportId : null,
      collected: false,           // for coin tiles
      broken: false               // for collapse tiles, after car passes
    };
  };

  /** Effective open sides of a tile at its current rotation. */
  RC.getOpenings = function (tile) {
    const base = RC.SHAPES[tile.shape].open;
    return base.map(function (d) { return RC.rotateDir(d, tile.rotation); });
  };

  /**
   * Given the entry side (where the car is coming FROM, i.e. the side of
   * this tile that must be open), determine the exit side. Returns null if
   * the tile cannot be entered from that side (car should fall).
   * For junctions (t/cross) we deterministically prefer: continue straight >
   * turn right > turn left, so there is never player ambiguity about path -
   * only the world's rotation affects the outcome.
   */
  RC.resolveExit = function (tile, entrySide, currentDir) {
    const openings = RC.getOpenings(tile);
    if (openings.indexOf(entrySide) === -1) return null; // not open on entry side -> fall

    if (tile.shape === 'bridge') {
      // Independent axis pass-through: N<->S and E<->W only.
      const axis = (entrySide === 'N' || entrySide === 'S') ? ['N', 'S'] : ['E', 'W'];
      return axis[0] === entrySide ? axis[1] : axis[0];
    }

    const candidates = openings.filter(function (d) { return d !== entrySide; });
    if (candidates.length === 0) return null; // dead end
    if (candidates.length === 1) return candidates[0];

    // Multiple possible exits (t-junction or cross): prefer straight, then right, then left.
    const straight = currentDir;
    const right = RC.rotateDir(currentDir, 1);
    const left = RC.rotateDir(currentDir, -1);
    if (candidates.indexOf(straight) !== -1) return straight;
    if (candidates.indexOf(right) !== -1) return right;
    if (candidates.indexOf(left) !== -1) return left;
    return candidates[0];
  };

})(window.RC = window.RC || {});
