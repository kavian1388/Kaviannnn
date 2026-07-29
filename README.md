# Rotate City

A one-finger, mobile-first, portrait hyper-casual game. The car drives
itself; you rotate the whole city 90° at a time to connect the roads and
guide it to the goal.

## Run it

Just open `index.html` in a mobile browser (or desktop Chrome with device
toolbar toggled to a phone size). No build step, no server, no dependencies.
Everything is plain HTML/CSS/ES6 + Canvas.

## Controls

- Tap the **left half** of the screen → rotate the city 90° left.
- Tap the **right half** of the screen → rotate the city 90° right.
- Input is locked for the 200ms of the rotation animation.

## How the puzzle works

The car always drives in a fixed screen direction (down the screen). Every
tile is one of: straight, corner, cross, T-junction, dead end, bridge
(over/under, non-connecting), teleport, collapsing, ice, speed, goal, or
coin. Rotating the city rotates every tile (and the car's position within
the grid) together — the car's own facing never changes, only the road
layout around it does. Figure out the rotation(s) that line up a path from
start to finish before the car reaches a gap and falls.

## Levels

`levels/levels.js` (loaded by `index.html`) contains 100 procedurally
generated, **individually verified-solvable** levels, growing from 5×5 to
11×11 with increasing tile variety (ice/speed/coins first, then more
complex junctions). Level 101 onward is Endless Mode: `scripts/Generator.js`
builds new levels on the fly using the same technique, with difficulty
(grid size, tile density) continuing to scale.

Being fully transparent about scope: "100 handcrafted levels" was
requested, but hand-authoring and hand-verifying 100 unique rotation
puzzles isn't something that can be done by hand in this format. Instead I
built a generator (`levels/generateLevels.js`) that:

1. Walks a random path across the grid and lays exactly the tiles needed to
   connect it (solvable at 0° rotation).
2. Scrambles the *entire* city by a random 1–3 step rotation and stores
   that as the level's starting layout.
3. **Simulates the real game engine end-to-end** to confirm the level is
   actually solvable before it's accepted into the level set — any level
   that fails is discarded and regenerated with a new seed.

Every one of the 100 shipped levels, and 40 sampled Endless levels, passed
this verification using the actual runtime code (not a separate "solver").

## Why there are no image/audio files

Every visual (roads, cars, coins, effects) is drawn on the Canvas in
`scripts/Game.js` / `scripts/Car.js`. Every sound is synthesized at runtime
with the Web Audio API in `scripts/Audio.js`. This was a deliberate choice:
it means there is nothing that can be "missing" when you open the game
offline, and it keeps the whole game to plain-text source files.
`assets/images` and `assets/audio` are kept (with short READMEs) as the
natural place to drop real art/sound later.

## Folder structure

```
index.html
style.css
main.js
assets/
  images/   (empty by design - see README.txt inside)
  audio/    (empty by design - see README.txt inside)
levels/
  levels.js          <- loaded by the game (window.RC_LEVELS)
  levels.json         <- same data, pretty-printed, human-readable
  generateLevels.js   <- offline Node build script that produced them
scripts/
  Utils.js     - math / direction / RNG / event bus helpers
  Tile.js      - tile shapes, openings, rotation & exit resolution
  Car.js       - autonomous car movement + car skins
  Level.js     - grid container, JSON decoding, whole-city rotation
  Generator.js - procedural level generation (Endless Mode + build script logic)
  Input.js     - one-finger left/right tap handling
  Audio.js     - synthesized SFX (Web Audio API)
  Save.js      - localStorage wrapper (coins, level, unlocked cars, stars)
  Ads.js       - AdsManager stub, disabled by default, AdMob-ready hooks
  UI.js        - HUD + pause/settings/win/fail overlay screens
  Game.js      - render loop, state machine, rotation animation, particles
```

## Save data

Coins, current level, unlocked car skins, and per-level star ratings are
stored in a single `localStorage` key (`rotateCity.save.v1`). Progress
persists across sessions in the same browser.

## Ads

`scripts/Ads.js` exposes an `AdsManager` with `showInterstitial()` /
`showRewarded()` and a `notifyLevelComplete()` hook, all currently disabled
(`enabled = false`). Flip that flag and fill in the two marked `TODO` spots
once you wire in a real SDK (e.g. AdMob) — no other file needs to change.

## Performance

- Fixed set of DOM overlay elements (no per-frame DOM writes except two text
  nodes for the HUD).
- Canvas rendering avoids per-tile gradients/images; tiles are drawn with a
  handful of stroke/fill calls each.
- Particle system (confetti/explosion) uses a single flat array, filtered
  once per frame — no object pooling framework needed at this particle count,
  but the array is reused rather than reallocated per particle.
- `devicePixelRatio` is capped at 2 to avoid oversized canvases on very
  high-DPI phones tanking fill-rate.
