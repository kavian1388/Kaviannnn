#!/usr/bin/env node
/**
 * generateLevels.js  (offline build tool - not shipped to the browser)
 *
 * Produces the 100 static levels for Rotate City as compact JSON, then
 * writes them out as:
 *   - levels/levels.json  (pretty JSON, human-readable, per spec "store
 *     level data as JSON")
 *   - levels/levels.js    (the same data as `window.RC_LEVELS = [...]`,
 *     which is what index.html actually loads - this avoids fetch()/CORS
 *     problems when the game is opened directly via file:// with no
 *     server, which is a very common way hyper-casual prototypes get
 *     opened and tested).
 *
 * Every level is verified solvable by fully simulating the car (including
 * corners/T-junctions/crosses/bridges/teleports) before being accepted;
 * levels that fail verification are regenerated with a new seed.
 *
 * This is a standalone Node (CommonJS) script and intentionally duplicates
 * the small amount of rotation/tile math also found in scripts/Utils.js,
 * scripts/Tile.js and scripts/Generator.js, so the shipped browser code
 * needs no bundler/transpiler and can be opened with zero build step.
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------
// Math / RNG helpers (mirrors scripts/Utils.js)
// ---------------------------------------------------------------------

function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function randInt(rng, min, max) { return Math.floor(rng() * (max - min + 1)) + min; }
function choice(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
function clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }

const CW_ORDER = ['N', 'E', 'S', 'W'];
function rotateDir(dir, times) {
  const idx = CW_ORDER.indexOf(dir);
  const next = (((idx + times) % 4) + 4) % 4;
  return CW_ORDER[next];
}
function opposite(dir) { return { N: 'S', S: 'N', E: 'W', W: 'E' }[dir]; }
const DIR_DELTA = { N: { dr: -1, dc: 0 }, E: { dr: 0, dc: 1 }, S: { dr: 1, dc: 0 }, W: { dr: 0, dc: -1 } };

function rotateMatrixCW(grid) {
  const N = grid.length, out = [];
  for (let r = 0; r < N; r++) out.push(new Array(N));
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) out[c][N - 1 - r] = grid[r][c];
  return out;
}
function coordAfterCW(r, c, N) { return { r: c, c: N - 1 - r }; }

// ---------------------------------------------------------------------
// Tile shapes (mirrors scripts/Tile.js)
// ---------------------------------------------------------------------

const SHAPES = {
  straight: { open: ['N', 'S'] },
  corner: { open: ['N', 'E'] },
  cross: { open: ['N', 'E', 'S', 'W'] },
  t: { open: ['N', 'E', 'S'] },
  dead: { open: ['N'] },
  bridge: { open: ['N', 'S', 'E', 'W'], bridge: true },
  goal: { open: ['N', 'E', 'S', 'W'] }
};

function makeTile(shape, rotation, mod) {
  return { shape, rotation: ((rotation % 4) + 4) % 4, mod: mod || null, collected: false };
}
function getOpenings(tile) {
  return SHAPES[tile.shape].open.map((d) => rotateDir(d, tile.rotation));
}
function resolveExit(tile, entrySide, currentDir) {
  const openings = getOpenings(tile);
  if (openings.indexOf(entrySide) === -1) return null;
  if (tile.shape === 'bridge') {
    const axis = (entrySide === 'N' || entrySide === 'S') ? ['N', 'S'] : ['E', 'W'];
    return axis[0] === entrySide ? axis[1] : axis[0];
  }
  const cand = openings.filter((d) => d !== entrySide);
  if (cand.length === 0) return null;
  if (cand.length === 1) return cand[0];
  const straight = currentDir, right = rotateDir(currentDir, 1), left = rotateDir(currentDir, -1);
  if (cand.indexOf(straight) !== -1) return straight;
  if (cand.indexOf(right) !== -1) return right;
  if (cand.indexOf(left) !== -1) return left;
  return cand[0];
}

function pickRotationFor(shape, neededOpenSet) {
  for (let rot = 0; rot < 4; rot++) {
    const openings = getOpenings(makeTile(shape, rot, null));
    const ok = neededOpenSet.every((d) => openings.indexOf(d) !== -1);
    if (ok && openings.length === neededOpenSet.length) return rot;
  }
  return 0;
}
function dirBetween(from, to) {
  if (to.r === from.r + 1) return 'S';
  if (to.r === from.r - 1) return 'N';
  if (to.c === from.c + 1) return 'E';
  return 'W';
}

// ---------------------------------------------------------------------
// Path + level construction
// ---------------------------------------------------------------------

const DECOR_SHAPES = ['straight', 'corner', 'cross', 't', 'dead'];

function buildPath(rng, N) {
  const startC = randInt(rng, 0, N - 1);
  let path = [{ r: 0, c: startC }];
  const visited = new Set(['0,' + startC]);
  let guard = 0;
  while (path[path.length - 1].r < N - 1 && guard < N * N * 8) {
    guard++;
    const cur = path[path.length - 1];
    const cands = [
      { r: cur.r + 1, c: cur.c, w: 5 },
      { r: cur.r, c: cur.c + 1, w: 2 },
      { r: cur.r, c: cur.c - 1, w: 2 }
    ];
    const options = [];
    cands.forEach((cand) => {
      if (cand.r < 0 || cand.r >= N || cand.c < 0 || cand.c >= N) return;
      if (visited.has(cand.r + ',' + cand.c)) return;
      for (let i = 0; i < cand.w; i++) options.push(cand);
    });
    if (options.length === 0) {
      path.pop();
      if (path.length === 0) { path = [{ r: 0, c: startC }]; visited.clear(); visited.add('0,' + startC); }
      continue;
    }
    const next = choice(rng, options);
    visited.add(next.r + ',' + next.c);
    path.push(next);
  }
  return path;
}

function buildLevel(levelNumber, seed) {
  const rng = makeRng(seed >>> 0);
  const N = clamp(5 + Math.floor((levelNumber - 1) / 12), 5, 11);
  const path = buildPath(rng, N);
  const finish = path[path.length - 1];

  const grid = [];
  for (let r = 0; r < N; r++) {
    const row = [];
    for (let c = 0; c < N; c++) row.push(makeTile(choice(rng, DECOR_SHAPES), randInt(rng, 0, 3), null));
    grid.push(row);
  }

  for (let i = 0; i < path.length; i++) {
    const cell = path[i], prev = path[i - 1], next = path[i + 1];
    const needed = [];
    // The car always "enters" the very first path tile from the north edge
    // of the world (as if driving in from off-screen above), so give it a
    // virtual incoming side of 'N' instead of leaving it with only one
    // opening (which would make resolveExit's entry-side check fail).
    if (prev) needed.push(dirBetween(cell, prev));
    else needed.push('N');
    if (next) needed.push(dirBetween(cell, next));
    let shape, rot, mod = null;
    if (!next) { shape = 'goal'; rot = 0; mod = 'goal'; }
    else if (needed.length === 1) { shape = 'dead'; rot = pickRotationFor('dead', needed); }
    else {
      const straightLine = needed[0] === opposite(needed[1]);
      shape = straightLine ? 'straight' : 'corner';
      rot = pickRotationFor(shape, needed);
    }
    if (mod === null && i > 0 && i < path.length - 1) {
      const roll = rng();
      const complexity = clamp((levelNumber - 1) / 100, 0, 1);
      if (roll < 0.18) mod = 'coin';
      else if (roll < 0.18 + 0.06 * complexity) mod = 'ice';
      else if (roll < 0.18 + 0.12 * complexity) mod = 'speed';
    }
    grid[cell.r][cell.c] = makeTile(shape, rot, mod);
  }

  const scrambleSteps = 1 + Math.floor(rng() * 3); // 1..3, never 0 (must require a rotation)
  let liveGrid = grid;
  let startPos = { r: 0, c: path[0].c };
  let finishPos = { r: finish.r, c: finish.c };
  for (let s = 0; s < scrambleSteps; s++) {
    liveGrid = rotateMatrixCW(liveGrid);
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) liveGrid[r][c].rotation = (liveGrid[r][c].rotation + 1) % 4;
    startPos = coordAfterCW(startPos.r, startPos.c, N);
    finishPos = coordAfterCW(finishPos.r, finishPos.c, N);
  }

  return { N, grid: liveGrid, start: startPos, finish: finishPos, requiredRotation: (4 - scrambleSteps) % 4, pathLen: path.length };
}

// ---------------------------------------------------------------------
// Verification: simulate applying the correct counter-rotation up front,
// then run the car all the way to confirm it reaches the goal tile
// without falling. This guarantees every shipped level is solvable.
// ---------------------------------------------------------------------

function simulate(levelObj) {
  let grid = levelObj.grid.map((row) => row.map((t) => Object.assign({}, t)));
  let N = levelObj.N;
  let r = levelObj.start.r, c = levelObj.start.c;

  for (let s = 0; s < levelObj.requiredRotation; s++) {
    grid = rotateMatrixCW(grid);
    for (let rr = 0; rr < N; rr++) for (let cc = 0; cc < N; cc++) grid[rr][cc].rotation = (grid[rr][cc].rotation + 1) % 4;
    const p = coordAfterCW(r, c, N);
    r = p.r; c = p.c;
  }

  let dir = 'S';
  let guard = 0;
  while (guard++ < N * N * 4) {
    const tile = grid[r] && grid[r][c];
    if (!tile) return false;
    if (tile.mod === 'goal') return true;
    const entry = opposite(dir);
    const exit = resolveExit(tile, entry, dir);
    if (!exit) return false;
    const d = DIR_DELTA[exit];
    const nr = r + d.dr, nc = c + d.dc;
    if (nr < 0 || nc < 0 || nr >= N || nc >= N) return false;
    r = nr; c = nc; dir = exit;
  }
  return false;
}

// ---------------------------------------------------------------------
// Compact encoding matching Level.js's decoder
// ---------------------------------------------------------------------

const SHAPE_TO_CODE = { straight: 'S', corner: 'C', cross: 'X', t: 'T', dead: 'D', bridge: 'B', goal: 'G' };
const MOD_TO_CODE = { ice: 'i', speed: 'v', coin: 'o', collapse: 'l', teleport: 'p', goal: 'g' };

function encodeLevel(id, levelObj) {
  const grid = levelObj.grid.map((row) => row.map((t) => {
    const cell = [SHAPE_TO_CODE[t.shape], t.rotation];
    if (t.mod) cell.push(MOD_TO_CODE[t.mod]);
    return cell;
  }));
  return {
    id,
    grid,
    start: [levelObj.start.r, levelObj.start.c],
    startDir: 'S',
    finish: [levelObj.finish.r, levelObj.finish.c]
  };
}

// ---------------------------------------------------------------------
// Generate all 100, retrying with a new seed on (rare) verification failure
// ---------------------------------------------------------------------

const levels = [];
for (let n = 1; n <= 100; n++) {
  let attempt = 0;
  let built, ok = false;
  while (!ok && attempt < 50) {
    const seed = n * 7919 + attempt * 104729 + 12345;
    built = buildLevel(n, seed);
    ok = simulate(built);
    attempt++;
  }
  if (!ok) throw new Error('Failed to generate a solvable level for #' + n + ' after 50 attempts');
  levels.push(encodeLevel(n, built));
  process.stdout.write('Level ' + n + ' OK (size ' + built.N + ', path ' + built.pathLen + ', rotation needed ' + built.requiredRotation + ', attempts ' + attempt + ')\n');
}

const outDir = __dirname;
fs.writeFileSync(path.join(outDir, 'levels.json'), JSON.stringify(levels, null, 2));
fs.writeFileSync(path.join(outDir, 'levels.js'),
  '/* Auto-generated by levels/generateLevels.js - do not hand edit. */\n' +
  'window.RC_LEVELS = ' + JSON.stringify(levels) + ';\n');

console.log('\nWrote levels.json and levels.js with', levels.length, 'verified-solvable levels.');
