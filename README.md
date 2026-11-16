# Lumen Tide

A lantern-skiff arena shooter for make.fun's **best-game-01** bounty
($1,000 USDC, deadline Thu 19 Nov 2026 01:00 WIB).

Keep the lantern lit. Burn the shadows back. Survive the tide.

## How to play

- **WASD / arrows** — sail the skiff
- **Mouse** — aim; hold the left button to fire light bolts
- **SPACE** — dash (brief invulnerability, 1.6 s cooldown)
- **P** — pause · **M** — mute · **R** — restart from the results screen

## The game

You are a lantern skiff on a dark tide. Shadows rise in waves: wisps
drift at you, shades zigzag, glooms split in two when they burst, and
every fifth wave a dread surfaces and fires radial bursts. Kills inside
your lamp's light pay +50%; chaining kills builds a combo up to x5.
Fallen shadows drop light orbs and power-ups: rapid fire, spread shot,
shield, and the occasional heart.

Waves grow in number, mix and speed. Clear a wave for a bonus, then
the next one comes. Three hearts; when the last one goes out, the tide
takes the light and the results screen shows your score, best voyage,
wave reached, shadows sunk, accuracy and time at sea.

Sound is synthesized live with WebAudio — no audio files, no network.
The whole game is static files under `game/` and runs offline in
desktop Chrome.

## Run it

```sh
node serve.ts            # serves game/ on http://localhost:8080
```

Screenshots are staged deterministically: `?shot=title|play|boss|over`
with `&seed=N` plays the real rules forward with an autopilot and
paints the scene (`window.__shotReady` signals the frame). See
`shots.json` and `research/shoot.mjs`.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to `/output` and writes
`/output/dossier.json` with the kit's `buildDossier`. Two runs write
identical bytes.

## Files

- `game/index.html` — the page: one canvas, one status line
- `game/src/config.js` — every tuning number, in one place
- `game/src/random.js` — seeded generator (mulberry32)
- `game/src/audio.js` — synthesized WebAudio sound effects
- `game/src/input.js` — keyboard + mouse
- `game/src/world.js` — the tide: player, enemies, bullets, pickups,
  waves, combo, collisions
- `game/src/render.js` — everything the eye sees: tide, lantern,
  shadows, particles, HUD, screens
- `game/src/autopilot.js` — the pilot that plays for the screenshots
- `game/src/shots.js` — the four staged scenes
- `game/src/main.js` — boot, the fixed-step loop, screens
- `main.ts` — the hand-in program
- `serve.ts` — local static server (development only)
- `research/shoot.mjs` — headless-Chrome screenshots + live smoke test
- `research/validate_gate.mjs` — local gate check (5 rows)

## License

MIT — see `LICENSE`.
