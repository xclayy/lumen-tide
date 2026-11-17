// EMBERKEEP — juice: screen shake, hit-stop, floating damage numbers,
// death bursts, ember trails and the boss-intro cinematic. Pure presentation:
// nothing here changes the simulation, so it can be as loud as it likes.
import { VIEW, ARENA } from './config.js';

export function createEffects() {
  return {
    shake: 0, shakeX: 0, shakeY: 0,
    hitStop: 0, flash: 0, flashColor: '#ffffff',
    banner: null, bannerT: 0,
    trails: [],
  };
}

export function addShake(fx, amount) {
  fx.shake = Math.max(fx.shake, amount);
}

export function addHitStop(fx, seconds) {
  fx.hitStop = Math.max(fx.hitStop, seconds);
}

export function addFlash(fx, color, seconds) {
  fx.flash = Math.max(fx.flash, seconds);
  fx.flashColor = color;
}

export function showBanner(fx, title, sub, seconds) {
  fx.banner = { title, sub };
  fx.bannerT = seconds;
}

export function updateEffects(fx, dt, rng) {
  if (fx.shake > 0) {
    fx.shake = Math.max(0, fx.shake - dt * 26);
    fx.shakeX = (rng() - 0.5) * fx.shake;
    fx.shakeY = (rng() - 0.5) * fx.shake;
  } else {
    fx.shakeX = 0;
    fx.shakeY = 0;
  }
  if (fx.hitStop > 0) fx.hitStop -= dt;
  if (fx.flash > 0) fx.flash -= dt;
  if (fx.bannerT > 0) fx.bannerT -= dt;
  for (const t of fx.trails) {
    t.life -= dt;
    t.x += t.vx * dt;
    t.y += t.vy * dt;
  }
  fx.trails = fx.trails.filter((t) => t.life > 0);
}

export function addTrail(fx, x, y, vx, vy, color, life, size) {
  fx.trails.push({ x, y, vx, vy, color, life, maxLife: life, size: size || 3 });
}

export function burst(fx, rng, x, y, n, color, speed, life) {
  for (let i = 0; i < n; i += 1) {
    const a = rng() * Math.PI * 2;
    const s = speed * (0.4 + rng() * 0.8);
    addTrail(fx, x, y, Math.cos(a) * s, Math.sin(a) * s, color, life * (0.6 + rng() * 0.7), 2 + rng() * 3);
  }
}

export function drawEffects(fx, ctx) {
  // Ember trails (additive glow).
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const t of fx.trails) {
    ctx.globalAlpha = Math.max(0, t.life / t.maxLife) * 0.8;
    ctx.fillStyle = t.color;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Full-screen flash (damage, boss death, victory).
  if (fx.flash > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.5, fx.flash * 2);
    ctx.fillStyle = fx.flashColor;
    ctx.fillRect(0, 0, VIEW.W, VIEW.H);
    ctx.restore();
  }
  // Boss-intro banner: a named splash that holds the screen for a beat.
  if (fx.banner && fx.bannerT > 0) {
    const a = Math.min(1, fx.bannerT);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 250, VIEW.W, 150);
    ctx.strokeStyle = '#ffd94f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(340, 250); ctx.lineTo(940, 250);
    ctx.moveTo(340, 400); ctx.lineTo(940, 400);
    ctx.stroke();
    ctx.font = 'bold 44px serif';
    ctx.fillStyle = '#ffd94f';
    ctx.textAlign = 'center';
    ctx.fillText(fx.banner.title, VIEW.W / 2, 320);
    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#cfc4a8';
    ctx.fillText(fx.banner.sub, VIEW.W / 2, 356);
    ctx.restore();
  }
}

export function applyShake(fx, ctx) {
  if (fx.shakeX !== 0 || fx.shakeY !== 0) ctx.translate(fx.shakeX, fx.shakeY);
}

// A small damage-number helper the world calls when a bolt lands.
export function damageNumber(w, fx, x, y, amount, color) {
  if (!w.floats) return;
  w.floats.push({ x, y, text: `${amount}`, color: color || '#ffffff', life: 0.8, maxLife: 0.8 });
}

// Lightning flash in the Frozen Deep: a rare, purely atmospheric strike.
export function maybeLightning(fx, rng, dt, realm) {
  if (realm !== 2) return;
  if (rng() < dt * 0.05) {
    addFlash(fx, '#b9c8ff', 0.18);
    addShake(fx, 3);
  }
}

// Arena edge vignette: darkens the corners so the centre reads as lit.
export function drawVignette(ctx) {
  const g = ctx.createRadialGradient(VIEW.W / 2, VIEW.H / 2, 260, VIEW.W / 2, VIEW.H / 2, 720);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.W, VIEW.H);
}
