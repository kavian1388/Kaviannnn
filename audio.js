export class AudioManager {
  constructor() {
    this.context = null;
    this.enabled = true;
    this.musicTimer = null;
    this.musicStep = 0;
    this.musicVolumeValue = 0.6;
    this.sfxVolumeValue = 0.8;
    this.platformMuted = false;
    this.masterGain = null;
  }

  init() {
    if (this.context) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      this.enabled = false;
      return;
    }
    this.context = new AudioCtx();
    this.masterGain = this.context.createGain();
    this.masterGain.gain.setValueAtTime(this.platformMuted ? 0 : 1, this.context.currentTime);
    this.masterGain.connect(this.context.destination);
    if (this.context.state === 'suspended') {
      this.context.resume().catch(() => {});
    }
  }

  setPlatformMuted(muted) {
    if (typeof muted !== 'boolean') return;
    this.platformMuted = muted;
    if (!this.masterGain || !this.context) return;
    this.masterGain.gain.cancelScheduledValues(this.context.currentTime);
    this.masterGain.gain.setValueAtTime(muted ? 0 : 1, this.context.currentTime);
  }

  setMusicVolume(value) {
    this.musicVolumeValue = value / 100;
  }

  setSfxVolume(value) {
    this.sfxVolumeValue = value / 100;
  }

  ensureContext() {
    if (!this.enabled) return null;
    if (!this.context) this.init();
    return this.context;
  }

  playTone({ frequency = 220, duration = 0.12, type = 'sine', volume = 0.08, sweep = 0, channel = 'sfx' }) {
    const context = this.ensureContext();
    if (!context) return;

    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    if (sweep !== 0) {
      oscillator.frequency.linearRampToValueAtTime(frequency + sweep, context.currentTime + duration);
    }

    gainNode.gain.setValueAtTime(0.001, context.currentTime);
    const channelVolume = channel === 'music' ? this.musicVolumeValue : this.sfxVolumeValue;
    gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume * channelVolume), context.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain || context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration + 0.04);
  }

  playJump() {
    this.playTone({ frequency: 290, duration: 0.11, type: 'square', volume: 0.08, sweep: 180 });
  }

  playCoin() {
    this.playTone({ frequency: 920, duration: 0.08, type: 'triangle', volume: 0.1, sweep: 180 });
    setTimeout(() => this.playTone({ frequency: 1120, duration: 0.08, type: 'triangle', volume: 0.08, sweep: 220 }), 45);
  }

  playHit() {
    this.playTone({ frequency: 120, duration: 0.28, type: 'sawtooth', volume: 0.12, sweep: -120 });
  }

  playButton() {
    this.playTone({ frequency: 430, duration: 0.08, type: 'triangle', volume: 0.07, sweep: 70 });
  }

  playAchievement() {
    this.playTone({ frequency: 620, duration: 0.12, type: 'triangle', volume: 0.1, sweep: 160 });
    setTimeout(() => this.playTone({ frequency: 780, duration: 0.12, type: 'triangle', volume: 0.08, sweep: 180 }), 110);
  }

  playPowerUp() {
    this.playTone({ frequency: 420, duration: 0.16, type: 'triangle', volume: 0.1, sweep: 420 });
    setTimeout(() => this.playTone({ frequency: 840, duration: 0.1, type: 'sine', volume: 0.07, sweep: 180 }), 70);
  }

  playCombo() {
    this.playTone({ frequency: 560, duration: 0.09, type: 'triangle', volume: 0.08, sweep: 160 });
  }

  startMusic() {
    if (!this.enabled) return;
    this.init();
    if (!this.context) return;
    if (this.musicTimer) clearInterval(this.musicTimer);

    const sequence = [220, 277, 330, 277, 392, 330, 277, 220];
    this.musicTimer = setInterval(() => {
      const freq = sequence[this.musicStep % sequence.length];
      this.playTone({ frequency: freq, duration: 0.22, type: 'sine', volume: 0.035, sweep: 40, channel: 'music' });
      this.musicStep += 1;
    }, 290);
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

const boundAudioSettings = new WeakMap();

export function bindCrazyGamesAudioSettings(sdk, audioManager) {
  let game;
  try {
    game = sdk?.game;
  } catch (error) {
    console.warn('CrazyGames game settings API is unavailable', error);
    return false;
  }
  if (!game || !audioManager || (typeof game !== 'object' && typeof game !== 'function')) return false;

  const existingBinding = boundAudioSettings.get(game);
  if (existingBinding) {
    existingBinding.applyMuteSetting();
    return true;
  }

  const applyMuteSetting = (settings) => {
    try {
      const muteAudio = settings?.muteAudio
        ?? settings?.settings?.muteAudio
        ?? game.settings?.muteAudio;
      if (typeof muteAudio === 'boolean') {
        audioManager.setPlatformMuted(muteAudio);
      }
    } catch (error) {
      console.warn('CrazyGames audio mute setting could not be read', error);
    }
  };

  let addSettingsChangeListener;
  try {
    addSettingsChangeListener = game.addSettingsChangeListener;
  } catch (error) {
    console.warn('CrazyGames audio settings listener is unavailable', error);
  }
  if (typeof addSettingsChangeListener === 'function') {
    try {
      addSettingsChangeListener.call(game, applyMuteSetting);
      boundAudioSettings.set(game, { applyMuteSetting });
    } catch (error) {
      console.warn('CrazyGames audio settings listener could not be registered', error);
    }
  }
  applyMuteSetting();
  return true;
}
