import * as THREE from './assets/three.module.js';
import { AudioManager, bindCrazyGamesAudioSettings } from './audio.js';
import { ParticleSystem } from './effects.js';
import { GROUND_Y, MAX_WORLD_SPEED, Player } from './player.js';
import { GhostRunner } from './ghost.js';
import { breakCombo, getComboMultiplier, increaseCombo } from './combo.js';
import { SaveManager } from './cloud-save.js';
import { createGameplayTracker } from './crazygames-gameplay.js';
import { ObstacleManager } from './obstacles.js';
import { renderShop } from './shop.js';
import {
  markWalletUpdated,
  buySkin,
  equipSkin,
  resetProgress,
  makeAchievementState,
  getAchievementList,
  ensureDailyChallenges,
  updateDailyChallengeProgress,
  claimDailyChallenge,
  getSecondsUntilDailyReset,
  getLoginRewardState,
  claimLoginReward,
  ENVIRONMENTS
} from './save.js';

const canvas = document.getElementById('gameCanvas');
const menuScreen = document.getElementById('menu-screen');
const hud = document.getElementById('hud');
const shopScreen = document.getElementById('shop-screen');
const missionsScreen = document.getElementById('missions-screen');
const settingsScreen = document.getElementById('settings-screen');
const gameOverOverlay = document.getElementById('game-over-overlay');
const pauseOverlay = document.getElementById('pause-overlay');
const scoreValue = document.getElementById('score-value');
const distanceValue = document.getElementById('distance-value');
const coinValue = document.getElementById('coin-value');
const speedValue = document.getElementById('speed-value');
const coinCard = document.getElementById('coin-card');
const coinGain = document.getElementById('coin-gain');
const coinBalance = document.getElementById('coin-balance');
const shopCoinBalance = document.getElementById('shop-coin-balance');
const bestScoreMenu = document.getElementById('best-score-menu');
const bestDistanceMenu = document.getElementById('best-distance-menu');
const finalScore = document.getElementById('final-score');
const finalDistance = document.getElementById('final-distance');
const finalCoins = document.getElementById('final-coins');
const finalBest = document.getElementById('final-best');
const newBestBanner = document.getElementById('new-best-banner');
const rewardButton = document.getElementById('reward-btn');
const musicSlider = document.getElementById('music-volume');
const sfxSlider = document.getElementById('sfx-volume');
const graphicsSelect = document.getElementById('graphics-quality');
const achievementList = document.getElementById('achievement-list');
const REWARDED_ADS_ENABLED = false;
const tutorialOverlay = document.getElementById('tutorial-overlay');
const ghostToggle = document.getElementById('ghost-enabled');
const ghostStatus = document.getElementById('ghost-status');
const comboDisplay = document.getElementById('combo-display');
const comboCount = document.getElementById('combo-count');
const comboMultiplier = document.getElementById('combo-multiplier');
const powerUpStatus = document.getElementById('powerup-status');
const environmentLabel = document.getElementById('environment-label');
const cloudSaveStatus = document.getElementById('cloud-save-status');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050b16);
scene.fog = new THREE.Fog(0x050b16, 15, 120);

const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 250);
camera.position.set(0, 8, 10);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = false;

const ambient = new THREE.AmbientLight(0x8bd3ff, 1.3);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0x9ac7ff, 1.4);
dirLight.position.set(8, 16, 10);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(1024, 1024);
scene.add(dirLight);

const rimLight = new THREE.PointLight(0xfb7185, 1.5, 40, 2);
rimLight.position.set(-8, 8, 22);
scene.add(rimLight);

const world = new THREE.Group();
scene.add(world);

const road = new THREE.Mesh(
  new THREE.BoxGeometry(14, 0.6, 180),
  new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x0ea5e9, emissiveIntensity: 0.2, metalness: 0.15, roughness: 0.8 })
);
road.position.set(0, -0.3, 10);
road.receiveShadow = true;
world.add(road);

const roadGlow = new THREE.Mesh(
  new THREE.BoxGeometry(11, 0.2, 180),
  new THREE.MeshStandardMaterial({ color: 0x0ea5e9, emissive: 0x38bdf8, emissiveIntensity: 0.9, transparent: true, opacity: 0.25 })
);
roadGlow.position.set(0, 0.02, 10);
world.add(roadGlow);

const laneLines = [];
for (let i = 0; i < 15; i += 1) {
  const laneMarker = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.03, 4),
    new THREE.MeshStandardMaterial({ color: 0x67e8f9, emissive: 0x67e8f9, emissiveIntensity: 0.8 })
  );
  laneMarker.position.set(-2, 0.15, -12 + i * 8);
  laneLines.push(laneMarker);
  world.add(laneMarker);

  const laneMarker2 = laneMarker.clone();
  laneMarker2.position.x = 2;
  laneLines.push(laneMarker2);
  world.add(laneMarker2);
}

const sideDecor = [];
for (let i = 0; i < 18; i += 1) {
  const pillar = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 8, 0.8),
    new THREE.MeshStandardMaterial({ color: 0x111827, emissive: 0x8b5cf6, emissiveIntensity: 0.6 })
  );
  const x = i % 2 === 0 ? -10.5 : 10.5;
  const z = -10 + i * 8;
  pillar.position.set(x, 3.5, z);
  pillar.castShadow = true;
  scene.add(pillar);
  sideDecor.push(pillar);
}

const skyGlows = [];
for (let i = 0; i < 12; i += 1) {
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.6 + Math.random() * 1.5, 12, 12),
    new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0x22d3ee : 0xa78bfa, transparent: true, opacity: 0.3 })
  );
  glow.position.set((Math.random() - 0.5) * 60, 12 + Math.random() * 16, -18 - i * 8);
  scene.add(glow);
  skyGlows.push(glow);
}

const audioManager = new AudioManager();
const particles = new ParticleSystem(scene);
const obstacleManager = new ObstacleManager(scene);
let currentSave = null;
const saveManager = new SaveManager(updateCloudSaveStatus, reconcileCloudSave);
let gameRunning = false;
let isPaused = false;
let newBestTriggered = false;
let sdkReady = false;
const gameplayTracker = createGameplayTracker({
  getSDK: getCrazyGamesSDK,
  isReady: () => saveManager.sdkInitialized === true
});
let sdkInitializationPromise = null;
let rewardAdPending = false;
let lastTime = performance.now();
let runMetrics = createRunMetrics();
let player = null;
let ghostRunner = null;
let sampleTimer = 0;
let environmentIndex = 0;
let powerUpTimers = { magnet: 0, slowMotion: 0, doubleCoins: 0, shield: 0 };
let shieldCharges = 0;
let invulnerabilityTimer = 0;
let environmentTransition = 0;

