export const STORAGE_KEY = 'cube-rush-3d-save';
export const SAVE_VERSION = 2;

export const SKINS = [
  { id: 'classic', name: 'Classic Cube', price: 0, color: '#e2e8f0', accent: '#4ade80' },
  { id: 'neon-blue', name: 'Neon Blue', price: 250, color: '#38bdf8', accent: '#0ea5e9' },
  { id: 'fire', name: 'Fire Cube', price: 350, color: '#f97316', accent: '#fb923c' },
  { id: 'electric', name: 'Electric Cube', price: 450, color: '#a78bfa', accent: '#22d3ee' },
  { id: 'toxic', name: 'Toxic Green', price: 550, color: '#22c55e', accent: '#86efac' },
  { id: 'golden', name: 'Golden Cube', price: 700, color: '#facc15', accent: '#f59e0b' },
  { id: 'diamond', name: 'Diamond Cube', price: 900, color: '#e2e8f0', accent: '#60a5fa' },
  { id: 'galaxy', name: 'Galaxy Cube', price: 1100, color: '#8b5cf6', accent: '#c084fc' },
  { id: 'rainbow', name: 'Rainbow Cube', price: 1400, color: '#f472b6', accent: '#fbbf24' },
  { id: 'shadow', name: 'Shadow Cube', price: 1600, color: '#1f2937', accent: '#a78bfa' },
  { id: 'cyber', name: 'Cyber Cube', price: 1850, color: '#14b8a6', accent: '#2dd4bf' },
  { id: 'legendary', name: 'Legendary Cube', price: 2200, color: '#f8fafc', accent: '#f97316' }
];

export const ACHIEVEMENTS = [
  { id: 'first-run', name: 'FIRST RUN', description: 'Complete your first run', reward: 50, condition: 'runs >= 1' },
  { id: 'collect-100', name: 'COLLECT 100', description: 'Collect 100 coins total', reward: 75, condition: 'totalCoins >= 100' },
  { id: 'survive-60', name: 'SURVIVE 60 SECONDS', description: 'Survive 60 seconds in one run', reward: 120, condition: 'maxTime >= 60' },
  { id: 'reach-1000', name: 'REACH 1000 M', description: 'Travel 1000 meters', reward: 150, condition: 'totalDistance >= 1000' },
  { id: 'collect-500', name: 'COLLECT 500', description: 'Collect 500 coins total', reward: 200, condition: 'totalCoins >= 500' },
  { id: 'complete-10', name: 'COMPLETE 10 RUNS', description: 'Finish 10 runs', reward: 250, condition: 'gamesPlayed >= 10' },
  { id: 'score-2000', name: 'SCORE 2000', description: 'Reach 2000 points', reward: 180, condition: 'bestScore >= 2000' },
  { id: 'coin-rush', name: 'COIN RUSH', description: 'Collect 20 coins in one run', reward: 120, condition: 'runCoins >= 20' },
  { id: 'speed-master', name: 'SPEED MASTER', description: 'Reach 25 speed units', reward: 160, condition: 'maxSpeed >= 25' },
  { id: 'lane-legend', name: 'LANE LEGEND', description: 'Survive 2 minutes', reward: 220, condition: 'maxTime >= 120' },
  { id: 'power-up-hunter', name: 'POWER-UP HUNTER', description: 'Collect 10 power-ups total', reward: 180, condition: 'powerUps >= 10' },
  { id: 'combo-legend', name: 'COMBO LEGEND', description: 'Reach a x10 combo in one run', reward: 220, condition: 'maxCombo >= 15' },
  { id: 'world-tour', name: 'WORLD TOUR', description: 'Unlock all three environments', reward: 250, condition: 'lava-world unlocked' }
];

