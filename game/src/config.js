// EMBERKEEP — Nine Nights of the Last Flame. Configuration: every number the
// game balances on lives here, so tuning never touches the simulation.
// A 2D canvas arena defence game: the Keeper guards the last ember-flame
// through 9 nights across 3 realms, then faces the Eclipse Warden.

export const VIEW = { W: 1280, H: 720 };
export const ARENA = { x: 24, y: 84, w: 1232, h: 612 };

// ---------------------------------------------------------------------------
// Difficulties: three named levels, each with a score multiplier.
// ---------------------------------------------------------------------------
export const DIFFICULTIES = [
  {
    id: 'kindled',
    name: 'KINDLED',
    blurb: 'A gentle first burn. Foes are weaker, the flame drains slowly.',
    hpMul: 0.8, speedMul: 0.9, flameDrain: 0.55, spawnMul: 0.85,
    scoreMul: 1.0, emberMul: 1.0,
  },
  {
    id: 'burning',
    name: 'BURNING',
    blurb: 'The intended burn. Steady pressure, fair rewards.',
    hpMul: 1.0, speedMul: 1.0, flameDrain: 0.8, spawnMul: 1.0,
    scoreMul: 1.25, emberMul: 1.0,
  },
  {
    id: 'inferno',
    name: 'INFERNO',
    blurb: 'The flame fights back. Tougher, faster, hungrier — worth more.',
    hpMul: 1.3, speedMul: 1.12, flameDrain: 1.1, spawnMul: 1.2,
    scoreMul: 1.5, emberMul: 1.25,
  },
];

// ---------------------------------------------------------------------------
// Realms and nights: 9 nights, 3 realms, a boss at the end of each realm.
// ---------------------------------------------------------------------------
export const REALMS = [
  { name: 'THE SUNKEN DOCKS', sub: 'Nights 1–3 · the tide brings the drowned', tint: '#1d4e5e', fog: '#0e2a33' },
  { name: 'THE ASHENWOOD', sub: 'Nights 4–6 · the trees burn without fire', tint: '#5e3a1d', fog: '#331d0e' },
  { name: 'THE FROZEN DEEP', sub: 'Nights 7–9 · the dark itself has teeth', tint: '#2b2b5e', fog: '#14142e' },
];

export const NIGHTS = 9;
export const FINAL_NIGHT = 9;

// Night composition: how many of each enemy the spawn queue holds, and the
// pace (seconds between spawns). Boss nights add the boss after the queue.
export const NIGHT_PLANS = [
  { budget: 14, pace: 1.9, mix: { mote: 0.55, crawler: 0.45 } },
  { budget: 20, pace: 1.7, mix: { mote: 0.4, crawler: 0.35, skitter: 0.25 } },
  { budget: 24, pace: 1.55, mix: { mote: 0.3, crawler: 0.3, skitter: 0.25, spitter: 0.15 }, boss: 'drownedBell' },
  { budget: 28, pace: 1.45, mix: { mote: 0.25, crawler: 0.25, skitter: 0.2, spitter: 0.15, splitter: 0.15 } },
  { budget: 33, pace: 1.35, mix: { mote: 0.2, crawler: 0.2, skitter: 0.2, spitter: 0.15, splitter: 0.15, wraith: 0.1 } },
  { budget: 38, pace: 1.25, mix: { mote: 0.15, crawler: 0.2, skitter: 0.2, spitter: 0.15, splitter: 0.15, wraith: 0.1, brute: 0.05 }, boss: 'ashenStag' },
  { budget: 42, pace: 1.15, mix: { mote: 0.1, crawler: 0.15, skitter: 0.2, spitter: 0.15, splitter: 0.15, wraith: 0.12, brute: 0.08, siphon: 0.05 } },
  { budget: 48, pace: 1.05, mix: { mote: 0.08, crawler: 0.12, skitter: 0.2, spitter: 0.16, splitter: 0.16, wraith: 0.12, brute: 0.08, siphon: 0.08 } },
  { budget: 52, pace: 0.95, mix: { mote: 0.08, crawler: 0.1, skitter: 0.18, spitter: 0.16, splitter: 0.16, wraith: 0.14, brute: 0.1, siphon: 0.08 }, boss: 'eclipseWarden' },
];

