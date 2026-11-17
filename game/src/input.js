// Keyboard + mouse input, with edge-triggered presses (pressed() is true for
// exactly one frame) and a click queue the menus consume.
export function createInput(canvas) {
  const keys = new Set();
  const pressedKeys = new Set();
  const mouse = { x: 0, y: 0, down: false, pressed: false, rightPressed: false };
  const clicks = [];

  function keyOf(e) {
    return e.code;
  }

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (!keys.has(e.code)) pressedKeys.add(e.code);
    keys.add(e.code);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => { keys.clear(); mouse.down = false; });

  function track(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
  }
  canvas.addEventListener('mousemove', track);
  canvas.addEventListener('mousedown', (e) => {
    track(e);
    if (e.button === 0) { mouse.down = true; mouse.pressed = true; clicks.push({ x: mouse.x, y: mouse.y, button: 0 }); }
    if (e.button === 2) { mouse.rightPressed = true; clicks.push({ x: mouse.x, y: mouse.y, button: 2 }); }
  });
  window.addEventListener('mouseup', (e) => { if (e.button === 0) mouse.down = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  return {
    mouse,
    isDown(code) { return keys.has(code); },
    pressed(code) { return pressedKeys.has(code); },
    axis() {
      let x = 0; let y = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
      return { x, y };
    },
    takeClicks() { const c = clicks.splice(0); return c; },
    endFrame() { pressedKeys.clear(); mouse.pressed = false; mouse.rightPressed = false; },
  };
}