const DEFAULT_SAVE = {
  version: SAVE_VERSION,
  updatedAt: 0,
  resetAt: 0,
  walletUpdatedAt: 0,
  totalCoins: 0,
  purchasedSkins: ['classic'],
  selectedSkin: 'classic',
  personalBest: 0,
  bestDistance: 0,
  totalDistance: 0,
  totalCoinsCollected: 0,
  gamesPlayed: 0,
  bestSurvivalTime: 0,
  achievements: {},
  ghost: {
    enabled: true,
    bestRun: null
  },
  dailyChallenges: {
    date: '',
    challenges: []
  },
  loginRewards: {
    lastClaimDate: '',
    streak: 0,
    totalClaims: 0
  },
  powerUpStats: {
    magnet: 0,
    shield: 0,
    slowMotion: 0,
    doubleCoins: 0,
    total: 0
  },
  environmentUnlocks: ['neon-city'],
  settings: {
    musicVolume: 60,
    sfxVolume: 80,
    graphics: 'medium',
    tutorialSeen: false
  }
};

export const DAILY_CHALLENGE_DEFINITIONS = [
  { id: 'daily-coins', metric: 'coins', target: 20, reward: 60, name: 'COIN COLLECTOR' },
  { id: 'daily-distance', metric: 'distance', target: 500, reward: 70, name: 'LONG RUN' },
  { id: 'daily-survival', metric: 'seconds', target: 60, reward: 55, name: 'STAY ALIVE' },
  { id: 'daily-jumps', metric: 'jumps', target: 12, reward: 50, name: 'SKY HOPPER' },
  { id: 'daily-obstacles', metric: 'obstacles', target: 20, reward: 65, name: 'CLEAN RUN' }
];

export const LOGIN_REWARDS = [25, 40, 60, 85, 110, 140, 200];
export const ENVIRONMENTS = ['neon-city', 'cyber-space', 'lava-world'];

