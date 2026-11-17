// EMBERKEEP — the simulation. One pure-ish state object plus an update step.
// Screens: 'title' | 'playing' | 'intermission' | 'gameover' | 'victory'.
// All gameplay randomness flows through the seeded rng, so a seed replays.
import {
  VIEW, ARENA, DIFFICULTIES, REALMS, NIGHTS, FINAL_NIGHT, NIGHT_PLANS,
  ENEMIES, ENEMY_ORDER, BOSSES, RELICS, SHOP, REROLL_COST, FEATS,
  GRADES, NIGHT_CLEAR_BONUS, BOSS_BONUS, PLAYER, FLAME_PER_KILL, EMBERS_PER_KILL,
  NIGHT_STORIES, ELITE_CHANCE, ELITE_HP_MUL, ELITE_VALUE_MUL, ELITE_SPEED_MUL,
  BOSS_ENRAGE_TIME, BOSS_ENRAGE_MUL, BOSS_DIALOGUE, REST_COST, GAMBLE_COST,
} from './config.js';
import { createRandom, pickWeighted, shuffle } from './random.js';
import { createEffects, addShake, addHitStop, addFlash, showBanner, burst, maybeLightning, updateEffects } from './effects.js';

export function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
export function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
export function angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }

const HISTORY_KEY = 'emberkeep_history_v1';
const BEST_KEY = 'emberkeep_best_v1';

export function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}
export function loadBest() {
  try { return JSON.parse(localStorage.getItem(BEST_KEY) || '{}'); } catch { return {}; }
}
export function saveRun(record) {
  try {
    const hist = loadHistory();
    hist.unshift(record);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(hist.slice(0, 5)));
    const best = loadBest();
    const key = record.difficulty;
    if (!best[key] || record.score > best[key].score) {
      best[key] = { score: record.score, grade: record.grade, nights: record.nights, date: record.date };
      localStorage.setItem(BEST_KEY, JSON.stringify(best));
    }
  } catch { /* storage unavailable: the run still counts in-session */ }
}

export function gradeFor(score) {
  for (const g of GRADES) if (score >= g.min) return g;
  return GRADES[GRADES.length - 1];
}

export function createWorld(seed, difficultyId) {
  const diff = DIFFICULTIES.find((d) => d.id === difficultyId) || DIFFICULTIES[1];
  const rng = createRandom(seed);
  const w = {
    seed, rng, diff,
    screen: 'title',
    fx: createEffects(),
    codexTab: 0,
    time: 0, runTime: 0,
    night: 0, realm: 0,
    score: 0, embers: 0,
    player: freshPlayer(),
    enemies: [], bolts: [], ebullets: [], pickups: [], traps: [], particles: [], floats: [],
    spawnQueue: [], spawnTimer: 0, boss: null, bossSpawned: false,
    introT: 0, introText: '', introSub: '',
    nightKills: 0, nightDamage: false, nightShots: 0, nightHits: 0,
    killsWindow: [], // timestamps of recent kills (triple kill feat)
    combo: { count: 0, timer: 0 },
    telegraphs: [],
    tipsShown: 0,
    nightStats: [],
    lanceCd: 0,
    relics: [], relicCounts: {},
    feats: new Set(), featsNew: [],
    shop: SHOP.map((s) => ({ ...s, bought: 0 })),
    relicChoices: [],
    stats: { kills: 0, shots: 0, hits: 0, bosses: 0, relicsTaken: 0, embersEarned: 0, nightsCleared: 0, lanceHits: 0, elitesKilled: 0 },
    paused: false, over: null, victory: null,
    message: '', messageT: 0, dialogue: null,
    history: loadHistory(), best: loadBest(),
    selectedDiff: 1,
  };
  return w;
}

export function freshPlayer() {
  return {
    x: VIEW.W / 2, y: VIEW.H / 2 + 60, vx: 0, vy: 0,
    radius: PLAYER.radius, hearts: PLAYER.hearts, maxHearts: PLAYER.hearts,
    flame: PLAYER.maxFlame, maxFlame: PLAYER.maxFlame,
    aim: -Math.PI / 2, fireT: 0,
    dashT: 0, dashCd: 0, dashDir: 0, invulnT: 0,
    // build stats (mutated by relics/shop)
    shots: 1, damageMul: 1, fireRateMul: 1, speedMul: 1, magnetMul: 1,
    dashCharges: 1, dashMax: 1, dashCooldownMul: 1, trapSlots: PLAYER.trapSlots,
    thorns: 0, emberMul: 1, frost: false, blast: false, phoenix: 0,
    trapCd: 0, slowT: 0, shield: false, lucky: false, secondWind: false, oil: false,
  };
}

export function realmOf(night) {
  return Math.min(2, Math.floor((night - 1) / 3));
}

export function nightName(night) {
  const plan = NIGHT_PLANS[night - 1];
  if (plan.boss) return BOSSES[plan.boss].name;
  return `NIGHT ${night}`;
}

// ---------------------------------------------------------------------------
// Night setup: build the spawn queue for a night from its plan.
// ---------------------------------------------------------------------------
export function startNight(w, night) {
  w.night = night;
  w.realm = realmOf(night);
  const plan = NIGHT_PLANS[night - 1];
  const diff = w.diff;
  const count = Math.round(plan.budget * diff.spawnMul);
  const queue = [];
  const entries = Object.entries(plan.mix);
  for (let i = 0; i < count; i += 1) {
    queue.push(pickWeighted(w.rng, entries));
  }
  w.spawnQueue = shuffle(w.rng, queue);
  w.spawnTimer = 1.2;
  w.boss = null;
  w.bossSpawned = false;
  w.nightKills = 0;
  w.nightDamage = false;
  w.nightShots = 0;
  w.nightHits = 0;
  w.introT = 2.6;
  // Ember Shield re-arms every night if the relic is owned.
  if (w.relicCounts.emberShield) w.player.shield = true;
  const boss = plan.boss ? BOSSES[plan.boss] : null;
  w.introText = boss ? boss.name : `NIGHT ${night}`;
  w.introSub = boss ? boss.title : NIGHT_STORIES[night - 1];
  w.screen = 'playing';
  if (boss) showBanner(w.fx, boss.name, boss.title, 2.6);
}

