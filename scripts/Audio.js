/**
 * Audio.js
 * Premium minimalist sound engine, fully synthesized via WebAudio so the
 * game needs zero external audio assets and works offline out of the box.
 */
const AudioEngine = (() => {
  let ctx = null;
  let master = null;
  let muted = false;

  function ensureCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.8;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  function tone({ freq = 440, dur = 0.15, type = 'sine', vol = 0.3, slideTo = null, delay = 0 }) {
    if (muted) return;
    ensureCtx();
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noiseBurst({ dur = 0.15, vol = 0.25, filterFreq = 2000, delay = 0 }) {
    if (muted) return;
    ensureCtx();
    const t0 = ctx.currentTime + delay;
    const bufferSize = ctx.sampleRate * dur;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    noise.start(t0);
    noise.stop(t0 + dur + 0.02);
  }

  const sfx = {
    shoot: () => {
      tone({ freq: 900, slideTo: 220, dur: 0.12, type: 'sawtooth', vol: 0.22 });
      noiseBurst({ dur: 0.08, vol: 0.35, filterFreq: 3500 });
    },
    bounce: (pitch = 1) => {
      tone({ freq: 520 * pitch, slideTo: 260 * pitch, dur: 0.1, type: 'triangle', vol: 0.22 });
    },
    hit: () => {
      tone({ freq: 180, slideTo: 60, dur: 0.18, type: 'square', vol: 0.25 });
      noiseBurst({ dur: 0.1, vol: 0.2, filterFreq: 1200 });
    },
    shield: () => {
      tone({ freq: 700, slideTo: 700, dur: 0.08, type: 'square', vol: 0.2 });
    },
    coin: () => {
      tone({ freq: 1200, dur: 0.08, type: 'sine', vol: 0.18 });
      tone({ freq: 1800, dur: 0.12, type: 'sine', vol: 0.16, delay: 0.05 });
    },
    win: () => {
      [660, 880, 1100, 1320].forEach((f, i) => tone({ freq: f, dur: 0.22, type: 'sine', vol: 0.22, delay: i * 0.08 }));
    },
    lose: () => {
      tone({ freq: 300, slideTo: 90, dur: 0.4, type: 'sawtooth', vol: 0.22 });
    },
    button: () => {
      tone({ freq: 500, dur: 0.06, type: 'sine', vol: 0.15 });
    },
    combo: (level) => {
      tone({ freq: 500 + level * 120, dur: 0.14, type: 'sine', vol: 0.2 });
    },
    teleport: () => {
      tone({ freq: 200, slideTo: 1200, dur: 0.2, type: 'sine', vol: 0.2 });
    },
    star: (i) => {
      tone({ freq: 700 + i * 200, dur: 0.16, type: 'sine', vol: 0.22, delay: i * 0.12 });
    },
  };

  function setMuted(v) {
    muted = v;
  }

  function unlock() {
    ensureCtx();
  }

  return { sfx, setMuted, unlock };
})();
