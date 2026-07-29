/**
 * Generator.js
 * Procedurally builds a level:
 *   1. Walk a random, self-avoiding, generally-downward path from the top
 *      row to the bottom row of an NxN grid.
 *   2. Assign each path cell the exact shape+rotation ("straight" or
 *      "corner") needed to connect its neighbours - i.e. a layout that is
 *      trivially solvable with ZERO rotation.
 *   3. Sprinkle coins / ice / speed modifiers along the path for flavor.
 *   4. Fill every remaining (non-path) cell with random decorative shapes -
 *      the car never steps on these, so they can't create ambiguity.
 *   5. Rotate the ENTIRE finished city by a random amount (1-3 steps) and
 *      store that as the level's starting orientation. Because a whole-grid
 *      rotation is invertible, the level is always solvable (by finding and
 *      applying the correct total rotation), while still requiring the
 *      player to figure out and perform it under time pressure.
 *
 * This same module is used both by the live game (Endless Mode) and by the
 * offline Node build script that produced levels/levels.js (see
 * levels/generateLevels.js for that script; it duplicates the constants
 * here in a Node-friendly form so the browser never needs a bundler).
 */
(function (RC) {
  'use strict';

  const DECOR_SHAPES = ['straight', 'corner', 'cross', 't', 'dead'];

  function pickRotationFor(shape, neededOpenSet) {
    for (let rot = 0; rot < 4; rot++) {
      const tile = RC.makeTile(shape, rot, null);
      const openings = RC.getOpenings(tile);
      const ok = neededOpenSet.every(function (d) { return openings.indexOf(d) !== -1; });
      if (ok && openings.length === neededOpenSet.length) return rot;
    }
    return 0;
  }

  /** Random self-avoiding path from row 0 to row N-1, biased downward. */
  function buildPath(rng, N) {
    const startC = RC.randInt(rng, 0, N - 1);
    let path = [{ r: 0, c: startC }];
    const visited = new Set(['0,' + startC]);

    let guard = 0;
    while (path[path.length - 1].r < N - 1 && guard < N * N * 6) {
      guard++;
      const cur = path[path.length - 1];
      const options = [];
      // Weighted choices: prefer moving down, allow sideways for variety.
      const candidates = [
        { r: cur.r + 1, c: cur.c, w: 5 },
        { r: cur.r, c: cur.c + 1, w: 2 },
        { r: cur.r, c: cur.c - 1, w: 2 }
      ];
      candidates.forEach(function (cand) {
        if (cand.r < 0 || cand.r >= N || cand.c < 0 || cand.c >= N) return;
        if (visited.has(cand.r + ',' + cand.c)) return;
        for (let i = 0; i < cand.w; i++) options.push(cand);
      });
      if (options.length === 0) {
        // Dead end in the walk - backtrack.
        path.pop();
        if (path.length === 0) { path = [{ r: 0, c: startC }]; visited.clear(); visited.add('0,' + startC); }
        continue;
      }
      const next = RC.choice(rng, options);
      visited.add(next.r + ',' + next.c);
      path.push(next);
    }
    return path;
  }

  /**
   * Generate one full level definition object (same shape consumed by
   * Level.js after going through the compact encode/decode - here we build
   * Tile-ready data directly since this runs in-browser for Endless mode).
   */
  RC.generateLevel = function (levelNumber, seed) {
    const rng = RC.makeRng(seed >>> 0);
    const N = RC.clamp(5 + Math.floor((levelNumber - 1) / 12), 5, 11);
    const path = buildPath(rng, N);
    const finish = path[path.length - 1];

    // Build blank grid filled with decoration first.
    const grid = [];
    for (let r = 0; r < N; r++) {
      const row = [];
      for (let c = 0; c < N; c++) {
        const shape = RC.choice(rng, DECOR_SHAPES);
        row.push(RC.makeTile(shape, RC.randInt(rng, 0, 3), null));
      }
      grid.push(row);
    }

    // Lay the guaranteed-solvable path (solved at rotation 0).
    for (let i = 0; i < path.length; i++) {
      const cell = path[i];
      const prev = path[i - 1];
      const next = path[i + 1];
      const needed = [];
      // See levels/generateLevels.js for why the first tile gets a virtual
      // north entry: the car always starts as if driving in from the top
      // edge of the world.
      if (prev) needed.push(dirBetween(cell, prev));
      else needed.push('N');
      if (next) needed.push(dirBetween(cell, next));

      let shape, rot, mod = null;
      if (!next) {
        shape = 'goal'; rot = 0; mod = 'goal';
      } else if (needed.length === 1) {
        shape = 'dead'; rot = pickRotationFor('dead', needed);
      } else {
        const isStraightLine = needed[0] === RC.opposite(needed[1]);
        shape = isStraightLine ? 'straight' : 'corner';
        rot = pickRotationFor(shape, needed);
      }

      // Flavor modifiers on mid-path tiles only.
      if (mod === null && i > 0 && i < path.length - 1) {
        const roll = rng();
        const complexity = RC.clamp((levelNumber - 1) / 100, 0, 1);
        if (roll < 0.16) mod = 'coin';
        else if (roll < 0.16 + 0.05 * complexity) mod = 'ice';
        else if (roll < 0.16 + 0.10 * complexity) mod = 'speed';
      }

      grid[cell.r][cell.c] = RC.makeTile(shape, rot, mod);
    }

    // Scramble: rotate the whole finished city by a random 1-3 steps so the
    // player must discover the correct un-rotation before/while the car runs.
    const scrambleSteps = 1 + Math.floor(rng() * 3); // 1..3
    let liveGrid = grid;
    let startPos = { r: 0, c: path[0].c };
    let finishPos = { r: finish.r, c: finish.c };
    for (let s = 0; s < scrambleSteps; s++) {
      liveGrid = RC.rotateMatrixCW(liveGrid);
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        liveGrid[r][c].rotation = (liveGrid[r][c].rotation + 1) % 4;
      }
      startPos = RC.coordAfterCW(startPos.r, startPos.c, N);
      finishPos = RC.coordAfterCW(finishPos.r, finishPos.c, N);
    }

    return {
      id: 'endless-' + levelNumber,
      size: N,
      grid: liveGrid,
      start: startPos,
      startDir: 'S',
      finish: finishPos
    };
  };

  function dirBetween(from, to) {
    if (to.r === from.r + 1) return 'S';
    if (to.r === from.r - 1) return 'N';
    if (to.c === from.c + 1) return 'E';
    return 'W';
  }

})(window.RC = window.RC || {});