export function spawnEnemy(w, type, x, y) {
  const cfg = ENEMIES[type];
  const diff = w.diff;
  const edge = pickEdge(w);
  const px = x !== undefined ? x : edge.x;
  const py = y !== undefined ? y : edge.y;
  const e = {
    type, name: cfg.name, x: px, y: py,
    vx: 0, vy: 0, angle: 0,
    hp: Math.max(1, Math.round(cfg.hp * diff.hpMul)),
    maxHp: Math.max(1, Math.round(cfg.hp * diff.hpMul)),
    speed: cfg.speed * diff.speedMul * (0.9 + w.rng() * 0.2),
    radius: cfg.radius, damage: cfg.damage, value: cfg.value,
    color: cfg.color, glow: cfg.glow,
    behaviour: cfg.behaviour, t: w.rng() * 10, phase: 0, phaseT: 0,
    solid: true, fireT: 1 + w.rng() * 1.5, chargeT: 3 + w.rng() * 2,
    charging: 0, telegraph: 0, slowT: 0, flashT: 0, wobble: w.rng() * Math.PI * 2,
    elite: false,
  };
  // Realm variants: the realms change the foes. Ash crawlers are faster and
  // leave embers; deep wraiths fade longer and move faster while faded.
  if (w.realm === 1 && type === 'crawler') {
    e.speed *= 1.15;
    e.value += 10;
  }
  if (w.realm === 2 && type === 'wraith') {
    e.speed *= 1.15;
  }
  // One in ten foes is ember-touched: golden, tougher, worth far more.
  if (w.rng() < ELITE_CHANCE) {
    e.elite = true;
    e.hp = Math.round(e.hp * ELITE_HP_MUL);
    e.maxHp = e.hp;
    e.value = Math.round(e.value * ELITE_VALUE_MUL);
    e.speed *= ELITE_SPEED_MUL;
    e.radius = Math.round(e.radius * 1.25);
  }
  w.enemies.push(e);
  return e;
}

function pickEdge(w) {
  const side = Math.floor(w.rng() * 4);
  const m = 30;
  if (side === 0) return { x: ARENA.x + m + w.rng() * (ARENA.w - m * 2), y: ARENA.y + m };
  if (side === 1) return { x: ARENA.x + m + w.rng() * (ARENA.w - m * 2), y: ARENA.y + ARENA.h - m };
  if (side === 2) return { x: ARENA.x + m, y: ARENA.y + m + w.rng() * (ARENA.h - m * 2) };
  return { x: ARENA.x + ARENA.w - m, y: ARENA.y + m + w.rng() * (ARENA.h - m * 2) };
}

export function spawnBoss(w, bossId) {
  const cfg = BOSSES[bossId];
  const diff = w.diff;
  const b = {
    id: bossId, name: cfg.name, title: cfg.title,
    x: VIEW.W / 2, y: ARENA.y + 120,
    vx: 0, vy: 0, angle: Math.PI / 2,
    hp: Math.round(cfg.hp * diff.hpMul), maxHp: Math.round(cfg.hp * diff.hpMul),
    speed: cfg.speed * diff.speedMul, radius: cfg.radius, value: cfg.value,
    color: cfg.color, glow: cfg.glow,
    attacks: cfg.attacks, phases: cfg.phases,
    t: 0, burstT: 3, summonT: 6, chargeT: 8, chargeState: 0, chargeDir: 0,
    phaseIdx: 0, flashT: 0, drainT: 0, slowT: 0, enraged: false,
  };
  w.boss = b;
  w.bossSpawned = true;
  // Bosses speak before the fight: two lines, shown as messages.
  w.dialogue = { lines: BOSS_DIALOGUE[bossId] || [], idx: 0, t: 0 };
  if (w.dialogue.lines.length > 0) {
    w.message = w.dialogue.lines[0];
    w.messageT = 2.6;
  }
  return b;
}

// ---------------------------------------------------------------------------
// Player update: movement, dash, firing, traps, pickups, flame drain.
// ---------------------------------------------------------------------------
export function updatePlayer(w, dt, input, audio) {
  const p = w.player;
  if (p.invulnT > 0) p.invulnT -= dt;
  if (p.dashCd > 0) p.dashCd -= dt;
  if (p.trapCd > 0) p.trapCd -= dt;
  if (p.fireT > 0) p.fireT -= dt;

  const ax = input.axis();
  const speed = PLAYER.speed * p.speedMul;
  if (p.dashT > 0) {
    p.dashT -= dt;
    p.x += Math.cos(p.dashDir) * PLAYER.dashSpeed * dt;
    p.y += Math.sin(p.dashDir) * PLAYER.dashSpeed * dt;
    spawnParticles(w, p.x, p.y, 2, '#ffd94f', 90, 0.3);
  } else {
    p.x += ax.x * speed * dt;
    p.y += ax.y * speed * dt;
  }
  p.x = clamp(p.x, ARENA.x + p.radius, ARENA.x + ARENA.w - p.radius);
  p.y = clamp(p.y, ARENA.y + p.radius, ARENA.y + ARENA.h - p.radius);

  // Aim at the mouse.
  p.aim = angleTo(p.x, p.y, input.mouse.x, input.mouse.y);

  // Dash: Space, or Shift. Costs a charge, restores one per cooldown.
  if ((input.pressed('Space') || input.pressed('ShiftLeft')) && p.dashCd <= 0 && p.dashCharges > 0) {
    const dir = (ax.x !== 0 || ax.y !== 0) ? Math.atan2(ax.y, ax.x) : p.aim;
    p.dashDir = dir;
    p.dashT = PLAYER.dashTime;
    p.dashCharges -= 1;
    p.dashCd = PLAYER.dashCooldown * p.dashCooldownMul;
    p.invulnT = Math.max(p.invulnT, 0.35);
    audio.play('dash');
  }
  if (p.dashCd <= 0 && p.dashCharges < p.dashMax) {
    p.dashCharges += 1;
    p.dashCd = PLAYER.dashCooldown * p.dashCooldownMul;
  }

  // Fire: hold mouse. One bolt per shot, plus extra bolts from Twin Wick.
  const interval = PLAYER.fireInterval / p.fireRateMul;
  if (input.mouse.down && p.fireT <= 0) {
    p.fireT = interval;
    const n = p.shots;
    const spread = 0.14;
    for (let i = 0; i < n; i += 1) {
      const off = (i - (n - 1) / 2) * spread;
      w.bolts.push({
        x: p.x + Math.cos(p.aim) * (p.radius + 6),
        y: p.y + Math.sin(p.aim) * (p.radius + 6),
        vx: Math.cos(p.aim + off) * PLAYER.boltSpeed,
        vy: Math.sin(p.aim + off) * PLAYER.boltSpeed,
        damage: PLAYER.boltDamage * p.damageMul,
        frost: p.frost, life: 1.6, radius: 5,
      });
    }
    w.nightShots += 1;
    w.stats.shots += 1;
    audio.play('shoot');
  }

  // Lance: F fires a piercing lance-bolt (4x damage, passes through foes),
  // on a 3s cooldown. The HUD shows the cooldown.
  if (w.lanceCd > 0) w.lanceCd -= dt;
  if (input.pressed('KeyF') && w.lanceCd <= 0) {
    w.lanceCd = 3;
    w.bolts.push({
      x: p.x + Math.cos(p.aim) * (p.radius + 6),
      y: p.y + Math.sin(p.aim) * (p.radius + 6),
      vx: Math.cos(p.aim) * 900,
      vy: Math.sin(p.aim) * 900,
      damage: PLAYER.boltDamage * p.damageMul * 4,
      frost: p.frost, life: 1.2, radius: 8, pierce: true, hit: new Set(),
    });
    addFlash(w.fx, '#ffe9a8', 0.08);
    audio.play('shoot');
  }

  // Light-trap: right click (or E) drops a trap at the mouse, within the arena.
  if ((input.mouse.rightPressed || input.pressed('KeyE')) && p.trapCd <= 0) {
    const live = w.traps.filter((t) => t.life > 0).length;
    if (live < p.trapSlots) {
      w.traps.push({
        x: clamp(input.mouse.x, ARENA.x + 20, ARENA.x + ARENA.w - 20),
        y: clamp(input.mouse.y, ARENA.y + 20, ARENA.y + ARENA.h - 20),
        radius: PLAYER.trapRadius, damage: PLAYER.trapDamage, life: PLAYER.trapDuration,
        maxLife: PLAYER.trapDuration, tickT: 0,
      });
      p.trapCd = 0.4;
      audio.play('trap');
    } else {
      audio.play('deny');
    }
  }

  // Flame drains the whole night. Out of flame, the run ends.
  // Lantern Oil slows the drain by 20%.
  const drain = w.diff.flameDrain * (w.boss ? 1.15 : 1) * (p.oil ? 0.8 : 1);
  p.flame -= drain * dt;
  if (p.flame <= 0) {
    p.flame = 0;
    killPlayer(w, 'The flame went out.', audio);
  }

  // Pickups: embers (currency) and flame motes drift to the Keeper.
  const magnet = PLAYER.magnetRadius * p.magnetMul;
  for (const pk of w.pickups) {
    pk.t -= dt;
    const d = dist(pk.x, pk.y, p.x, p.y);
    if (d < magnet) {
      const pull = 420 * (1 - d / magnet) + 120;
      const a = angleTo(pk.x, pk.y, p.x, p.y);
      pk.x += Math.cos(a) * pull * dt;
      pk.y += Math.sin(a) * pull * dt;
    }
    if (d < p.radius + PLAYER.pickupRadius) {
      pk.dead = true;
      if (pk.kind === 'ember') {
        const gain = Math.round(EMBERS_PER_KILL * w.diff.emberMul * p.emberMul);
        w.embers += gain;
        w.stats.embersEarned += gain;
        if (w.embers >= 300) unlockFeat(w, 'hoarder');
      } else {
        p.flame = Math.min(p.maxFlame, p.flame + FLAME_PER_KILL);
        audio.play('pickup');
      }
    }
  }
  w.pickups = w.pickups.filter((pk) => !pk.dead && pk.t > 0);
}