function isValidDateKey(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function dayNumber(dateKey) {
  return Math.floor(Date.parse(`${dateKey}T00:00:00Z`) / 86400000);
}

export function getDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function getDailyChallengeDefinitions(date = new Date()) {
  const day = dayNumber(getDateKey(date));
  const start = ((day % DAILY_CHALLENGE_DEFINITIONS.length) + DAILY_CHALLENGE_DEFINITIONS.length) % DAILY_CHALLENGE_DEFINITIONS.length;
  return Array.from({ length: 3 }, (_, index) => {
    const definition = DAILY_CHALLENGE_DEFINITIONS[(start + index) % DAILY_CHALLENGE_DEFINITIONS.length];
    return { ...definition };
  });
}

export function ensureDailyChallenges(save, date = new Date()) {
  const today = getDateKey(date);
  if (!save.dailyChallenges || save.dailyChallenges.date !== today) {
    save.dailyChallenges = {
      date: today,
      challenges: getDailyChallengeDefinitions(date).map((definition) => ({
        ...definition,
        progress: 0,
        claimed: false
      }))
    };
  }
  return save.dailyChallenges;
}

export function updateDailyChallengeProgress(save, metric, amount, date = new Date()) {
  const daily = ensureDailyChallenges(save, date);
  if (!Number.isFinite(amount) || amount <= 0) return daily;
  for (const challenge of daily.challenges) {
    if (challenge.metric === metric) {
      challenge.progress = Math.min(challenge.target, challenge.progress + amount);
    }
  }
  return daily;
}

export function claimDailyChallenge(save, challengeId, date = new Date()) {
  const daily = ensureDailyChallenges(save, date);
  const challenge = daily.challenges.find((item) => item.id === challengeId);
  if (!challenge || challenge.claimed || challenge.progress < challenge.target) {
    return { claimed: false, reward: 0, save };
  }
  challenge.claimed = true;
  save.totalCoins += challenge.reward;
  markWalletUpdated(save);
  return { claimed: true, reward: challenge.reward, save };
}

export function getSecondsUntilDailyReset(date = new Date()) {
  const nextReset = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
  return Math.max(0, Math.ceil((nextReset - date.getTime()) / 1000));
}

export function getLoginRewardState(save, date = new Date()) {
  const today = getDateKey(date);
  const lastClaimDate = isValidDateKey(save.loginRewards?.lastClaimDate) ? save.loginRewards.lastClaimDate : '';
  const claimedToday = lastClaimDate === today;
  const streak = Math.max(0, Number(save.loginRewards?.streak) || 0);
  const rewardDay = claimedToday ? Math.max(1, streak) : (
    lastClaimDate && dayNumber(today) - dayNumber(lastClaimDate) === 1 ? streak + 1 : 1
  );
  return {
    claimedToday,
    streak,
    nextStreak: rewardDay,
    reward: LOGIN_REWARDS[(rewardDay - 1) % LOGIN_REWARDS.length],
    rewards: [...LOGIN_REWARDS]
  };
}

export function claimLoginReward(save, date = new Date()) {
  const state = getLoginRewardState(save, date);
  if (state.claimedToday) return { claimed: false, reward: 0, save, state };
  save.loginRewards = {
    lastClaimDate: getDateKey(date),
    streak: state.nextStreak,
    totalClaims: (Number(save.loginRewards?.totalClaims) || 0) + 1
  };
  save.totalCoins += state.reward;
  markWalletUpdated(save);
  return { claimed: true, reward: state.reward, save, state: getLoginRewardState(save, date) };
}

export function markWalletUpdated(save, timestamp = Date.now()) {
  const previous = Number.isFinite(save.walletUpdatedAt) ? save.walletUpdatedAt : 0;
  save.walletUpdatedAt = Math.max(previous + 1, timestamp);
  return save.walletUpdatedAt;
}

export function createDefaultSave() {
  return JSON.parse(JSON.stringify(DEFAULT_SAVE));
}

export function sanitizeSave(raw) {
  const base = JSON.parse(JSON.stringify(DEFAULT_SAVE));
  if (!raw || typeof raw !== 'object') return base;

  if (Number.isFinite(raw.updatedAt)) base.updatedAt = Math.max(0, raw.updatedAt);
  if (Number.isFinite(raw.resetAt)) base.resetAt = Math.max(0, raw.resetAt);
  if (Number.isFinite(raw.walletUpdatedAt)) base.walletUpdatedAt = Math.max(0, raw.walletUpdatedAt);
  if (typeof raw.totalCoins === 'number') base.totalCoins = Math.max(0, raw.totalCoins);
  if (Array.isArray(raw.purchasedSkins)) base.purchasedSkins = raw.purchasedSkins.filter((id) => SKINS.some((skin) => skin.id === id));
  if (typeof raw.selectedSkin === 'string') base.selectedSkin = SKINS.some((skin) => skin.id === raw.selectedSkin) ? raw.selectedSkin : 'classic';
  if (typeof raw.personalBest === 'number') base.personalBest = Math.max(0, raw.personalBest);
  if (typeof raw.bestDistance === 'number') base.bestDistance = Math.max(0, raw.bestDistance);
  if (typeof raw.totalDistance === 'number') base.totalDistance = Math.max(0, raw.totalDistance);
  if (typeof raw.totalCoinsCollected === 'number') base.totalCoinsCollected = Math.max(0, raw.totalCoinsCollected);
  if (typeof raw.gamesPlayed === 'number') base.gamesPlayed = Math.max(0, raw.gamesPlayed);
  if (typeof raw.bestSurvivalTime === 'number') base.bestSurvivalTime = Math.max(0, raw.bestSurvivalTime);
  base.version = SAVE_VERSION;

  if (raw.achievements && typeof raw.achievements === 'object') {
    base.achievements = Object.fromEntries(
      Object.entries(raw.achievements).filter(([id, value]) => ACHIEVEMENTS.some((item) => item.id === id) && value === true)
    );
  }

  if (raw.ghost && typeof raw.ghost === 'object') {
    base.ghost.enabled = raw.ghost.enabled !== false;
    if (raw.ghost.bestRun && Array.isArray(raw.ghost.bestRun.samples)) {
      const samples = raw.ghost.bestRun.samples
        .slice(0, 30000)
        .filter((sample) => sample && [sample.t, sample.x, sample.y, sample.score, sample.distance].every(Number.isFinite))
        .map((sample) => ({
          t: Math.max(0, sample.t),
          x: sample.x,
          y: sample.y,
          score: Math.max(0, sample.score),
          distance: Math.max(0, sample.distance),
          scaleY: Number.isFinite(sample.scaleY) ? Math.min(1, Math.max(0.1, sample.scaleY)) : 1,
          sliding: sample.sliding === true
        }));
      if (samples.length > 1) {
        base.ghost.bestRun = {
          score: Math.max(0, Number(raw.ghost.bestRun.score) || 0),
          distance: Math.max(0, Number(raw.ghost.bestRun.distance) || 0),
          duration: Math.max(0, Number(raw.ghost.bestRun.duration) || samples[samples.length - 1].t),
          samples
        };
      }
    }
  }

  if (raw.dailyChallenges && typeof raw.dailyChallenges === 'object' && isValidDateKey(raw.dailyChallenges.date) && Array.isArray(raw.dailyChallenges.challenges)) {
    base.dailyChallenges = {
      date: raw.dailyChallenges.date,
      challenges: raw.dailyChallenges.challenges
        .filter((challenge) => DAILY_CHALLENGE_DEFINITIONS.some((item) => item.id === challenge?.id))
        .map((challenge) => {
          const definition = DAILY_CHALLENGE_DEFINITIONS.find((item) => item.id === challenge.id);
          return {
            ...definition,
            progress: Math.min(definition.target, Math.max(0, Number(challenge.progress) || 0)),
            claimed: challenge.claimed === true
          };
        })
    };
  }

  if (raw.loginRewards && typeof raw.loginRewards === 'object') {
    base.loginRewards = {
      lastClaimDate: isValidDateKey(raw.loginRewards.lastClaimDate) ? raw.loginRewards.lastClaimDate : '',
      streak: Math.max(0, Math.floor(Number(raw.loginRewards.streak) || 0)),
      totalClaims: Math.max(0, Math.floor(Number(raw.loginRewards.totalClaims) || 0))
    };
  }

  if (raw.powerUpStats && typeof raw.powerUpStats === 'object') {
    for (const type of ['magnet', 'shield', 'slowMotion', 'doubleCoins', 'total']) {
      base.powerUpStats[type] = Math.max(0, Math.floor(Number(raw.powerUpStats[type]) || 0));
    }
  }

  if (Array.isArray(raw.environmentUnlocks)) {
    base.environmentUnlocks = [...new Set(raw.environmentUnlocks.filter((id) => ENVIRONMENTS.includes(id)))];
    if (!base.environmentUnlocks.includes('neon-city')) base.environmentUnlocks.unshift('neon-city');
  }

  if (raw.settings && typeof raw.settings === 'object') {
    if (typeof raw.settings.musicVolume === 'number') base.settings.musicVolume = Math.min(100, Math.max(0, raw.settings.musicVolume));
    if (typeof raw.settings.sfxVolume === 'number') base.settings.sfxVolume = Math.min(100, Math.max(0, raw.settings.sfxVolume));
    if (typeof raw.settings.graphics === 'string') base.settings.graphics = ['low', 'medium', 'high'].includes(raw.settings.graphics) ? raw.settings.graphics : 'medium';
    if (typeof raw.settings.tutorialSeen === 'boolean') base.settings.tutorialSeen = raw.settings.tutorialSeen;
  }

  if (!base.purchasedSkins.includes('classic')) base.purchasedSkins.unshift('classic');
  if (!base.purchasedSkins.includes(base.selectedSkin)) base.selectedSkin = 'classic';

  return base;
}

export function loadSave() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return createDefaultSave();
    const parsed = JSON.parse(data);
    return sanitizeSave(parsed);
  } catch (error) {
    return createDefaultSave();
  }
}

