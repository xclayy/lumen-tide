// Keyboard and mouse, read once a frame. Movement is WASD or arrows;
// the mouse aims; holding the button fires; Space dashes; P pauses;
// M mutes; R restarts from the results screen.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_DASH = 4;
export const ACTION_RESTART = 8;
export const ACTION_MUTE = 16;

const KEYMAP = {
  Space: ACTION_CONFIRM,
  Enter: ACTION_CONFIRM,
  KeyP: ACTION_PAUSE,
  Escape: ACTION_PAUSE,
  ShiftLeft: ACTION_DASH,
  ShiftRight: ACTION_DASH,
  KeyR: ACTION_RESTART,
  KeyM: ACTION_MUTE,
};

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouseX = 0;
  let mouseY = 0;
  let firing = false;

  function toCanvas(event) {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  }

  function onKeyDown(event) {
    if (event.repeat) return;
    keys.add(event.code);
    const action = KEYMAP[event.code];
    if (action) {
      actions |= action;
      if (event.code === 'Space') event.preventDefault();
    }
  }

  function onKeyUp(event) {
    keys.delete(event.code);
  }

  function onMouseMove(event) {
    toCanvas(event);
  }

  function onMouseDown(event) {
    if (event.button !== 0) return;
    toCanvas(event);
    firing = true;
    actions |= ACTION_CONFIRM;
  }

  function onMouseUp(event) {
    if (event.button === 0) firing = false;
  }

  function onBlur() {
    keys.clear();
    firing = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);

  return {
    /** Normalised move vector from WASD / arrows. */
    direction() {
      let x = 0;
      let y = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) {
        const inv = 1 / Math.SQRT2;
        x *= inv;
        y *= inv;
      }
      return { x, y };
    },
    /** Aim in canvas pixels, corrected for the canvas scale. */
    aim() {
      const scale = canvas.width / canvas.clientWidth || 1;
      return { x: mouseX * scale, y: mouseY * scale };
    },
    holdFire() {
      return firing;
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