export function hurtPlayer(w, amount, audio) {
  const p = w.player;
  if (p.invulnT > 0 || w.screen !== 'playing') return;
  // Ember Shield blocks one hit per night.
  if (p.shield) {
    p.shield = false;
    p.invulnT = 1.0;
    addFloat(w, p.x, p.y - 24, 'SHIELD!', '#7fd4ff');
    spawnParticles(w, p.x, p.y, 10, '#7fd4ff', 180, 0.4);
    audio.play('deny');
    return;
  }
  p.hearts -= amount;
  p.invulnT = 1.0;
  w.nightDamage = true;
  audio.play('hurt');
  addShake(w.fx, 10);
  addFlash(w.fx, '#ff3b30', 0.12);
  spawnParticles(w, p.x, p.y, 14, '#ff6b5e', 220, 0.5);
  addFloat(w, p.x, p.y - 24, `-${amount} ♥`, '#ff6b5e');
  if (p.hearts <= 0) killPlayer(w, 'The Keeper has fallen.', audio);
}

export function killPlayer(w, why, audio) {
  const p = w.player;
  if (p.phoenix > 0) {
    p.phoenix -= 1;
    p.hearts = 2;
    p.flame = p.maxFlame * 0.5;
    p.invulnT = 2;
    w.message = 'The Phoenix Feather burns — you rise again!';
    w.messageT = 3;
    audio.play('relic');
    spawnParticles(w, p.x, p.y, 40, '#ffb347', 320, 0.9);
    return;
  }
  w.screen = 'gameover';
  w.over = { why, night: w.night, score: w.score };
  audio.play('gameOver');
  finishRun(w, false, audio);
}

// ---------------------------------------------------------------------------
// Particles and floating text (visual only, but seeded through the world rng).
// ---------------------------------------------------------------------------
export function spawnParticles(w, x, y, n, color, speed, life) {
  for (let i = 0; i < n; i += 1) {
    const a = w.rng() * Math.PI * 2;
    const s = speed * (0.4 + w.rng() * 0.8);
    w.particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: life * (0.6 + w.rng() * 0.7), maxLife: life, color,
      size: 2 + w.rng() * 3,
    });
  }
}

export function addFloat(w, x, y, text, color) {
  w.floats.push({ x, y, text, color, life: 1.1, maxLife: 1.1 });
}

export function updateParticles(w, dt) {
  for (const pt of w.particles) {
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= 0.94;
    pt.vy *= 0.94;
    pt.life -= dt;
  }
  w.particles = w.particles.filter((pt) => pt.life > 0);
  for (const f of w.floats) {
    f.y -= 34 * dt;
    f.life -= dt;
  }
  w.floats = w.floats.filter((f) => f.life > 0);
}