export function readLegacySave() {
  try {
    const rawValue = localStorage.getItem(STORAGE_KEY);
    if (!rawValue) return { found: false, valid: false, save: null };
    const raw = JSON.parse(rawValue);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return { found: true, valid: false, save: null };
    }

    const knownFields = [
      'totalCoins', 'purchasedSkins', 'selectedSkin', 'personalBest', 'bestDistance',
      'totalDistance', 'totalCoinsCollected', 'gamesPlayed', 'achievements', 'ghost',
      'dailyChallenges', 'loginRewards', 'powerUpStats', 'environmentUnlocks', 'settings'
    ];
    const valid = knownFields.some((field) => Object.hasOwn(raw, field));
    return { found: true, valid, save: valid ? sanitizeSave(raw) : null };
  } catch (error) {
    return { found: true, valid: false, save: null, error };
  }
}

export function mergeSaveData(localData, cloudData) {
  const local = sanitizeSave(localData);
  const cloud = sanitizeSave(cloudData);
  if (local.resetAt > cloud.resetAt && local.resetAt >= cloud.updatedAt) return local;
  if (cloud.resetAt > local.resetAt && cloud.resetAt >= local.updatedAt) return cloud;
  const localUpdatedAt = local.updatedAt;
  const cloudUpdatedAt = cloud.updatedAt;
  const latest = cloudUpdatedAt > localUpdatedAt ? cloud : local;
  const walletSource = local.walletUpdatedAt === cloud.walletUpdatedAt
    ? cloud
    : (local.walletUpdatedAt > cloud.walletUpdatedAt ? local : cloud);
  const dailyDate = local.dailyChallenges.date > cloud.dailyChallenges.date
    ? local.dailyChallenges.date
    : cloud.dailyChallenges.date;
  const dailySource = local.dailyChallenges.date === dailyDate ? local.dailyChallenges : cloud.dailyChallenges;
  const otherDaily = dailySource === local.dailyChallenges ? cloud.dailyChallenges : local.dailyChallenges;
  const dailyById = new Map(dailySource.challenges.map((challenge) => [challenge.id, { ...challenge }]));
  if (dailySource.date === otherDaily.date) {
    for (const challenge of otherDaily.challenges) {
      const current = dailyById.get(challenge.id);
      if (!current) {
        dailyById.set(challenge.id, { ...challenge });
      } else {
        current.progress = Math.max(current.progress, challenge.progress);
        current.claimed = current.claimed || challenge.claimed;
      }
    }
  }

  const merged = {
    ...latest,
    updatedAt: Math.max(localUpdatedAt, cloudUpdatedAt),
    walletUpdatedAt: Math.max(local.walletUpdatedAt, cloud.walletUpdatedAt),
    totalCoins: walletSource.totalCoins,
    purchasedSkins: SKINS
      .map((skin) => skin.id)
      .filter((id) => local.purchasedSkins.includes(id) || cloud.purchasedSkins.includes(id)),
    achievements: { ...local.achievements, ...cloud.achievements },
    bestDistance: Math.max(local.bestDistance, cloud.bestDistance),
    personalBest: Math.max(local.personalBest, cloud.personalBest),
    totalDistance: Math.max(local.totalDistance, cloud.totalDistance),
    totalCoinsCollected: Math.max(local.totalCoinsCollected, cloud.totalCoinsCollected),
    gamesPlayed: Math.max(local.gamesPlayed, cloud.gamesPlayed),
    bestSurvivalTime: Math.max(local.bestSurvivalTime, cloud.bestSurvivalTime),
    powerUpStats: Object.fromEntries(
      ['magnet', 'shield', 'slowMotion', 'doubleCoins', 'total']
        .map((key) => [key, Math.max(local.powerUpStats[key], cloud.powerUpStats[key])])
    ),
    environmentUnlocks: ENVIRONMENTS.filter(
      (id) => local.environmentUnlocks.includes(id) || cloud.environmentUnlocks.includes(id)
    ),
    dailyChallenges: {
      date: dailyDate,
      challenges: [...dailyById.values()]
    },
    loginRewards: (() => {
      const localDate = local.loginRewards.lastClaimDate;
      const cloudDate = cloud.loginRewards.lastClaimDate;
      const latestLogin = cloudDate > localDate ? cloud.loginRewards : local.loginRewards;
      return {
        ...latestLogin,
        streak: localDate === cloudDate
          ? Math.max(local.loginRewards.streak, cloud.loginRewards.streak)
          : latestLogin.streak,
        totalClaims: Math.max(local.loginRewards.totalClaims, cloud.loginRewards.totalClaims)
      };
    })()
  };
  const localGhost = local.ghost.bestRun;
  const cloudGhost = cloud.ghost.bestRun;
  if (localGhost && cloudGhost) {
    merged.ghost = {
      enabled: latest.ghost.enabled,
      bestRun: cloudGhost.score > localGhost.score
        || (cloudGhost.score === localGhost.score && cloudGhost.distance > localGhost.distance)
        ? cloudGhost
        : localGhost
    };
  } else {
    merged.ghost = { ...latest.ghost, bestRun: localGhost || cloudGhost };
  }
  if (!merged.purchasedSkins.includes(merged.selectedSkin)) {
    merged.selectedSkin = merged.purchasedSkins.includes(local.selectedSkin)
      ? local.selectedSkin
      : 'classic';
  }
  return sanitizeSave(merged);
}