const ENVIRONMENT_PALETTES = [
  { bg: new THREE.Color(0x050b16), fog: new THREE.Color(0x050b16), road: new THREE.Color(0x0f172a), roadGlow: new THREE.Color(0x0ea5e9), lane: new THREE.Color(0x67e8f9), ambient: new THREE.Color(0x8bd3ff), rim: new THREE.Color(0xfb7185) },
  { bg: new THREE.Color(0x09051c), fog: new THREE.Color(0x100b2e), road: new THREE.Color(0x11102a), roadGlow: new THREE.Color(0x8b5cf6), lane: new THREE.Color(0xc4b5fd), ambient: new THREE.Color(0xc4b5fd), rim: new THREE.Color(0x22d3ee) },
  { bg: new THREE.Color(0x1c0807), fog: new THREE.Color(0x2a0d0a), road: new THREE.Color(0x21100e), roadGlow: new THREE.Color(0xf97316), lane: new THREE.Color(0xfacc15), ambient: new THREE.Color(0xffc38a), rim: new THREE.Color(0xef4444) }
];

function createRunMetrics() {
  return {
    score: 0,
    distance: 0,
    coins: 0,
    seconds: 0,
    maxSpeed: 0,
    runCoins: 0,
    combo: 0,
    maxCombo: 0,
    multiplier: 1,
    obstaclesAvoided: 0,
    jumps: 0,
    powerUps: 0,
    powerUpsByType: { magnet: 0, shield: 0, slowMotion: 0, doubleCoins: 0 },
    successfulActions: 0,
    ghostSamples: [],
    environmentsVisited: ['neon-city']
  };
}

function showScreen(screenName) {
  const screens = [menuScreen, shopScreen, missionsScreen, settingsScreen];
  screens.forEach((screen) => {
    screen.classList.add('hidden');
  });
  if (screenName === 'menu') menuScreen.classList.remove('hidden');
  if (screenName === 'shop') shopScreen.classList.remove('hidden');
  if (screenName === 'missions') missionsScreen.classList.remove('hidden');
  if (screenName === 'settings') settingsScreen.classList.remove('hidden');
}

function updateSaveDisplay() {
  currentSave = saveManager.loadCurrent();
  coinBalance.textContent = currentSave.totalCoins;
  shopCoinBalance.textContent = currentSave.totalCoins;
  bestScoreMenu.textContent = currentSave.personalBest;
  bestDistanceMenu.textContent = `${Math.round(currentSave.bestDistance)} m`;
}

function updateCloudSaveStatus(status) {
  const labels = {
    local: 'LOCAL SAVE',
    loading: 'LOADING SAVE',
    loaded: 'SAVE LOADED',
    saving: 'SAVING...',
    saved: 'SAVE SUCCESSFUL',
    error: 'SAVE FAILED · SESSION ONLY',
    offline: 'SDK UNAVAILABLE · SESSION ONLY',
    'local-error': 'LOCAL SAVE FAILED'
  };
  cloudSaveStatus.textContent = labels[status] || labels.local;
  cloudSaveStatus.dataset.state = status;
  cloudSaveStatus.title = status === 'saved'
    ? 'The active save provider confirmed the save'
    : status === 'error'
      ? 'CrazyGames save failed; progress is currently held in memory and will be retried'
      : status === 'offline'
        ? 'The CrazyGames SDK is unavailable; this session is not being persisted'
      : status === 'local-error'
        ? 'The browser could not save local progress'
        : status === 'local'
          ? 'Progress is saved on this device'
          : '';
}

function persistProgress(save, options) {
  if (!saveManager.persist(save, options)) {
    saveManager.setStatus(saveManager.mode === 'local' ? 'local-error' : 'error');
    console.error('Unable to persist player progress through the active save provider');
    return false;
  }
  return true;
}

function reconcileCloudSave(save) {
  currentSave = save;
  updateSaveDisplay();
  buildAchievements();
  syncSettingsFromSave();
  applyGraphicsSettings();
  if (player) player.setSkin(currentSave.selectedSkin);
}

function getCrazyGamesSDK() {
  return window.CrazyGames?.SDK;
}

function notifyGameplayStart() {
  gameplayTracker.start();
}

function notifyGameplayStop() {
  gameplayTracker.stop();
}

function initializeCrazyGamesSDK() {
  if (sdkInitializationPromise) return sdkInitializationPromise;
  sdkInitializationPromise = initializeCrazyGamesSDKOnce().finally(() => {
    if (!sdkReady) sdkInitializationPromise = null;
  });
  return sdkInitializationPromise;
}

async function initializeCrazyGamesSDKOnce() {
  const sdk = getCrazyGamesSDK();
  try {
    const result = await saveManager.connect(sdk);
    if (result.environment === 'crazygames' && result.sdkInitialized) {
      sdkReady = true;
      bindCrazyGamesAudioSettings(sdk, audioManager);
    }
    return result;
  } catch (error) {
    console.warn('CrazyGames SDK initialization failed; continuing without SDK', error);
    return {
      save: saveManager.loadCurrent(),
      environment: saveManager.mode,
      connected: false,
      sdkInitialized: false
    };
  }
}