// ---------------------------------------------------------------------------
// Enemies: 8 types. Each has a behaviour, a counter, and a title-screen line.
// ---------------------------------------------------------------------------
export const ENEMIES = {
  mote: {
    name: 'Mote', value: 10, hp: 1, speed: 95, radius: 10, damage: 1,
    color: '#ffb347', glow: '#ff8c1a',
    desc: 'Drifts at the flame, mindless and many.',
    counter: 'One bolt each. Let them come to you.',
    behaviour: 'drift',
  },
  crawler: {
    name: 'Crawler', value: 25, hp: 4, speed: 52, radius: 16, damage: 1,
    color: '#8fd14f', glow: '#5da32e',
    desc: 'Slow, armoured, and patient. It does not hurry. It does not stop.',
    counter: 'Kite it. It cannot catch a Keeper who keeps moving.',
    behaviour: 'chase',
  },
  skitter: {
    name: 'Skitter', value: 35, hp: 2, speed: 175, radius: 11, damage: 1,
    color: '#7fd4ff', glow: '#2fa8e0',
    desc: 'Fast and crooked. It zigzags so your aim must lead it.',
    counter: 'Lead your shots. A trap where it turns ends it.',
    behaviour: 'zigzag',
  },
  spitter: {
    name: 'Spitter', value: 35, hp: 3, speed: 70, radius: 13, damage: 1,
    color: '#e07fd4', glow: '#a83aa0',
    desc: 'Holds its distance and spits burning globes at your light.',
    counter: 'Close the gap — it is helpless up close.',
    behaviour: 'ranged',
  },
  splitter: {
    name: 'Splitter', value: 50, hp: 3, speed: 80, radius: 15, damage: 1,
    color: '#ffd94f', glow: '#d4a017',
    desc: 'One body, two grudges. Kill it and it becomes two Motes.',
    counter: 'Finish the Motes fast, or the swarm doubles.',
    behaviour: 'split',
  },
  wraith: {
    name: 'Wraith', value: 60, hp: 3, speed: 110, radius: 13, damage: 1,
    color: '#b9a7ff', glow: '#7a5fd4',
    desc: 'It fades from the world and back. Bolts pass through its ghost.',
    counter: 'Strike while it is solid. Watch the shimmer.',
    behaviour: 'phase',
  },
  brute: {
    name: 'Brute', value: 90, hp: 14, speed: 46, radius: 24, damage: 2,
    color: '#ff6b5e', glow: '#c22e22',
    desc: 'A wall of gristle. It telegraphs a charge — then the whole arena shakes.',
    counter: 'Dash sideways when it lowers its head.',
    behaviour: 'charge',
  },
  siphon: {
    name: 'Siphon', value: 80, hp: 4, speed: 65, radius: 14, damage: 0,
    color: '#4fd4c2', glow: '#1f8a7d',
    desc: 'It does not bite. It drinks your flame from across the room.',
    counter: 'Kill it first. Its drain is slow but it never stops.',
    behaviour: 'drain',
  },
};

export const ENEMY_ORDER = ['mote', 'crawler', 'skitter', 'spitter', 'splitter', 'wraith', 'brute', 'siphon'];

