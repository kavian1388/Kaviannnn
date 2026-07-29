/**
 * Audio.js
 * All SFX are synthesized at runtime with the Web Audio API. This keeps the
 * game 100% offline with zero external audio assets to go missing. No music
 * is played, per spec - only short one-shot effects.
 */
(function (RC) {
  'use strict';

  function AudioManager() {
    this.ctx = null;
    this.muted = false;
  }

  AudioManager.prototype._ensureCtx = function () {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  };

  /** Generic short blip: frequency slide + gain envelope. */
  AudioManager.prototype._tone = function (freqStart, freqEnd, duration, type, volume) {
    if (this.muted) return;
    const ctx = this._ensureCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freqStart, ctx.currentTime);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), ctx.currentTime + duration);
    gain.gain.setValueAtTime(volume != null ? volume : 0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.02);
  };

  AudioManager.prototype.rotate = function () { this._tone(320, 480, 0.12, 'square', 0.12); };
  AudioManager.prototype.coin = function () { this._tone(880, 1400, 0.15, 'triangle', 0.18); };
  AudioManager.prototype.button = function () { this._tone(500, 500, 0.06, 'square', 0.1); };

  AudioManager.prototype.win = function () {
    const self = this;
    [660, 880, 1100, 1320].forEach(function (f, i) {
      setTimeout(function () { self._tone(f, f, 0.18, 'triangle', 0.2); }, i * 90);
    });
  };

  AudioManager.prototype.lose = function () {
    this._tone(220, 60, 0.5, 'sawtooth', 0.22);
  };

  AudioManager.prototype.setMuted = function (v) { this.muted = v; };

  RC.Audio = new AudioManager();

  // Wire up game events to sounds in one place.
  RC.Events.on('rotate', function () { RC.Audio.rotate(); });
  RC.Events.on('coin', function () { RC.Audio.coin(); });
  RC.Events.on('win', function () { RC.Audio.win(); });
  RC.Events.on('lose', function () { RC.Audio.lose(); });
  RC.Events.on('button', function () { RC.Audio.button(); });

})(window.RC = window.RC || {});
