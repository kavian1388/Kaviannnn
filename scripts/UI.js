/**
 * UI.js
 * Thin DOM controller for every screen that sits on top of the canvas:
 * main menu, level select, HUD, pause, win/lose, skins shop, daily
 * rewards + missions, achievements, statistics and settings. Keeping
 * this out of Game.js keeps the render/physics loop free of DOM work.
 */
const UI = (() => {
  const screens = {};
  let activeScreen = null;
  let hudComboTimeout = null;

  function $(id) { return document.getElementById(id); }

  function cacheScreens() {
    document.querySelectorAll('[data-screen]').forEach((el) => {
      screens[el.dataset.screen] = el;
    });
  }

  function show(name) {
    if (activeScreen === name) return;
    for (const key in screens) {
      const el = screens[key];
      if (key === name) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    }
    activeScreen = name;
    const hud = $('hud');
    if (hud) hud.classList.toggle('hidden', name !== 'game');
    if (name === 'menu') refreshMenuBadges();
  }

  function refreshMenuBadges() {
    const save = Save.get();
    $('menu-coins').textContent = save.coins.toLocaleString();
    const claimable = isDailyLoginClaimable();
    $('daily-badge').classList.toggle('hidden', !claimable);
  }

  function isDailyLoginClaimable() {
    return Save.get().dailyLogin.lastClaim !== new Date().toDateString();
  }

  // ---------------- HUD (in-game) ----------------
  function setHudLevel(id) {
    $('hud-level').textContent = 'LEVEL ' + id;
  }

  function setHudCoins(coins) {
    $('hud-coins').textContent = coins.toLocaleString();
  }

  function setHudBounces(count, max) {
    $('hud-bounces').textContent = `${count}/${max}`;
  }

  function showCombo(n) {
    const el = $('combo-banner');
    el.textContent = `COMBO x${n}`;
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
    clearTimeout(hudComboTimeout);
    hudComboTimeout = setTimeout(() => el.classList.remove('pop'), 700);
  }

  function showPerfect() {
    const el = $('perfect-banner');
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
    setTimeout(() => el.classList.remove('pop'), 1100);
  }

  function flashCoins(amount) {
    const el = $('coin-float');
    el.textContent = '+' + amount;
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
  }

  // ---------------- Level select ----------------
  function buildLevelSelect(onPick) {
    const grid = $('level-grid');
    grid.innerHTML = '';
    const total = LevelManager.totalLevels();
    for (let i = 1; i <= total; i++) {
      const unlocked = LevelManager.isUnlocked(i);
      const stars = LevelManager.getStars(i);
      const btn = document.createElement('button');
      btn.className = 'level-tile' + (unlocked ? '' : ' locked');
      btn.innerHTML = `<span class="level-num">${i}</span><span class="level-stars">${renderStars(stars)}</span>`;
      if (unlocked) btn.addEventListener('click', () => onPick(i));
      grid.appendChild(btn);
    }
  }

  function renderStars(n) {
    let s = '';
    for (let i = 0; i < 3; i++) s += i < n ? '★' : '☆';
    return s;
  }

  // ---------------- Win / Lose ----------------
  function showWin({ levelId, stars, coinsEarned, perfect, bounces, par }) {
    $('win-level-label').textContent = 'LEVEL ' + levelId + ' CLEARED';
    $('win-stars').innerHTML = [0, 1, 2].map((i) => `<span class="star ${i < stars ? 'filled' : ''}">★</span>`).join('');
    $('win-coins').textContent = '+' + coinsEarned;
    $('win-perfect').classList.toggle('hidden', !perfect);
    $('win-bounces').textContent = `${bounces} bounce${bounces === 1 ? '' : 's'} (par ${par})`;
    show('win');
  }

  function showLose(levelId) {
    $('lose-level-label').textContent = 'LEVEL ' + levelId;
    show('lose');
  }

  // ---------------- Skins ----------------
  function buildSkinsScreen(onEquip, onPurchase) {
    const grid = $('skins-grid');
    grid.innerHTML = '';
    const save = Save.get();
    SkinManager.all().forEach((skin) => {
      const unlocked = SkinManager.isUnlocked(skin.id);
      const equipped = save.equippedSkin === skin.id;
      const card = document.createElement('div');
      card.className = 'skin-card' + (equipped ? ' equipped' : '');
      card.innerHTML = `
        <div class="skin-swatch" style="background: linear-gradient(135deg, ${skin.metalLight}, ${skin.metalDark}); box-shadow: 0 0 22px ${skin.glow}66;"></div>
        <div class="skin-name">${skin.name}</div>
        <div class="skin-action">${equipped ? 'EQUIPPED' : unlocked ? 'EQUIP' : skin.price + ' COINS'}</div>
      `;
      card.querySelector('.skin-action').addEventListener('click', () => {
        if (equipped) return;
        if (unlocked) { onEquip(skin.id); } else { onPurchase(skin.id); }
      });
      grid.appendChild(card);
    });
  }

  // ---------------- Daily / Missions ----------------
  function buildDailyScreen(onClaimMission) {
    const track = $('login-track');
    track.innerHTML = '';
    const save = Save.get();
    const claimableToday = isDailyLoginClaimable();
    MissionManager.LOGIN_REWARDS.forEach((reward, i) => {
      const day = i + 1;
      const done = day < save.dailyLogin.streak || (day === save.dailyLogin.streak && !claimableToday);
      const isToday = claimableToday && day === (save.dailyLogin.streak % 7) + 1;
      const cell = document.createElement('div');
      cell.className = 'login-cell' + (done ? ' done' : '') + (isToday ? ' today' : '');
      cell.innerHTML = `<div class="login-day">DAY ${day}</div><div class="login-reward">${reward}</div>`;
      track.appendChild(cell);
    });

    const list = $('missions-list');
    list.innerHTML = '';
    MissionManager.getMissions().forEach((m) => {
      const pct = Math.min(100, (m.progress / m.target) * 100);
      const row = document.createElement('div');
      row.className = 'mission-row';
      row.innerHTML = `
        <div class="mission-info">
          <div class="mission-label">${m.label}</div>
          <div class="mission-bar"><div class="mission-fill" style="width:${pct}%"></div></div>
          <div class="mission-progress">${m.progress}/${m.target}</div>
        </div>
        <button class="mission-claim ${m.claimed ? 'claimed' : m.progress >= m.target ? 'ready' : ''}" ${m.claimed ? 'disabled' : ''}>
          ${m.claimed ? 'DONE' : '+' + m.reward}
        </button>`;
      row.querySelector('.mission-claim').addEventListener('click', () => {
        if (m.progress >= m.target && !m.claimed) onClaimMission(m.id);
      });
      list.appendChild(row);
    });
  }

  // ---------------- Achievements ----------------
  function buildAchievementsScreen() {
    const list = $('achievements-list');
    list.innerHTML = '';
    AchievementManager.all().forEach((a) => {
      const row = document.createElement('div');
      row.className = 'ach-row' + (a.unlocked ? ' unlocked' : '');
      row.innerHTML = `
        <div class="ach-icon">${a.unlocked ? '✓' : '•'}</div>
        <div class="ach-info"><div class="ach-name">${a.name}</div><div class="ach-desc">${a.desc}</div></div>
        <div class="ach-reward">+${a.reward}</div>`;
      list.appendChild(row);
    });
  }

  // ---------------- Statistics ----------------
  function buildStatsScreen() {
    const s = Save.get().stats;
    const rows = [
      ['Levels Completed', s.levelsCompleted],
      ['Bullets Fired', s.bulletsFired],
      ['Enemies Destroyed', s.enemiesDestroyed],
      ['Longest Combo', 'x' + s.longestCombo],
      ['Perfect Shots', s.perfectShots],
      ['Total Play Time', Utils.formatTime(s.totalPlayTimeSec)],
    ];
    $('stats-list').innerHTML = rows.map(([label, val]) =>
      `<div class="stat-row"><span>${label}</span><span class="stat-val">${val}</span></div>`).join('');
  }

  // ---------------- Settings ----------------
  function buildSettingsScreen(onChange) {
    const save = Save.get();
    const soundToggle = $('setting-sound');
    const hapticsToggle = $('setting-haptics');
    soundToggle.checked = save.settings.sound;
    hapticsToggle.checked = save.settings.haptics;
    soundToggle.onchange = () => onChange('sound', soundToggle.checked);
    hapticsToggle.onchange = () => onChange('haptics', hapticsToggle.checked);
  }

  return {
    cacheScreens, show, refreshMenuBadges,
    setHudLevel, setHudCoins, setHudBounces, showCombo, showPerfect, flashCoins,
    buildLevelSelect, showWin, showLose,
    buildSkinsScreen, buildDailyScreen, buildAchievementsScreen, buildStatsScreen, buildSettingsScreen,
    isDailyLoginClaimable,
  };
})();