function buildAchievements() {
  const unlocked = currentSave.achievements || {};
  const list = getAchievementList();
  achievementList.innerHTML = '';

  buildDailyChallengesPanel();
  buildLoginRewardsPanel();
  buildLocalLeaderboardPanel();

  const careerSummary = document.createElement('div');
  careerSummary.className = 'career-summary';
  careerSummary.innerHTML = `
    <div><span>TOTAL RUNS</span><strong>${currentSave.gamesPlayed}</strong></div>
    <div><span>COINS COLLECTED</span><strong>${currentSave.totalCoinsCollected}</strong></div>
    <div><span>TOTAL DISTANCE</span><strong>${Math.floor(currentSave.totalDistance)} m</strong></div>
    <div><span>BEST SURVIVAL</span><strong>${Math.floor(currentSave.bestSurvivalTime)} s</strong></div>
  `;
  achievementList.appendChild(careerSummary);

  list.forEach((achievement) => {
    const isUnlocked = Boolean(unlocked[achievement.id]);
    const item = document.createElement('div');
    item.className = `achievement-item ${isUnlocked ? 'unlocked' : 'locked'}`;
    item.innerHTML = `
      <div class="achievement-heading">
        <div class="achievement-title">${achievement.name}</div>
        <span class="reward-status-badge ${isUnlocked ? 'claimed' : 'locked'}">${isUnlocked ? 'REWARD CLAIMED' : 'LOCKED'}</span>
      </div>
      <div class="achievement-desc">${achievement.description}</div>
      <div class="achievement-reward">+${achievement.reward} coins</div>
    `;
    achievementList.appendChild(item);
  });
  updateRewardNotifications();
}

function updateRewardNotifications() {
  const daily = ensureDailyChallenges(currentSave);
  const hasUnclaimedDailyReward = daily.challenges.some(
    (challenge) => challenge.progress >= challenge.target && !challenge.claimed
  );
  const hasUnclaimedLoginReward = !getLoginRewardState(currentSave).claimedToday;
  const hasRewards = hasUnclaimedDailyReward || hasUnclaimedLoginReward;
  for (const id of ['missions-btn', 'leaderboard-btn']) {
    const button = document.getElementById(id);
    button.classList.toggle('has-reward-notice', hasRewards);
    if (hasRewards) {
      button.title = 'Unclaimed rewards are ready';
      button.setAttribute('aria-label', `${button.textContent.trim()}: unclaimed rewards are ready`);
    } else {
      button.removeAttribute('title');
      button.removeAttribute('aria-label');
    }
  }
}

function buildDailyChallengesPanel() {
  const savedDate = currentSave.dailyChallenges?.date;
  const daily = ensureDailyChallenges(currentSave);
  if (daily.date !== savedDate) persistProgress(currentSave);
  const panel = document.createElement('section');
  panel.className = 'progression-panel';
  panel.id = 'daily-panel';
  const heading = document.createElement('h3');
  heading.textContent = 'DAILY CHALLENGES';
  const legend = document.createElement('p');
  legend.className = 'reward-status-legend';
  legend.textContent = 'Gold means a reward is ready to claim · Green means claimed · Gray means in progress';
  const reset = document.createElement('div');
  reset.className = 'daily-reset';
  reset.id = 'daily-reset-countdown';
  const rows = document.createElement('div');
  rows.className = 'daily-challenge-list';
  for (const challenge of daily.challenges) {
    const completed = challenge.progress >= challenge.target;
    const state = challenge.claimed ? 'claimed' : completed ? 'ready' : 'progress';
    const row = document.createElement('div');
    row.className = `daily-challenge daily-challenge-${state}`;
    const copy = document.createElement('div');
    copy.className = 'daily-challenge-copy';
    const titleRow = document.createElement('div');
    titleRow.className = 'daily-challenge-title-row';
    const title = document.createElement('strong');
    title.textContent = challenge.name;
    const badge = document.createElement('span');
    badge.className = `reward-status-badge ${state}`;
    badge.textContent = challenge.claimed ? 'CLAIMED' : completed ? 'REWARD READY' : 'IN PROGRESS';
    titleRow.append(title, badge);
    const progress = document.createElement('span');
    progress.textContent = `${Math.floor(challenge.progress)} / ${challenge.target} · +${challenge.reward} COINS`;
    const track = document.createElement('div');
    track.className = 'daily-progress-track';
    const fill = document.createElement('div');
    fill.className = 'daily-progress-fill';
    fill.style.width = `${Math.min(100, (challenge.progress / challenge.target) * 100)}%`;
    track.appendChild(fill);
    copy.append(titleRow, progress, track);

    const claim = document.createElement('button');
    claim.className = 'daily-claim-button';
    claim.dataset.action = 'claim-challenge';
    claim.dataset.challengeId = challenge.id;
    claim.disabled = challenge.claimed || !completed;
    claim.textContent = challenge.claimed ? 'CLAIMED' : completed ? `CLAIM +${challenge.reward}` : 'IN PROGRESS';
    claim.setAttribute('aria-label', challenge.claimed
      ? `${challenge.name}: reward claimed`
      : completed
        ? `Claim ${challenge.reward} coins for ${challenge.name}`
        : `${challenge.name}: in progress`);
    row.append(copy, claim);
    rows.appendChild(row);
  }
  panel.append(heading, legend, reset, rows);
  achievementList.appendChild(panel);
  updateDailyResetCountdown();
}

function buildLoginRewardsPanel() {
  const panel = document.createElement('section');
  panel.className = 'progression-panel';
  panel.id = 'login-rewards-panel';
  const state = getLoginRewardState(currentSave);
  const heading = document.createElement('h3');
  heading.textContent = '7-DAY LOGIN REWARDS';
  const row = document.createElement('div');
  row.className = 'login-reward-row';
  const note = document.createElement('span');
  note.className = 'login-reward-note';
  note.textContent = `LOGIN STREAK: ${state.streak} DAY${state.streak === 1 ? '' : 'S'} · NEXT: +${state.reward} COINS`;
  const claim = document.createElement('button');
  claim.className = 'login-claim-button';
  claim.dataset.action = 'claim-login-reward';
  claim.disabled = state.claimedToday;
  claim.classList.toggle('reward-ready', !state.claimedToday);
  claim.textContent = state.claimedToday ? '✓ CLAIMED TODAY' : `CLAIM ${state.reward} COINS`;
  claim.setAttribute('aria-label', state.claimedToday
    ? 'Daily login reward already claimed'
    : `Claim today's ${state.reward} coin login reward`);
  row.append(note, claim);

  const days = document.createElement('div');
  days.className = 'login-reward-days';
  state.rewards.forEach((reward, index) => {
    const day = document.createElement('div');
    day.className = 'login-reward-day';
    if (state.nextStreak === index + 1 && !state.claimedToday) day.classList.add('current');
    const claimedThrough = state.claimedToday ? state.streak : state.nextStreak - 1;
    if (index + 1 <= claimedThrough) day.classList.add('claimed');
    day.textContent = `DAY ${index + 1} · ${reward}`;
    days.appendChild(day);
  });
  panel.append(heading, row, days);
  achievementList.appendChild(panel);
}

