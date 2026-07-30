/**
 * main.js
 * Application bootstrap. Wires every DOM button to Game/UI/manager calls.
 * Kept intentionally thin: all real logic lives in scripts/*.js.
 */
(function () {
  function $(id) { return document.getElementById(id); }

  function boot() {
    UI.cacheScreens();
    const canvas = $('game-canvas');
    const game = new Game(canvas);
    window.__game = game; // debugging convenience only

    AudioEngine.setMuted(!Save.get().settings.sound);
    AdsManager.init();
    MissionManager.ensureFresh();

    // ---------------- Screen back buttons ----------------
    document.querySelectorAll('[data-back]').forEach((el) => {
      el.addEventListener('click', () => {
        AudioEngine.sfx.button();
        UI.show(el.dataset.back);
      });
    });

    // ---------------- Main menu ----------------
    $('btn-play').addEventListener('click', () => {
      AudioEngine.sfx.button();
      UI.buildLevelSelect((id) => {
        AudioEngine.sfx.button();
        game.loadLevel(id);
      });
      UI.show('level-select');
    });

    $('btn-skins').addEventListener('click', () => {
      AudioEngine.sfx.button();
      UI.buildSkinsScreen(
        (id) => { SkinManager.equip(id); AudioEngine.sfx.button(); UI.buildSkinsScreen(equipHandler, purchaseHandler); },
        (id) => { if (SkinManager.purchase(id)) { AudioEngine.sfx.coin(); } UI.buildSkinsScreen(equipHandler, purchaseHandler); }
      );
      UI.show('skins');
    });
    function equipHandler(id) { SkinManager.equip(id); AudioEngine.sfx.button(); UI.buildSkinsScreen(equipHandler, purchaseHandler); }
    function purchaseHandler(id) { if (SkinManager.purchase(id)) AudioEngine.sfx.coin(); UI.buildSkinsScreen(equipHandler, purchaseHandler); }

    $('btn-daily').addEventListener('click', () => {
      AudioEngine.sfx.button();
      UI.buildDailyScreen((missionId) => {
        const reward = MissionManager.claim(missionId);
        if (reward > 0) { AudioEngine.sfx.coin(); UI.buildDailyScreen(claimHandler); }
      });
      UI.show('daily');
    });
    function claimHandler(missionId) {
      const reward = MissionManager.claim(missionId);
      if (reward > 0) { AudioEngine.sfx.coin(); UI.buildDailyScreen(claimHandler); }
    }

    $('btn-achievements').addEventListener('click', () => {
      AudioEngine.sfx.button();
      UI.buildAchievementsScreen();
      UI.show('achievements');
    });

    $('btn-stats').addEventListener('click', () => {
      AudioEngine.sfx.button();
      UI.buildStatsScreen();
      UI.show('stats');
    });

    $('btn-settings').addEventListener('click', () => {
      AudioEngine.sfx.button();
      UI.buildSettingsScreen((key, val) => {
        Save.update((s) => { s.settings[key] = val; });
        if (key === 'sound') AudioEngine.setMuted(!val);
      });
      UI.show('settings');
    });

    $('btn-reset-progress').addEventListener('click', () => {
      if (confirm('Reset all progress? This cannot be undone.')) {
        Save.reset();
        UI.buildStatsScreen();
        UI.refreshMenuBadges();
        UI.show('menu');
      }
    });

    // ---------------- In-game HUD ----------------
    $('btn-pause').addEventListener('click', () => {
      AudioEngine.sfx.button();
      game.pause();
      UI.show('pause');
    });
    $('btn-resume').addEventListener('click', () => {
      AudioEngine.sfx.button();
      game.resume();
      UI.show('game');
    });
    $('btn-pause-restart').addEventListener('click', () => {
      AudioEngine.sfx.button();
      game.resume();
      game.restartLevel();
    });
    $('btn-pause-menu').addEventListener('click', () => {
      AudioEngine.sfx.button();
      game.resume();
      game.level = null;
      UI.show('menu');
    });

    // ---------------- Win / lose ----------------
    $('btn-win-next').addEventListener('click', () => {
      AudioEngine.sfx.button();
      const next = game.levelId + 1;
      if (next > LevelManager.totalLevels()) { UI.show('menu'); return; }
      game.loadLevel(next);
    });
    $('btn-win-menu').addEventListener('click', () => {
      AudioEngine.sfx.button();
      game.level = null;
      UI.show('menu');
    });
    $('btn-lose-retry').addEventListener('click', () => {
      AudioEngine.sfx.button();
      game.restartLevel();
    });
    $('btn-lose-menu').addEventListener('click', () => {
      AudioEngine.sfx.button();
      game.level = null;
      UI.show('menu');
    });

    // ---------------- Daily login popup ----------------
    const loginResult = MissionManager.checkLoginStreak();

    setTimeout(() => {
      UI.show('menu');
      if (loginResult) {
        $('daily-popup-day').textContent = 'DAY ' + loginResult.day + ' REWARD';
        $('daily-popup-reward').textContent = '+' + loginResult.reward;
        UI.show('daily-popup');
        $('btn-daily-popup-claim').onclick = () => {
          AudioEngine.sfx.coin();
          UI.show('menu');
        };
      }
    }, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
