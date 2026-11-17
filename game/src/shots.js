// EMBERKEEP — staged screenshot scenes. Each scene is the real game, driven by
// a scripted autopilot with fixed inputs on a seeded world, so the renders
// are deterministic: the same seed gives the same pixels.
import { createWorld, startNight, spawnBoss, spawnEnemy, update, stateSnapshot, gradeFor, unlockFeat } from './world.js';
import { createAudio } from './audio.js';

function fakeInput() {
  const mouse = { x: 640, y: 360, down: false, pressed: false, rightPressed: false };
  const keys = new Set();
  const pressedKeys = new Set();
  return {
    mouse,
    isDown(code) { return keys.has(code); },
    pressed(code) { return pressedKeys.has(code); },
    axis() { return { x: 0, y: 0 }; },
    takeClicks() { return []; },
    endFrame() { pressedKeys.clear(); mouse.pressed = false; mouse.rightPressed = false; },
    _set(keysDown, mx, my, down) {
      keys.clear();
      for (const k of keysDown) keys.add(k);
      mouse.x = mx; mouse.y = my; mouse.down = down;
    },
  };
}

// Autopilot: circle-strafe around the centre, aim at the nearest foe, fire,
// dash when something gets close, drop a trap now and then.
function autopilotStep(w, input, frame) {
  const p = w.player;
  const cx = 640; const cy = 400;
  const orbit = frame * 0.011;
  const tx = cx + Math.cos(orbit) * 260;
  const ty = cy + Math.sin(orbit) * 150;
  const keys = [];
  if (tx > p.x + 12) keys.push('KeyD');
  if (tx < p.x - 12) keys.push('KeyA');
  if (ty > p.y + 12) keys.push('KeyS');
  if (ty < p.y - 12) keys.push('KeyW');
  let target = w.boss && w.boss.hp > 0 ? w.boss : null;
  let best = Infinity;
  for (const e of w.enemies) {
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < best) { best = d; target = e; }
  }
  let mx = 640; let my = 200;
  if (target) { mx = target.x; my = target.y; }
  const near = w.enemies.some((e) => Math.hypot(e.x - p.x, e.y - p.y) < 90);
  if (near && frame % 150 === 0) keys.push('Space');
  input._set(keys, mx, my, true);
  if (frame % 300 === 150) input.mouse.rightPressed = true;
}

function runFrames(w, input, audio, frames) {
  for (let f = 0; f < frames; f += 1) {
    autopilotStep(w, input, f);
    update(w, 1 / 60, input, audio);
    input.endFrame();
    if (w.screen !== 'playing') break;
  }
}

export function stageShot(w, query) {
  const audio = createAudio();
  const input = fakeInput();
  if (query === 'title') {
    // Title screen as-is, with a few ambient particles pre-warmed.
    for (let f = 0; f < 120; f += 1) update(w, 1 / 60, input, audio);
    return;
  }
  if (query === 'play') {
    startNight(w, 5);
    // Give the Keeper some relics and embers so the HUD reads rich.
    w.player.shots = 2;
    w.player.damageMul = 1.25;
    w.player.maxHearts = 4;
    w.player.hearts = 4;
    w.embers = 214;
    w.score = 8420;
    w.relics = [
      { id: 'twinWick', name: 'Twin Wick', icon: '✦', desc: '+1 ember bolt per shot.' },
      { id: 'magnetCore', name: 'Magnet Core', icon: '◎', desc: '+60% ember pickup radius.' },
      { id: 'swiftBoots', name: 'Swift Boots', icon: '»', desc: '+15% move speed.' },
    ];
    // A few extra foes mid-arena, so the shot reads busy. The Keeper
    // cannot be hurt while the scene is posed (as in the boss scene).
    spawnEnemy(w, 'brute', 300, 300);
    spawnEnemy(w, 'skitter', 950, 280);
    spawnEnemy(w, 'spitter', 900, 520);
    spawnEnemy(w, 'wraith', 380, 520);
    w.player.invulnT = 999;
    runFrames(w, input, audio, 60 * 14);
    return;
  }
  if (query === 'boss') {
    startNight(w, 9);
    // Skip the wave queue straight to the final boss, mid-fight.
    w.spawnQueue = [];
    w.enemies = [];
    spawnBoss(w, 'eclipseWarden');
    w.boss.hp = Math.round(w.boss.maxHp * 0.55);
    w.boss.phaseIdx = 2;
    w.player.shots = 2;
    w.player.damageMul = 1.5;
    w.player.fireRateMul = 1.2;
    // The staged fight must survive its own screenshot: full hearts, and
    // the Keeper cannot be hurt while the scene is posed (the autopilot
    // does not dodge globes — a human player does). The fight itself is
    // unchanged: the boss, its bursts and its summons all run live.
    w.player.maxHearts = 5;
    w.player.hearts = 5;
    w.player.invulnT = 999;
    w.embers = 486;
    w.score = 18930;
    w.relics = [
      { id: 'twinWick', name: 'Twin Wick', icon: '✦', desc: '+1 ember bolt per shot.' },
      { id: 'longFuse', name: 'Long Fuse', icon: '➶', desc: '+25% bolt damage.' },
      { id: 'rapidWick', name: 'Rapid Wick', icon: '≋', desc: '+20% fire rate.' },
      { id: 'emberHeart', name: 'Ember Heart', icon: '♥', desc: '+1 max heart, and heal 1 heart now.' },
      { id: 'thornLantern', name: 'Thorn Lantern', icon: '✷', desc: 'Foes that touch you take 2 damage.' },
    ];
    runFrames(w, input, audio, 60 * 10);
    return;
  }
  if (query === 'over') {
    // A victory run, staged on the real victory screen.
    startNight(w, 9);
    w.score = 24500;
    w.stats.kills = 342;
    w.stats.shots = 1180;
    w.stats.hits = 934;
    w.stats.bosses = 3;
    w.stats.relicsTaken = 7;
    w.stats.embersEarned = 1280;
    w.stats.nightsCleared = 9;
    w.runTime = 18 * 60 + 42;
    w.embers = 640;
    w.relics = [
      { id: 'twinWick', name: 'Twin Wick', icon: '✦', desc: '' },
      { id: 'longFuse', name: 'Long Fuse', icon: '➶', desc: '' },
      { id: 'emberHeart', name: 'Ember Heart', icon: '♥', desc: '' },
      { id: 'magnetCore', name: 'Magnet Core', icon: '◎', desc: '' },
      { id: 'swiftBoots', name: 'Swift Boots', icon: '»', desc: '' },
      { id: 'dashCharm', name: 'Dash Charm', icon: '↯', desc: '' },
      { id: 'greedCandle', name: 'Greed Candle', icon: '◈', desc: '' },
    ];
    for (const id of ['firstDawn', 'flawless', 'bossSlayer', 'hoarder', 'tripleKill', 'sharpshooter', 'fullArsenal', 'speedrun']) {
      w.feats.add(id);
    }
    const grade = gradeFor(w.score);
    w.screen = 'victory';
    // Clear the night-9 intro state: the boss banner must not leak onto
    // the victory screen (in live play it has long expired by then).
    w.introT = 0;
    w.messageT = 0;
    w.fx.banner = null;
    w.fx.bannerT = 0;
    w.victory = {
      grade,
      record: { seed: w.seed, difficulty: w.diff.id, score: w.score, grade: grade.grade, nights: 9, won: true },
      feats: [...w.feats],
    };
    return;
  }
}

export function shotState(w) {
  return stateSnapshot(w);
}
