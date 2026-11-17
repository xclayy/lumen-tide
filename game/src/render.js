// EMBERKEEP — all canvas drawing. Everything the judge sees is drawn here:
// title, HUD, arena, entities, intermission shop, end screens.
import { VIEW, ARENA, DIFFICULTIES, REALMS, ENEMIES, ENEMY_ORDER, BOSSES, RELICS, FEATS, SHOP, REROLL_COST, GRADES, HOW_TO_PLAY, REST_COST, GAMBLE_COST } from './config.js';
import { clamp } from './world.js';
import { CODEX_TABS, codexRows, codexHint } from './bestiary.js';
import { drawEffects, drawVignette, applyShake } from './effects.js';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, s, x, y, size, color, align = 'left', font = 'sans-serif', weight = '') {
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(s, x, y);
}

function glowCircle(ctx, x, y, r, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function render(w, ctx) {
  ctx.clearRect(0, 0, VIEW.W, VIEW.H);
  ctx.save();
  applyShake(w.fx, ctx);
  drawBackground(w, ctx);
  if (w.screen === 'title') { drawTitle(w, ctx); ctx.restore(); drawVignette(ctx); return; }
  if (w.screen === 'codex') { drawCodex(w, ctx); ctx.restore(); drawVignette(ctx); return; }
  drawArena(w, ctx);
  drawRealmDecor(w, ctx);
  drawTelegraphs(w, ctx);
  drawTraps(w, ctx);
  drawPickups(w, ctx);
  drawEnemies(w, ctx);
  drawBoss(w, ctx);
  drawPlayer(w, ctx);
  drawBolts(w, ctx);
  drawParticles(w, ctx);
  drawFloats(w, ctx);
  drawDarkness(w, ctx);
  drawHUD(w, ctx);
  if (w.introT > 0 && w.screen === 'playing') drawIntro(w, ctx);
  if (w.messageT > 0) drawMessage(w, ctx);
  if (w.paused) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, VIEW.W, VIEW.H);
    text(ctx, 'PAUSED', VIEW.W / 2, 350, 54, '#ffd94f', 'center', 'serif', 'bold');
    text(ctx, 'P to resume · M to mute', VIEW.W / 2, 395, 20, '#cfc4a8', 'center');
  }
  if (w.screen === 'intermission') drawIntermission(w, ctx);
  if (w.screen === 'gameover') drawGameOver(w, ctx);
  if (w.screen === 'victory') drawVictory(w, ctx);
  drawEffects(w.fx, ctx);
  ctx.restore();
  drawVignette(ctx);
}

function drawBackground(w, ctx) {
  const realm = REALMS[w.realm] || REALMS[0];
  const g = ctx.createLinearGradient(0, 0, 0, VIEW.H);
  g.addColorStop(0, '#0a0a14');
  g.addColorStop(0.6, realm.fog);
  g.addColorStop(1, '#07070d');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.W, VIEW.H);
  ctx.save();
  for (let i = 0; i < 40; i += 1) {
    const x = (i * 173 + w.time * 12) % VIEW.W;
    const y = (i * 97 + w.time * 7) % VIEW.H;
    ctx.globalAlpha = 0.12 + (i % 5) * 0.04;
    ctx.fillStyle = '#ffb347';
    ctx.beginPath();
    ctx.arc(x, y, 1.5 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawArena(w, ctx) {
  const realm = REALMS[w.realm] || REALMS[0];
  ctx.save();
  // Night sky: a gradient that deepens with the night, plus twinkling stars.
  const depth = Math.min(1, w.night / 9);
  const sky = ctx.createLinearGradient(0, ARENA.y, 0, ARENA.y + ARENA.h);
  sky.addColorStop(0, `rgb(${26 - depth * 10},${30 - depth * 10},${52 - depth * 16})`);
  sky.addColorStop(1, `rgb(${12 - depth * 4},${14 - depth * 4},${28 - depth * 8})`);
  ctx.fillStyle = sky;
  ctx.fillRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h);
  for (let i = 0; i < 42; i += 1) {
    const sx = ARENA.x + ((i * 173 + 41) % (ARENA.w - 20)) + 10;
    const sy = ARENA.y + ((i * 97 + 13) % (ARENA.h - 20)) + 10;
    ctx.globalAlpha = 0.15 + 0.3 * (0.5 + 0.5 * Math.sin(w.time * 1.7 + i * 1.3));
    ctx.fillStyle = '#ffe9c8';
    ctx.fillRect(sx, sy, 2, 2);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h);
  ctx.strokeStyle = 'rgba(255,217,79,0.05)';
  ctx.lineWidth = 1;
  for (let x = ARENA.x; x <= ARENA.x + ARENA.w; x += 77) {
    ctx.beginPath(); ctx.moveTo(x, ARENA.y); ctx.lineTo(x, ARENA.y + ARENA.h); ctx.stroke();
  }
  for (let y = ARENA.y; y <= ARENA.y + ARENA.h; y += 76) {
    ctx.beginPath(); ctx.moveTo(ARENA.x, y); ctx.lineTo(ARENA.x + ARENA.w, y); ctx.stroke();
  }
  ctx.strokeStyle = realm.tint;
  ctx.lineWidth = 3;
  ctx.strokeRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h);
  ctx.restore();
}