// ---------------------------------------------------------------------------
// Bosses: named, with phases and their own mechanics.
// ---------------------------------------------------------------------------
export const BOSSES = {
  drownedBell: {
    name: 'THE DROWNED BELL', title: 'Bell of the Sunken Docks', night: 3,
    hp: 220, speed: 42, radius: 42, value: 2000,
    color: '#7fd4c2', glow: '#2fa08a',
    desc: 'Every toll births a swarm. Silence it before the tide rises.',
    attacks: ['radial burst of 10 globes', 'summons 4 Motes per toll', 'slow drift toward the flame'],
    phases: [{ at: 1.0, note: 'The Bell tolls.' }, { at: 0.5, note: 'The Bell tolls faster.' }],
  },
  ashenStag: {
    name: 'THE ASHEN STAG', title: 'King of the Burning Wood', night: 6,
    hp: 340, speed: 60, radius: 46, value: 3000,
    color: '#ff9d4f', glow: '#d46a17',
    desc: 'Its antlers are burning branches. When it lowers its head, run.',
    attacks: ['telegraphed arena-wide charge', 'summons 3 Crawlers', 'ember nova when wounded'],
    phases: [{ at: 1.0, note: 'The Stag paws the ash.' }, { at: 0.66, note: 'The Stag burns brighter.' }, { at: 0.33, note: 'The Stag is furious.' }],
  },
  eclipseWarden: {
    name: 'THE ECLIPSE WARDEN', title: 'The Dark That Wears a Crown', night: 9,
    hp: 520, speed: 55, radius: 52, value: 5000,
    color: '#c9a7ff', glow: '#7a3fd4',
    desc: 'The final night. It drinks light, calls the wraiths, and does not fall easily.',
    attacks: ['twin radial bursts of 14 globes', 'summons 3 Wraiths', 'flame-drain aura', 'charge slam'],
    phases: [
      { at: 1.0, note: 'The Warden wakes.' },
      { at: 0.75, note: 'The Warden calls the wraiths.' },
      { at: 0.5, note: 'The Warden eclipses the flame.' },
      { at: 0.25, note: 'The Warden is dying — and desperate.' },
    ],
  },
};

// ---------------------------------------------------------------------------
// Relics: 12. One of three is offered after each night; duplicates stack.
// ---------------------------------------------------------------------------
export const RELICS = [
  { id: 'twinWick', name: 'Twin Wick', icon: '✦', desc: '+1 ember bolt per shot.', apply: (s) => { s.shots += 1; } },
  { id: 'longFuse', name: 'Long Fuse', icon: '➶', desc: '+25% bolt damage.', apply: (s) => { s.damageMul *= 1.25; } },
  { id: 'rapidWick', name: 'Rapid Wick', icon: '≋', desc: '+20% fire rate.', apply: (s) => { s.fireRateMul *= 1.2; } },
  { id: 'emberHeart', name: 'Ember Heart', icon: '♥', desc: '+1 max heart, and heal 1 heart now.', apply: (s) => { s.maxHearts += 1; s.hearts = Math.min(s.maxHearts, s.hearts + 1); } },
  { id: 'phoenixFeather', name: 'Phoenix Feather', icon: '❖', desc: 'Once per run, revive at half flame when you fall.', apply: (s) => { s.phoenix += 1; } },
  { id: 'magnetCore', name: 'Magnet Core', icon: '◎', desc: '+60% ember pickup radius.', apply: (s) => { s.magnetMul *= 1.6; } },
  { id: 'swiftBoots', name: 'Swift Boots', icon: '»', desc: '+15% move speed.', apply: (s) => { s.speedMul *= 1.15; } },
  { id: 'dashCharm', name: 'Dash Charm', icon: '↯', desc: '+1 dash charge, −25% dash cooldown.', apply: (s) => { s.dashCharges += 1; s.dashCooldownMul *= 0.75; } },
  { id: 'thornLantern', name: 'Thorn Lantern', icon: '✷', desc: 'Foes that touch you take 2 damage.', apply: (s) => { s.thorns += 2; } },
  { id: 'greedCandle', name: 'Greed Candle', icon: '◈', desc: '+25% embers from every kill.', apply: (s) => { s.emberMul *= 1.25; } },
  { id: 'frostWick', name: 'Frost Wick', icon: '❄', desc: 'Bolts slow foes 30% for 1.5s.', apply: (s) => { s.frost = true; } },
  { id: 'blastPowder', name: 'Blast Powder', icon: '✹', desc: 'Kills explode, damaging nearby foes.', apply: (s) => { s.blast = true; } },
  { id: 'emberShield', name: 'Ember Shield', icon: '⛨', desc: 'Gain a shield that blocks one hit per night.', apply: (s) => { s.shield = true; } },
  { id: 'luckyCandle', name: 'Lucky Candle', icon: '☘', desc: 'Bolts have a 15% chance to deal triple damage.', apply: (s) => { s.lucky = true; } },
  { id: 'secondWind', name: 'Second Wind', icon: '↻', desc: 'Your dash refreshes whenever you kill a foe.', apply: (s) => { s.secondWind = true; } },
  { id: 'lanternOil', name: 'Lantern Oil', icon: '◐', desc: 'Your flame drains 20% slower.', apply: (s) => { s.oil = true; } },
];

