// Synthesised sound: no audio assets, everything is WebAudio oscillators.
// Created lazily on the first user gesture (browsers block audio before it).
export function createAudio() {
  let ctx = null;
  let muted = false;
  let master = null;
  let musicTimer = null;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.22;
      master.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (muted || !ensure()) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    gain.gain.setValueAtTime(vol || 0.5, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, vol, lowpass) {
    if (muted || !ensure()) return;
    const t0 = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass || 1200;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol || 0.4, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  }

  const sfx = {
    shoot() { tone(720, 0.07, 'square', 0.16, 380); },
    hit() { tone(190, 0.06, 'sawtooth', 0.2, 120); },
    die() { tone(320, 0.16, 'triangle', 0.3, 60); noise(0.12, 0.18, 900); },
    pickup() { tone(880, 0.09, 'sine', 0.25, 1320); },
    hurt() { tone(140, 0.22, 'sawtooth', 0.35, 70); noise(0.15, 0.25, 600); },
    dash() { noise(0.16, 0.2, 2400); },
    trap() { tone(520, 0.1, 'sine', 0.2, 780); },
    relic() { tone(523, 0.12, 'sine', 0.28); setTimeout(() => tone(784, 0.14, 'sine', 0.28), 90); setTimeout(() => tone(1046, 0.2, 'sine', 0.28), 180); },
    buy() { tone(660, 0.08, 'square', 0.18, 990); },
    deny() { tone(160, 0.14, 'square', 0.22, 110); },
    nightClear() {
      [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.3), i * 110));
    },
    bossRoar() { tone(90, 0.7, 'sawtooth', 0.4, 45); noise(0.5, 0.3, 500); },
    bossDie() {
      [392, 311, 233, 155].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'sawtooth', 0.3), i * 140));
      noise(0.7, 0.35, 700);
    },
    gameOver() { [330, 262, 196, 131].forEach((f, i) => setTimeout(() => tone(f, 0.4, 'triangle', 0.32), i * 200)); },
    victory() {
      [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => setTimeout(() => tone(f, 0.35, 'triangle', 0.3), i * 130));
    },
    click() { tone(600, 0.05, 'sine', 0.18, 700); },
    heal() { tone(440, 0.15, 'sine', 0.25, 880); },
  };

  return {
    unlock() { ensure(); },
    toggleMute() { muted = !muted; return muted; },
    isMuted() { return muted; },
    play(name) { if (sfx[name]) sfx[name](); },
    // Generative ambient music: a slow minor-pentatonic line over a low
    // drone, root shifting per realm. Starts only after unlock().
    startMusic(getRealm) {
      if (musicTimer) return;
      const scale = [0, 3, 5, 7, 10, 12, 15];
      const roots = [110, 98, 82.4];
      let step = 0;
      musicTimer = setInterval(() => {
        if (muted || !ctx) return;
        const realm = Math.min(2, Math.max(0, getRealm() || 0));
        const root = roots[realm];
        if (step % 8 === 0) tone(root / 2, 3.2, 'sine', 0.14);
        if (step % 2 === 0 && Math.random() < 0.75) {
          const deg = scale[Math.floor(Math.random() * scale.length)];
          const f = root * Math.pow(2, deg / 12) * 2;
          tone(f, 0.9, 'triangle', 0.08);
        }
        if (step % 16 === 14) tone(root * 1.5, 1.4, 'sine', 0.06);
        step += 1;
      }, 460);
    },
  };
}
