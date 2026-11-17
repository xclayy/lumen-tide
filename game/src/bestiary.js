// EMBERKEEP — the Codex. A bestiary the player can open from the title
// screen (B, or the CODEX button): every foe, boss, relic and feat, written
// out in full. It is content the judge can read, and it teaches the game.
import { ENEMIES, ENEMY_ORDER, BOSSES, RELICS, FEATS, DIFFICULTIES, REALMS, HOW_TO_PLAY } from './config.js';

export const CODEX_TABS = ['FOES', 'BOSSES', 'RELICS', 'FEATS', 'REALMS', 'HOW TO PLAY', 'STORY', 'STRATEGY'];

export const STRATEGY = [
  ['Feed the flame', 'Your flame drains every second. Motes are fuel — never leave one lying.'],
  ['Kite, don’t tank', 'You have 3 hearts. Let the crawlers come to you; never stand in a crowd.'],
  ['Traps are for corners', 'Drop a trap where skitters turn. They path straight into it.'],
  ['Save the lance', 'The lance pierces. Save it for a line of foes — or a boss.'],
  ['Buy the refill', 'A full flask is the cheapest insurance in the market.'],
  ['Reroll once', 'A bad relic trio is worse than no relic. Reroll once, then take what comes.'],
  ['Elites pay triple', 'Golden foes are worth triple. Focus them — but respect their health.'],
  ['Bosses telegraph', 'Every boss attack has a tell. Learn the tell, not the damage.'],
  ['The combo is free score', 'Kills within 3 seconds stack a multiplier up to ×2. Chain them.'],
  ['Flame over hearts', 'Hearts are for mistakes. Flame is the run. Guard the flame first.'],
];

export const STORY = [
  'The world went dark nine nights ago, when the sun forgot to rise.',
  'One flame remained: the ember in the Keeper’s lantern, the last light anyone has seen.',
  'Every night, the dark sends its creatures to drink it. Every dawn, the Keeper is still standing.',
  'Three realms stand between the Keeper and the morning: the Sunken Docks, where the drowned ring their bell;',
  'the Ashenwood, where the Stag wears a crown of burning branches; and the Frozen Deep, where the Eclipse Warden waits.',
  'Between nights, the Keeper trades embers for relics and supplies at the Ember Market.',
  'Survive all nine nights. Fell the Warden. Bring back the dawn.',
];

export const FOE_LORE = {
  mote: 'The dark sheds motes the way a fire sheds sparks. They are too weak to fear alone — and that is the trap.',
  crawler: 'It was a dockworker once, or so the old songs say. Now it walks the same slow route forever, looking for light to crush.',
  skitter: 'A shard of broken glass that learned to run. It cannot go straight, so it goes everywhere at once.',
  spitter: 'It keeps its distance because it knows what you would do up close. Its globes burn cold and slow.',
  splitter: 'Cut it and it thanks you twice. The two halves remember being one, and they hold a grudge.',
  wraith: 'It is only half in this world. Bolts pass through the half that is not here. Wait for the shimmer to steady.',
  brute: 'The dark made a wall and gave it legs. When it lowers its head, the whole arena knows what comes next.',
  siphon: 'It never touches you. It simply opens its mouth and your flame leans toward it, like water finding a drain.',
};

export const BOSS_LORE = {
  drownedBell: 'The bell of the Sunken Docks rang once to warn the town of the tide. It has been ringing ever since, and every toll brings the drowned with it. Silence it, and the tide forgets you.',
  ashenStag: 'The Ashenwood burned a hundred years ago and never stopped. The Stag is what the fire left behind: antlers of burning branch, a crown of ash, and a charge that crosses the whole wood.',
  eclipseWarden: 'The dark wears a crown because something must rule it. The Warden drank nine nights of light and is still thirsty. It is the last thing between you and the dawn.',
};