// ---------------------------------------------------------------------------
// Enemies: movement per behaviour, and their attacks.
// ---------------------------------------------------------------------------
export function updateEnemies(w, dt, audio) {
  const p = w.player;
  for (const e of w.enemies) {
    e.t += dt;
    if (e.flashT > 0) e.flashT -= dt;
    if (e.slowT > 0) e.slowT -= dt;
    const slow = e.slowT > 0 ? 0.7 : 1;
    const toPlayer = angleTo(e.x, e.y, p.x, p.y);
    const dPlayer = dist(e.x, e.y, p.x, p.y);

    if (e.behaviour === 'drift') {
      e.wobble += dt * 2.2;
      const a = toPlayer + Math.sin(e.wobble) * 0.5;
      e.x += Math.cos(a) * e.speed * slow * dt;
      e.y += Math.sin(a) * e.speed * slow * dt;
    } else if (e.behaviour === 'chase' || e.behaviour === 'split') {
      e.x += Math.cos(toPlayer) * e.speed * slow * dt;
      e.y += Math.sin(toPlayer) * e.speed * slow * dt;
    } else if (e.behaviour === 'zigzag') {
      const perp = toPlayer + Math.PI / 2;
      const sway = Math.sin(e.t * 4.2) * 0.8;
      e.x += (Math.cos(toPlayer) + Math.cos(perp) * sway) * e.speed * slow * dt;
      e.y += (Math.sin(toPlayer) + Math.sin(perp) * sway) * e.speed * slow * dt;
    } else if (e.behaviour === 'ranged') {
      // Hold ~260 away; spit a globe every couple of seconds.
      if (dPlayer > 300) {
        e.x += Math.cos(toPlayer) * e.speed * slow * dt;
        e.y += Math.sin(toPlayer) * e.speed * slow * dt;
      } else if (dPlayer < 200) {
        e.x -= Math.cos(toPlayer) * e.speed * slow * dt;
        e.y -= Math.sin(toPlayer) * e.speed * slow * dt;
      }
      e.fireT -= dt;
      if (e.fireT <= 0 && dPlayer < 520) {
        e.fireT = 2.2 + w.rng() * 0.8;
        fireEnemyBullet(w, e.x, e.y, toPlayer, 170, 6, '#e07fd4');
      }
    } else if (e.behaviour === 'phase') {
      // Solid 2.2s, faded 1.4s. Only solid takes damage; faster while faded.
      e.phaseT += dt;
      const cycle = e.phaseT % 3.6;
      e.solid = cycle < 2.2;
      const sp = e.solid ? e.speed : e.speed * 1.6;
      e.x += Math.cos(toPlayer) * sp * slow * dt;
      e.y += Math.sin(toPlayer) * sp * slow * dt;
    } else if (e.behaviour === 'charge') {
      if (e.telegraph > 0) {
        e.telegraph -= dt;
        if (e.telegraph <= 0) {
          e.charging = 0.7;
          e.chargeDir = toPlayer;
          audio.play('dash');
        }
      } else if (e.charging > 0) {
        e.charging -= dt;
        e.x += Math.cos(e.chargeDir) * 430 * slow * dt;
        e.y += Math.sin(e.chargeDir) * 430 * slow * dt;
        spawnParticles(w, e.x, e.y, 1, '#ff6b5e', 60, 0.3);
      } else {
        e.x += Math.cos(toPlayer) * e.speed * slow * dt;
        e.y += Math.sin(toPlayer) * e.speed * slow * dt;
        e.chargeT -= dt;
        if (e.chargeT <= 0 && dPlayer < 420) {
          e.telegraph = 0.8;
          e.chargeT = 4.5 + w.rng() * 1.5;
        }
      }
    } else if (e.behaviour === 'drain') {
      // Keep ~300 away and drink the flame.
      if (dPlayer > 340) {
        e.x += Math.cos(toPlayer) * e.speed * slow * dt;
        e.y += Math.sin(toPlayer) * e.speed * slow * dt;
      } else if (dPlayer < 240) {
        e.x -= Math.cos(toPlayer) * e.speed * slow * dt;
        e.y -= Math.sin(toPlayer) * e.speed * slow * dt;
      }
      if (dPlayer < 360) {
        p.flame = Math.max(0, p.flame - 1.5 * dt);
        if (w.rng() < dt * 8) spawnParticles(w, e.x, e.y, 1, '#4fd4c2', 40, 0.4);
        if (p.flame <= 0) killPlayer(w, 'The flame was drunk dry.', audio);
      }
    }

    e.x = clamp(e.x, ARENA.x + e.radius, ARENA.x + ARENA.w - e.radius);
    e.y = clamp(e.y, ARENA.y + e.radius, ARENA.y + ARENA.h - e.radius);
    e.angle = toPlayer;

    // Touch damage (thorns strike back first).
    if (dPlayer < e.radius + p.radius && p.invulnT <= 0 && p.dashT <= 0) {
      if (p.thorns > 0) damageEnemy(w, e, p.thorns, audio, true);
      hurtPlayer(w, e.damage, audio);
    }
  }
  w.enemies = w.enemies.filter((e) => e.hp > 0);
}

export function fireEnemyBullet(w, x, y, angle, speed, radius, color) {
  w.ebullets.push({
    x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
    radius, color, life: 5,
  });
}

export function updateBullets(w, dt, audio) {
  // Player bolts.
  for (const b of w.bolts) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.x < ARENA.x || b.x > ARENA.x + ARENA.w || b.y < ARENA.y || b.y > ARENA.y + ARENA.h) b.life = 0;
  }
  // Enemy globes.
  for (const b of w.ebullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.x < ARENA.x || b.x > ARENA.x + ARENA.w || b.y < ARENA.y || b.y > ARENA.y + ARENA.h) b.life = 0;
    const p = w.player;
    if (dist(b.x, b.y, p.x, p.y) < b.radius + p.radius) {
      b.life = 0;
      hurtPlayer(w, 1, audio);
    }
  }
  w.bolts = w.bolts.filter((b) => b.life > 0);
  w.ebullets = w.ebullets.filter((b) => b.life > 0);
}

export function rollBoltDamage(w, b) {
  // Lucky Candle: 15% of bolts deal triple damage.
  if (w.player.lucky && w.rng() < 0.15) {
    addFloat(w, b.x, b.y - 12, 'CRIT!', '#ffd94f');
    return b.damage * 3;
  }
  return b.damage;
}

export function resolveBoltHits(w, audio) {
  const p = w.player;
  for (const b of w.bolts) {
    if (b.life <= 0) continue;
    // Boss first (it is big and in the way).
    if (w.boss && w.boss.hp > 0 && dist(b.x, b.y, w.boss.x, w.boss.y) < b.radius + w.boss.radius) {
      if (b.pierce) {
        if (!b.hit.has(w.boss)) {
          b.hit.add(w.boss);
          w.stats.lanceHits += 1;
          if (w.stats.lanceHits >= 25) unlockFeat(w, 'lanceMaster');
          damageBoss(w, rollBoltDamage(w, b), audio);
          w.nightHits += 1;
          w.stats.hits += 1;
        }
      } else {
        b.life = 0;
        damageBoss(w, rollBoltDamage(w, b), audio);
        w.nightHits += 1;
        w.stats.hits += 1;
      }
      continue;
    }
    for (const e of w.enemies) {
      if (e.hp <= 0) continue;
      if (e.behaviour === 'phase' && !e.solid) continue;
      if (dist(b.x, b.y, e.x, e.y) < b.radius + e.radius) {
        if (b.pierce) {
          if (b.hit.has(e)) continue;
          b.hit.add(e);
          w.stats.lanceHits += 1;
          if (w.stats.lanceHits >= 25) unlockFeat(w, 'lanceMaster');
          damageEnemy(w, e, rollBoltDamage(w, b), audio, false, b.frost);
          w.nightHits += 1;
          w.stats.hits += 1;
          continue;
        }
        b.life = 0;
        damageEnemy(w, e, rollBoltDamage(w, b), audio, false, b.frost);
        w.nightHits += 1;
        w.stats.hits += 1;
        break;
      }
    }
  }
  // Traps tick: damage anything standing in them.
  for (const t of w.traps) {
    t.life -= 1 / 60;
    t.tickT -= 1 / 60;
    if (t.tickT <= 0) {
      t.tickT = 0.5;
      for (const e of w.enemies) {
        if (e.hp > 0 && dist(t.x, t.y, e.x, e.y) < t.radius + e.radius) damageEnemy(w, e, t.damage, audio, true);
      }
      if (w.boss && w.boss.hp > 0 && dist(t.x, t.y, w.boss.x, w.boss.y) < t.radius + w.boss.radius) {
        damageBoss(w, t.damage, audio);
      }
    }
  }
  w.traps = w.traps.filter((t) => t.life > 0);
}

