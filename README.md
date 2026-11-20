# Cube Rush 3D

## Run locally

Serve this folder over HTTP so the browser can load JavaScript modules:

```sh
python -m http.server 8000
```

Then open `http://localhost:8000`. The game and Three.js renderer are bundled locally. Internet access is only needed for CrazyGames' official SDK script; if the SDK is unavailable, the game remains playable and rewarded ads stay disabled.

Run the automated checks with Node.js:

```sh
node --test
```

## Publish

Upload the contents of this folder to a static web host. The CrazyGames SDK v3 script is included in `index.html`. Rewarded ads are deliberately disabled by default; enable `REWARDED_ADS_ENABLED` in `game.js` only after CrazyGames has approved and enabled monetization for the game. No external ad provider or development SDK shim is included.

Cloud saves use the SDK v3 `SDK.data.getItem(key)` and `SDK.data.setItem(key, value)` methods after `SDK.init()` completes. Inside CrazyGames, the Data Module is the only persistent save provider; on cloud errors, progress remains in memory and the game reports the failure rather than falling back to game-owned local storage. Outside CrazyGames, the existing local storage save remains active. An existing `cube-rush-3d-save` profile is migrated only when the Data Module has no save, and the migration is verified before it is considered complete. Serialized cloud profiles are capped at 900 KiB (below the SDK's 1 MB data limit); oversized ghost paths are downsampled for cloud storage without changing the in-memory save. Cloud behavior should still be verified in the CrazyGames testing/production environment before claiming account-level synchronization.

After SDK initialization, the game reads `SDK.game.settings.muteAudio` and registers `SDK.game.addSettingsChangeListener`. Platform mute is applied at the master audio output, so music and effects are silenced together without changing the player's saved music or sound-effect volume preferences.

Cloud writes re-read and merge the latest cloud snapshot before updating it. Wallet reconciliation uses a separate `walletUpdatedAt` field rather than assuming the device save timestamp identifies the newest balance; legacy saves without this field use the higher existing balance instead of adding balances. This is best-effort conflict handling: the SDK Data Module API used here provides no conditional-write/transaction primitive, so truly simultaneous writes from multiple devices cannot be made atomic by the game alone.

## CrazyGames gameplay events

`crazygames-gameplay.js` tracks the wanted gameplay state and calls `SDK.game.gameplayStart()` / `SDK.game.gameplayStop()` only when that state changes, so duplicate calls are not sent. `gameplayStart` fires when a run really begins (Play, Retry after the tutorial) and on resume; `gameplayStop` fires on pause, tab hide, game over and return to the main menu. Nothing is sent from the loading screen or menus. If the SDK finishes initialising after the player has already started, the pending state is delivered automatically; without the SDK (local play) nothing is called and nothing throws. The SDK script is loaded synchronously in `<head>` as CrazyGames recommends.

## Controls

- **A / Left Arrow** and **D / Right Arrow**: change lanes
- **Space / Up Arrow**: jump
- **S / Down Arrow**: slide
- **Escape**: pause or resume
- **Mobile**: swipe left/right to change lanes, up to jump, down to slide