function buildLocalLeaderboardPanel() {
  const panel = document.createElement('section');
  panel.className = 'leaderboard-panel';
  panel.id = 'local-leaderboard';
  const heading = document.createElement('h3');
  heading.textContent = 'LOCAL LEADERBOARD';
  const note = document.createElement('p');
  note.className = 'leaderboard-note';
  note.textContent = 'Personal records saved on this device. Global rankings are unavailable offline.';
  const score = document.createElement('div');
  score.className = 'local-rank-row';
  score.innerHTML = `<span>BEST SCORE</span><strong>${Math.floor(currentSave.personalBest)}</strong>`;
  const distance = document.createElement('div');
  distance.className = 'local-rank-row';
  distance.innerHTML = `<span>BEST DISTANCE</span><strong>${Math.floor(currentSave.bestDistance)} m</strong>`;
  panel.append(heading, note, score, distance);
  achievementList.appendChild(panel);
}

function updateDailyResetCountdown() {
  const savedDate = currentSave.dailyChallenges?.date;
  const dailyChallenges = ensureDailyChallenges(currentSave);
  if (dailyChallenges.date !== savedDate) {
    persistProgress(currentSave);
    buildAchievements();
    return;
  }
  const label = document.getElementById('daily-reset-countdown');
  if (!label) return;
  const seconds = getSecondsUntilDailyReset();
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  label.textContent = `NEW CHALLENGES IN ${hours}H ${minutes}M`;
}

function claimProgressionReward(target) {
  let result;
  if (target.dataset.action === 'claim-challenge') {
    result = claimDailyChallenge(currentSave, target.dataset.challengeId);
  } else if (target.dataset.action === 'claim-login-reward') {
    result = claimLoginReward(currentSave);
  } else {
    return;
  }
  if (!result.claimed) return;
  currentSave = result.save;
  persistProgress(currentSave);
  void saveManager.flush();
  updateSaveDisplay();
  buildAchievements();
  const balancePanel = document.querySelector('.coin-panel');
  balancePanel.classList.remove('reward-claimed');
  void balancePanel.offsetWidth;
  balancePanel.classList.add('reward-claimed');
  setTimeout(() => balancePanel.classList.remove('reward-claimed'), 500);
  audioManager.playAchievement();
  showToast(`REWARD CLAIMED: +${result.reward} COINS`);
}

function applySettings() {
  audioManager.setMusicVolume(Number(musicSlider.value));
  audioManager.setSfxVolume(Number(sfxSlider.value));
  currentSave.settings.musicVolume = Number(musicSlider.value);
  currentSave.settings.sfxVolume = Number(sfxSlider.value);
  currentSave.settings.graphics = graphicsSelect.value;
  persistProgress(currentSave);

  applyGraphicsSettings();
}

function applyGraphicsSettings() {
  const quality = graphicsSelect.value;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality === 'low' ? 1.2 : quality === 'medium' ? 1.6 : 2));
  renderer.shadowMap.enabled = quality === 'high';
  dirLight.castShadow = quality === 'high';
}

function syncSettingsFromSave() {
  musicSlider.value = currentSave.settings.musicVolume;
  sfxSlider.value = currentSave.settings.sfxVolume;
  graphicsSelect.value = currentSave.settings.graphics;
  ghostToggle.checked = currentSave.ghost.enabled;
  audioManager.setMusicVolume(Number(musicSlider.value));
  audioManager.setSfxVolume(Number(sfxSlider.value));
}

function clearCurrentRun() {
  if (ghostRunner) {
    ghostRunner.dispose();
    ghostRunner = null;
  }
  if (player) {
    player.dispose();
    player = null;
  }
  obstacleManager.items.forEach((item) => scene.remove(item.mesh));
  obstacleManager.coins.forEach((coin) => scene.remove(coin.mesh));
  obstacleManager.reset();
}

function startGame() {
  clearCurrentRun();
  menuScreen.classList.add('hidden');
  shopScreen.classList.add('hidden');
  missionsScreen.classList.add('hidden');
  settingsScreen.classList.add('hidden');
  gameOverOverlay.classList.add('hidden');
  pauseOverlay.classList.add('hidden');

  gameRunning = true;
  isPaused = false;
  newBestTriggered = false;
  runMetrics = createRunMetrics();
  sampleTimer = 0;
  powerUpTimers = { magnet: 0, slowMotion: 0, doubleCoins: 0, shield: 0 };
  shieldCharges = 0;
  invulnerabilityTimer = 0;
  environmentIndex = 0;
  environmentTransition = 0;
  hud.classList.remove('hidden');
  player = new Player(scene, currentSave.selectedSkin || 'classic');
  player.setWorldSpeed(17);
  obstacleManager.setEnvironment(ENVIRONMENTS[0]);
  if (currentSave.ghost.enabled && currentSave.ghost.bestRun?.samples?.length > 1) {
    ghostRunner = new GhostRunner(scene, currentSave.ghost.bestRun.samples);
    ghostStatus.classList.remove('hidden');
    ghostStatus.textContent = 'RECORD GHOST';
  } else {
    ghostRunner = null;
    ghostStatus.classList.add('hidden');
  }
  recordGhostSample(true);
  comboDisplay.classList.add('hidden');
  powerUpStatus.classList.add('hidden');
  environmentLabel.textContent = 'NEON CITY';
  obstacleManager.reset();
  camera.position.set(0, 8, 12);
  audioManager.init();
  audioManager.startMusic();
  audioManager.playButton();
  notifyGameplayStart();
}

function hasSeenTutorial() {
  return currentSave.settings?.tutorialSeen === true;
}

function completeTutorial() {
  currentSave.settings.tutorialSeen = true;
  persistProgress(currentSave);
  tutorialOverlay.classList.add('hidden');
  startGame();
}

function pauseGame() {
  if (!gameRunning) return;
  isPaused = !isPaused;
  if (isPaused) {
    persistProgress(currentSave);
    void saveManager.flush();
    audioManager.stopMusic();
    pauseOverlay.classList.remove('hidden');
    document.getElementById('pause-btn').textContent = 'RESUME';
    notifyGameplayStop();
  } else {
    audioManager.startMusic();
    pauseOverlay.classList.add('hidden');
    document.getElementById('pause-btn').textContent = 'PAUSE';
    notifyGameplayStart();
  }
}