export function damageEnemy(w, e, dmg, audio, silent, frost) {
  e.hp -= dmg;
  e.flashT = 0.12;
  if (frost) e.slowT = 1.5;
  if (!silent) audio.play('hit');
  spawnParticles(w, e.x, e.y, 4, e.color, 140, 0.3);
  if (e.hp <= 0) killEnemy(w, e, audio);
}

export function killEnemy(w, e, audio) {
  const p = w.player;
  // Combo: kills within 3s of each other raise a multiplier (up to x2).
  w.combo.count += 1;
  w.combo.timer = 3;
  const mult = 1 + Math.min(w.combo.count, 10) * 0.1;
  if (mult >= 2.0) unlockFeat(w, 'comboKing');
  const gain = Math.round(e.value * w.diff.scoreMul * mult);
  w.score += gain;
  w.nightKills += 1;
  w.stats.kills += 1;
  if (e.elite) {
    w.stats.elitesKilled += 1;
    if (w.stats.elitesKilled >= 5) unlockFeat(w, 'eliteHunter');
  }
  if (p.secondWind) p.dashCharges = p.dashMax;
  addFloat(w, e.x, e.y - 14, mult > 1 ? `+${gain} ×${mult.toFixed(1)}` : `+${gain}`, '#ffd94f');
  spawnParticles(w, e.x, e.y, 12, e.color, 200, 0.5);
  audio.play('die');
  // Drops: a flame mote, and sometimes an ember coin.
  w.pickups.push({ kind: 'flame', x: e.x, y: e.y, t: 8 });
  if (w.rng() < 0.55) w.pickups.push({ kind: 'ember', x: e.x + (w.rng() - 0.5) * 30, y: e.y + (w.rng() - 0.5) * 30, t: 8 });
  if (e.type === 'splitter') {
    spawnEnemy(w, 'mote', e.x - 14, e.y);
    spawnEnemy(w, 'mote', e.x + 14, e.y);
  }
  if (p.blast) {
    for (const o of w.enemies) {
      if (o !== e && o.hp > 0 && dist(o.x, o.y, e.x, e.y) < 110) damageEnemy(w, o, 2, audio, true);
    }
    spawnParticles(w, e.x, e.y, 10, '#ffb347', 260, 0.4);
  }
  // Triple-kill feat: 3 kills inside 2 seconds.
  const now = w.time;
  w.killsWindow.push(now);
  w.killsWindow = w.killsWindow.filter((t) => now - t < 2);
  if (w.killsWindow.length >= 3) unlockFeat(w, 'tripleKill');
}

// ---------------------------------------------------------------------------
// Bosses: movement and attacks per boss id, with phase changes.
// ---------------------------------------------------------------------------
export function updateBoss(w, dt, audio) {
  const b = w.boss;
  if (!b || b.hp <= 0) return;
  const p = w.player;
  b.t += dt;
  if (b.flashT > 0) b.flashT -= dt;
  if (b.slowT > 0) b.slowT -= dt;
  // Enrage: after 75 seconds the boss burns hotter and attacks faster.
  const enraged = b.t > BOSS_ENRAGE_TIME;
  const rate = enraged ? BOSS_ENRAGE_MUL : 1;
  if (enraged && !b.enraged) {
    b.enraged = true;
    w.message = `${b.name} is ENRAGED!`;
    w.messageT = 3;
    addShake(w.fx, 12);
  }
  const toPlayer = angleTo(b.x, b.y, p.x, p.y);
  const dPlayer = dist(b.x, b.y, p.x, p.y);
  const slow = b.slowT > 0 ? 0.7 : 1;

  // Phase changes announce themselves.
  const frac = b.hp / b.maxHp;
  while (b.phaseIdx < b.phases.length - 1 && frac <= b.phases[b.phaseIdx + 1].at) {
    b.phaseIdx += 1;
    w.message = b.phases[b.phaseIdx].note;
    w.messageT = 2.5;
    if (b.id !== 'drownedBell') radialBurst(w, b.x, b.y, 12, 150);
    audio.play('bossRoar');
  }

  if (b.id === 'drownedBell') {
    b.x += Math.cos(toPlayer) * b.speed * slow * dt;
    b.y += Math.sin(toPlayer) * b.speed * slow * dt;
    b.burstT -= dt;
    if (b.burstT <= 0) {
      b.burstT = (b.phaseIdx === 0 ? 3.6 : 2.6) * rate;
      radialBurst(w, b.x, b.y, 10, 150);
      audio.play('bossRoar');
    }
    b.summonT -= dt;
    if (b.summonT <= 0) {
      b.summonT = 6 * rate;
      for (let i = 0; i < 4; i += 1) spawnEnemy(w, 'mote');
      w.message = 'The Bell tolls — the drowned rise!';
      w.messageT = 2;
    }
  } else if (b.id === 'ashenStag') {
    if (b.chargeState === 1) {
      b.chargeT -= dt;
      if (b.chargeT <= 0) {
        b.chargeState = 2;
        b.chargeDir = toPlayer;
        b.chargeT = 0.8;
        audio.play('dash');
      }
    } else if (b.chargeState === 2) {
      b.chargeT -= dt;
      b.x += Math.cos(b.chargeDir) * 470 * slow * dt;
      b.y += Math.sin(b.chargeDir) * 470 * slow * dt;
      spawnParticles(w, b.x, b.y, 2, '#ff9d4f', 120, 0.3);
      if (b.chargeT <= 0) { b.chargeState = 0; b.chargeT = (5 + w.rng() * 2) * rate; }
    } else {
      b.x += Math.cos(toPlayer) * b.speed * slow * dt;
      b.y += Math.sin(toPlayer) * b.speed * slow * dt;
      b.chargeT -= dt;
      if (b.chargeT <= 0 && dPlayer < 460) { b.chargeState = 1; b.chargeT = 0.9; }
    }
    b.summonT -= dt;
    if (b.summonT <= 0) {
      b.summonT = 7 * rate;
      for (let i = 0; i < 3; i += 1) spawnEnemy(w, 'crawler');
    }
  } else if (b.id === 'eclipseWarden') {
    b.x += Math.cos(toPlayer) * b.speed * slow * dt;
    b.y += Math.sin(toPlayer) * b.speed * slow * dt;
    b.burstT -= dt;
    if (b.burstT <= 0) {
      b.burstT = 4 * rate;
      radialBurst(w, b.x, b.y, 14, 165);
      radialBurst(w, b.x, b.y, 14, 165, Math.PI / 14);
    }
    b.summonT -= dt;
    if (b.summonT <= 0) {
      b.summonT = 8 * rate;
      for (let i = 0; i < 3; i += 1) spawnEnemy(w, 'wraith');
      w.message = 'The Warden calls the wraiths!';
      w.messageT = 2;
    }
    // Drain aura: standing close drinks the flame.
    if (dPlayer < 230) {
      p.flame = Math.max(0, p.flame - 2 * dt);
      if (w.rng() < dt * 10) spawnParticles(w, p.x, p.y, 1, '#c9a7ff', 60, 0.4);
      if (p.flame <= 0) killPlayer(w, 'The Warden drank the last light.', audio);
    }
    // Charge slam.
    if (b.chargeState === 1) {
      b.chargeT -= dt;
      if (b.chargeT <= 0) {
        b.chargeState = 2;
        b.chargeDir = toPlayer;
        b.chargeT = 0.7;
      }
    } else if (b.chargeState === 2) {
      b.chargeT -= dt;
      b.x += Math.cos(b.chargeDir) * 500 * slow * dt;
      b.y += Math.sin(b.chargeDir) * 500 * slow * dt;
      if (b.chargeT <= 0) { b.chargeState = 0; b.chargeT = 8 + w.rng() * 2; }
    } else {
      b.chargeT -= dt;
      if (b.chargeT <= 0 && dPlayer < 480) { b.chargeState = 1; b.chargeT = 0.9; }
    }
  }

  b.x = clamp(b.x, ARENA.x + b.radius, ARENA.x + ARENA.w - b.radius);
  b.y = clamp(b.y, ARENA.y + b.radius, ARENA.y + ARENA.h - b.radius);
  b.angle = toPlayer;

  // Touch damage.
  if (dPlayer < b.radius + p.radius && p.invulnT <= 0 && p.dashT <= 0) {
    if (p.thorns > 0) damageBoss(w, p.thorns, audio);
    hurtPlayer(w, 2, audio);
  }
}

