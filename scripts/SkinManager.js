/**
 * SkinManager.js
 * Weapon-only skins. Each skin changes the bullet glow color, trail,
 * reflection sparks and impact tint, plus the pistol's metal gradient.
 */
const SkinManager = (() => {
  const SKINS = {
    obsidian: {
      id: 'obsidian', name: 'Obsidian', price: 0,
      metalLight: '#4a4a50', metalDark: '#101012', rim: '#8a8a92',
      glow: '#00f6ff',
    },
    chrome: {
      id: 'chrome', name: 'Chrome', price: 800,
      metalLight: '#e8e8ec', metalDark: '#8b8b92', rim: '#ffffff',
      glow: '#8fe9ff',
    },
    gold: {
      id: 'gold', name: 'Gold', price: 1500,
      metalLight: '#f3d27a', metalDark: '#8a6a1f', rim: '#ffe9a8',
      glow: '#ffd166',
    },
    carbon: {
      id: 'carbon', name: 'Carbon Fiber', price: 1200,
      metalLight: '#2c2c30', metalDark: '#050506', rim: '#4a4a52',
      glow: '#39ff88',
    },
    cyberneon: {
      id: 'cyberneon', name: 'Cyber Neon', price: 2200,
      metalLight: '#33323f', metalDark: '#0c0b12', rim: '#ff2df0',
      glow: '#ff2df0',
    },
    emerald: {
      id: 'emerald', name: 'Emerald', price: 1800,
      metalLight: '#2fae7a', metalDark: '#0c3324', rim: '#7dffca',
      glow: '#20e39e',
    },
  };

  function all() {
    return Object.values(SKINS);
  }

  function isUnlocked(id) {
    return Save.get().unlockedSkins.includes(id);
  }

  function unlock(id) {
    Save.update((s) => {
      if (!s.unlockedSkins.includes(id)) s.unlockedSkins.push(id);
    });
  }

  function equip(id) {
    Save.update((s) => { s.equippedSkin = id; });
  }

  function purchase(id) {
    const skin = SKINS[id];
    const save = Save.get();
    if (!skin || isUnlocked(id) || save.coins < skin.price) return false;
    Save.update((s) => {
      s.coins -= skin.price;
      s.unlockedSkins.push(id);
      s.equippedSkin = id;
    });
    return true;
  }

  function getEquippedSkinData() {
    const id = Save.get().equippedSkin;
    return SKINS[id] || SKINS.obsidian;
  }

  return { all, isUnlocked, unlock, equip, purchase, getEquippedSkinData, SKINS };
})();