function endGame() {
  if (!gameRunning) return;
  gameRunning = false;
  isPaused = false;

  const currentScore = Math.floor(runMetrics.score);
  const distance = Math.floor(runMetrics.distance);
  const distanceReward = Math.floor(distance / 100);
  const earnedCoins = runMetrics.runCoins + distanceReward;

  const previousBest = currentSave.personalBest || 0;
  const newBest = currentScore > previousBest;
  currentSave.personalBest = Math.max(previousBest, currentScore);
  currentSave.totalDistance += distance;
  currentSave.bestDistance = Math.max(currentSave.bestDistance, distance);
  currentSave.totalCoinsCollected += runMetrics.runCoins;
  currentSave.gamesPlayed += 1;
  currentSave.bestSurvivalTime = Math.max(currentSave.bestSurvivalTime, runMetrics.seconds);
  currentSave.totalCoins += earnedCoins;
  if (earnedCoins > 0) markWalletUpdated(currentSave);
  if (newBest) {
    recordGhostSample(true);
    currentSave.ghost.bestRun = {
      score: currentScore,
      distance,
      duration: runMetrics.seconds,
      samples: runMetrics.ghostSamples
    };
  }
  ensureDailyChallenges(currentSave);
  currentSave.powerUpStats.total += runMetrics.powerUps;
  for (const type of ['magnet', 'shield', 'slowMotion', 'doubleCoins']) {
    currentSave.powerUpStats[type] += runMetrics.powerUpsByType?.[type] || 0;
  }
  if (distance >= 1000 && !currentSave.environmentUnlocks.includes('cyber-space')) currentSave.environmentUnlocks.push('cyber-space');
  if (distance >= 3000 && !currentSave.environmentUnlocks.includes('lava-world')) currentSave.environmentUnlocks.push('lava-world');

  const { achievements, newlyUnlocked } = makeAchievementState(currentSave, {
    runCoins: runMetrics.runCoins,
    maxSpeed: runMetrics.maxSpeed,
    maxCombo: runMetrics.maxCombo,
    totalCoins: currentSave.totalCoinsCollected
  });
  currentSave.achievements = achievements;

  newBestTriggered = newBest;
  finalScore.textContent = currentScore;
  finalDistance.textContent = `${distance} m`;
  finalCoins.textContent = earnedCoins;
  finalBest.textContent = currentSave.personalBest;
  document.getElementById('final-combo').textContent = runMetrics.maxCombo;
  document.getElementById('final-powerups').textContent = runMetrics.powerUps;
  document.getElementById('final-environments').textContent = runMetrics.environmentsVisited.length;
  newBestBanner.classList.toggle('hidden', !newBestTriggered);

  persistProgress(currentSave);
  void saveManager.flush();
  updateSaveDisplay();
  buildAchievements();
  if (newlyUnlocked.length > 0) {
    const rewards = newlyUnlocked.map((id) => getAchievementList().find((item) => item.id === id)?.name).filter(Boolean);
    document.getElementById('achievement-summary').textContent = `MISSIONS COMPLETE: ${rewards.join(', ')}`;
    document.getElementById('achievement-summary').classList.remove('hidden');
    audioManager.playAchievement();
  } else {
    document.getElementById('achievement-summary').classList.add('hidden');
  }
  audioManager.playHit();
  hud.classList.add('hidden');
  gameOverOverlay.classList.remove('hidden');
  pauseOverlay.classList.add('hidden');
  comboDisplay.classList.add('hidden');
  powerUpStatus.classList.add('hidden');
  document.getElementById('pause-btn').textContent = 'PAUSE';
  audioManager.stopMusic();
  notifyGameplayStop();
  const sdk = getCrazyGamesSDK();
  rewardButton.hidden = !(REWARDED_ADS_ENABLED && sdkReady && typeof sdk?.ad?.requestAd === 'function');
  rewardButton.disabled = false;
  rewardButton.textContent = 'WATCH AD FOR +50 COINS';
}

function handleRewardAd() {
  const sdk = window.CrazyGames?.SDK;
  if (!REWARDED_ADS_ENABLED || !sdkReady || gameRunning || rewardAdPending || typeof sdk?.ad?.requestAd !== 'function') return;

  rewardAdPending = true;
  rewardButton.disabled = true;
  try {
    sdk.ad.requestAd('rewarded', {
      adStarted: () => {
        rewardButton.textContent = 'AD PLAYING...';
      },
      adFinished: () => {
        currentSave.totalCoins += 50;
        markWalletUpdated(currentSave);
        persistProgress(currentSave);
        updateSaveDisplay();
        rewardButton.textContent = 'BONUS CLAIMED +50';
        audioManager.playAchievement();
        rewardAdPending = false;
      },
      adError: (error) => {
        console.warn('CrazyGames rewarded ad failed', error);
        rewardButton.textContent = 'AD UNAVAILABLE';
        rewardButton.disabled = false;
        rewardAdPending = false;
      }
    });
  } catch (error) {
    console.warn('CrazyGames rewarded ad request failed', error);
    rewardButton.textContent = 'AD UNAVAILABLE';
    rewardButton.disabled = false;
    rewardAdPending = false;
  }
}

function updateHud() {
  scoreValue.textContent = Math.floor(runMetrics.score);
  distanceValue.textContent = `${Math.floor(runMetrics.distance)} m`;
  coinValue.textContent = runMetrics.runCoins;
  speedValue.textContent = `${Math.round(obstacleManager.worldSpeed)}x`;
  updatePowerUpHud();
}

function animateCoinPickup() {
  coinCard.classList.remove('is-collecting');
  coinGain.classList.remove('is-visible');
  void coinCard.offsetWidth;
  coinCard.classList.add('is-collecting');
  coinGain.classList.add('is-visible');
  clearTimeout(animateCoinPickup.timeout);
  animateCoinPickup.timeout = setTimeout(() => {
    coinCard.classList.remove('is-collecting');
    coinGain.classList.remove('is-visible');
  }, 560);
}