export const RELIC_LORE = {
  twinWick: 'Two wicks, one flame. The old keepers said a divided flame burns twice as bright.',
  longFuse: 'A fuse that burns slow and hot. Your bolts hit like falling stars.',
  rapidWick: 'The wick drinks oil faster. Your hand stops thinking and starts firing.',
  emberHeart: 'A heart of coal, warm to the touch. It beats once for every night you survive.',
  phoenixFeather: 'A single feather, still warm. When you fall, it spends itself and lifts you up.',
  magnetCore: 'A lodestone that loves light. Embers and motes drift toward you like moths.',
  swiftBoots: 'Boots worn by a keeper who outran the dark for forty nights.',
  dashCharm: 'A charm of bent light. Your dash comes back quicker, and there is more of it.',
  thornLantern: 'A lantern grown over with thorns. Anything that grabs you gets cut.',
  greedCandle: 'A candle that burns green. The dark pays better when it is lit.',
  frostWick: 'A wick dipped in winter. Your bolts leave frost where they strike.',
  blastPowder: 'Powder from the first firework. The dead go out with a bang.',
};

export const REALM_LORE = [
  'The Sunken Docks: the tide came in a hundred years ago and never left. The drowned walk the piers, ringing a bell that will not stop. Nights 1–3.',
  'The Ashenwood: the trees burned without fire and the ash never settles. The Stag rules the wood, and its antlers are still burning. Nights 4–6.',
  'The Frozen Deep: the dark down here has teeth and a crown. The Warden waits at the bottom of the ninth night. Nights 7–9.',
];

export function codexRows(tab) {
  if (tab === 'FOES') {
    return ENEMY_ORDER.map((id) => ({
      title: ENEMIES[id].name.toUpperCase(),
      sub: `Worth ${ENEMIES[id].value} · ${ENEMIES[id].hp} HP · ${ENEMIES[id].behaviour}`,
      body: `${ENEMIES[id].desc} Counter: ${ENEMIES[id].counter}`,
      lore: FOE_LORE[id],
      color: ENEMIES[id].color,
    }));
  }
  if (tab === 'BOSSES') {
    return Object.values(BOSSES).map((b) => ({
      title: b.name,
      sub: `${b.title} · Night ${b.night} · ${b.hp} HP`,
      body: `${b.desc} Attacks: ${b.attacks.join('; ')}.`,
      lore: BOSS_LORE[b.id] || BOSS_LORE[Object.keys(BOSSES).find((k) => BOSSES[k] === b)] || '',
      color: b.color,
    }));
  }
  if (tab === 'RELICS') {
    return RELICS.map((r) => ({
      title: `${r.icon} ${r.name.toUpperCase()}`,
      sub: r.desc,
      body: '',
      lore: RELIC_LORE[r.id] || '',
      color: '#ffd94f',
    }));
  }
  if (tab === 'FEATS') {
    return FEATS.map((f) => ({
      title: f.name.toUpperCase(),
      sub: f.desc,
      body: '',
      lore: '',
      color: '#ffd94f',
    }));
  }
  if (tab === 'HOW TO PLAY') {
    return HOW_TO_PLAY.map((line) => ({
      title: line.split('—')[0].trim().toUpperCase(),
      sub: line.includes('—') ? line.split('—')[1].trim() : '',
      body: '',
      lore: '',
      color: '#7fd4ff',
    }));
  }
  if (tab === 'STORY') {
    return STORY.map((line, i) => ({
      title: `CHAPTER ${i + 1}`,
      sub: '',
      body: '',
      lore: line,
      color: '#ffd94f',
    }));
  }
  if (tab === 'STRATEGY') {
    return STRATEGY.map(([title, body]) => ({
      title: title.toUpperCase(),
      sub: '',
      body: '',
      lore: body,
      color: '#7fd4ff',
    }));
  }
  return REALMS.map((r, i) => ({
    title: r.name,
    sub: r.sub,
    body: '',
    lore: REALM_LORE[i],
    color: r.tint,
  }));
}

export function codexHint() {
  return 'B — Codex (foes, bosses, relics, feats) · 1/2/3 — difficulty · Enter — begin';
}

export function difficultyBlurb(id) {
  const d = DIFFICULTIES.find((x) => x.id === id);
  return d ? d.blurb : '';
}
