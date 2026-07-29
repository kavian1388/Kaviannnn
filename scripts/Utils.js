/**
 * Utils.js
 * Shared math / direction / RNG helpers used by every other module.
 * Attached to the global RC namespace so plain <script> tags can share it
 * without needing a bundler or ES module support (keeps file:// usage safe).
 */
(function (RC) {
  'use strict';

  // Screen-space fixed directions. These NEVER rotate with the world -
  // rotating the city changes which tile sits where, not which way the
  // car is facing on screen. That distinction is the heart of the game.
  RC.DIR = { N: 'N', E: 'E', S: 'S', W: 'W' };

  // Order used for rotation math (clockwise cycle).
  const CW_ORDER = ['N', 'E', 'S', 'W'];

  /** Row/col delta for a screen direction. */
  RC.DIR_DELTA = {
    N: { dr: -1, dc: 0 },
    E: { dr: 0, dc: 1 },
    S: { dr: 1, dc: 0 },
    W: { dr: 0, dc: -1 }
  };

  /** Opposite of a direction, e.g. opposite('N') === 'S'. */
  RC.opposite = function (dir) {
    return { N: 'S', S: 'N', E: 'W', W: 'E' }[dir];
  };

  /** Rotate a direction clockwise `times` steps (times may be negative). */
  RC.rotateDir = function (dir, times) {
    const idx = CW_ORDER.indexOf(dir);
    const next = (((idx + times) % 4) + 4) % 4;
    return CW_ORDER[next];
  };

  RC.clamp = function (v, min, max) {
    return Math.max(min, Math.min(max, v));
  };

  RC.lerp = function (a, b, t) {
    return a + (b - a) * t;
  };

  RC.easeInOutQuad = function (t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  };

  RC.easeOutBack = function (t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };

  /** Deterministic seeded RNG (mulberry32) so generated levels are stable. */
  RC.makeRng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  RC.randInt = function (rng, min, max) {
    return Math.floor(rng() * (max - min + 1)) + min;
  };

  RC.choice = function (rng, arr) {
    return arr[Math.floor(rng() * arr.length)];
  };

  /** Rotate an NxN grid array 90 degrees clockwise (returns new array). */
  RC.rotateMatrixCW = function (grid) {
    const N = grid.length;
    const out = [];
    for (let r = 0; r < N; r++) {
      out.push(new Array(N));
    }
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        // out[c][N-1-r] = grid[r][c]
        out[c][N - 1 - r] = grid[r][c];
      }
    }
    return out;
  };

  RC.rotateMatrixCCW = function (grid) {
    const N = grid.length;
    const out = [];
    for (let r = 0; r < N; r++) {
      out.push(new Array(N));
    }
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        // out[N-1-c][r] = grid[r][c]
        out[N - 1 - c][r] = grid[r][c];
      }
    }
    return out;
  };

  /** Coordinate transform matching rotateMatrixCW (where does (r,c) move to). */
  RC.coordAfterCW = function (r, c, N) {
    return { r: c, c: N - 1 - r };
  };

  RC.coordAfterCCW = function (r, c, N) {
    return { r: N - 1 - c, c: r };
  };

  /** Tiny pub/sub event bus so modules (Audio, UI, Game) stay decoupled. */
  RC.Events = (function () {
    const listeners = {};
    return {
      on: function (name, fn) {
        (listeners[name] = listeners[name] || []).push(fn);
      },
      emit: function (name, payload) {
        (listeners[name] || []).forEach(function (fn) { fn(payload); });
      }
    };
  })();

})(window.RC = window.RC || {});