export function saveProgress(save, { touchTimestamp = true } = {}) {
  try {
    if (touchTimestamp) save.updatedAt = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
    return true;
  } catch (error) {
    return false;
  }
}

export function getSkinById(id) {
  return SKINS.find((skin) => skin.id === id) || SKINS[0];
}

export function buySkin(save, skinId) {
  const skin = SKINS.find((item) => item.id === skinId);
  if (!skin) return { purchased: false, reason: 'invalid-skin', save };
  if (save.purchasedSkins.includes(skinId)) return { purchased: true, save };
  if (save.totalCoins < skin.price) return { purchased: false, reason: 'not-enough-coins', save };

  save.totalCoins -= skin.price;
  markWalletUpdated(save);
  save.purchasedSkins.push(skinId);
  return { purchased: true, save };
}

export function equipSkin(save, skinId) {
  if (!SKINS.some((skin) => skin.id === skinId)) return { equipped: false, save };
  if (!save.purchasedSkins.includes(skinId)) return { equipped: false, save };
  save.selectedSkin = skinId;
  return { equipped: true, save };
}

export function awardAchievement(save, achievementId) {
  if (!ACHIEVEMENTS.some((item) => item.id === achievementId)) return save;
  if (!save.achievements) save.achievements = {};
  if (save.achievements[achievementId]) return save;
  save.achievements[achievementId] = true;
  const achievement = ACHIEVEMENTS.find((item) => item.id === achievementId);
  if (achievement) {
    save.totalCoins += achievement.reward;
    markWalletUpdated(save);
  }
  return save;
}

