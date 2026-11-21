/* ============ missions.js — daily and weekly mission templates ============
 * Each day 3 dailies appear and each week 2 weeklies (Spain time), with
 * goals and drawn types. They are completed by playing and the prize is claimed in
 * the Missions screen. The logic is in systems/progress.js.
 * Rewards pay coins only: where a mission paid gacha tickets (retired, #133) it pays G.Drops.ticketCoins() on top.
 *
 *   ev      event that advances it (see G.Progress.event)
 *   match   (data, param) -> does this event count?
 *   value   data -> how much it is worth; with mode 'max' it keeps the greater, with
 *           'add' (default) adds up (1 if there is no value)
 *   param   'type': draws a Pokemon type for the mission
 */
G.MissionDefs = (() => {
  const T = (t) => G.U.TYPE_NAME[t];
  const min = (d) => Math.floor(d.time / 60);

  const daily = [
    {
      id: 'kill',
      ev: 'kill',
      goals: [300, 500, 800],
      reward: { coins: 150 + G.Drops.ticketCoins(2) },
      text: (n) => `Derrota a ${n} Pokémon`,
    },
    {
      id: 'killType',
      ev: 'kill',
      param: 'type',
      goals: [30, 50, 80],
      reward: { coins: 200 + G.Drops.ticketCoins(2) },
      match: (d, t) => d.types.includes(t),
      text: (n, t) => `Derrota a ${n} Pokémon de tipo ${T(t)}`,
    },
    {
      id: 'survive',
      ev: 'runEnd',
      mode: 'max',
      value: min,
      goals: [5, 7, 9],
      reward: { coins: 200 + G.Drops.ticketCoins(3) },
      text: (n) => `Aguanta ${n} minutos en una run`,
    },
    {
      id: 'level',
      ev: 'runEnd',
      mode: 'max',
      value: (d) => d.level,
      goals: [8, 12, 15],
      reward: { coins: 200 + G.Drops.ticketCoins(2) },
      text: (n) => `Llega al nivel ${n} en una run`,
    },
    {
      id: 'boss',
      ev: 'kill',
      match: (d) => d.boss,
      goals: [1, 2],
      reward: { coins: 250 + G.Drops.ticketCoins(3) },
      text: (n) => (n === 1 ? 'Derrota a un jefe' : `Derrota a ${n} jefes`),
    },
    {
      id: 'chest',
      ev: 'chest',
      goals: [1, 2],
      reward: { coins: 200 + G.Drops.ticketCoins(2) },
      text: (n) => (n === 1 ? 'Abre un cofre con candado' : `Abre ${n} cofres con candado`),
    },
    {
      id: 'coins',
      ev: 'runEnd',
      value: (d) => d.coins,
      goals: [100, 200, 300],
      reward: { coins: 150 + G.Drops.ticketCoins(2) },
      text: (n) => `Recoge ${n} monedas en tus runs`,
    },
    {
      id: 'playType',
      ev: 'runEnd',
      param: 'type',
      mode: 'max',
      value: min,
      goals: [3],
      reward: { coins: 200 + G.Drops.ticketCoins(3) },
      match: (d, t) => d.types.includes(t),
      text: (n, t) => `Aguanta ${n} minutos con un Pokémon de tipo ${T(t)}`,
    },
    {
      id: 'item',
      ev: 'item',
      goals: [1],
      reward: { coins: 150 + G.Drops.ticketCoins(2) },
      text: () => 'Encuentra un objeto equipable',
    },
  ];

  const weekly = [
    {
      id: 'wkill',
      ev: 'kill',
      goals: [4000, 6000],
      reward: { coins: 800 + G.Drops.ticketCoins(0, 1) },
      text: (n) => `Derrota a ${n.toLocaleString('es')} Pokémon`,
    },
    {
      id: 'wboss',
      ev: 'kill',
      match: (d) => d.boss,
      goals: [4, 6],
      reward: { coins: 900 + G.Drops.ticketCoins(0, 1) },
      text: (n) => `Derrota a ${n} jefes`,
    },
    {
      id: 'wsurvive',
      ev: 'runEnd',
      mode: 'max',
      value: min,
      goals: [12, 15],
      reward: { coins: 1000 + G.Drops.ticketCoins(0, 1) },
      text: (n) => `Aguanta ${n} minutos en una run`,
    },
    {
      id: 'wdaily',
      ev: 'missionDone',
      match: (d) => d.daily,
      goals: [8, 12],
      reward: { coins: 800 + G.Drops.ticketCoins(0, 1) },
      text: (n) => `Completa ${n} misiones diarias`,
    },
  ];

  const BY = {};
  for (const m of daily.concat(weekly)) BY[m.id] = m;

  return { daily, weekly, BY };
})();
