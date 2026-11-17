// The tide itself: the world holds the player, enemies, bullets,
// pickups and particles, and steps them forward in fixed slices.
// Everything the renderer draws and the autopilot steers lives here.
import { COMBO, ENEMY, FIELD, PICKUP, PLAYER, STEP, WAVE } from './config.js';

export const EVENT_HIT = 1;
export const EVENT_OVER = 2;
export const EVENT_KILL = 4;
export const EVENT_WAVE = 8;
export const EVENT_PICKUP = 16;

const TAU = Math.PI * 2;

function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

function dist2(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
}

export function createWorld(random) {
  const state = freshState();
  let spawnQueue = [];
  let spawnTimer = 0;
  let betweenTimer = 0;
  let elapsed = 0;

  function freshState() {
    return {
      player: {
        x: FIELD.width / 2,
        y: FIELD.height / 2,
        vx: 0,
        vy: 0,
        angle: -Math.PI / 2,
        hearts: PLAYER.maxHearts,
        invulnerable: 0,
        dashTime: 0,
        dashCooldown: 0,
        fireTimer: 0,
        muzzle: 0,
        wakeTimer: 0,
        rapidTimer: 0,
        spreadTimer: 0,
        shieldTimer: 0,
        lamp: PLAYER.lampBase,
      },
      bullets: [],
      enemyBullets: [],
      enemies: [],
      pickups: [],
      particles: [],
      texts: [],
      wave: 0,
      waveActive: false,
      kills: 0,
      shotsFired: 0,
      shotsHit: 0,
      score: 0,
      combo: 0,
      comboTimer: 0,
      multiplier: 1,
      shake: 0,
      flash: 0,
      time: 0,
    };
  }

  /** The mix a wave throws at the player: wisps always, shades from
   * wave 2, glooms from wave 3, spitters from wave 4, a dread on
   * every fifth wave. */
  function waveMix(wave) {
    const mix = [];
    const total = WAVE.baseCount + WAVE.perWave * (wave - 1);
    for (let i = 0; i < total; i += 1) {
      let kind = 'wisp';
      const roll = random.next();
      if (wave >= 5 && i === 0) kind = 'dread';
      else if (wave >= 3 && roll < 0.2) kind = 'gloom';
      else if (wave >= 2 && roll < 0.45) kind = 'shade';
      else if (wave >= 4 && roll < 0.6) kind = 'spitter';
      mix.push(kind);
    }
    return mix;
  }

  function spawnPoint() {
    const margin = 40;
    const side = random.int(0, 3);
    if (side === 0) return { x: random.range(margin, FIELD.width - margin), y: -30 };
    if (side === 1) return { x: random.range(margin, FIELD.width - margin), y: FIELD.height + 30 };
    if (side === 2) return { x: -30, y: random.range(margin, FIELD.height - margin) };
    return { x: FIELD.width + 30, y: random.range(margin, FIELD.height - margin) };
  }

  function spawnEnemy(kind) {
    const def = ENEMY[kind];
    const at = spawnPoint();
    // Later waves hunt faster: up to +50% speed by wave 25.
    const waveSpeed = 1 + Math.min(0.5, state.wave * 0.02);
    const enemy = {
      kind,
      x: at.x,
      y: at.y,
      vx: 0,
      vy: 0,
      radius: def.radius,
      hp: def.hp,
      maxHp: def.hp,
      speed: def.speed * random.range(0.9, 1.15) * waveSpeed,
      score: def.score,
      angle: 0,
      wobble: random.range(0, TAU),
      burstTimer: kind === 'dread' ? 2.5 : 0,
      spitTimer: kind === 'spitter' ? 1.8 : 0,
      flash: 0,
    };
    state.enemies.push(enemy);
  }

  function startWave() {
    state.wave += 1;
    state.waveActive = true;
    spawnQueue = waveMix(state.wave);
    spawnTimer = 0.4;
    return EVENT_WAVE;
  }

  function burst(x, y, color, count, speed, life) {
    for (let i = 0; i < count; i += 1) {
      const angle = random.range(0, TAU);
      const v = random.range(speed * 0.3, speed);
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        radius: random.range(2, 5),
        life: random.range(life * 0.5, life),
        maxLife: life,
        color,
      });
    }
  }

  function ring(x, y, color) {
    state.particles.push({ x, y, vx: 0, vy: 0, radius: 6, life: 0.45, maxLife: 0.45, color, ring: true });
  }

  function floatText(x, y, text, color) {
    state.texts.push({ x, y, text, color, life: 0.9, maxLife: 0.9 });
  }

  function dropPickup(x, y) {
    if (!random.chance(PICKUP.dropChance)) return;
    let kind = 'orb';
    const roll = random.next();
    if (roll < PICKUP.heartChance && state.player.hearts < PLAYER.maxHearts) kind = 'heart';
    else if (roll < 0.35) kind = 'rapid';
    else if (roll < 0.6) kind = 'spread';
    else if (roll < 0.85) kind = 'shield';
    state.pickups.push({ kind, x, y, vx: 0, vy: 0, life: PICKUP.lifetime, bob: random.range(0, TAU) });
  }

  function killEnemy(enemy, index) {
    const player = state.player;
    const inLight = dist2(enemy.x, enemy.y, player.x, player.y) <= player.lamp * player.lamp;
    state.combo += 1;
    state.comboTimer = COMBO.windowSeconds;
    state.multiplier = Math.min(COMBO.maxMultiplier, 1 + Math.floor(state.combo / COMBO.stepKills));
    const gained = enemy.score * state.multiplier * (inLight ? 1.5 : 1);
    state.score += Math.round(gained);
    state.kills += 1;
    const def = ENEMY[enemy.kind];
    burst(enemy.x, enemy.y, def.color, enemy.kind === 'dread' ? 42 : 16, 260, 0.6);
    ring(enemy.x, enemy.y, def.color);
    floatText(enemy.x, enemy.y - 18, `+${Math.round(gained)}`, inLight ? '#ffe9a8' : '#eaf6ff');
    if (enemy.kind === 'gloom') {
      for (let i = 0; i < 2; i += 1) {
        state.enemies.push({
          kind: 'wisp',
          x: enemy.x + random.range(-24, 24),
          y: enemy.y + random.range(-24, 24),
          vx: 0, vy: 0,
          radius: ENEMY.wisp.radius, hp: 1, maxHp: 1,
          speed: ENEMY.wisp.speed * random.range(1, 1.3),
          score: ENEMY.wisp.score, angle: 0,
          wobble: random.range(0, TAU), burstTimer: 0, spitTimer: 0, flash: 0,
        });
      }
    }
    dropPickup(enemy.x, enemy.y);
    state.enemies.splice(index, 1);
  }

  function hurtPlayer() {
    const player = state.player;
    if (player.invulnerable > 0 || player.dashTime > 0) return 0;
    if (player.shieldTimer > 0) {
      player.shieldTimer = 0;
      player.invulnerable = 0.8;
      ring(player.x, player.y, '#9df2ff');
      floatText(player.x, player.y - 30, 'SHIELD!', '#9df2ff');
      return EVENT_HIT;
    }
    player.hearts -= 1;
    player.invulnerable = PLAYER.invulnerableTime;
    state.combo = 0;
    state.multiplier = 1;
    state.shake = 14;
    state.flash = 0.55;
    burst(player.x, player.y, '#ff5d73', 24, 300, 0.7);
    if (player.hearts <= 0) return EVENT_HIT | EVENT_OVER;
    return EVENT_HIT;
  }

  /** A spitter's aimed bolt: one slow shot straight at the lantern,
   * telegraphed by the burst it leaves at the maw. */
  function spitAimedBolt(enemy) {
    const a = angleTo(enemy.x, enemy.y, state.player.x, state.player.y);
    state.enemyBullets.push({
      x: enemy.x + Math.cos(a) * (enemy.radius + 6),
      y: enemy.y + Math.sin(a) * (enemy.radius + 6),
      vx: Math.cos(a) * 210,
      vy: Math.sin(a) * 210,
      radius: 6,
    });
    burst(enemy.x, enemy.y, ENEMY.spitter.color, 4, 120, 0.3);
  }

  function stepPlayer(dt, move, aim, firing, dash) {
    const player = state.player;
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    player.dashCooldown = Math.max(0, player.dashCooldown - dt);
    player.rapidTimer = Math.max(0, player.rapidTimer - dt);
    player.spreadTimer = Math.max(0, player.spreadTimer - dt);
    player.shieldTimer = Math.max(0, player.shieldTimer - dt);
    player.fireTimer -= dt;
    player.muzzle = Math.max(0, player.muzzle - dt);
    player.wakeTimer -= dt;
    player.lamp = Math.max(PLAYER.lampBase, player.lamp - PLAYER.lampDecay * dt);
    player.angle = angleTo(player.x, player.y, aim.x, aim.y);

    if (dash && player.dashCooldown <= 0 && (move.x !== 0 || move.y !== 0)) {
      player.dashTime = PLAYER.dashTime;
      player.dashCooldown = PLAYER.dashCooldown;
      burst(player.x, player.y, '#ffe9a8', 10, 180, 0.4);
    }

    if (player.dashTime > 0) {
      player.dashTime -= dt;
      player.x += move.x * PLAYER.dashSpeed * dt;
      player.y += move.y * PLAYER.dashSpeed * dt;
    } else {
      player.x += move.x * PLAYER.speed * dt;
      player.y += move.y * PLAYER.speed * dt;
    }
    player.x = Math.min(FIELD.width - PLAYER.radius, Math.max(PLAYER.radius, player.x));
    player.y = Math.min(FIELD.height - PLAYER.radius, Math.max(PLAYER.radius, player.y));

    // A moving skiff leaves a fading wake on the tide.
    if ((move.x !== 0 || move.y !== 0) && player.wakeTimer <= 0) {
      player.wakeTimer = 0.06;
      state.particles.push({
        x: player.x - move.x * 20,
        y: player.y - move.y * 20,
        vx: -move.x * 30,
        vy: -move.y * 30,
        radius: 3,
        life: 0.5,
        maxLife: 0.5,
        color: '#2f5d7d',
      });
    }

    if (firing && player.fireTimer <= 0) {
      player.fireTimer = player.rapidTimer > 0 ? PLAYER.rapidInterval : PLAYER.fireInterval;
      player.muzzle = 0.07;
      const angles = player.spreadTimer > 0 ? [-0.22, 0, 0.22] : [0];
      for (const offset of angles) {
        const a = player.angle + offset;
        state.bullets.push({
          x: player.x + Math.cos(a) * (PLAYER.radius + 8),
          y: player.y + Math.sin(a) * (PLAYER.radius + 8),
          vx: Math.cos(a) * PLAYER.bulletSpeed,
          vy: Math.sin(a) * PLAYER.bulletSpeed,
          radius: PLAYER.bulletRadius,
          damage: 1,
        });
      }
      state.shotsFired += 1;
    }
  }

  function stepEnemies(dt) {
    const player = state.player;
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = state.enemies[i];
      enemy.flash = Math.max(0, enemy.flash - dt);
      const angle = angleTo(enemy.x, enemy.y, player.x, player.y);
      enemy.angle = angle;
      let vx = Math.cos(angle) * enemy.speed;
      let vy = Math.sin(angle) * enemy.speed;
      if (enemy.kind === 'shade') {
        enemy.wobble += dt * 6;
        const perp = angle + Math.PI / 2;
        vx += Math.cos(perp) * Math.sin(enemy.wobble) * 120;
        vy += Math.sin(perp) * Math.sin(enemy.wobble) * 120;
      }
      if (enemy.kind === 'spitter') {
        // Hold a firing lane: close in past 320, back off inside 220,
        // strafe while the maw charges, then spit an aimed bolt.
        enemy.wobble += dt * 2;
        const d = Math.sqrt(dist2(enemy.x, enemy.y, player.x, player.y)) || 1;
        const hold = d > 320 ? 1 : d < 220 ? -0.8 : 0;
        const perp = angle + Math.PI / 2;
        vx = Math.cos(angle) * enemy.speed * hold + Math.cos(perp) * Math.sin(enemy.wobble) * 60;
        vy = Math.sin(angle) * enemy.speed * hold + Math.sin(perp) * Math.sin(enemy.wobble) * 60;
        enemy.spitTimer -= dt;
        if (enemy.spitTimer <= 0) {
          enemy.spitTimer = 3.0;
          spitAimedBolt(enemy);
        }
      }
      if (enemy.kind === 'dread') {
        enemy.burstTimer -= dt;
        if (enemy.burstTimer <= 0) {
          enemy.burstTimer = 2.6;
          for (let k = 0; k < 8; k += 1) {
            const a = (k / 8) * TAU + enemy.wobble;
            state.enemyBullets.push({
              x: enemy.x + Math.cos(a) * (enemy.radius + 6),
              y: enemy.y + Math.sin(a) * (enemy.radius + 6),
              vx: Math.cos(a) * 190,
              vy: Math.sin(a) * 190,
              radius: 7,
            });
          }
          ring(enemy.x, enemy.y, ENEMY.dread.color);
        }
      }
      enemy.x += vx * dt;
      enemy.y += vy * dt;
      // Touching the lantern hurts.
      const rr = enemy.radius + PLAYER.radius - 4;
      if (dist2(enemy.x, enemy.y, player.x, player.y) < rr * rr) {
        const events = hurtPlayer();
        if (events & EVENT_OVER) return events;
        // The enemy that landed the hit is spent.
        burst(enemy.x, enemy.y, ENEMY[enemy.kind].color, 10, 200, 0.5);
        state.enemies.splice(i, 1);
      }
    }
    return 0;
  }

  function stepBullets(dt) {
    let events = 0;
    for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
      const bullet = state.bullets[i];
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      if (bullet.x < -20 || bullet.x > FIELD.width + 20 || bullet.y < -20 || bullet.y > FIELD.height + 20) {
        state.bullets.splice(i, 1);
        continue;
      }
      for (let j = state.enemies.length - 1; j >= 0; j -= 1) {
        const enemy = state.enemies[j];
        const rr = enemy.radius + bullet.radius;
        if (dist2(bullet.x, bullet.y, enemy.x, enemy.y) < rr * rr) {
          state.bullets.splice(i, 1);
          state.shotsHit += 1;
          enemy.hp -= bullet.damage;
          enemy.flash = 0.12;
          burst(bullet.x, bullet.y, ENEMY[enemy.kind].color, 5, 160, 0.35);
          if (enemy.hp <= 0) {
            killEnemy(enemy, j);
            events |= EVENT_KILL;
          }
          break;
        }
      }
    }
    for (let i = state.enemyBullets.length - 1; i >= 0; i -= 1) {
      const bullet = state.enemyBullets[i];
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      if (bullet.x < -20 || bullet.x > FIELD.width + 20 || bullet.y < -20 || bullet.y > FIELD.height + 20) {
        state.enemyBullets.splice(i, 1);
        continue;
      }
      const player = state.player;
      const rr = bullet.radius + PLAYER.radius - 4;
      if (dist2(bullet.x, bullet.y, player.x, player.y) < rr * rr) {
        state.enemyBullets.splice(i, 1);
        const hit = hurtPlayer();
        events |= hit;
        if (hit & EVENT_OVER) return events;
      }
    }
    return events;
  }

  function stepPickups(dt) {
    const player = state.player;
    for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
      const pickup = state.pickups[i];
      pickup.life -= dt;
      pickup.bob += dt * 3;
      if (pickup.life <= 0) {
        state.pickups.splice(i, 1);
        continue;
      }
      const d2 = dist2(pickup.x, pickup.y, player.x, player.y);
      if (d2 < PICKUP.magnetRadius * PICKUP.magnetRadius) {
        const d = Math.sqrt(d2) || 1;
        pickup.x += ((player.x - pickup.x) / d) * PICKUP.magnetSpeed * dt;
        pickup.y += ((player.y - pickup.y) / d) * PICKUP.magnetSpeed * dt;
      }
      if (d2 < (PLAYER.radius + 16) * (PLAYER.radius + 16)) {
        state.pickups.splice(i, 1);
        if (pickup.kind === 'orb') {
          player.lamp = Math.min(PLAYER.lampMax, player.lamp + 14);
          state.score += 10 * state.multiplier;
          floatText(player.x, player.y - 28, '+10', '#ffe9a8');
        } else if (pickup.kind === 'heart') {
          player.hearts = Math.min(PLAYER.maxHearts, player.hearts + 1);
          floatText(player.x, player.y - 28, '+1 ♥', '#ff6b81');
        } else if (pickup.kind === 'rapid') {
          player.rapidTimer = PICKUP.rapidSeconds;
          floatText(player.x, player.y - 28, 'RAPID FIRE!', '#7fe7ff');
        } else if (pickup.kind === 'spread') {
          player.spreadTimer = PICKUP.spreadSeconds;
          floatText(player.x, player.y - 28, 'SPREAD SHOT!', '#c792ff');
        } else if (pickup.kind === 'shield') {
          player.shieldTimer = PICKUP.shieldSeconds;
          floatText(player.x, player.y - 28, 'SHIELD!', '#9df2ff');
        }
        burst(pickup.x, pickup.y, '#ffe9a8', 8, 140, 0.4);
        return EVENT_PICKUP;
      }
    }
    return 0;
  }

  function stepParticles(dt) {
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const p = state.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        state.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      if (p.ring) p.radius += 260 * dt;
    }
    for (let i = state.texts.length - 1; i >= 0; i -= 1) {
      const t = state.texts[i];
      t.life -= dt;
      t.y -= 34 * dt;
      if (t.life <= 0) state.texts.splice(i, 1);
    }
    state.shake = Math.max(0, state.shake - 40 * dt);
    state.flash = Math.max(0, state.flash - 1.6 * dt);
  }

  function reset() {
    const fresh = freshState();
    for (const key of Object.keys(fresh)) state[key] = fresh[key];
    spawnQueue = [];
    spawnTimer = 0;
    betweenTimer = WAVE.betweenSeconds;
    elapsed = 0;
  }

  /** Advance one fixed step. `attract` runs the world as a title-screen
   * backdrop: wisps drift, nothing can hurt the player. Returns events. */
  function step(dt, move, aim, firing, dash, attract) {
    state.time += dt;
    elapsed += dt;
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) {
        state.combo = 0;
        state.multiplier = 1;
      }
    }
    if (attract) {
      if (state.enemies.length < 14 && random.chance(0.02)) spawnEnemy('wisp');
      for (const enemy of state.enemies) {
        enemy.wobble += dt * 2;
        enemy.x += Math.cos(enemy.wobble) * 24 * dt;
        enemy.y += Math.sin(enemy.wobble * 0.7) * 18 * dt + 12 * dt;
        if (enemy.y > FIELD.height + 40) {
          enemy.y = -30;
          enemy.x = random.range(40, FIELD.width - 40);
        }
      }
      stepParticles(dt);
      return 0;
    }

    stepPlayer(dt, move, aim, firing, dash);
    let events = stepEnemies(dt);
    if (events & EVENT_OVER) return events;
    events |= stepBullets(dt);
    if (events & EVENT_OVER) return events;
    events |= stepPickups(dt);

    if (state.waveActive) {
      spawnTimer -= dt;
      const interval = Math.max(WAVE.minSpawnInterval, WAVE.spawnInterval - state.wave * 0.05);
      if (spawnQueue.length > 0 && spawnTimer <= 0) {
        spawnTimer = interval;
        spawnEnemy(spawnQueue.shift());
      }
      if (spawnQueue.length === 0 && state.enemies.length === 0) {
        state.waveActive = false;
        state.score += WAVE.clearBonus * state.wave;
        betweenTimer = WAVE.betweenSeconds;
        floatText(FIELD.width / 2, FIELD.height / 2 - 60, `WAVE ${state.wave} CLEAR  +${WAVE.clearBonus * state.wave}`, '#ffd166');
      }
    } else {
      betweenTimer -= dt;
      if (betweenTimer <= 0) events |= startWave();
    }

    stepParticles(dt);
    return events;
  }

  reset();

  return {
    state,
    reset,
    step,
    startWave,
    get elapsed() {
      return elapsed;
    },
  };
}
