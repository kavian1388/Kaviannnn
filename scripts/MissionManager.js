/**
 * MissionManager.js
 * Generates a fresh set of 3 daily missions each calendar day, tracks
 * progress against session stats, and separately drives the 7-day login
 * reward streak.
 */
const MissionManager = (() => {
  const POOL = [
    { id: 'levels10', label: 'Complete 10 levels', target: 10, stat: 'levelsToday', reward: 150 },
    { id: 'enemies50', label: 'Destroy 50 enemies', target: 50, stat: 'enemiesToday', reward: 150 },
    { id: 'coins300', label: 'Collect 300 coins', target: 300, stat: 'coinsToday', reward: 100 },
    { id: 'noFail', label: 'Finish a level without failing', target: 1, stat: 'noFailToday', reward: 120 },
    { id: 'perfect3', label: 'Land 3 Perfect Shots', target: 3, stat: 'perfectToday', reward: 180 },
  ];

  function todayKey() {
    return new Date().toDateString();
  }

  function ensureFresh() {
    Save.update((s) => {
      if (s.missions.date !== todayKey()) {
        s.missions.date = todayKey();
        const rng = Utils.seededRandom(Date.now() % 100000);
        const shuffled = [...POOL].sort(() => rng() - 0.5).slice(0, 3);
        s.missions.list = shuffled.map((m) => ({ ...m, progress: 0, claimed: false }));
        s.missions.progressCounters = { levelsToday: 0, enemiesToday: 0, coinsToday: 0, noFailToday: 0, perfectToday: 0 };
      }
      if (!s.missions.progressCounters) {
        s.missions.progressCounters = { levelsToday: 0, enemiesToday: 0, coinsToday: 0, noFailToday: 0, perfectToday: 0 };
      }
    });
  }

  function reportRoundResult({ won, enemiesKilled, coinsEarned, perfectShots, noFail }) {
    ensureFresh();
    Save.update((s) => {
      const c = s.missions.progressCounters;
      if (won) c.levelsToday += 1;
      c.enemiesToday += enemiesKilled;
      c.coinsToday += coinsEarned;
      if (perfectShots) c.perfectToday += perfectShots;
      if (noFail) c.noFailToday = 1;

      for (const m of s.missions.list) {
        m.progress = Math.min(m.target, c[m.stat] || 0);
      }
    });
  }

  function claim(missionId) {
    let reward = 0;
    Save.update((s) => {
      const m = s.missions.list.find((x) => x.id === missionId);
      if (m && !m.claimed && m.progress >= m.target) {
        m.claimed = true;
        s.coins += m.reward;
        reward = m.reward;
      }
    });
    return reward;
  }

  function getMissions() {
    ensureFresh();
    return Save.get().missions.list;
  }

  // ---- Daily login ----
  const LOGIN_REWARDS = [50, 80, 120, 160, 220, 300, 500];

  function checkLoginStreak() {
    let result = null;
    Save.update((s) => {
      const today = todayKey();
      if (s.dailyLogin.lastClaim === today) return;
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      if (s.dailyLogin.lastClaim === yesterday) {
        s.dailyLogin.streak = (s.dailyLogin.streak % 7) + 1;
      } else {
        s.dailyLogin.streak = 1;
      }
      s.dailyLogin.lastClaim = today;
      const reward = LOGIN_REWARDS[s.dailyLogin.streak - 1];
      s.coins += reward;
      result = { day: s.dailyLogin.streak, reward };
    });
    return result;
  }

  return { ensureFresh, reportRoundResult, claim, getMissions, checkLoginStreak, LOGIN_REWARDS };
})();
