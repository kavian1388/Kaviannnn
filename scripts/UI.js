/**
 * UI.js
 * All chrome (HUD, buttons, overlays) is plain DOM/CSS layered above the
 * canvas. This is simpler and more accessible/robust for touch buttons
 * than drawing UI inside the canvas, and keeps rendering code focused on
 * gameplay only.
 */
(function (RC) {
  'use strict';

  function UI(game) {
    this.game = game;
    this.el = {
      level: document.getElementById('hud-level'),
      coins: document.getElementById('hud-coins'),
      btnRestart: document.getElementById('btn-restart'),
      btnPause: document.getElementById('btn-pause'),
      btnSettings: document.getElementById('btn-settings'),
      pauseScreen: document.getElementById('screen-pause'),
      settingsScreen: document.getElementById('screen-settings'),
      winScreen: document.getElementById('screen-win'),
      failScreen: document.getElementById('screen-fail'),
      winCoins: document.getElementById('win-coins'),
      winNextBtn: document.getElementById('btn-next-level'),
      failRetryBtn: document.getElementById('btn-retry'),
      resumeBtn: document.getElementById('btn-resume'),
      pauseRestartBtn: document.getElementById('btn-pause-restart'),
      soundToggle: document.getElementById('toggle-sound'),
      closeSettingsBtn: document.getElementById('btn-close-settings'),
      carSkinList: document.getElementById('car-skin-list')
    };
    this._bindButtons();
  }

  UI.prototype._bindButtons = function () {
    const g = this.game;
    const self = this;

    this.el.btnRestart.addEventListener('click', function () {
      RC.Events.emit('button');
      g.restartLevel();
    });
    this.el.btnPause.addEventListener('click', function () {
      RC.Events.emit('button');
      g.pause();
      self.show('pauseScreen');
    });
    this.el.resumeBtn.addEventListener('click', function () {
      RC.Events.emit('button');
      self.hide('pauseScreen');
      g.resume();
    });
    this.el.pauseRestartBtn.addEventListener('click', function () {
      RC.Events.emit('button');
      self.hide('pauseScreen');
      g.restartLevel();
    });
    this.el.btnSettings.addEventListener('click', function () {
      RC.Events.emit('button');
      g.pause();
      self.show('settingsScreen');
    });
    this.el.closeSettingsBtn.addEventListener('click', function () {
      RC.Events.emit('button');
      self.hide('settingsScreen');
      g.resume();
    });
    this.el.soundToggle.addEventListener('click', function () {
      const on = RC.Save.toggleSound();
      RC.Audio.setMuted(!on);
      self.el.soundToggle.textContent = on ? 'Sound: On' : 'Sound: Off';
    });
    this.el.winNextBtn.addEventListener('click', function () {
      RC.Events.emit('button');
      self.hide('winScreen');
      g.nextLevel();
    });
    this.el.failRetryBtn.addEventListener('click', function () {
      RC.Events.emit('button');
      self.hide('failScreen');
      g.restartLevel();
    });

    this._buildSkinList();
  };

  UI.prototype._buildSkinList = function () {
    const self = this;
    const skins = RC.SKINS;
    this.el.carSkinList.innerHTML = '';
    skins.forEach(function (skin) {
      const btn = document.createElement('button');
      btn.className = 'skin-chip';
      btn.style.setProperty('--chip-color', skin.color);
      btn.textContent = skin.name;
      btn.dataset.id = skin.id;
      btn.addEventListener('click', function () {
        const unlocked = RC.Save.data.unlockedCars.indexOf(skin.id) !== -1;
        if (!unlocked) {
          if (RC.Save.data.coins >= skin.cost) {
            RC.Save.spendCoins(skin.cost);
            RC.Save.unlockCar(skin.id);
          } else {
            return; // not enough coins - simple no-op for this hyper-casual scope
          }
        }
        RC.Save.selectCar(skin.id);
        self.game.setCarSkin(skin.id);
        self._buildSkinList();
      });
      if (RC.Save.data.selectedCar === skin.id) btn.classList.add('selected');
      if (RC.Save.data.unlockedCars.indexOf(skin.id) === -1) {
        btn.classList.add('locked');
        btn.textContent = skin.name + ' (' + skin.cost + ')';
      }
      self.el.carSkinList.appendChild(btn);
    });
  };

  UI.prototype.updateHUD = function (levelId, coins) {
    this.el.level.textContent = 'Level ' + levelId;
    this.el.coins.textContent = coins;
  };

  UI.prototype.show = function (key) { this.el[key].classList.add('visible'); };
  UI.prototype.hide = function (key) { this.el[key].classList.remove('visible'); };

  UI.prototype.showWin = function (coinsEarned) {
    this.el.winCoins.textContent = '+' + coinsEarned;
    this.show('winScreen');
  };

  UI.prototype.showFail = function () {
    this.show('failScreen');
  };

  RC.UI = UI;

})(window.RC = window.RC || {});