function radialBurst(w, x, y, n, speed, offset = 0) {
  for (let i = 0; i < n; i += 1) {
    const a = offset + (i / n) * Math.PI * 2;
    fireEnemyBullet(w, x, y, a, speed, 8, '#c9a7ff');
  }
}

export function damageBoss(w, dmg, audio) {
  const b = w.boss;
  if (!b || b.hp <= 0) return;
  b.hp -= dmg;
  b.flashT = 0.1;
  if (b.hp <= 0) {
    b.hp = 0;
    w.score += Math.round(b.value * w.diff.scoreMul) + BOSS_BONUS;
    w.stats.bosses += 1;
    addFloat(w, b.x, b.y - 50, `+${Math.round(b.value * w.diff.scoreMul) + BOSS_BONUS}`, '#ffd94f');
    spawnParticles(w, b.x, b.y, 60, b.color, 340, 1.0);
    spawnParticles(w, b.x, b.y, 30, '#ffd94f', 260, 0.9);
    burst(w.fx, w.rng, b.x, b.y, 40, b.color, 320, 1.0);
    addShake(w.fx, 16);
    addHitStop(w.fx, 0.22);
    addFlash(w.fx, '#ffd94f', 0.25);
    audio.play('bossDie');
    unlockFeat(w, 'bossSlayer');
    w.message = `${b.name} has fallen!`;
    w.messageT = 3;
  } else {
    audio.play('hit');
  }
}

// ---------------------------------------------------------------------------
// Night flow: spawn queue, clear, intermission, relics, shop.
// ---------------------------------------------------------------------------
export function updateSpawning(w, dt) {
  if (w.introT > 0) return; // let the banner breathe before the first spawn
  if (w.spawnQueue.length > 0) {
    w.spawnTimer -= dt;
    if (w.spawnTimer <= 0) {
      w.spawnTimer = NIGHT_PLANS[w.night - 1].pace / w.diff.spawnMul;
      // Telegraph first: a warning mark at the edge, then the foe arrives.
      const pos = pickEdge(w);
      w.telegraphs.push({ type: w.spawnQueue.shift(), x: pos.x, y: pos.y, t: 0.6, maxT: 0.6 });
    }
  } else if (!w.bossSpawned) {
    const plan = NIGHT_PLANS[w.night - 1];
    if (plan.boss && w.enemies.length === 0) {
      spawnBoss(w, plan.boss);
    }
  }
}

export function updateTelegraphs(w, dt) {
  for (const tg of w.telegraphs) {
    tg.t -= dt;
    if (tg.t <= 0 && !tg.done) {
      tg.done = true;
      spawnEnemy(w, tg.type, tg.x, tg.y);
    }
  }
  w.telegraphs = w.telegraphs.filter((tg) => !tg.done);
}

export function nightIsClear(w) {
  if (w.introT > 0) return false;
  if (w.spawnQueue.length > 0) return false;
  if (w.enemies.length > 0) return false;
  if (w.boss && w.boss.hp > 0) return false;
  if (w.bossSpawned && w.boss) return true;
  if (!NIGHT_PLANS[w.night - 1].boss) return true;
  return false;
}

export function clearNight(w, audio) {
  const p = w.player;
  const bonus = NIGHT_CLEAR_BONUS * w.night + Math.round(p.flame) * 2;
  const gained = Math.round(bonus * w.diff.scoreMul);
  w.score += gained;
  w.stats.nightsCleared += 1;
  const acc = w.nightShots > 0 ? Math.round((w.nightHits / w.nightShots) * 100) : 0;
  w.nightStats.push({ night: w.night, kills: w.nightKills, score: gained, accuracy: acc, flame: Math.round(p.flame) });
  audio.play('nightClear');
  burst(w.fx, w.rng, VIEW.W / 2, 200, 60, '#ffd94f', 300, 1.2);
  addFlash(w.fx, '#ffe9a8', 0.15);
  if (!w.nightDamage) unlockFeat(w, 'flawless');
  if (p.flame >= p.maxFlame - 0.5) unlockFeat(w, 'fullFlame');
  if (p.hearts === 1) unlockFeat(w, 'lastStand');
  if (w.nightShots === 0) unlockFeat(w, 'pacifistFlame');
  if (w.nightShots >= 10 && acc >= 80) unlockFeat(w, 'sharpshooter');
  if (w.night === 1) unlockFeat(w, 'firstDawn');
  if (w.night >= FINAL_NIGHT) {
    finishRun(w, true, audio);
    return;
  }
  openIntermission(w);
}