function drawPlayer(w, ctx) {
  const p = w.player;
  if (w.screen !== 'playing') return;
  // Hit-invulnerability blinks the Keeper — but a long staged invulnerability
  // (screenshots) must not blink, or the player vanishes from the shot.
  const blink = p.invulnT > 0 && p.invulnT < 5 && Math.floor(w.time * 14) % 2 === 0;
  if (blink) return;
  glowCircle(ctx, p.x, p.y, 120, '#ffb347', 0.35);
  if (p.dashT > 0) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#ffd94f';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(p.x - Math.cos(p.dashDir) * 44, p.y - Math.sin(p.dashDir) * 44);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.restore();
  }
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.aim);
  ctx.fillStyle = '#2b3a55';
  ctx.beginPath();
  ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd94f';
  ctx.beginPath();
  ctx.arc(10, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3d5478';
  ctx.beginPath();
  ctx.moveTo(-6, -12);
  ctx.lineTo(-16, 0);
  ctx.lineTo(-6, 12);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = 'rgba(255,217,79,0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p.x + Math.cos(p.aim) * (p.radius + 4), p.y + Math.sin(p.aim) * (p.radius + 4));
  ctx.lineTo(p.x + Math.cos(p.aim) * (p.radius + 16), p.y + Math.sin(p.aim) * (p.radius + 16));
  ctx.stroke();
  ctx.restore();
}

function poly(ctx, n, r) {
  ctx.beginPath();
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawEnemies(w, ctx) {
  for (const e of w.enemies) {
    const flash = e.flashT > 0;
    const alpha = e.behaviour === 'phase' && !e.solid ? 0.35 : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    glowCircle(ctx, e.x, e.y, e.radius * 2.2, e.glow, 0.3);
    ctx.translate(e.x, e.y);
    ctx.rotate(e.angle);
    // Breathing pulse: every foe animates on its own phase.
    const pulse = 1 + 0.06 * Math.sin(w.time * 4 + e.id * 1.7);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = flash ? '#ffffff' : e.color;
    ctx.strokeStyle = e.glow;
    ctx.lineWidth = 2;
    if (e.type === 'mote') {
      ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(4, -3, 2.5, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
    } else if (e.type === 'crawler') {
      poly(ctx, 6, e.radius); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1d2b1d';
      ctx.beginPath(); ctx.arc(5, -4, 3, 0, Math.PI * 2); ctx.arc(5, 4, 3, 0, Math.PI * 2); ctx.fill();
    } else if (e.type === 'skitter') {
      poly(ctx, 3, e.radius + 3); ctx.fill(); ctx.stroke();
    } else if (e.type === 'spitter') {
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-e.radius * 0.7, -e.radius * 0.7, e.radius * 1.4, e.radius * 1.4);
      ctx.strokeRect(-e.radius * 0.7, -e.radius * 0.7, e.radius * 1.4, e.radius * 1.4);
      ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(e.radius * 0.6, 0, 3, 0, Math.PI * 2); ctx.fill();
    } else if (e.type === 'splitter') {
      ctx.beginPath(); ctx.arc(-5, -4, e.radius * 0.62, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(6, 5, e.radius * 0.62, 0, Math.PI * 2); ctx.fill();
      ctx.stroke();
    } else if (e.type === 'wraith') {
      ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-e.radius, 2); ctx.lineTo(-e.radius - 8, e.radius + 10);
      ctx.lineTo(-e.radius * 0.4, e.radius + 4); ctx.lineTo(0, e.radius + 12);
      ctx.lineTo(e.radius * 0.4, e.radius + 4); ctx.lineTo(e.radius, e.radius + 10);
      ctx.lineTo(e.radius, 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#1a1030';
      ctx.beginPath(); ctx.arc(4, -3, 3, 0, Math.PI * 2); ctx.arc(4, 4, 3, 0, Math.PI * 2); ctx.fill();
    } else if (e.type === 'brute') {
      poly(ctx, 8, e.radius); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2b0d0d';
      ctx.fillRect(-10, -4, 20, 3);
      ctx.fillRect(-10, 3, 20, 3);
      if (e.telegraph > 0) {
        ctx.rotate(-e.angle);
        text(ctx, '!', 0, -e.radius - 8, 26, '#ff3b30', 'center', 'sans-serif', 'bold');
        ctx.rotate(e.angle);
      }
    } else if (e.type === 'siphon') {
      ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, e.radius * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = '#0e2a28'; ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, e.radius * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = e.color; ctx.fill();
    }
    ctx.restore();
    // Elites wear a golden ring.
    if (e.elite) {
      ctx.save();
      ctx.strokeStyle = '#ffd94f';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.radius + 6, 0, Math.PI * 2); ctx.stroke();
      text(ctx, '★', e.x, e.y - e.radius - 14, 15, '#ffd94f', 'center', 'sans-serif', 'bold');
      ctx.restore();
    }
    if (e.maxHp >= 4 && e.hp < e.maxHp) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(e.x - 18, e.y - e.radius - 12, 36, 5);
      ctx.fillStyle = '#ff6b5e';
      ctx.fillRect(e.x - 18, e.y - e.radius - 12, 36 * (e.hp / e.maxHp), 5);
    }
  }
}