export function resetProgress() {
  const fresh = JSON.parse(JSON.stringify(DEFAULT_SAVE));
  fresh.resetAt = Date.now();
  fresh.updatedAt = fresh.resetAt;
  fresh.walletUpdatedAt = fresh.resetAt;
  return fresh;
}

export function makeAchievementState(save, runMetrics = {}) {
  const achievements = { ...(save.achievements || {}) };
  const totalCoins = Number(runMetrics.totalCoins ?? save.totalCoinsCollected ?? 0);
  const runCoins = Number(runMetrics.runCoins || 0);
  const bestScore = Number(save.personalBest || 0);
  const topTime = Number(save.bestSurvivalTime || 0);
  const totalDistance = Number(save.totalDistance || 0);
  const gamesPlayed = Number(save.gamesPlayed || 0);
  const maxSpeed = Number(runMetrics.maxSpeed || 0);

  const checks = [
    { id: 'first-run', active: gamesPlayed >= 1 },
    { id: 'collect-100', active: totalCoins >= 100 },
    { id: 'survive-60', active: topTime >= 60 },
    { id: 'reach-1000', active: totalDistance >= 1000 },
    { id: 'collect-500', active: totalCoins >= 500 },
    { id: 'complete-10', active: gamesPlayed >= 10 },
    { id: 'score-2000', active: bestScore >= 2000 },
    { id: 'coin-rush', active: runCoins >= 20 },
    { id: 'speed-master', active: maxSpeed >= 25 },
    { id: 'lane-legend', active: topTime >= 120 },
    { id: 'power-up-hunter', active: (Number(save.powerUpStats?.total) || 0) >= 10 },
    { id: 'combo-legend', active: Number(runMetrics.maxCombo) >= 15 },
    { id: 'world-tour', active: save.environmentUnlocks?.includes('lava-world') === true }
  ];

  const newlyUnlocked = checks.filter((item) => item.active && !achievements[item.id]).map((item) => item.id);
  for (const id of newlyUnlocked) {
    save.achievements = achievements;
    awardAchievement(save, id);
    achievements[id] = true;
  }
  return { achievements: { ...save.achievements }, newlyUnlocked };
}

export function getAchievementList() {
  return ACHIEVEMENTS.map((achievement) => ({ ...achievement }));
}

export function grantAchievementRewards(save, achievementIds = []) {
  let nextSave = save;
  for (const id of achievementIds) {
    nextSave = awardAchievement(nextSave, id);
  }
  return nextSave;
}