function registerComboAction() {
  const previousMultiplier = runMetrics.multiplier;
  runMetrics = increaseCombo(runMetrics);
  const increased = runMetrics.multiplier > previousMultiplier;
  if (runMetrics.combo >= 2) {
    comboCount.textContent = `COMBO ${runMetrics.combo}`;
    comboMultiplier.textContent = `x${runMetrics.multiplier}`;
    comboDisplay.className = `combo-display combo-tier-${runMetrics.multiplier}`;
    comboDisplay.classList.remove('hidden');
    comboDisplay.classList.remove('combo-pop');
    void comboDisplay.offsetWidth;
    comboDisplay.classList.add('combo-pop');
  }
  if (increased) audioManager.playCombo();
}

function resetCombo() {
  if (runMetrics.combo === 0) return;
  runMetrics = breakCombo(runMetrics);
  comboDisplay.classList.add('hidden');
}

function recordGhostSample(force = false) {
  if (!player) return;
  if (!force && sampleTimer < 0.1) return;
  sampleTimer = force ? 0 : sampleTimer % 0.1;
  const sample = {
    t: runMetrics.seconds,
    x: player.group.position.x,
    y: player.group.position.y,
    scaleY: player.group.scale.y,
    score: runMetrics.score,
    distance: runMetrics.distance,
    sliding: player.isSliding
  };
  const samples = runMetrics.ghostSamples;
  if (samples.length < 30000) samples.push(sample);
  else if (force) samples[samples.length - 1] = sample;

  const ghostSample = currentSave.ghost.enabled ? ghostRunner?.update(runMetrics.seconds) : null;
  if (ghostSample) {
    const delta = Math.round(runMetrics.distance - ghostSample.distance);
    ghostStatus.textContent = Math.abs(delta) < 3 ? 'RUNNING EVEN' : `${delta > 0 ? 'AHEAD' : 'BEHIND'} ${Math.abs(delta)} M`;
  } else if (ghostRunner) {
    ghostStatus.textContent = runMetrics.seconds > (currentSave.ghost.bestRun?.duration || 0) ? 'RECORD FINISHED' : 'RECORD GHOST';
  }
}

function updatePowerUpHud() {
  const labels = [
    ['magnet', 'MAGNET'],
    ['shield', shieldCharges > 0 ? 'SHIELD READY' : 'SHIELD'],
    ['slowMotion', 'SLOW'],
    ['doubleCoins', '2X COINS']
  ];
  const active = [];
  for (const [type, label] of labels) {
    const remaining = powerUpTimers[type];
    if (remaining <= 0) continue;
    active.push(`${label} ${type === 'shield' && shieldCharges ? '1 HIT' : `${remaining.toFixed(1)}S`}`);
  }
  const signature = active.join('|');
  if (signature !== powerUpStatus.dataset.signature) {
    powerUpStatus.replaceChildren();
    for (const text of active) {
      const timer = document.createElement('span');
      timer.className = 'powerup-timer';
      timer.textContent = text;
      powerUpStatus.appendChild(timer);
    }
    powerUpStatus.dataset.signature = signature;
  }
  powerUpStatus.classList.toggle('hidden', active.length === 0);
}

function collectPowerUp(powerUp) {
  const durations = { magnet: 10, shield: 12, slowMotion: 7, doubleCoins: 10 };
  const colors = { magnet: 0xf472b6, shield: 0x38bdf8, slowMotion: 0xa78bfa, doubleCoins: 0xfacc15 };
  powerUpTimers[powerUp.type] = durations[powerUp.type];
  if (powerUp.type === 'shield') shieldCharges = 1;
  runMetrics.powerUps += 1;
  runMetrics.powerUpsByType[powerUp.type] += 1;
  obstacleManager.removePowerUp(powerUp);
  particles.spawnBurst(player.group.position.clone(), colors[powerUp.type], 20, 2.8);
  audioManager.playPowerUp();
  updatePowerUpHud();
}

function processPassedObstacles() {
  for (const obstacle of obstacleManager.items) {
    if (obstacle.passed || obstacle.mesh.position.z < 1.35) continue;
    obstacle.passed = true;
    runMetrics.obstaclesAvoided += 1;
    updateDailyChallengeProgress(currentSave, 'obstacles', 1);
    const usedAction = (
      ['laser', 'spinner'].includes(obstacle.type)
      && Math.abs(player.group.position.x - obstacle.mesh.position.x) < 1.7
      && player.isSliding
    ) || (
      ['block', 'moving', 'gap', 'moving-platform'].includes(obstacle.type)
      && Math.abs(player.group.position.x - obstacle.mesh.position.x) < 1.7
      && player.group.position.y > GROUND_Y + 0.2
    );
    if (usedAction) runMetrics.successfulActions += 1;
    registerComboAction();
  }
}

function performJump() {
  if (!player?.jump()) return;
  runMetrics.jumps += 1;
  updateDailyChallengeProgress(currentSave, 'jumps', 1);
  audioManager.playJump();
}

function performSlide() {
  if (!player?.slide()) return;
  audioManager.playButton();
}

function updateEnvironment(dt) {
  const nextIndex = Math.floor(runMetrics.distance / 900) % ENVIRONMENTS.length;
  if (nextIndex !== environmentIndex) {
    environmentIndex = nextIndex;
    obstacleManager.setEnvironment(ENVIRONMENTS[environmentIndex]);
  }
  const target = ENVIRONMENT_PALETTES[environmentIndex];
  const environment = ENVIRONMENTS[environmentIndex];
  if (!runMetrics.environmentsVisited.includes(environment)) {
    runMetrics.environmentsVisited.push(environment);
  }
  const alpha = 1 - Math.exp(-dt * 0.35);
  scene.background.lerp(target.bg, alpha);
  scene.fog.color.lerp(target.fog, alpha);
  road.material.color.lerp(target.road, alpha);
  roadGlow.material.color.lerp(target.roadGlow, alpha);
  roadGlow.material.emissive.lerp(target.roadGlow, alpha);
  laneLines[0].material.color.lerp(target.lane, alpha);
  laneLines[0].material.emissive.lerp(target.lane, alpha);
  ambient.color.lerp(target.ambient, alpha);
  rimLight.color.lerp(target.rim, alpha);
  sideDecor[0].material.emissive.lerp(target.roadGlow, alpha);
  for (const glow of skyGlows) {
    glow.material.color.lerp(target.ambient, alpha);
  }
  environmentLabel.textContent = ['NEON CITY', 'CYBER SPACE', 'LAVA WORLD'][environmentIndex];
  environmentTransition += dt;
}

