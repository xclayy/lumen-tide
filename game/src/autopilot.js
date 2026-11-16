// A simple pilot that plays the real game for the screenshot scenes:
// it keeps its distance from the nearest shadow, chases the nearest
// light orb, aims at the closest enemy and dashes out of trouble.
import { FIELD, PLAYER } from './config.js';

function nearest(list, x, y) {
  let best = null;
  let bestD = Infinity;
  for (const item of list) {
    const dx = item.x - x;
    const dy = item.y - y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = item;
    }
  }
  return best;
}

export function autopilot(state, skill) {
  const player = state.player;
  const enemy = nearest(state.enemies, player.x, player.y);
  const orb = nearest(state.pickups, player.x, player.y);
  let tx = FIELD.width / 2;
  let ty = FIELD.height / 2;
  let dash = false;

  if (enemy) {
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const danger = enemy.radius + PLAYER.radius + (skill === 'bold' ? 26 : 90);
    if (d < danger) {
      // Too close: run away from it, dash if it is right on top of us.
      tx = player.x - (dx / d) * 300;
      ty = player.y - (dy / d) * 300;
      if (d < danger * 0.55) dash = true;
    } else if (orb && skill !== 'bold') {
      tx = orb.x;
      ty = orb.y;
    } else {
      // Hold a firing lane: drift toward the middle of the tide.
      tx = player.x + (FIELD.width / 2 - player.x) * 0.2;
      ty = player.y + (FIELD.height / 2 - player.y) * 0.2;
    }
  } else if (orb) {
    tx = orb.x;
    ty = orb.y;
  }

  const mx = tx - player.x;
  const my = ty - player.y;
  const len = Math.sqrt(mx * mx + my * my) || 1;
  const move = { x: mx / len, y: my / len };
  if (Math.abs(mx) < 6 && Math.abs(my) < 6) {
    move.x = 0;
    move.y = 0;
  }
  const aim = enemy ? { x: enemy.x, y: enemy.y } : { x: player.x, y: player.y - 100 };
  return { move, aim, firing: Boolean(enemy), dash };
}
