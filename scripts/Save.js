/**
 * Save.js
 * Thin wrapper around localStorage. Keeps a single JSON blob so we only ever
 * do one read/write, with sane defaults if nothing is saved yet or the data
 * is corrupt.
 */
(function (RC) {
  'use strict';

  const KEY = 'rotateCity.save.v1';

  function defaults() {
    return {
      coins: 0,
      currentLevel: 1,
      bestStreak: 0,
      unlockedCars: ['sports'],
      selectedCar: 'sports',
      settings: { sound: true },
      levelStars: {} // levelId -> 1..3
    };
  }

  const SaveManager = {
    data: null,

    load: function () {
      try {
        const raw = localStorage.getItem(KEY);
        this.data = raw ? Object.assign(defaults(), JSON.parse(raw)) : defaults();
      } catch (e) {
        this.data = defaults();
      }
      return this.data;
    },

    persist: function () {
      try {
        localStorage.setItem(KEY, JSON.stringify(this.data));
      } catch (e) {
        // Storage may be unavailable (private mode, quota) - fail silently,
        // the game still works, it just won't remember progress.
      }
    },

    addCoins: function (n) {
      this.data.coins += n;
      this.persist();
    },

    spendCoins: function (n) {
      if (this.data.coins < n) return false;
      this.data.coins -= n;
      this.persist();
      return true;
    },

    setCurrentLevel: function (n) {
      this.data.currentLevel = n;
      this.persist();
    },

    unlockCar: function (id) {
      if (this.data.unlockedCars.indexOf(id) === -1) {
        this.data.unlockedCars.push(id);
        this.persist();
      }
    },

    selectCar: function (id) {
      this.data.selectedCar = id;
      this.persist();
    },

    setStars: function (levelId, stars) {
      const cur = this.data.levelStars[levelId] || 0;
      if (stars > cur) {
        this.data.levelStars[levelId] = stars;
        this.persist();
      }
    },

    toggleSound: function () {
      this.data.settings.sound = !this.data.settings.sound;
      this.persist();
      return this.data.settings.sound;
    }
  };

  RC.Save = SaveManager;

})(window.RC = window.RC || {});
