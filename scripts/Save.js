/**
 * Save.js
 * All persistence goes through here. Single source of truth for the
 * player's save file, backed by LocalStorage with safe defaults and
 * versioning so future updates can migrate old saves.
 */
const Save = (() => {
  const KEY = 'onebullet_save_v1';

  function defaults() {
    return {
      version: 1,
      coins: 0,
      currentLevel: 1,
      levelStars: {}, // { [levelId]: 1|2|3 }
      unlockedSkins: ['obsidian'],
      equippedSkin: 'obsidian',
      achievements: {}, // { [id]: true }
      stats: {
        levelsCompleted: 0,
        bulletsFired: 0,
        enemiesDestroyed: 0,
        longestCombo: 0,
        perfectShots: 0,
        totalPlayTimeSec: 0,
      },
      missions: {
        date: null,
        list: [],
      },
      dailyLogin: {
        lastClaim: null,
        streak: 0,
      },
      settings: {
        sound: true,
        haptics: true,
      },
    };
  }

  function deepMerge(base, incoming) {
    const out = { ...base };
    for (const k in base) {
      if (incoming && incoming[k] !== undefined) {
        if (typeof base[k] === 'object' && base[k] !== null && !Array.isArray(base[k])) {
          out[k] = deepMerge(base[k], incoming[k]);
        } else {
          out[k] = incoming[k];
        }
      }
    }
    return out;
  }

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaults();
      const parsed = JSON.parse(raw);
      return deepMerge(defaults(), parsed);
    } catch (e) {
      console.warn('Save load failed, resetting to defaults', e);
      return defaults();
    }
  }

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Save persist failed', e);
    }
  }

  function get() {
    return state;
  }

  function update(mutator) {
    mutator(state);
    persist();
  }

  function reset() {
    state = defaults();
    persist();
  }

  return { get, update, reset };
})();