export function openIntermission(w) {
  w.screen = 'intermission';
  w.relicChoices = rollRelicChoices(w);
  w.shop.forEach((s) => { s.bought = 0; });
}

export function rollRelicChoices(w) {
  const pool = shuffle(w.rng, RELICS);
  return pool.slice(0, 3);
}

export function chooseRelic(w, idx, audio) {
  const relic = w.relicChoices[idx];
  if (!relic) return false;
  relic.apply(w.player);
  w.relics.push(relic);
  w.relicCounts[relic.id] = (w.relicCounts[relic.id] || 0) + 1;
  w.stats.relicsTaken += 1;
  if (w.relics.length >= 6) unlockFeat(w, 'fullArsenal');
  w.relicChoices = [];
  audio.play('relic');
  return true;
}

export function buyShopItem(w, idx, audio) {
  const item = w.shop[idx];
  if (!item || w.embers < item.cost) { audio.play('deny'); return false; }
  w.embers -= item.cost;
  item.bought += 1;
  item.apply(w.player);
  audio.play('buy');
  return true;
}

export function rerollRelics(w, audio) {
  if (w.embers < REROLL_COST || w.relicChoices.length === 0) { audio.play('deny'); return false; }
  w.embers -= REROLL_COST;
  w.relicChoices = rollRelicChoices(w);
  audio.play('click');
  return true;
}

// Ember Market extras: rest (heal + refill) and gamble (a random relic).
export function restAtMarket(w, audio) {
  if (w.embers < REST_COST) { audio.play('deny'); return false; }
  w.embers -= REST_COST;
  w.player.hearts = Math.min(w.player.maxHearts, w.player.hearts + 1);
  w.player.flame = w.player.maxFlame;
  audio.play('heal');
  return true;
}

export function gambleRelic(w, audio) {
  if (w.embers < GAMBLE_COST) { audio.play('deny'); return false; }
  w.embers -= GAMBLE_COST;
  const relic = RELICS[Math.floor(w.rng() * RELICS.length)];
  relic.apply(w.player);
  w.relics.push(relic);
  w.relicCounts[relic.id] = (w.relicCounts[relic.id] || 0) + 1;
  w.stats.relicsTaken += 1;
  if (w.relics.length >= 6) unlockFeat(w, 'fullArsenal');
  w.message = `The market gives you: ${relic.name}!`;
  w.messageT = 3;
  audio.play('relic');
  return true;
}

// ---------------------------------------------------------------------------
// Feats and run finish.
// ---------------------------------------------------------------------------
export function unlockFeat(w, id) {
  if (w.feats.has(id)) return;
  w.feats.add(id);
  const feat = FEATS.find((f) => f.id === id);
  w.featsNew.push(feat ? feat.name : id);
  w.message = `Feat unlocked: ${feat ? feat.name : id}`;
  w.messageT = 3;
}

export function finishRun(w, won, audio) {
  const p = w.player;
  const grade = gradeFor(w.score);
  const record = {
    seed: w.seed, difficulty: w.diff.id, score: w.score, grade: grade.grade,
    nights: won ? NIGHTS : w.night, won,
    kills: w.stats.kills, timeSec: Math.round(w.runTime),
    date: new Date().toISOString().slice(0, 10),
  };
  saveRun(record);
  w.history = loadHistory();
  w.best = loadBest();
  if (won) {
    w.screen = 'victory';
    w.victory = { grade, record, feats: [...w.feats] };
    if (w.runTime < 20 * 60) unlockFeat(w, 'speedrun');
    audio.play('victory');
  }
}

// ---------------------------------------------------------------------------
// Top-level update: dispatch by screen, handle menus, pause, mute.
// ---------------------------------------------------------------------------
export function update(w, dt, input, audio) {
  w.time += dt;
  if (w.messageT > 0) w.messageT -= dt;
  updateEffects(w.fx, dt, w.rng);
  maybeLightning(w.fx, w.rng, dt, w.realm);
  if (input.pressed('KeyM')) {
    const muted = audio.toggleMute();
    w.message = muted ? 'Sound off (M to turn on)' : 'Sound on';
    w.messageT = 1.5;
  }

  if (w.screen === 'title') {
    updateTitle(w, input, audio);
    return;
  }
  if (w.screen === 'codex') {
    updateCodex(w, input, audio);
    return;
  }
  if (w.screen === 'intermission') {
    updateIntermission(w, input, audio);
    return;
  }
  if (w.screen === 'gameover' || w.screen === 'victory') {
    if (input.pressed('Enter') || input.pressed('Space')) {
      resetToTitle(w);
    }
    handleClick(w, input, audio);
    return;
  }
  if (w.screen !== 'playing') return;

  if (input.pressed('KeyP')) {
    w.paused = !w.paused;
    w.message = w.paused ? 'Paused — P to resume' : '';
    w.messageT = w.paused ? 999 : 0;
  }
  if (w.paused) return;

  w.runTime += dt;
  if (w.introT > 0) w.introT -= dt;

  // Boss dialogue advances line by line.
  if (w.dialogue) {
    w.dialogue.t += dt;
    if (w.dialogue.t > 2.6) {
      w.dialogue.t = 0;
      w.dialogue.idx += 1;
      if (w.dialogue.idx < w.dialogue.lines.length) {
        w.message = w.dialogue.lines[w.dialogue.idx];
        w.messageT = 2.6;
      } else {
        w.dialogue = null;
      }
    }
  }

  // Combo decays after 3s without a kill.
  if (w.combo.timer > 0) {
    w.combo.timer -= dt;
    if (w.combo.timer <= 0) w.combo.count = 0;
  }

  // Night 1 tutorial tips, on a timer.
  if (w.night === 1) {
    const tips = [
      [2, 'Move with WASD — your flame drains. Collect the little flames to feed it.'],
      [12, 'Hold left click to fire. Right-click (or E) drops a light-trap.'],
      [24, 'SPACE dashes through danger. F fires a piercing lance (3s cooldown).'],
    ];
    if (w.tipsShown < tips.length && w.runTime >= tips[w.tipsShown][0]) {
      w.message = tips[w.tipsShown][1];
      w.messageT = 5;
      w.tipsShown += 1;
    }
  }

  updatePlayer(w, dt, input, audio);
  if (w.screen !== 'playing') return; // player may have died from flame drain
  updateSpawning(w, dt);
  updateTelegraphs(w, dt);
  updateEnemies(w, dt, audio);
  updateBoss(w, dt, audio);
  updateBullets(w, dt, audio);
  resolveBoltHits(w, audio);
  updateParticles(w, dt);

  if (nightIsClear(w)) clearNight(w, audio);
}

