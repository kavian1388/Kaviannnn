# ONE BULLET

A premium, black-and-white hyper-casual mobile game built with vanilla HTML5/CSS3/JS + Canvas. One bullet, every wall reflects it, destroy every enemy with it.

## How to run
1. Unzip the folder.
2. Open `index.html` directly in a browser (double-click it, or drag it into Chrome/Safari).
   - Requires an internet connection on first load to fetch GSAP from cdnjs (used for camera shake/zoom/slow‑mo tweening). Everything else — audio, levels, save data, art — is 100% self-contained, no other assets or build step needed.
3. On a phone: copy the folder onto the device and open `index.html` in the mobile browser, or wrap it in Capacitor/Cordova for a Play Store build (the `AdsManager.js` stub is ready for AdMob wiring when you get there).

## What's inside
- **100 levels** (`levels/levels.js`): 10 hand-tuned tutorial levels + 90 procedurally generated levels with progressively introduced mechanics (breakable/moving/rotating/magnetic walls, moving/shielded enemies, teleporters, gravity/speed zones).
- **Full meta layer**: weapon skins (6, coin-gated), daily missions, 7-day login rewards, achievements, lifetime statistics, settings, LocalStorage save system.
- **Core juice**: Time Echo trajectory prediction, per-bounce slow-motion + camera shake/zoom, combo system, Perfect Shot bonus, 3-star scoring (accuracy/bounces/speed).
- **Zero external art/audio assets** — the character, weapon, enemies, and all particle effects are drawn procedurally on canvas; all sound effects are synthesized live via the Web Audio API. This keeps the game genuinely dependency-free and instantly loadable.

## Testing note
I ran this end-to-end in a headless browser (menu → level select → aim/fire → win/lose → pause → skins/missions/achievements/stats/settings) and fixed one real bug found that way (an invisible screen layer was swallowing touch input). It hasn't been tested on a physical Android device or through an actual Google Play build pipeline — before publishing, I'd recommend a real-device pass to tune touch sensitivity, check performance on a low-end phone, and confirm GSAP loads correctly under your production hosting.

## Folder structure
```
index.html
style.css
main.js
assets/images, assets/audio   (reserved for future art/audio; currently unused by design)
levels/levels.js              (all 100 level definitions)
scripts/                      (Game, Renderer, Player, Weapon, Bullet, Enemy, Particles,
                                Physics, Collision, Input, Animation, UI, Audio, Save,
                                LevelManager, AchievementManager, MissionManager,
                                SkinManager, AdsManager, Utils)
```