function animateScene(dt) {
  const t = performance.now() * 0.0007;
  roadGlow.material.emissiveIntensity = 0.45 + Math.sin(t * 10) * 0.3;

  laneLines.forEach((line) => {
    line.position.z += obstacleManager.worldSpeed * dt * 0.72;
    if (line.position.z > 32) line.position.z = -48;
  });

  sideDecor.forEach((pillar, index) => {
    pillar.position.z += obstacleManager.worldSpeed * dt * 0.78;
    if (pillar.position.z > 30) pillar.position.z = -54;
    pillar.rotation.y += dt * 0.2;
  });

  skyGlows.forEach((glow, index) => {
    glow.position.z += obstacleManager.worldSpeed * dt * 0.35;
    if (glow.position.z > 32) glow.position.z = -90;
    glow.scale.setScalar(1 + Math.sin((t + index) * 3) * 0.3);
  });

  particles.update(dt);

  if (player) {
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, player.group.position.x * 0.6, 0.1);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, 7.5 + (player.group.position.y - 0.62) * 0.6, 0.1);
    camera.lookAt(new THREE.Vector3(player.group.position.x, 0.95, -10));
  }
}

function checkCollisions() {
  if (!player) return;

  const playerX = player.group.position.x;
  const playerY = player.group.position.y;

  for (const coin of [...obstacleManager.coins]) {
    if (powerUpTimers.magnet > 0 && Math.abs(coin.mesh.position.z) < 13) {
      coin.mesh.position.x = THREE.MathUtils.lerp(coin.mesh.position.x, playerX, 0.07);
      coin.mesh.position.y = THREE.MathUtils.lerp(coin.mesh.position.y, playerY + 0.25, 0.045);
    }
    const dx = Math.abs(playerX - coin.mesh.position.x);
    const dz = Math.abs(coin.mesh.position.z);
    const dy = Math.abs(playerY - coin.mesh.position.y);
    if (dx < 1.2 && dz < 1.5 && dy < 1.8) {
      const position = coin.mesh.position.clone();
      obstacleManager.removeCoin(coin);
      registerComboAction();
      const reward = runMetrics.multiplier * (powerUpTimers.doubleCoins > 0 ? 2 : 1);
      runMetrics.runCoins += reward;
      runMetrics.score += 80 * runMetrics.multiplier;
      updateDailyChallengeProgress(currentSave, 'coins', reward);
      animateCoinPickup();
      particles.spawnBurst(position, 0xfacc15, 12, 2.5);
      audioManager.playCoin();
    } else if (coin.mesh.position.z > 1.5 && !coin.passed) {
      coin.passed = true;
      resetCombo();
    }
  }

  for (const powerUp of [...obstacleManager.powerUps]) {
    if (Math.abs(playerX - powerUp.mesh.position.x) < 1.35
      && Math.abs(powerUp.mesh.position.z) < 1.5
      && Math.abs(playerY - powerUp.mesh.position.y) < 1.6) {
      collectPowerUp(powerUp);
    }
  }

  const collisions = obstacleManager.getObstacleCollisionState(playerX, 0, playerY, player.isSliding);
  if (collisions.length > 0 && invulnerabilityTimer <= 0) {
    resetCombo();
    if (shieldCharges > 0) {
      shieldCharges = 0;
      powerUpTimers.shield = 0;
      invulnerabilityTimer = 1.25;
      particles.spawnBurst(player.group.position.clone(), 0x38bdf8, 24, 3.2);
      audioManager.playPowerUp();
      updatePowerUpHud();
    } else {
      endGame();
    }
  }
}

function updateGame(dt) {
  if (!player) return;

  runMetrics.seconds += dt;
  invulnerabilityTimer = Math.max(0, invulnerabilityTimer - dt);
  for (const type of Object.keys(powerUpTimers)) {
    powerUpTimers[type] = Math.max(0, powerUpTimers[type] - dt);
  }
  if (powerUpTimers.shield <= 0) shieldCharges = 0;

  const naturalSpeed = Math.min(MAX_WORLD_SPEED, 17 + runMetrics.distance * 0.03);
  const effectiveSpeed = naturalSpeed * (powerUpTimers.slowMotion > 0 ? 0.62 : 1);
  runMetrics.distance += effectiveSpeed * dt;
  runMetrics.score += dt * (15 + effectiveSpeed * 1.4);
  updateDailyChallengeProgress(currentSave, 'seconds', dt);
  updateDailyChallengeProgress(currentSave, 'distance', effectiveSpeed * dt);
  runMetrics.maxSpeed = Math.max(runMetrics.maxSpeed, naturalSpeed);
  obstacleManager.update(dt, effectiveSpeed);
  player.setWorldSpeed(naturalSpeed);
  player.update(dt);
  sampleTimer += dt;
  recordGhostSample();
  processPassedObstacles();
  updateEnvironment(dt);
  if (Math.random() < dt * 18) particles.spawnBurst(
    new THREE.Vector3(player.group.position.x, player.group.position.y - 0.6, player.group.position.z + 0.5),
    [0x38bdf8, 0xa78bfa, 0xfb7185][environmentIndex],
    1,
    0.35
  );
  checkCollisions();
  updateHud();
}

function bindControls() {
  const leftKeys = ['ArrowLeft', 'a', 'A'];
  const rightKeys = ['ArrowRight', 'd', 'D'];
  const jumpKeys = [' ', 'ArrowUp', 'w', 'W'];
  const slideKeys = ['s', 'S', 'ArrowDown'];

  document.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    if (gameRunning && isPaused && event.key !== 'Escape') return;

    if (gameRunning && !isPaused && leftKeys.includes(event.key)) player?.moveLane(-1);
    if (gameRunning && !isPaused && rightKeys.includes(event.key)) player?.moveLane(1);
    if (gameRunning && !isPaused && jumpKeys.includes(event.key)) performJump();
    if (gameRunning && !isPaused && slideKeys.includes(event.key)) performSlide();
    if (event.key === 'Escape') pauseGame();
  });

  let touchStart = null;
  document.addEventListener('touchstart', (event) => {
    if (event.touches.length > 0) {
      const touch = event.touches[0];
      touchStart = { x: touch.clientX, y: touch.clientY };
    }
  }, { passive: true });

  document.addEventListener('touchend', (event) => {
    if (!touchStart || !event.changedTouches.length) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStart.x;
    const dy = touch.clientY - touchStart.y;
    const shouldHandleSwipe = gameRunning && !isPaused;
    touchStart = null;
    if (!shouldHandleSwipe) return;

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 35) {
      if (dx < 0) player?.moveLane(-1);
      else player?.moveLane(1);
    } else if (dy < -28) {
      performJump();
    } else if (dy > 28) {
      performSlide();
    }
  }, { passive: true });
  document.addEventListener('touchcancel', () => {
    touchStart = null;
  }, { passive: true });

  document.addEventListener('touchmove', (event) => {
    if (gameRunning && !isPaused && touchStart) event.preventDefault();
  }, { passive: false });
}

