# EMBERKEEP — Nine Nights of the Last Flame

[![make.fun](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![Rank](https://make.fun/badge/xclayy/lumen-tide/rank.svg)](https://make.fun/bounty/best-game-01)
[![Reward](https://make.fun/badge/xclayy/lumen-tide/reward.svg)](https://make.fun/bounty/best-game-01)

A 2D canvas arena-defence game for the [make.fun "Make the best game" bounty](https://make.fun/bounty/best-game-01).

## The game

The world went dark nine nights ago, when the sun forgot to rise. One flame remained: the ember in the Keeper's lantern. Guard it through **nine nights across three realms** — the Sunken Docks, the Ashenwood and the Frozen Deep — and defeat the final boss, the Eclipse Warden, to bring back the dawn.

- **Campaign:** 9 nights, 3 realms, a clear win condition. Lose when the flame reaches 0 or your hearts run out.
- **8 enemy types**, each with its own behaviour and counter — listed in the in-game Codex (press B), plus golden ember-touched elites worth triple.
- **3 named bosses** with their own mechanics and dialogue: The Drowned Bell (night 3), The Ashen Stag (night 6), The Eclipse Warden (night 9). Bosses enrage after 75 seconds.
- **Progression between nights:** choose 1 of 3 relics (16 in all, duplicates stack), trade embers at the Ember Market (6-item shop, rest, gamble, reroll), and carry your build forward.
- **3 difficulties:** Kindled, Burning, Inferno — with score multipliers up to ×1.5.
- **Meta-progression:** 14 feats, best scores per difficulty, run history, a run seed, and a rich end-of-run screen with stats and an S/A/B/C grade.
- **Combat:** aim with the mouse, hold left click to fire, right click (or E) drops a light-trap, SPACE dashes, F fires a piercing lance. Kills within 3 seconds build a combo multiplier up to ×2.
- **Feel:** screen shake, hit-stop, particles, floating damage text, boss banners, per-realm decor, generative ambient music (WebAudio synth, no files), and a lantern-lit darkness that follows the Keeper.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move |
| Mouse | Aim |
| Hold left click | Fire bolts |
| Right click / E | Drop a light-trap |
| SPACE | Dash (brief invulnerability) |
| F | Piercing lance (3s cooldown) |
| 1 / 2 / 3 | Choose a relic, or a codex tab |
| R | Reroll relics (25 embers) |
| P | Pause · M mute · B codex |
| Enter / Space | Start / continue |

## Play it

Fully offline in desktop Chrome from static files — no network, no build step:

```sh
node serve.ts   # then open http://localhost:8080
```

or open `game/index.html` directly. The entry is handed in by `main.ts` (Node 22):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Files

- `game/index.html` — the page; `game/src/` — the game, split by job: `config.js` (balance, relics, shop, feats), `world.js` (state machine, spawning, combat, bosses), `render.js` (all drawing), `input.js`, `audio.js` (synth SFX + generative music), `effects.js`, `bestiary.js` (codex content), `shots.js` (staged screenshot scenes), `random.js`, `main.js` (loop).
- `screenshots/` — 4 real renders of the game (title, night play, boss fight, victory).
- `main.ts` — build script; `vendor/makefun-game.ts` — the kit's dossier library, unmodified.
- `shots.json` — the screenshot scene list used to take them.

## License

MIT — see [LICENSE](LICENSE).