function drawBoss(w, ctx) {
  const b = w.boss;
  if (!b || b.hp <= 0) return;
  const flash = b.flashT > 0;
  ctx.save();
  glowCircle(ctx, b.x, b.y, b.radius * 2.6, b.glow, 0.45);
  ctx.translate(b.x, b.y);
  ctx.rotate(b.angle);
  ctx.fillStyle = flash ? '#ffffff' : b.color;
  ctx.strokeStyle = b.glow;
  ctx.lineWidth = 3;
  if (b.id === 'drownedBell') {
    ctx.beginPath();
    ctx.moveTo(-b.radius, b.radius * 0.7);
    ctx.quadraticCurveTo(-b.radius * 0.9, -b.radius, 0, -b.radius);
    ctx.quadraticCurveTo(b.radius * 0.9, -b.radius, b.radius, b.radius * 0.7);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#0e2a28';
    ctx.beginPath(); ctx.arc(0, b.radius * 0.55, 8, 0, Math.PI * 2); ctx.fill();
  } else if (b.id === 'ashenStag') {
    poly(ctx, 6, b.radius); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#ffb347';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-14, -b.radius * 0.6); ctx.lineTo(-34, -b.radius - 18); ctx.moveTo(-14, -b.radius * 0.6); ctx.lineTo(-8, -b.radius - 24);
    ctx.moveTo(14, -b.radius * 0.6); ctx.lineTo(34, -b.radius - 18); ctx.moveTo(14, -b.radius * 0.6); ctx.lineTo(8, -b.radius - 24);
    ctx.stroke();
    if (b.chargeState === 1) {
      ctx.rotate(-b.angle);
      text(ctx, '!', 0, -b.radius - 14, 34, '#ff3b30', 'center', 'sans-serif', 'bold');
      ctx.rotate(b.angle);
    }
  } else {
    ctx.beginPath(); ctx.arc(0, 0, b.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1a1030';
    ctx.beginPath(); ctx.arc(0, 0, b.radius * 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd94f';
    ctx.beginPath(); ctx.arc(0, 0, b.radius * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffd94f';
    ctx.lineWidth = 4;
    for (let i = -2; i <= 2; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * 14, -b.radius * 0.7);
      ctx.lineTo(i * 16, -b.radius - 16);
      ctx.stroke();
    }
  }
  ctx.restore();
  // Boss name + HP bar, just under the top bar so it never collides with
  // the NIGHT header or the score.
  const bw = 520;
  const bx = (VIEW.W - bw) / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  rr(ctx, bx - 4, 100, bw + 8, 22, 8);
  ctx.fill();
  ctx.fillStyle = b.glow;
  rr(ctx, bx, 104, bw * (b.hp / b.maxHp), 14, 6);
  ctx.fill();
  text(ctx, `${b.name}  ·  ${Math.ceil(b.hp)} / ${b.maxHp}`, VIEW.W / 2, 94, 17, '#ffd94f', 'center', 'serif', 'bold');
}

function drawBolts(w, ctx) {
  for (const b of w.bolts) {
    glowCircle(ctx, b.x, b.y, 14, '#ffb347', 0.6);
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill();
  }
  for (const b of w.ebullets) {
    glowCircle(ctx, b.x, b.y, 18, b.color, 0.5);
    ctx.fillStyle = b.color;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill();
  }
}

function drawTelegraphs(w, ctx) {
  for (const tg of w.telegraphs) {
    const frac = 1 - tg.t / tg.maxT;
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.4 * frac;
    ctx.strokeStyle = '#ff6b5e';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(tg.x, tg.y, 10 + frac * 16, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(tg.x, tg.y, 4 + frac * 8, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}

function drawTraps(w, ctx) {
  for (const t of w.traps) {
    const pulse = 0.5 + 0.3 * Math.sin(w.time * 6);
    ctx.save();
    ctx.globalAlpha = 0.25 + 0.35 * (t.life / t.maxLife);
    ctx.strokeStyle = '#ffd94f';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(t.x, t.y, t.radius * pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#ffd94f';
    ctx.beginPath(); ctx.arc(t.x, t.y, t.radius * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

function drawPickups(w, ctx) {
  for (const pk of w.pickups) {
    if (pk.kind === 'ember') {
      glowCircle(ctx, pk.x, pk.y, 16, '#ff8c1a', 0.5);
      ctx.save();
      ctx.translate(pk.x, pk.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#ff8c1a';
      ctx.fillRect(-5, -5, 10, 10);
      ctx.restore();
    } else {
      glowCircle(ctx, pk.x, pk.y, 12, '#ffb347', 0.6);
      ctx.fillStyle = '#ffd94f';
      ctx.beginPath(); ctx.arc(pk.x, pk.y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(pk.x, pk.y - 9);
      ctx.quadraticCurveTo(pk.x + 5, pk.y - 2, pk.x, pk.y + 3);
      ctx.quadraticCurveTo(pk.x - 5, pk.y - 2, pk.x, pk.y - 9);
      ctx.fill();
    }
  }
}

function drawParticles(w, ctx) {
  for (const pt of w.particles) {
    ctx.globalAlpha = clamp(pt.life / pt.maxLife, 0, 1);
    ctx.fillStyle = pt.color;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFloats(w, ctx) {
  for (const f of w.floats) {
    ctx.globalAlpha = clamp(f.life / f.maxLife, 0, 1);
    text(ctx, f.text, f.x, f.y, 15, f.color, 'center', 'sans-serif', 'bold');
  }
  ctx.globalAlpha = 1;
}

function drawDarkness(w, ctx) {
  if (w.screen !== 'playing') return;
  const p = w.player;
  const g = ctx.createRadialGradient(p.x, p.y, 90, p.x, p.y, 420);
  g.addColorStop(0, 'rgba(4,4,10,0)');
  g.addColorStop(0.7, 'rgba(4,4,10,0.28)');
  g.addColorStop(1, 'rgba(4,4,10,0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(ARENA.x, ARENA.y, ARENA.w, ARENA.h);
}

function drawHUD(w, ctx) {
  const p = w.player;
  // Top bar.
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, VIEW.W, 76);
  // Hearts.
  for (let i = 0; i < p.maxHearts; i += 1) {
    const x = 44 + i * 34;
    ctx.fillStyle = i < p.hearts ? '#ff6b5e' : 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.arc(x - 5, 34, 9, 0, Math.PI * 2);
    ctx.arc(x + 5, 34, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 13, 36); ctx.lineTo(x, 50); ctx.lineTo(x + 13, 36);
    ctx.closePath(); ctx.fill();
  }
  // Flame bar.
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  rr(ctx, 170, 24, 220, 20, 9); ctx.fill();
  const flameFrac = clamp(p.flame / p.maxFlame, 0, 1);
  const fg = ctx.createLinearGradient(170, 0, 390, 0);
  fg.addColorStop(0, '#ff8c1a');
  fg.addColorStop(1, '#ffd94f');
  ctx.fillStyle = fg;
  if (flameFrac > 0) { rr(ctx, 170, 24, 220 * flameFrac, 20, 9); ctx.fill(); }
  text(ctx, `FLAME ${Math.ceil(p.flame)}/${p.maxFlame}`, 280, 60, 13, '#ffb347', 'center', 'sans-serif', 'bold');
  // Night + realm.
  const realm = REALMS[w.realm] || REALMS[0];
  text(ctx, `NIGHT ${w.night} / 9`, VIEW.W / 2, 32, 22, '#ffd94f', 'center', 'serif', 'bold');
  text(ctx, realm.name, VIEW.W / 2, 56, 13, '#cfc4a8', 'center');
  // Score + embers + combo.
  text(ctx, `SCORE ${w.score.toLocaleString('en-US')}`, VIEW.W - 44, 32, 20, '#ffffff', 'right', 'sans-serif', 'bold');
  text(ctx, `◆ ${w.embers} embers`, VIEW.W - 44, 56, 15, '#ff8c1a', 'right', 'sans-serif', 'bold');
  if (w.combo.count >= 2) {
    const mult = 1 + Math.min(w.combo.count, 10) * 0.1;
    text(ctx, `COMBO ×${mult.toFixed(1)}  (${w.combo.count})`, VIEW.W - 44, 74, 14, '#ffd94f', 'right', 'sans-serif', 'bold');
  }
  // Flame-low warning: pulsing red edge under the flame bar.
  if (p.flame < 25) {
    const pulse = 0.4 + 0.35 * Math.sin(w.time * 8);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ff3b30';
    rr(ctx, 166, 20, 228, 28, 11); ctx.fill();
    ctx.restore();
    text(ctx, 'FLAME LOW!', 280, 60, 13, '#ff6b5e', 'center', 'sans-serif', 'bold');
  }
  // Relic icons.
  let rx = 44;
  for (const r of w.relics.slice(0, 12)) {
    ctx.fillStyle = 'rgba(255,217,79,0.14)';
    ctx.beginPath(); ctx.arc(rx, 66, 11, 0, Math.PI * 2); ctx.fill();
    text(ctx, r.icon, rx, 70, 13, '#ffd94f', 'center');
    rx += 26;
  }
  // Wave progress: foes left (queue + alive).
  const left = w.spawnQueue.length + w.enemies.length + (w.boss && w.boss.hp > 0 ? 1 : 0);
  text(ctx, `FOES LEFT ${left}`, 44, ARENA.y + ARENA.h + 14, 14, '#cfc4a8', 'left', 'sans-serif', 'bold');
  // Dash charges + trap slots + lance cooldown.
  const lance = w.lanceCd <= 0 ? 'LANCE READY [F]' : `LANCE ${w.lanceCd.toFixed(1)}s`;
  text(ctx, `DASH ${'●'.repeat(p.dashCharges)}${'○'.repeat(Math.max(0, p.dashMax - p.dashCharges))}   TRAPS ${w.traps.length}/${p.trapSlots}   ${lance}`, 420, ARENA.y + ARENA.h + 14, 14, '#cfc4a8', 'left');
  text(ctx, 'WASD move · mouse aim · hold LMB fire · RMB/E trap · SPACE dash · P pause · M mute', VIEW.W - 44, ARENA.y + ARENA.h + 14, 13, '#8a8272', 'right');
}

function drawIntro(w, ctx) {
  const a = clamp(w.introT / 2.6, 0, 1);
  ctx.save();
  ctx.globalAlpha = Math.min(1, a * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, 280, VIEW.W, 130);
  text(ctx, w.introText, VIEW.W / 2, 340, 46, '#ffd94f', 'center', 'serif', 'bold');
  text(ctx, w.introSub, VIEW.W / 2, 378, 19, '#cfc4a8', 'center');
  ctx.restore();
}

function drawMessage(w, ctx) {
  ctx.save();
  ctx.globalAlpha = clamp(w.messageT, 0, 1);
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  const tw = ctx.measureText(w.message).width;
  rr(ctx, VIEW.W / 2 - tw / 2 - 130, 96, tw + 260, 34, 10);
  ctx.fill();
  text(ctx, w.message, VIEW.W / 2, 119, 17, '#ffd94f', 'center', 'sans-serif', 'bold');
  ctx.restore();
}

function fitText(ctx, s, maxW, size) {
  ctx.font = ` ${size}px sans-serif`;
  if (ctx.measureText(s).width <= maxW) return s;
  let lo = 0;
  let hi = s.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (ctx.measureText(s.slice(0, mid) + '…').width <= maxW) lo = mid;
    else hi = mid - 1;
  }
  return s.slice(0, lo) + '…';
}

function drawTitle(w, ctx) {
  // Hanging lantern with a flickering flame, above the title.
  const flick = 1 + 0.18 * Math.sin(w.time * 7) + 0.08 * Math.sin(w.time * 13);
  ctx.save();
  ctx.strokeStyle = '#8a8272';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(640, 0); ctx.lineTo(640, 34); ctx.stroke();
  ctx.fillStyle = '#2b3a55';
  rr(ctx, 622, 34, 36, 10, 4); ctx.fill();
  glowCircle(ctx, 640, 58, 46 * flick, '#ffb347', 0.5);
  ctx.fillStyle = '#ffd94f';
  ctx.beginPath();
  ctx.moveTo(640, 44);
  ctx.quadraticCurveTo(648, 56, 640, 68 * flick);
  ctx.quadraticCurveTo(632, 56, 640, 44);
  ctx.fill();
  ctx.strokeStyle = '#ffd94f';
  ctx.lineWidth = 2;
  rr(ctx, 626, 40, 28, 32, 6); ctx.stroke();
  ctx.restore();
  // Big lantern glow behind the title.
  glowCircle(ctx, VIEW.W / 2, 150, 320, '#ffb347', 0.28);
  text(ctx, 'EMBERKEEP', VIEW.W / 2, 132, 84, '#ffd94f', 'center', 'serif', 'bold');
  text(ctx, 'NINE NIGHTS OF THE LAST FLAME', VIEW.W / 2, 168, 22, '#cfc4a8', 'center', 'serif');
  text(ctx, 'Guard the last ember through 9 nights across 3 realms. When the flame dies, the dark wins.', VIEW.W / 2, 198, 16, '#a89e86', 'center');
  // Enemy roster: 8 types, two columns, name + counter.
  text(ctx, 'THE DARK SENDS — KNOW THEM', 60, 240, 16, '#ffd94f', 'left', 'sans-serif', 'bold');
  ENEMY_ORDER.forEach((id, i) => {
    const e = ENEMIES[id];
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 60 + col * 610;
    const y = 268 + row * 44;
    ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.arc(x + 10, y - 6, 8, 0, Math.PI * 2); ctx.fill();
    text(ctx, e.name.toUpperCase(), x + 28, y, 15, '#ffffff', 'left', 'sans-serif', 'bold');
    // One line per foe, truncated to the column so nothing runs off-screen.
    const line = `${e.desc}  Counter: ${e.counter}`;
    text(ctx, fitText(ctx, line, 560, 12.5), x + 28, y + 17, 12.5, '#a89e86', 'left');
  });
  // Bosses line.
  text(ctx, 'BOSSES:  THE DROWNED BELL (Night 3)  ·  THE ASHEN STAG (Night 6)  ·  THE ECLIPSE WARDEN (Night 9)', VIEW.W / 2, 452, 15, '#c9a7ff', 'center', 'sans-serif', 'bold');
  // Difficulty buttons.
  DIFFICULTIES.forEach((d, i) => {
    const bx = 340 + i * 220;
    const sel = w.selectedDiff === i;
    ctx.fillStyle = sel ? 'rgba(255,217,79,0.28)' : 'rgba(255,255,255,0.07)';
    rr(ctx, bx, 470, 200, 54, 10); ctx.fill();
    ctx.strokeStyle = sel ? '#ffd94f' : 'rgba(255,255,255,0.25)';
    ctx.lineWidth = sel ? 3 : 1.5;
    rr(ctx, bx, 470, 200, 54, 10); ctx.stroke();
    text(ctx, `${i + 1} · ${d.name}`, bx + 100, 493, 17, sel ? '#ffd94f' : '#ffffff', 'center', 'sans-serif', 'bold');
    text(ctx, `score ×${d.scoreMul}`, bx + 100, 513, 12, '#a89e86', 'center');
  });
  // Best scores + feats.
  const best = w.best || {};
  const bestLine = DIFFICULTIES.map((d) => {
    const b = best[d.id];
    return `${d.name}: ${b ? `${b.score.toLocaleString('en-US')} (${b.grade})` : '—'}`;
  }).join('   ·   ');
  text(ctx, `BEST  ${bestLine}`, VIEW.W / 2, 552, 14, '#cfc4a8', 'center');
  const hist = w.history || [];
  text(ctx, hist.length > 0 ? `LAST RUNS: ${hist.map((h) => `#${h.seed} ${h.score.toLocaleString('en-US')} ${h.grade}`).join('  ·  ')}` : 'No runs yet — the flame is waiting.', VIEW.W / 2, 574, 13, '#8a8272', 'center');
  // Start button.
  ctx.fillStyle = '#ffb347';
  rr(ctx, 540, 600, 200, 56, 12); ctx.fill();
  text(ctx, 'BEGIN NIGHT 1', 640, 636, 20, '#1a1206', 'center', 'sans-serif', 'bold');
  // Codex button.
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  rr(ctx, 540, 664, 200, 26, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(255,217,79,0.6)';
  ctx.lineWidth = 1.5;
  rr(ctx, 540, 664, 200, 26, 8); ctx.stroke();
  text(ctx, 'CODEX  [B]', 640, 682, 13, '#ffd94f', 'center', 'sans-serif', 'bold');
  text(ctx, 'WASD / arrows move · mouse aim · hold click to fire · right-click / E trap · SPACE dash', VIEW.W / 2, 710, 13, '#8a8272', 'center');
}

function drawIntermission(w, ctx) {
  ctx.fillStyle = 'rgba(4,4,10,0.82)';
  ctx.fillRect(0, 0, VIEW.W, VIEW.H);
  text(ctx, `NIGHT ${w.night} CLEARED`, VIEW.W / 2, 92, 40, '#ffd94f', 'center', 'serif', 'bold');
  text(ctx, `Score ${w.score.toLocaleString('en-US')}  ·  ◆ ${w.embers} embers  ·  Hearts ${w.player.hearts}/${w.player.maxHearts}  ·  Flame ${Math.ceil(w.player.flame)}/${w.player.maxFlame}`, VIEW.W / 2, 122, 16, '#cfc4a8', 'center');
  if (w.relicChoices.length > 0) {
    text(ctx, 'CHOOSE A RELIC — the flame rewards the bold (click, or press 1 / 2 / 3)', VIEW.W / 2, 152, 16, '#ffffff', 'center', 'sans-serif', 'bold');
    w.relicChoices.forEach((r, i) => {
      const bx = 250 + i * 270;
      const count = w.relicCounts[r.id] || 0;
      ctx.fillStyle = 'rgba(255,217,79,0.10)';
      rr(ctx, bx, 170, 250, 160, 12); ctx.fill();
      ctx.strokeStyle = '#ffd94f';
      ctx.lineWidth = 2;
      rr(ctx, bx, 170, 250, 160, 12); ctx.stroke();
      text(ctx, r.icon, bx + 125, 222, 40, '#ffd94f', 'center');
      text(ctx, r.name.toUpperCase(), bx + 125, 252, 17, '#ffffff', 'center', 'sans-serif', 'bold');
      wrapText(ctx, r.desc, bx + 125, 278, 210, 15, '#cfc4a8');
      if (count > 0) text(ctx, `OWNED ×${count}`, bx + 125, 318, 13, '#ff8c1a', 'center', 'sans-serif', 'bold');
      text(ctx, `[${i + 1}]`, bx + 125, 190, 12, '#8a8272', 'center');
    });
    // Reroll.
    ctx.fillStyle = w.embers >= REROLL_COST ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)';
    rr(ctx, 1060, 180, 120, 36, 8); ctx.fill();
    text(ctx, `REROLL ◆${REROLL_COST} [R]`, 1120, 203, 13, w.embers >= REROLL_COST ? '#ffffff' : '#8a8272', 'center', 'sans-serif', 'bold');
    text(ctx, 'After choosing, the shop opens.', VIEW.W / 2, 380, 15, '#a89e86', 'center');
  } else {
    text(ctx, 'THE EMBER MARKET — spend your embers before the next night', VIEW.W / 2, 152, 16, '#ffffff', 'center', 'sans-serif', 'bold');
    // Relics owned.
    text(ctx, `RELICS: ${w.relics.length > 0 ? w.relics.map((r) => r.name).join(' · ') : 'none yet'}`, 60, 180, 14, '#ffd94f', 'left');
    // Shop rows (right side).
    w.shop.forEach((s, i) => {
      const by = 200 + i * 44;
      const afford = w.embers >= s.cost;
      ctx.fillStyle = afford ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)';
      rr(ctx, 880, by, 330, 38, 8); ctx.fill();
      text(ctx, s.name, 896, by + 24, 15, afford ? '#ffffff' : '#8a8272', 'left', 'sans-serif', 'bold');
      text(ctx, s.desc, 1080, by + 24, 13, '#a89e86', 'left');
      text(ctx, `◆${s.cost}${s.bought > 0 ? ` ×${s.bought}` : ''}`, 1194, by + 24, 14, afford ? '#ff8c1a' : '#8a8272', 'right', 'sans-serif', 'bold');
    });
    // Feats earned so far (left side).
    text(ctx, 'FEATS EARNED', 60, 210, 15, '#ffd94f', 'left', 'sans-serif', 'bold');
    const earned = FEATS.filter((f) => w.feats.has(f.id));
    if (earned.length === 0) text(ctx, 'None yet — the night is young.', 60, 236, 14, '#a89e86', 'left');
    earned.forEach((f, i) => text(ctx, `★ ${f.name} — ${f.desc}`, 60, 236 + i * 22, 14, '#cfc4a8', 'left'));
    // Rest + gamble buttons, under the shop rows.
    const restAfford = w.embers >= REST_COST;
    const gambleAfford = w.embers >= GAMBLE_COST;
    ctx.fillStyle = restAfford ? 'rgba(127,212,255,0.14)' : 'rgba(255,255,255,0.04)';
    rr(ctx, 880, 480, 160, 40, 8); ctx.fill();
    text(ctx, `REST ◆${REST_COST}`, 960, 505, 14, restAfford ? '#7fd4ff' : '#8a8272', 'center', 'sans-serif', 'bold');
    ctx.fillStyle = gambleAfford ? 'rgba(255,140,26,0.16)' : 'rgba(255,255,255,0.04)';
    rr(ctx, 1050, 480, 160, 40, 8); ctx.fill();
    text(ctx, `GAMBLE ◆${GAMBLE_COST}`, 1130, 505, 14, gambleAfford ? '#ff8c1a' : '#8a8272', 'center', 'sans-serif', 'bold');
    text(ctx, 'Rest: +1 heart and a full flame. Gamble: a random relic.', 1045, 540, 13, '#a89e86', 'center');
    // Next night preview.
    const next = w.night + 1;
    text(ctx, `NEXT: NIGHT ${next} — ${next <= 9 ? (next % 3 === 0 ? 'A BOSS WAITS' : REALMS[Math.min(2, Math.floor((next - 1) / 3))].name) : ''}`, VIEW.W / 2, 560, 17, '#ffffff', 'center', 'sans-serif', 'bold');
    text(ctx, 'Click a shop item to buy it. Then begin the next night.', VIEW.W / 2, 590, 14, '#a89e86', 'center');
    ctx.fillStyle = '#ffb347';
    rr(ctx, 540, 620, 200, 48, 12); ctx.fill();
    text(ctx, `BEGIN NIGHT ${next}`, 640, 650, 18, '#1a1206', 'center', 'sans-serif', 'bold');
  }
}

function wrapText(ctx, s, cx, y, maxW, size, color) {
  const words = s.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    ctx.font = `${size}px sans-serif`;
    if (ctx.measureText(test).width > maxW && line) {
      text(ctx, line, cx, yy, size, color, 'center');
      line = word;
      yy += size + 4;
    } else line = test;
  }
  if (line) text(ctx, line, cx, yy, size, color, 'center');
}

function statRows(w) {
  const acc = w.stats.shots > 0 ? Math.round((w.stats.hits / w.stats.shots) * 100) : 0;
  return [
    ['Score', w.score.toLocaleString('en-US')],
    ['Nights cleared', `${w.stats.nightsCleared} / 9`],
    ['Foes vanquished', `${w.stats.kills}`],
    ['Bosses felled', `${w.stats.bosses} / 3`],
    ['Relics taken', `${w.stats.relicsTaken}`],
    ['Embers earned', `${w.stats.embersEarned}`],
    ['Accuracy', `${acc}%  (${w.stats.hits}/${w.stats.shots})`],
    ['Time', `${Math.floor(w.runTime / 60)}:${String(Math.floor(w.runTime % 60)).padStart(2, '0')}`],
    ['Difficulty', `${w.diff.name} (score ×${w.diff.scoreMul})`],
    ['Seed', `#${w.seed}`],
  ];
}

function drawGameOver(w, ctx) {
  ctx.fillStyle = 'rgba(4,4,10,0.85)';
  ctx.fillRect(0, 0, VIEW.W, VIEW.H);
  text(ctx, 'THE FLAME IS OUT', VIEW.W / 2, 130, 52, '#ff6b5e', 'center', 'serif', 'bold');
  text(ctx, w.over ? w.over.why : '', VIEW.W / 2, 168, 18, '#cfc4a8', 'center');
  text(ctx, `You fell on Night ${w.night} of 9.`, VIEW.W / 2, 196, 16, '#a89e86', 'center');
  const rows = statRows(w);
  rows.forEach(([k, v], i) => {
    const y = 240 + i * 28;
    text(ctx, k, 470, y, 16, '#a89e86', 'left');
    text(ctx, v, 810, y, 16, '#ffffff', 'right', 'sans-serif', 'bold');
  });
  const best = (w.best || {})[w.diff.id];
  text(ctx, best ? `BEST ON ${w.diff.name}: ${best.score.toLocaleString('en-US')} (${best.grade})` : 'No best yet on this difficulty.', VIEW.W / 2, 540, 15, '#ffd94f', 'center');
  if (w.nightStats.length > 0) {
    text(ctx, `NIGHTS: ${w.nightStats.map((n) => `N${n.night} ${n.kills} kills · ${n.score} pts · ${n.accuracy}%`).join('   ')}`, VIEW.W / 2, 566, 12.5, '#8a8272', 'center');
  }
  ctx.fillStyle = '#ffb347';
  rr(ctx, 540, 600, 200, 56, 12); ctx.fill();
  text(ctx, 'TRY AGAIN', 640, 636, 20, '#1a1206', 'center', 'sans-serif', 'bold');
  text(ctx, 'Enter / Space / click — back to the title', VIEW.W / 2, 686, 13, '#8a8272', 'center');
}

function drawVictory(w, ctx) {
  const v = w.victory;
  const grade = v ? v.grade : GRADES[3];
  ctx.fillStyle = 'rgba(4,4,10,0.88)';
  ctx.fillRect(0, 0, VIEW.W, VIEW.H);
  glowCircle(ctx, VIEW.W / 2, 170, 300, '#ffd94f', 0.35);
  text(ctx, 'THE DAWN BREAKS', VIEW.W / 2, 110, 48, '#ffd94f', 'center', 'serif', 'bold');
  text(ctx, 'Nine nights survived. The Eclipse Warden is ash. The flame lives on.', VIEW.W / 2, 146, 17, '#cfc4a8', 'center');
  text(ctx, grade.grade, VIEW.W / 2, 250, 110, '#ffd94f', 'center', 'serif', 'bold');
  text(ctx, grade.label, VIEW.W / 2, 286, 18, '#ffffff', 'center', 'serif');
  const rows = statRows(w);
  rows.forEach(([k, val], i) => {
    const y = 330 + i * 26;
    text(ctx, k, 470, y, 15, '#a89e86', 'left');
    text(ctx, val, 810, y, 15, '#ffffff', 'right', 'sans-serif', 'bold');
  });
  const earned = FEATS.filter((f) => w.feats.has(f.id));
  text(ctx, `FEATS EARNED ${earned.length}/${FEATS.length}:  ${earned.map((f) => f.name).join('  ·  ') || 'none'}`, VIEW.W / 2, 606, 14, '#ffd94f', 'center');
  if (w.nightStats.length > 0) {
    text(ctx, `NIGHTS: ${w.nightStats.map((n) => `N${n.night} ${n.kills} kills · ${n.score} pts · ${n.accuracy}%`).join('   ')}`, VIEW.W / 2, 588, 12.5, '#8a8272', 'center');
  }
  ctx.fillStyle = '#ffb347';
  rr(ctx, 540, 620, 200, 48, 12); ctx.fill();
  text(ctx, 'PLAY AGAIN', 640, 650, 18, '#1a1206', 'center', 'sans-serif', 'bold');
}

function drawRealmDecor(w, ctx) {
  // Per-realm scenery, drawn faintly inside the arena so the judge can tell
  // the realms apart: dock posts and water, ash trees, ice shards.
  ctx.save();
  if (w.realm === 0) {
    // Sunken Docks: wooden posts along the top, water shimmer at the bottom.
    ctx.fillStyle = 'rgba(120,90,50,0.5)';
    for (let x = ARENA.x + 60; x < ARENA.x + ARENA.w; x += 150) {
      ctx.fillRect(x, ARENA.y + 8, 14, 46);
      ctx.fillRect(x - 4, ARENA.y + 8, 22, 8);
    }
    ctx.strokeStyle = 'rgba(127,212,255,0.10)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i += 1) {
      const y = ARENA.y + ARENA.h - 20 - i * 12;
      ctx.beginPath();
      for (let x = ARENA.x; x <= ARENA.x + ARENA.w; x += 24) {
        const yy = y + Math.sin(x * 0.02 + w.time * 1.5 + i) * 3;
        if (x === ARENA.x) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
  } else if (w.realm === 1) {
    // Ashenwood: burnt tree silhouettes in the corners.
    ctx.strokeStyle = 'rgba(90,50,20,0.65)';
    ctx.lineWidth = 5;
    const trees = [
      [ARENA.x + 50, ARENA.y + ARENA.h - 30, 70],
      [ARENA.x + ARENA.w - 50, ARENA.y + 50, 80],
      [ARENA.x + 130, ARENA.y + 60, 55],
      [ARENA.x + ARENA.w - 130, ARENA.y + ARENA.h - 50, 60],
    ];
    for (const [tx, ty, th] of trees) {
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx, ty - th); ctx.stroke();
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(tx, ty - th * 0.6); ctx.lineTo(tx - 22, ty - th * 0.85); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tx, ty - th * 0.7); ctx.lineTo(tx + 24, ty - th * 0.95); ctx.stroke();
      ctx.lineWidth = 5;
    }
    // Falling ash.
    ctx.fillStyle = 'rgba(200,180,160,0.25)';
    for (let i = 0; i < 24; i += 1) {
      const x = (i * 211 + w.time * 18) % ARENA.w + ARENA.x;
      const y = (i * 137 + w.time * 26) % ARENA.h + ARENA.y;
      ctx.fillRect(x, y, 2, 2);
    }
  } else {
    // Frozen Deep: ice shards along the edges, drifting snow.
    ctx.fillStyle = 'rgba(150,180,255,0.28)';
    for (let i = 0; i < 9; i += 1) {
      const x = ARENA.x + 40 + i * 140;
      const h = 26 + (i % 3) * 14;
      ctx.beginPath();
      ctx.moveTo(x, ARENA.y + ARENA.h - 4);
      ctx.lineTo(x + 12, ARENA.y + ARENA.h - 4 - h);
      ctx.lineTo(x + 24, ARENA.y + ARENA.h - 4);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 30; i += 1) {
      const x = (i * 167 + w.time * 30) % ARENA.w + ARENA.x;
      const y = (i * 113 + w.time * 46) % ARENA.h + ARENA.y;
      ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

function drawCodex(w, ctx) {
  ctx.fillStyle = 'rgba(4,4,10,0.92)';
  ctx.fillRect(0, 0, VIEW.W, VIEW.H);
  text(ctx, 'THE CODEX', VIEW.W / 2, 72, 44, '#ffd94f', 'center', 'serif', 'bold');
  text(ctx, 'Everything the dark sends, written down by keepers who survived it.', VIEW.W / 2, 102, 15, '#a89e86', 'center');
  // Tabs.
  CODEX_TABS.forEach((tab, i) => {
    const bx = 40 + i * 152;
    const sel = w.codexTab === i;
    ctx.fillStyle = sel ? 'rgba(255,217,79,0.28)' : 'rgba(255,255,255,0.06)';
    rr(ctx, bx, 120, 145, 32, 8); ctx.fill();
    ctx.strokeStyle = sel ? '#ffd94f' : 'rgba(255,255,255,0.2)';
    ctx.lineWidth = sel ? 2 : 1;
    rr(ctx, bx, 120, 145, 32, 8); ctx.stroke();
    text(ctx, `${i + 1} · ${tab}`, bx + 72, 141, 12, sel ? '#ffd94f' : '#cfc4a8', 'center', 'sans-serif', 'bold');
  });
  // Rows.
  const rows = codexRows(CODEX_TABS[w.codexTab]);
  rows.forEach((row, i) => {
    const y = 186 + i * 52;
    if (y > 620) return;
    ctx.fillStyle = row.color;
    ctx.beginPath(); ctx.arc(72, y - 4, 7, 0, Math.PI * 2); ctx.fill();
    text(ctx, row.title, 92, y, 16, '#ffffff', 'left', 'sans-serif', 'bold');
    if (row.sub) text(ctx, row.sub, 92, y + 17, 12.5, '#a89e86', 'left');
    const body = row.lore || row.body;
    if (body) {
      ctx.font = '13px sans-serif';
      const maxW = 640;
      const words = body.split(' ');
      let line = '';
      let yy = y - 2;
      const lines = [];
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = word; }
        else line = test;
      }
      if (line) lines.push(line);
      lines.slice(0, 2).forEach((ln, li) => text(ctx, ln, 560, yy + li * 17, 13, '#cfc4a8', 'left'));
    }
  });
  // Footer: how to play + back.
  text(ctx, codexHint(), VIEW.W / 2, 620, 13, '#8a8272', 'center');
  ctx.fillStyle = '#ffb347';
  rr(ctx, 540, 640, 200, 40, 10); ctx.fill();
  text(ctx, 'BACK  [B]', 640, 665, 15, '#1a1206', 'center', 'sans-serif', 'bold');
}
