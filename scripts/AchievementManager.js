/**
 * AchievementManager.js
 * Defines the fixed achievement list and checks it against live stats
 * after every stat-changing action. Unlocking pays out coins once.
 */
const AchievementManager = (() => {
  const LIST = [
    { id: 'enemies_100', name: '100 Enemies', desc: 'Destroy 100 enemies', reward: 200, check: (s) => s.stats.enemiesDestroyed >= 100 },
    { id: 'enemies_500', name: '500 Enemies', desc: 'Destroy 500 enemies', reward: 600, check: (s) => s.stats.enemiesDestroyed >= 500 },
    { id: 'enemies_1000', name: '1000 Enemies', desc: 'Destroy 1000 enemies', reward: 1200, check: (s) => s.stats.enemiesDestroyed >= 1000 },
    { id: 'perfect_50', name: '50 Perfect Shots', desc: 'Land 50 Perfect Shots', reward: 700, check: (s) => s.stats.perfectShots >= 50 },
    { id: 'levels_100', name: '100 Levels', desc: 'Complete all 100 levels', reward: 1500, check: (s) => s.stats.levelsCompleted >= 100 },
    { id: 'combo_king', name: 'Longest Combo', desc: 'Reach a combo of x5', reward: 300, check: (s) => s.stats.longestCombo >= 5 },
  ];

  function checkAll() {
    const unlocked = [];
    Save.update((s) => {
      for (const a of LIST) {
        if (!s.achievements[a.id] && a.check(s)) {
          s.achievements[a.id] = true;
          s.coins += a.reward;
          unlocked.push(a);
        }
      }
    });
    return unlocked;
  }

  function all() {
    const save = Save.get();
    return LIST.map((a) => ({ ...a, unlocked: !!save.achievements[a.id] }));
  }

  return { all, checkAll };
})();
