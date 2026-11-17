// EMBERKEEP — entry point. Wires the canvas, input, audio, world and render
// loop together. ?shot=title|play|boss|over&seed=N stages a deterministic
// screenshot scene instead of live play; otherwise the game runs live.
import { VIEW } from './config.js';
import { createWorld, update, stateSnapshot } from './world.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { render } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
canvas.width = VIEW.W;
canvas.height = VIEW.H;
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(window.location.search);
const seedParam = Number.parseInt(params.get('seed') || '7', 10);
const seed = Number.isFinite(seedParam) ? seedParam : 7;
const shot = params.get('shot');

const input = createInput(canvas);
const audio = createAudio();
const world = createWorld(seed, 'burning');

// First gesture unlocks audio (browsers require it) and starts the music.
window.addEventListener('pointerdown', () => { audio.unlock(); audio.startMusic(() => world.realm); }, { once: true });
window.addEventListener('keydown', () => { audio.unlock(); audio.startMusic(() => world.realm); }, { once: true });

window.__ember = {
  state: () => stateSnapshot(world),
  world,
};

if (shot) {
  stageShot(world, shot);
  render(world, ctx);
  window.__shotReady = true;
} else {
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(world, dt, input, audio);
    render(world, ctx);
    input.endFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