function bindUi() {
  document.getElementById('play-btn').addEventListener('click', () => {
    if (hasSeenTutorial()) {
      startGame();
    } else {
      tutorialOverlay.classList.remove('hidden');
    }
  });
  document.getElementById('tutorial-start-btn').addEventListener('click', completeTutorial);
  document.getElementById('tutorial-skip-btn').addEventListener('click', completeTutorial);

  document.getElementById('shop-btn').addEventListener('click', () => {
    currentSave = saveManager.loadCurrent();
    refreshShop();
    showScreen('shop');
  });

  document.getElementById('missions-btn').addEventListener('click', () => {
    buildAchievements();
    showScreen('missions');
  });
  document.getElementById('leaderboard-btn').addEventListener('click', () => {
    buildAchievements();
    showScreen('missions');
    document.getElementById('local-leaderboard').scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
  achievementList.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (button) claimProgressionReward(button);
  });

  document.getElementById('settings-btn').addEventListener('click', () => {
    showScreen('settings');
  });

  document.getElementById('shop-back').addEventListener('click', () => showScreen('menu'));
  document.getElementById('missions-back').addEventListener('click', () => showScreen('menu'));
  document.getElementById('settings-back').addEventListener('click', () => showScreen('menu'));

  document.getElementById('restart-btn').addEventListener('click', () => {
    audioManager.playButton();
    startGame();
  });

  document.getElementById('menu-btn').addEventListener('click', () => {
    audioManager.playButton();
    persistProgress(currentSave);
    void saveManager.flush();
    gameOverOverlay.classList.add('hidden');
    gameRunning = false;
    notifyGameplayStop();
    showScreen('menu');
    audioManager.stopMusic();
  });

  document.getElementById('pause-btn').addEventListener('click', () => {
    pauseGame();
  });
  document.getElementById('resume-btn').addEventListener('click', () => pauseGame());

  document.getElementById('reset-progress-btn').addEventListener('click', () => {
    currentSave = resetProgress();
    persistProgress(currentSave);
    syncSettingsFromSave();
    applyGraphicsSettings();
    if (player) player.setSkin(currentSave.selectedSkin);
    updateSaveDisplay();
    buildAchievements();
    audioManager.playButton();
  });

  rewardButton.addEventListener('click', handleRewardAd);

  musicSlider.addEventListener('input', () => applySettings());
  sfxSlider.addEventListener('input', () => applySettings());
  graphicsSelect.addEventListener('change', () => applySettings());
  ghostToggle.addEventListener('change', () => {
    currentSave.ghost.enabled = ghostToggle.checked;
    persistProgress(currentSave);
    if (!ghostToggle.checked && ghostRunner) {
      ghostRunner.setVisible(false);
      ghostStatus.classList.add('hidden');
    } else if (ghostToggle.checked && currentSave.ghost.bestRun?.samples?.length > 1) {
      if (gameRunning) {
        if (!ghostRunner) ghostRunner = new GhostRunner(scene, currentSave.ghost.bestRun.samples);
        ghostRunner.setVisible(true);
        ghostStatus.classList.remove('hidden');
      }
    }
  });
}

function refreshShop() {
  renderShop(currentSave, (skinId) => {
    const result = buySkin(currentSave, skinId);
    if (!result.purchased) {
      showToast('NOT ENOUGH COINS');
      return;
    }
    currentSave = result.save;
    persistProgress(currentSave);
    updateSaveDisplay();
    refreshShop();
  }, (skinId) => {
    const result = equipSkin(currentSave, skinId);
    if (!result.equipped) return;
    currentSave = result.save;
    persistProgress(currentSave);
    if (player) player.setSkin(currentSave.selectedSkin);
    updateSaveDisplay();
    refreshShop();
  });
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toast.classList.add('hidden'), 1800);
}

function mainLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.033);
  lastTime = timestamp;

  if (gameRunning && !isPaused) {
    updateGame(dt);
  }
  animateScene(isPaused ? 0 : dt);
  renderer.render(scene, camera);
  requestAnimationFrame(mainLoop);
}

async function waitForSDKScript() {
  if (getCrazyGamesSDK()) return;
  const script = document.getElementById('crazygames-sdk-script');
  if (!script) return;
  await new Promise((resolve) => {
    let completed = false;
    const finish = () => {
      if (completed) return;
      completed = true;
      clearTimeout(timeout);
      script.removeEventListener('load', finish);
      script.removeEventListener('error', finish);
      resolve();
    };
    const timeout = setTimeout(finish, 4000);
    script.addEventListener('load', finish, { once: true });
    script.addEventListener('error', finish, { once: true });
  });
}

async function boot() {
  cloudSaveStatus.textContent = 'LOADING SAVE';
  cloudSaveStatus.dataset.state = 'loading';
  requestAnimationFrame(mainLoop);
  await waitForSDKScript();
  let result = await initializeCrazyGamesSDK();
  if (!result) result = await saveManager.connect(null);
  currentSave = result.save || saveManager.loadCurrent();
  ensureDailyChallenges(currentSave);
  persistProgress(currentSave, { touchTimestamp: false });
  syncSettingsFromSave();
  applyGraphicsSettings();
  updateSaveDisplay();
  buildAchievements();
  bindUi();
  bindControls();
  showScreen('menu');
  player = new Player(scene, currentSave.selectedSkin || 'classic');
  player.reset();
  setInterval(updateDailyResetCountdown, 60000);
  // Deliver any pending gameplay state if the SDK finished initialising late.
  setInterval(() => gameplayTracker.sync(), 1000);
}

void boot();
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  applyGraphicsSettings();
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) return;
  if (gameRunning && !isPaused) pauseGame();
  else void saveManager.flush();
});
