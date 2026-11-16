// All sound is synthesized with WebAudio: no audio files, no network.
// The synth stays silent until the first player gesture, and the
// screenshot scenes never touch it.
export function createAudio() {
  let context = null;
  let master = null;
  let enabled = true;

  function ensure() {
    if (context) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.16;
      master.connect(context.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, seconds, type, slideTo, volume) {
    if (!enabled || !ensure()) return;
    try {
      if (context.state === 'suspended') void context.resume();
      const osc = context.createOscillator();
      const gain = context.createGain();
      const now = context.currentTime;
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), now + seconds);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + seconds + 0.02);
    } catch {
      // Sound is garnish: a failure here never stops the game.
    }
  }

  function noise(seconds, volume, lowpass) {
    if (!enabled || !ensure()) return;
    try {
      if (context.state === 'suspended') void context.resume();
      const length = Math.floor(context.sampleRate * seconds);
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const source = context.createBufferSource();
      source.buffer = buffer;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpass;
      const gain = context.createGain();
      gain.gain.value = volume;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      source.start();
    } catch {
      // As above: never let sound break play.
    }
  }

  return {
    unlock() {
      ensure();
    },
    shoot() {
      tone(740, 0.07, 'square', 320, 0.25);
    },
    enemyDown() {
      tone(210, 0.16, 'sawtooth', 60, 0.4);
      noise(0.12, 0.3, 1400);
    },
    hit() {
      tone(130, 0.3, 'sawtooth', 45, 0.5);
      noise(0.25, 0.4, 700);
    },
    pickup() {
      tone(880, 0.09, 'sine', 1320, 0.4);
    },
    heart() {
      tone(523, 0.12, 'sine', 784, 0.4);
      tone(784, 0.16, 'sine', 1046, 0.3);
    },
    waveHorn() {
      tone(196, 0.5, 'triangle', 392, 0.45);
      tone(294, 0.5, 'triangle', 392, 0.25);
    },
    gameOver() {
      tone(392, 0.9, 'triangle', 98, 0.45);
      tone(196, 1.1, 'sine', 65, 0.35);
    },
    toggle() {
      enabled = !enabled;
      return enabled;
    },
  };
}