// ---------------------------------------------------------------------------
// Shop: spent between nights with Embers, the run currency.
// ---------------------------------------------------------------------------
export const SHOP = [
  { id: 'maxFlame', name: 'Wick Oil', desc: '+20 max flame', cost: 40, apply: (s) => { s.maxFlame += 20; s.flame = Math.min(s.maxFlame, s.flame + 20); } },
  { id: 'damage', name: 'Hotter Coals', desc: '+10% bolt damage', cost: 60, apply: (s) => { s.damageMul *= 1.1; } },
  { id: 'fireRate', name: 'Quick Wick', desc: '+10% fire rate', cost: 60, apply: (s) => { s.fireRateMul *= 1.1; } },
  { id: 'trapSlot', name: 'Trap Lattice', desc: '+1 light-trap slot', cost: 50, apply: (s) => { s.trapSlots += 1; } },
  { id: 'heal', name: 'Warm Meal', desc: 'Restore 1 heart', cost: 80, apply: (s) => { s.hearts = Math.min(s.maxHearts, s.hearts + 1); } },
  { id: 'refill', name: 'Full Flask', desc: 'Refill flame to full', cost: 30, apply: (s) => { s.flame = s.maxFlame; } },
];

export const REROLL_COST = 25;

// ---------------------------------------------------------------------------
// Feats: 10 achievements, tracked across the run and shown at the end.
// ---------------------------------------------------------------------------
export const FEATS = [
  { id: 'firstDawn', name: 'First Dawn', desc: 'Survive Night 1.' },
  { id: 'flawless', name: 'Flawless Night', desc: 'Finish a night without taking damage.' },
  { id: 'bossSlayer', name: 'Boss Slayer', desc: 'Defeat any boss.' },
  { id: 'hoarder', name: 'Ember Hoarder', desc: 'Hold 300 embers at once.' },
  { id: 'tripleKill', name: 'Triple Kill', desc: 'Three kills within 2 seconds.' },
  { id: 'fullFlame', name: 'Full Flame', desc: 'Finish a night with a full flame.' },
  { id: 'sharpshooter', name: 'Sharpshooter', desc: 'End a night at 80% accuracy or better.' },
  { id: 'lastStand', name: 'Last Stand', desc: 'Finish a night on your last heart.' },
  { id: 'fullArsenal', name: 'Full Arsenal', desc: 'Own 6 relics at once.' },
  { id: 'speedrun', name: 'Speed of Light', desc: 'Win the campaign in under 20 minutes.' },
  { id: 'eliteHunter', name: 'Elite Hunter', desc: 'Defeat 5 ember-touched elites in one run.' },
  { id: 'lanceMaster', name: 'Lance Master', desc: 'Land 25 lance hits in one run.' },
  { id: 'comboKing', name: 'Combo King', desc: 'Reach a ×2.0 combo.' },
  { id: 'pacifistFlame', name: 'Keeper of the Flame', desc: 'Win a night without firing a single bolt.' },
];