function updateTitle(w, input, audio) {
  // Difficulty: 1/2/3 or click. Start: Enter, Space, or click START.
  // B opens the Codex (bestiary).
  if (input.pressed('Digit1')) w.selectedDiff = 0;
  if (input.pressed('Digit2')) w.selectedDiff = 1;
  if (input.pressed('Digit3')) w.selectedDiff = 2;
  if (input.pressed('KeyB')) { w.screen = 'codex'; w.codexTab = 0; audio.play('click'); return; }
  if (input.pressed('Enter') || input.pressed('Space')) {
    audio.unlock();
    startRun(w, audio);
    return;
  }
  for (const c of input.takeClicks()) {
    audio.unlock();
    const d = hitDifficulty(w, c.x, c.y);
    if (d !== -1) { w.selectedDiff = d; audio.play('click'); continue; }
    if (c.y > 600 && c.y < 656 && c.x > 540 && c.x < 740) {
      startRun(w, audio);
      return;
    }
    if (c.y > 660 && c.y < 684 && c.x > 540 && c.x < 740) {
      w.screen = 'codex'; w.codexTab = 0; audio.play('click'); return;
    }
  }
  updateParticles(w, 1 / 60);
  // Ambient title motes drifting for atmosphere.
  if (w.rng() < 0.12) {
    w.particles.push({
      x: w.rng() * VIEW.W, y: VIEW.H + 10,
      vx: (w.rng() - 0.5) * 20, vy: -20 - w.rng() * 30,
      life: 4, maxLife: 4, color: '#ffb347', size: 2 + w.rng() * 3,
    });
  }
}

export function hitDifficulty(w, x, y) {
  // Title difficulty buttons: three boxes centred at y=470, each 200x54.
  if (y < 470 || y > 524) return -1;
  for (let i = 0; i < 3; i += 1) {
    const bx = 340 + i * 220;
    if (x >= bx && x <= bx + 200) return i;
  }
  return -1;
}

export function startRun(w, audio) {
  const fresh = createWorld(w.seed, DIFFICULTIES[w.selectedDiff].id);
  // Keep the chosen difficulty, history and best scores.
  Object.assign(w, fresh, { history: w.history, best: w.best, selectedDiff: w.selectedDiff });
  audio.play('click');
  startNight(w, 1);
}

export function resetToTitle(w) {
  const keep = { history: w.history, best: w.best, selectedDiff: w.selectedDiff, seed: w.seed };
  const fresh = createWorld(w.seed, DIFFICULTIES[w.selectedDiff].id);
  Object.assign(w, fresh, keep);
  w.screen = 'title';
}

function updateIntermission(w, input, audio) {
  if (input.pressed('Digit1')) chooseRelic(w, 0, audio);
  else if (input.pressed('Digit2')) chooseRelic(w, 1, audio);
  else if (input.pressed('Digit3')) chooseRelic(w, 2, audio);
  else if (input.pressed('KeyR')) rerollRelics(w, audio);
  else if (input.pressed('Enter') && w.relicChoices.length === 0) {
    startNight(w, w.night + 1);
    return;
  }
  for (const c of input.takeClicks()) {
    // Relic cards: three boxes at y=170..330.
    if (w.relicChoices.length > 0) {
      for (let i = 0; i < 3; i += 1) {
        const bx = 250 + i * 270;
        if (c.x >= bx && c.x <= bx + 250 && c.y >= 170 && c.y <= 330) {
          chooseRelic(w, i, audio);
          break;
        }
      }
      // Reroll button.
      if (c.x >= 1060 && c.x <= 1180 && c.y >= 180 && c.y <= 216) rerollRelics(w, audio);
    } else {
      // Shop rows: y starts 200, each 44 high.
      for (let i = 0; i < w.shop.length; i += 1) {
        const by = 200 + i * 44;
        if (c.x >= 880 && c.x <= 1210 && c.y >= by && c.y <= by + 38) {
          buyShopItem(w, i, audio);
          break;
        }
      }
      // Rest + gamble buttons.
      if (c.y >= 480 && c.y <= 520) {
        if (c.x >= 880 && c.x <= 1040) restAtMarket(w, audio);
        else if (c.x >= 1050 && c.x <= 1210) gambleRelic(w, audio);
      }
      // Continue button.
      if (c.x >= 540 && c.x <= 740 && c.y >= 620 && c.y <= 668) {
        audio.play('click');
        startNight(w, w.night + 1);
        return;
      }
    }
  }
}

function handleClick(w, input, audio) {
  for (const c of input.takeClicks()) {
    if (c.y > 600 && c.y < 656 && c.x > 540 && c.x < 740) {
      audio.play('click');
      resetToTitle(w);
      return;
    }
  }
}

// Small read-only snapshot for the smoke test and the shot scenes.
export function stateSnapshot(w) {
  return {
    screen: w.screen, night: w.night, score: w.score, embers: w.embers,
    hearts: w.player.hearts, flame: Math.round(w.player.flame),
    enemies: w.enemies.length, bolts: w.bolts.length,
    boss: w.boss ? w.boss.name : null, relics: w.relics.length,
    feats: w.feats.size, paused: w.paused,
  };
}

function updateCodex(w, input, audio) {
  // Tabs: 1-5 or click the tab strip. B / Escape / Enter closes.
  if (input.pressed('KeyB') || input.pressed('Escape') || input.pressed('Enter')) {
    w.screen = 'title';
    audio.play('click');
    return;
  }
  for (let i = 0; i < 8; i += 1) {
    if (input.pressed(`Digit${i + 1}`)) { w.codexTab = i; audio.play('click'); }
  }
  for (const c of input.takeClicks()) {
    if (c.y >= 120 && c.y <= 152) {
      for (let i = 0; i < 8; i += 1) {
        const bx = 40 + i * 152;
        if (c.x >= bx && c.x <= bx + 145) { w.codexTab = i; audio.play('click'); break; }
      }
    }
    if (c.y > 640 && c.y < 680 && c.x > 540 && c.x < 740) {
      w.screen = 'title';
      audio.play('click');
      return;
    }
  }
  updateParticles(w, 1 / 60);
}
