// Everything the eye sees: the tide, the lantern, the shadows, the
// particles and the HUD. Glow comes from sprites painted once into
// offscreen canvases, so the frame stays fast even with a full tide.
import { COLORS, ENEMY, FIELD, PLAYER } from './config.js';

export const SCREEN_TITLE = 0;
export const SCREEN_PLAY = 1;
export const SCREEN_PAUSED = 2;
export const SCREEN_OVER = 3;

const TAU = Math.PI * 2;

function glowSprite(color, radius) {
  const size = radius * 2;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.35, color + 'aa');
  gradient.addColorStop(1, color + '00');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

function solidSprite(color, radius) {
  const size = radius * 2;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(radius, radius, radius, 0, TAU);
  ctx.fill();
  return canvas;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const sprites = {
    lamp: glowSprite('#ffe9a8', 130),
    bullet: glowSprite('#ffe9a8', 14),
    wisp: glowSprite('#7fe7ff', 30),
    shade: glowSprite('#c792ff', 34),
    gloom: glowSprite('#ff7a9e', 54),
    dread: glowSprite('#ffb347', 90),
    orb: glowSprite('#ffd166', 22),
    heart: solidSprite('#ff6b81', 10),
    player: solidSprite('#fff3c4', 16),
  };
  const motes = [];
  // Fixed-seed motes, so the same tide always draws the same way.
  let moteSeed = 0x12345678;
  const moteRandom = () => {
    moteSeed = (moteSeed + 0x6d2b79f5) | 0;
    let t = Math.imul(moteSeed ^ (moteSeed >>> 15), 1 | moteSeed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < 70; i += 1) {
    motes.push({
      x: moteRandom() * FIELD.width,
      y: moteRandom() * FIELD.height,
      r: 1 + moteRandom() * 2.2,
      speed: 6 + moteRandom() * 14,
      drift: moteRandom() * TAU,
    });
  }

  function fitCanvas() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(canvas.width / FIELD.width, 0, 0, canvas.height / FIELD.height, 0, 0);
  }

  function drawBackground(time) {
    const gradient = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    gradient.addColorStop(0, COLORS.deepTop);
    gradient.addColorStop(1, COLORS.deepBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    // Slow tide bands.
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = COLORS.tide;
    ctx.lineWidth = 26;
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      const baseY = 140 + i * 150;
      for (let x = 0; x <= FIELD.width; x += 32) {
        const y = baseY + Math.sin(x / 190 + time * 0.35 + i * 1.7) * 22;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
    // Drifting motes.
    ctx.save();
    ctx.fillStyle = '#bfe6ff';
    for (const mote of motes) {
      const y = (mote.y + time * mote.speed) % (FIELD.height + 8);
      const x = mote.x + Math.sin(time * 0.4 + mote.drift) * 12;
      ctx.globalAlpha = 0.25 + 0.2 * Math.sin(time + mote.drift);
      ctx.beginPath();
      ctx.arc(x, y, mote.r, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawLamp(player) {
    const size = player.lamp * 2;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.drawImage(sprites.lamp, player.x - size / 2, player.y - size / 2, size, size);
    ctx.restore();
  }

  function drawPlayer(player, time) {
    const blink = player.invulnerable > 0 && Math.floor(time * 14) % 2 === 0;
    if (blink) return;
    ctx.save();
    ctx.translate(player.x, player.y);
    // Hull: a small skiff pointing at the aim.
    ctx.rotate(player.angle);
    ctx.fillStyle = '#2b4a63';
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(-14, -11);
    ctx.lineTo(-8, 0);
    ctx.lineTo(-14, 11);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(-4, -3, 10, 6);
    ctx.restore();
    // The lantern flame.
    const flame = 1 + 0.12 * Math.sin(time * 9);
    ctx.drawImage(sprites.player, player.x - 16 * flame, player.y - 16 * flame, 32 * flame, 32 * flame);
    if (player.shieldTimer > 0) {
      ctx.save();
      ctx.strokeStyle = '#9df2ff';
      ctx.globalAlpha = 0.7 + 0.3 * Math.sin(time * 8);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 30, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
    if (player.dashCooldown > 0 && player.dashTime <= 0) {
      const frac = 1 - player.dashCooldown / 1.6;
      ctx.save();
      ctx.strokeStyle = '#8fb3c9';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 24, -Math.PI / 2, -Math.PI / 2 + frac * TAU);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawEnemy(enemy, time) {
    const def = ENEMY[enemy.kind];
    const sprite = sprites[enemy.kind];
    const size = enemy.radius * 4;
    ctx.save();
    if (enemy.flash > 0) ctx.globalAlpha = 0.9;
    ctx.drawImage(sprite, enemy.x - size / 2, enemy.y - size / 2, size, size);
    ctx.restore();
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    if (enemy.kind === 'wisp') {
      ctx.fillStyle = '#dff8ff';
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#0a2436';
      ctx.beginPath();
      ctx.arc(-2.5, -1, 1.8, 0, TAU);
      ctx.arc(2.5, -1, 1.8, 0, TAU);
      ctx.fill();
    } else if (enemy.kind === 'shade') {
      ctx.rotate(enemy.angle);
      ctx.fillStyle = '#e6d4ff';
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-10, -9);
      ctx.lineTo(-5, 0);
      ctx.lineTo(-10, 9);
      ctx.closePath();
      ctx.fill();
    } else if (enemy.kind === 'gloom') {
      ctx.fillStyle = '#ffdce4';
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#5c1020';
      ctx.beginPath();
      ctx.arc(-5, -3, 3, 0, TAU);
      ctx.arc(5, -3, 3, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#5c1020';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 4, 6, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    } else {
      const pulse = 1 + 0.06 * Math.sin(time * 5);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = '#ffe1ad';
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#7a3c00';
      ctx.beginPath();
      ctx.arc(-9, -6, 4.5, 0, TAU);
      ctx.arc(9, -6, 4.5, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#7a3c00';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 6, 10, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();
    }
    ctx.restore();
    if (enemy.maxHp > 1 && enemy.hp < enemy.maxHp) {
      const w = enemy.radius * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(enemy.x - w / 2, enemy.y - enemy.radius - 12, w, 5);
      ctx.fillStyle = def.color;
      ctx.fillRect(enemy.x - w / 2, enemy.y - enemy.radius - 12, w * (enemy.hp / enemy.maxHp), 5);
    }
  }

  function drawPickup(pickup, time) {
    const bob = Math.sin(pickup.bob) * 4;
    const y = pickup.y + bob;
    const blink = pickup.life < 2 && Math.floor(time * 8) % 2 === 0;
    if (blink) return;
    if (pickup.kind === 'orb') {
      ctx.drawImage(sprites.orb, pickup.x - 22, y - 22, 44, 44);
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.arc(pickup.x, y, 6, 0, TAU);
      ctx.fill();
    } else if (pickup.kind === 'heart') {
      ctx.save();
      ctx.translate(pickup.x, y);
      ctx.fillStyle = COLORS.heart;
      ctx.beginPath();
      ctx.arc(-4.5, -2, 6, 0, TAU);
      ctx.arc(4.5, -2, 6, 0, TAU);
      ctx.moveTo(-10, 0);
      ctx.lineTo(0, 11);
      ctx.lineTo(10, 0);
      ctx.fill();
      ctx.restore();
    } else {
      const label = pickup.kind === 'rapid' ? 'R' : pickup.kind === 'spread' ? 'S' : '◈';
      const color = pickup.kind === 'rapid' ? '#7fe7ff' : pickup.kind === 'spread' ? '#c792ff' : '#9df2ff';
      ctx.save();
      ctx.fillStyle = 'rgba(4,16,29,0.85)';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pickup.x, y, 14, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, pickup.x, y + 1);
      ctx.restore();
    }
  }

  function drawParticles(state) {
    for (const p of state.particles) {
      const frac = p.life / p.maxLife;
      ctx.save();
      if (p.ring) {
        ctx.globalAlpha = frac;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, TAU);
        ctx.stroke();
      } else {
        ctx.globalAlpha = frac;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * frac + 0.5, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px system-ui, sans-serif';
    for (const t of state.texts) {
      ctx.globalAlpha = Math.min(1, (t.life / t.maxLife) * 2);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.restore();
  }

  function heart(x, y, filled) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = filled ? COLORS.heart : 'rgba(255,107,129,0.25)';
    ctx.beginPath();
    ctx.arc(-4.5, -2, 6, 0, TAU);
    ctx.arc(4.5, -2, 6, 0, TAU);
    ctx.moveTo(-10, 0);
    ctx.lineTo(0, 11);
    ctx.lineTo(10, 0);
    ctx.fill();
    ctx.restore();
  }

  function drawHud(state, best) {
    const player = state.player;
    ctx.save();
    ctx.textBaseline = 'alphabetic';
    // Hearts, top left.
    for (let i = 0; i < PLAYER.maxHearts; i += 1) heart(30 + i * 30, 32, i < player.hearts);
    // Active powers, under the hearts.
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    let powerY = 58;
    if (player.rapidTimer > 0) {
      ctx.fillStyle = '#7fe7ff';
      ctx.fillText(`RAPID ${player.rapidTimer.toFixed(0)}s`, 18, powerY);
      powerY += 18;
    }
    if (player.spreadTimer > 0) {
      ctx.fillStyle = '#c792ff';
      ctx.fillText(`SPREAD ${player.spreadTimer.toFixed(0)}s`, 18, powerY);
      powerY += 18;
    }
    if (player.shieldTimer > 0) {
      ctx.fillStyle = '#9df2ff';
      ctx.fillText(`SHIELD ${player.shieldTimer.toFixed(0)}s`, 18, powerY);
    }
    // Wave, top centre.
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.pale;
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText(`WAVE ${Math.max(1, state.wave)}`, FIELD.width / 2, 34);
    ctx.fillStyle = COLORS.dim;
    ctx.font = '14px system-ui, sans-serif';
    const left = state.waveActive ? state.enemies.length : 0;
    ctx.fillText(state.waveActive ? `${left} shadows left` : 'next wave incoming…', FIELD.width / 2, 56);
    // Score, top right.
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText(String(state.score).padStart(6, '0'), FIELD.width - 18, 36);
    ctx.fillStyle = COLORS.dim;
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(`BEST ${best}`, FIELD.width - 18, 56);
    // Combo meter, right side under the score.
    if (state.multiplier > 1) {
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText(`COMBO x${state.multiplier}`, FIELD.width - 18, 88);
      ctx.fillStyle = 'rgba(255,209,102,0.3)';
      ctx.fillRect(FIELD.width - 118, 96, 100, 6);
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(FIELD.width - 118, 96, 100 * (state.comboTimer / 3), 6);
    }
    // Dash cooldown, bottom centre.
    const dashFrac = 1 - player.dashCooldown / 1.6;
    ctx.fillStyle = 'rgba(143,179,201,0.3)';
    ctx.fillRect(FIELD.width / 2 - 60, FIELD.height - 24, 120, 6);
    ctx.fillStyle = dashFrac >= 1 ? '#ffe9a8' : '#8fb3c9';
    ctx.fillRect(FIELD.width / 2 - 60, FIELD.height - 24, 120 * dashFrac, 6);
    ctx.fillStyle = COLORS.dim;
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(dashFrac >= 1 ? 'DASH READY  [SPACE]' : 'DASH…', FIELD.width / 2, FIELD.height - 32);
    ctx.restore();
  }

  function panel(x, y, w, h) {
    ctx.save();
    ctx.fillStyle = 'rgba(3,14,25,0.82)';
    ctx.strokeStyle = 'rgba(255,209,102,0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 18);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawTitle(state, best) {
    panel(FIELD.width / 2 - 330, 150, 660, 400);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 64px system-ui, sans-serif';
    ctx.fillText('LUMEN TIDE', FIELD.width / 2, 235);
    ctx.fillStyle = COLORS.pale;
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText('Keep the lantern lit. Burn the shadows back.', FIELD.width / 2, 272);
    ctx.fillStyle = COLORS.dim;
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText('WASD / arrows — sail    ·    Mouse — aim & fire', FIELD.width / 2, 322);
    ctx.fillText('SPACE — dash    ·    P — pause    ·    M — mute', FIELD.width / 2, 348);
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillText('Wisps 10  ·  Shades 25  ·  Glooms 50  ·  Dreads 300', FIELD.width / 2, 392);
    ctx.fillStyle = COLORS.dim;
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText('Kills inside your light pay +50%. Chain kills for combo x5.', FIELD.width / 2, 420);
    ctx.fillStyle = COLORS.pale;
    ctx.font = 'bold 22px system-ui, sans-serif';
    const pulse = 0.65 + 0.35 * Math.sin(state.time * 4);
    ctx.globalAlpha = pulse;
    ctx.fillText('CLICK OR PRESS SPACE TO SAIL', FIELD.width / 2, 488);
    ctx.globalAlpha = 1;
    if (best > 0) {
      ctx.fillStyle = COLORS.dim;
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillText(`Best voyage: ${best}`, FIELD.width / 2, 522);
    }
    ctx.restore();
  }

  function drawPaused() {
    ctx.save();
    ctx.fillStyle = 'rgba(3,14,25,0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.pale;
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.fillText('BECALMED', FIELD.width / 2, FIELD.height / 2 - 10);
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillStyle = COLORS.dim;
    ctx.fillText('Press P or click to keep sailing', FIELD.width / 2, FIELD.height / 2 + 30);
    ctx.restore();
  }

  function drawOver(state, best, stats) {
    ctx.save();
    ctx.fillStyle = 'rgba(3,10,18,0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    panel(FIELD.width / 2 - 320, 130, 640, 440);
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.danger;
    ctx.font = 'bold 46px system-ui, sans-serif';
    ctx.fillText('THE TIDE TOOK', FIELD.width / 2, 205);
    ctx.fillText('THE LIGHT', FIELD.width / 2, 258);
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.fillText(`SCORE  ${state.score}`, FIELD.width / 2, 318);
    ctx.fillStyle = COLORS.pale;
    ctx.font = '19px system-ui, sans-serif';
    const accuracy = state.shotsFired > 0 ? Math.round((state.shotsHit / state.shotsFired) * 100) : 0;
    ctx.fillText(`Wave ${state.wave}  ·  ${state.kills} shadows sunk  ·  ${accuracy}% shots on target`, FIELD.width / 2, 358);
    ctx.fillText(`Time at sea ${Math.floor(stats.seconds / 60)}:${String(Math.floor(stats.seconds % 60)).padStart(2, '0')}`, FIELD.width / 2, 390);
    if (state.score >= best && state.score > 0) {
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText('★ NEW BEST VOYAGE ★', FIELD.width / 2, 432);
    } else {
      ctx.fillStyle = COLORS.dim;
      ctx.font = '17px system-ui, sans-serif';
      ctx.fillText(`Best voyage: ${best}`, FIELD.width / 2, 432);
    }
    ctx.fillStyle = COLORS.pale;
    ctx.font = 'bold 21px system-ui, sans-serif';
    const pulse = 0.65 + 0.35 * Math.sin(state.time * 4);
    ctx.globalAlpha = pulse;
    ctx.fillText('PRESS R OR CLICK TO SAIL AGAIN', FIELD.width / 2, 512);
    ctx.restore();
  }

  function drawWaveBanner(state) {
    if (!state.waveActive || state.enemies.length > 0) return;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 40px system-ui, sans-serif';
    ctx.globalAlpha = 0.9;
    ctx.fillText(`WAVE ${state.wave}`, FIELD.width / 2, FIELD.height / 2 - 90);
    ctx.restore();
  }

  function draw(state, screen, best, stats) {
    fitCanvas();
    const time = state.time;
    ctx.save();
    if (state.shake > 0) {
      // Deterministic wobble from the clock, so a staged frame is stable.
      ctx.translate(Math.sin(time * 91) * state.shake * 0.5, Math.cos(time * 113) * state.shake * 0.5);
    }
    drawBackground(time);
    if (screen !== SCREEN_TITLE) drawLamp(state.player);
    for (const pickup of state.pickups) drawPickup(pickup, time);
    for (const enemy of state.enemies) drawEnemy(enemy, time);
    for (const bullet of state.bullets) {
      ctx.drawImage(sprites.bullet, bullet.x - 14, bullet.y - 14, 28, 28);
    }
    for (const bullet of state.enemyBullets) {
      ctx.save();
      ctx.fillStyle = '#ffb347';
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    if (screen !== SCREEN_TITLE) drawPlayer(state.player, time);
    drawParticles(state);
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHud(state, best);
    if (screen === SCREEN_PLAY) drawWaveBanner(state);
    ctx.restore();
    if (state.flash > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(255,40,60,${state.flash * 0.35})`;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      ctx.restore();
    }
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    else if (screen === SCREEN_PAUSED) drawPaused();
    else if (screen === SCREEN_OVER) drawOver(state, best, stats);
  }

  return { draw, fitCanvas };
}
