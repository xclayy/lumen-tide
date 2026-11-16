// The screenshot scenes behind ?shot=title|play|boss|over. Each one
// plays the real rules forward from a fresh world for a fixed number of
// steps, steered by the autopilot, so the frame is what a real game
// looks like and the same seed always gives the same frame.
import { EVENT_OVER, EVENT_WAVE } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { autopilot } from './autopilot.js';
import { STEP } from './config.js';

const TITLE_SECONDS = 6;
const OVER_LIMIT_SECONDS = 600;

/** Run the world forward with the pilot until `stop` says so. */
function playForward(world, seconds, pilot, stop) {
  const steps = Math.floor(seconds / STEP);
  for (let index = 0; index < steps; index += 1) {
    const state = world.state;
    const orders = pilot(state);
    const events = world.step(STEP, orders.move, orders.aim, orders.firing, orders.dash, false);
    if (stop && stop(events, state)) return events;
    if (events & EVENT_OVER) return events;
  }
  return 0;
}

export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'boss' && name !== 'over') {
    // Title: let the backdrop tide drift for a few seconds.
    for (let index = 0; index < TITLE_SECONDS / STEP; index += 1) {
      world.step(STEP, { x: 0, y: 0 }, { x: 640, y: 200 }, false, false, true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }

  if (name === 'boss') {
    // Sail through waves 1-4 with a bold pilot, stopping the instant
    // wave 5 opens, before the dread has spawned. Then close in
    // WITHOUT firing, so the dread stays healthy and drifts on screen
    // with its escorts; a final short burst puts bullets in flight
    // toward it without burning it down.
    playForward(world, 120, (state) => autopilot(state, 'bold'), (events, state) => state.wave >= 5 && state.waveActive);
    playForward(world, 6, (state) => {
      const orders = autopilot(state, 'bold');
      orders.firing = false;
      return orders;
    }, (events, state) => {
      const dread = state.enemies.find((e) => e.kind === 'dread');
      return Boolean(dread && dread.x > 80 && dread.x < 1200 && dread.y > 80 && dread.y < 640 && state.enemies.length >= 3);
    });
    playForward(world, 0.7, (state) => autopilot(state, 'bold'));
    return { screen: SCREEN_PLAY, best: world.state.score };
  }

  if (name === 'over') {
    // A hurried pilot that never dashes: it is caught out once the
    // tide quickens, as a new player is. If it somehow survives, the
    // last phase sails straight into the nearest shadow, so the scene
    // always ends in a genuine game over.
    playForward(world, OVER_LIMIT_SECONDS, (state) => {
      const orders = autopilot(state, 'bold');
      orders.dash = false;
      return orders;
    });
    if (world.state.player.hearts > 0) {
      playForward(world, 120, (state) => {
        let target = null;
        let bestD = Infinity;
        for (const enemy of state.enemies) {
          const dx = enemy.x - state.player.x;
          const dy = enemy.y - state.player.y;
          const d = dx * dx + dy * dy;
          if (d < bestD) {
            bestD = d;
            target = enemy;
          }
        }
        if (!target) return { move: { x: 0, y: 0 }, aim: { x: 640, y: 200 }, firing: false, dash: false };
        const dx = target.x - state.player.x;
        const dy = target.y - state.player.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        return { move: { x: dx / len, y: dy / len }, aim: { x: target.x, y: target.y }, firing: false, dash: false };
      });
    }
    return { screen: SCREEN_OVER, best: world.state.score };
  }

  // Play: a careful pilot through the opening waves, frozen the moment
  // a wave is properly under way — enemies on screen, bullets flying.
  playForward(world, 40, (state) => autopilot(state, 'careful'), (events, state) => state.waveActive && state.enemies.length >= 5 && state.bullets.length >= 2);
  return { screen: SCREEN_PLAY, best: world.state.score };
}