// ---------------------------------------------------------------------------
// Scoring and grades.
// ---------------------------------------------------------------------------
export const GRADES = [
  { min: 22000, grade: 'S', label: 'The flame remembers you.' },
  { min: 15000, grade: 'A', label: 'A bright keeper.' },
  { min: 9000, grade: 'B', label: 'The light held.' },
  { min: 0, grade: 'C', label: 'The dark almost won.' },
];

export const NIGHT_CLEAR_BONUS = 500;
export const BOSS_BONUS = 2000;

// Player base stats.
export const PLAYER = {
  radius: 16, speed: 265, hearts: 3, maxFlame: 100,
  boltSpeed: 540, boltDamage: 1, fireInterval: 0.24,
  dashTime: 0.22, dashSpeed: 720, dashCooldown: 2.4, dashCharges: 1,
  trapSlots: 3, trapDuration: 12, trapRadius: 90, trapDamage: 2,
  magnetRadius: 90, pickupRadius: 26,
};

export const FLAME_PER_KILL = 2;
export const EMBERS_PER_KILL = 4;

// ---------------------------------------------------------------------------
// Night stories: one line of story per night, shown under the night banner.
// ---------------------------------------------------------------------------
export const NIGHT_STORIES = [
  'The tide came in and never left. Something is walking the piers.',
  'The drowned remember the light. They want it back.',
  'The Bell has been ringing since the town sank. Tonight it rings for you.',
  'The wood is ash, but the ash is warm. Something stirs between the trees.',
  'The trees lean toward your flame like flowers toward the sun.',
  'The Stag has smelled your smoke. It is coming to put it out.',
  'The cold down here is not weather. It is a warning.',
  'The dark is thick enough to chew. The Warden is counting your steps.',
  'The last night. Kill the Warden, and the sun will remember how to rise.',
];

// ---------------------------------------------------------------------------
// Elites: one in ten foes is ember-touched — golden, tougher, worth more.
// ---------------------------------------------------------------------------
export const ELITE_CHANCE = 0.1;
export const ELITE_HP_MUL = 2.5;
export const ELITE_VALUE_MUL = 3;
export const ELITE_SPEED_MUL = 1.1;

// Boss enrage: after 75 seconds a boss burns hotter (faster attacks).
// Boss enrage: after 75 seconds a boss burns hotter (faster attacks).
export const BOSS_ENRAGE_TIME = 75;
export const BOSS_ENRAGE_MUL = 0.7;

export const BOSS_DIALOGUE = {
  drownedBell: [
    'THE DROWNED BELL: "The tide brought me your light, Keeper. I will ring until it is mine."',
    'KEEPER: "Ring all you like. The flame does not answer bells."',
  ],
  ashenStag: [
    'THE ASHEN STAG: "You carry fire into my wood. I will trample it out."',
    'KEEPER: "Your wood burned a hundred years ago. You are only the smoke."',
  ],
  eclipseWarden: [
    'THE ECLIPSE WARDEN: "Nine nights, Keeper. Nine nights and you still burn. Admirable. Useless."',
    'KEEPER: "One more night. Then the sun remembers how to rise."',
  ],
};

// Intermission extras: rest and gamble, bought with embers.
export const REST_COST = 45;
export const GAMBLE_COST = 50;

// How-to-play lines, shown on the title screen footer and the codex.
export const HOW_TO_PLAY = [
  'WASD / arrows — move the Keeper',
  'Mouse — aim the lantern',
  'Hold left click — fire ember bolts',
  'Right click / E — drop a light-trap',
  'SPACE — dash (briefly untouchable)',
  '1 / 2 / 3 — choose a relic, pick a difficulty',
  'R — reroll the relic choice (25 embers)',
  'P — pause · M — mute · B — codex',
];
