// Boot and the one loop: input is read every frame, the world advances
// in fixed 1/60 s steps (several in a slow frame, none in a fast one),
// and the renderer paints what is there. The game moves between four
// screens: title, play, paused and game over.
//
// ?seed=N fixes the tide's pattern. ?shot=title|play|boss|over (with
// &seed=N) stages that scene instead of running the loop, paints it
// twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import { createWorld, EVENT_HIT, EVENT_KILL, EVENT_OVER, EVENT_PICKUP, EVENT_WAVE } from './world.js';
import { ACTION_CONFIRM, ACTION_DASH, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  const stats = { seconds: world.elapsed };
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, stats);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let runSeconds = 0;
  let dashQueued = false;

  // Screen readers (and anyone watching the page's text) hear the screen changes and each hit.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    world.reset();
    world.startWave();
    accumulator = 0;
    runSeconds = 0;
    screen = SCREEN_PLAY;
    announce(`Sailing. Wave 1. ${world.state.player.hearts} hearts.`);
  }

  function endGame() {
    screen = SCREEN_OVER;
    audio.gameOver();
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`Game over. Score ${world.state.score}. Best ${best}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_DASH) dashQueued = true;
    if (actions & ACTION_MUTE) {
      const on = audio.toggle();
      announce(on ? 'Sound on.' : 'Sound off.');
    }
    if (actions & ACTION_RESTART && screen === SCREEN_OVER) {
      startGame();
      return;
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Sailing.');
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { x: 0, y: 0 }, { x: 640, y: 200 }, false, false, true);
      return;
    }
    const firing = input.holdFire();
    const dash = dashQueued;
    dashQueued = false;
    const move = input.direction();
    const aim = input.aim();
    const events = world.step(STEP, move, aim, firing, dash, false);
    runSeconds += STEP;
    if (events & EVENT_WAVE) audio.waveHorn();
    if (events & EVENT_KILL) audio.enemyDown();
    if (events & EVENT_PICKUP) audio.pickup();
    if (events & EVENT_HIT) {
      audio.hit();
      announce(world.state.player.hearts === 1 ? 'Hit. 1 heart left.' : `Hit. ${world.state.player.hearts} hearts left.`);
    }
    if (events & EVENT_OVER) endGame();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, { seconds: runSeconds });
  }

  // Leaving the tab pauses a running game rather than letting shadows close in unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Lumen Tide. Press Space or click to sail.');
  window.__lumen = {
    state() {
      return {
        screen,
        wave: world.state.wave,
        score: world.state.score,
        hearts: world.state.player.hearts,
        enemies: world.state.enemies.length,
        bullets: world.state.bullets.length,
        player: { x: Math.round(world.state.player.x), y: Math.round(world.state.player.y) },
      };
    },
  };
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
