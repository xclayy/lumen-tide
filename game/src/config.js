// Lumen Tide — tuning and constants. One place holds every number the
// rest of the game reads, so balance lives here and nowhere else.
export const FIELD = { width: 1280, height: 720 };
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 16,
  speed: 265,
  fireInterval: 0.16,
  rapidInterval: 0.085,
  bulletSpeed: 660,
  bulletRadius: 5,
  dashSpeed: 780,
  dashTime: 0.16,
  dashCooldown: 1.6,
  invulnerableTime: 1.2,
  maxHearts: 3,
  lampBase: 185,
  lampMax: 265,
  lampDecay: 3,
};

export const ENEMY = {
  wisp: { radius: 14, hp: 1, speed: 95, score: 10, color: '#7fe7ff' },
  shade: { radius: 16, hp: 2, speed: 175, score: 25, color: '#c792ff' },
  gloom: { radius: 27, hp: 5, speed: 48, score: 50, color: '#ff7a9e' },
  dread: { radius: 46, hp: 26, speed: 58, score: 300, color: '#ffb347' },
};

export const WAVE = {
  baseCount: 7,
  perWave: 3,
  spawnInterval: 0.9,
  minSpawnInterval: 0.32,
  betweenSeconds: 3.2,
  clearBonus: 50,
};

export const COMBO = {
  windowSeconds: 3,
  stepKills: 5,
  maxMultiplier: 5,
};

export const PICKUP = {
  dropChance: 0.18,
  heartChance: 0.05,
  lifetime: 9,
  magnetRadius: 110,
  magnetSpeed: 320,
  rapidSeconds: 8,
  spreadSeconds: 8,
  shieldSeconds: 10,
};

export const COLORS = {
  deepTop: '#0a2436',
  deepBottom: '#04101d',
  tide: '#0d3a52',
  gold: '#ffd166',
  pale: '#eaf6ff',
  dim: '#8fb3c9',
  danger: '#ff5d73',
  heart: '#ff6b81',
  lamp: '#ffe9a8',
};

export const BEST_KEY = 'lumen-tide-best';
