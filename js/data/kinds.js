/* ============ kinds.js — what each move kind supports (upgrade rework, slice 2a) ============
 *
 * One entry per delivery kind that systems/combat.js implements. A kind lists the stat keys its
 * engine hook actually reads (`keys`), the card wording for it (`nouns`), and its `payload`:
 *   damage  the kind's number is `dmg` (Power)      buff  the kind's number is `amount` (a stat boost)
 * G.Mechanics (data/mechanics.js) decides which upgrade mechanics a move can take from these key
 * lists plus the move's own fields, never from a kind name or a move id. So a move imported later
 * (for example from PokeAPI) becomes upgradeable by getting a `kind` and the stat keys it has.
 *
 * Stat-key vocabulary (fixed, engine-owned):
 *   dmg cd count pierce speed radius width arc size life dur rate stacks amount knock ailmentChance
 * Keys the engine does not honor yet are NOT here (spread is a layout detail; slow, homing, flinch,
 * the other ailments, crit stage, drain, multi-hit wait for the status rework; burn and poison are live
 * since slice A, and their chance, `ailmentChance`, is a key since slice B).
 *
 * `wkind` is the name used in docs/move_kind_rules.xlsx. Mend, Ward, Control and Field are in that
 * workbook but have no engine hook yet, so they are not here until they get one.
 * `nouns`: count = what Count is called for this kind, area = what Area (radius) is called,
 * recharge / speed only where the default wording does not fit.
 */
G.Kinds = (() => {
  const BY = {
    projectile: { wkind: 'Projectile', payload: 'damage', keys: ['dmg', 'cd', 'count', 'pierce', 'speed', 'size', 'life', 'knock'],
                  nouns: { count: 'Projectile' } },
    cone:       { wkind: 'Spray',      payload: 'damage', keys: ['dmg', 'cd', 'count', 'pierce', 'speed', 'arc', 'size', 'life'],
                  nouns: { count: 'Shot' } },
    nova:       { wkind: 'Burst',      payload: 'damage', keys: ['dmg', 'cd', 'count', 'pierce', 'speed', 'size', 'life'],
                  nouns: { count: 'Projectile' } },
    melee:      { wkind: 'Melee',      payload: 'damage', keys: ['dmg', 'cd', 'radius', 'arc', 'knock'],
                  nouns: { area: 'Reach' } },
    dash:       { wkind: 'Dash',       payload: 'damage', keys: ['dmg', 'cd', 'radius', 'width', 'knock'],
                  nouns: { area: 'Distance' } },
    beam:       { wkind: 'Beam',       payload: 'damage', keys: ['dmg', 'cd', 'radius', 'width'],
                  nouns: { area: 'Length' } },
    aura:       { wkind: 'Aura',       payload: 'damage', keys: ['dmg', 'cd', 'radius'],
                  nouns: { area: 'Radius' } },
    orbit:      { wkind: 'Orbit',      payload: 'damage', keys: ['dmg', 'cd', 'count', 'speed', 'radius', 'size', 'knock'],
                  nouns: { count: 'Orb', area: 'Orbit Radius', recharge: 'Re-hit Speed', speed: 'Spin Speed' } },
    boomerang:  { wkind: 'Boomerang',  payload: 'damage', keys: ['dmg', 'cd', 'count', 'speed', 'radius', 'size', 'knock'],
                  nouns: { count: 'Boomerang', area: 'Range' } },
    chain:      { wkind: 'Chain',      payload: 'damage', keys: ['dmg', 'cd', 'count', 'radius'],
                  nouns: { count: 'Jump', area: 'Jump Range' } },
    trail:      { wkind: 'Trail',      payload: 'damage', keys: ['dmg', 'cd', 'radius', 'dur'],
                  nouns: { area: 'Puddle Size', recharge: 'Puddle Rate' } },
    mine:       { wkind: 'Mines',      payload: 'damage', keys: ['dmg', 'cd', 'count', 'radius', 'dur'],
                  nouns: { count: 'Mine', area: 'Blast Radius' } },
    meteor:     { wkind: 'Meteors',    payload: 'damage', keys: ['dmg', 'cd', 'count', 'radius', 'knock'],
                  nouns: { count: 'Strike', area: 'Impact Radius' } },
    turret:     { wkind: 'Turret',     payload: 'damage', keys: ['dmg', 'cd', 'count', 'speed', 'size', 'dur', 'rate'],
                  nouns: { count: 'Turret' } },
    buff:       { wkind: 'Buff',       payload: 'buff',   keys: ['dmg', 'cd', 'dur', 'stacks', 'amount'],
                  nouns: {} }
  };

  // Status rework slice B: combat.js procAilments rolls `ailmentChance` on every hit of every damage kind, so every damage kind
  // lists it. Whether a given MOVE can take the Ailment Chance card is decided by the card (needs() in mechanics.js).
  for (const k in BY) if (BY[k].payload === 'damage') BY[k].keys.push('ailmentChance');

  const VOCAB = ['dmg', 'cd', 'count', 'pierce', 'speed', 'radius', 'width', 'arc', 'size', 'life', 'dur', 'rate', 'stacks', 'amount', 'knock', 'ailmentChance'];

  /** Does this kind's engine hook read `key`? */
  function hasKey(kind, key) { const k = BY[kind]; return !!k && k.keys.includes(key); }

  /** The stat that "Increased Effect" scales for a kind: Power for damage kinds, amount for buffs. */
  function effectKey(kind) { const k = BY[kind]; return k && k.payload === 'buff' ? 'amount' : 'dmg'; }

  /** Card noun for a mechanic on a kind (e.g. count on orbit is "Orb"). Falls back to `dflt`. */
  function noun(kind, slot, dflt) { const k = BY[kind]; return (k && k.nouns[slot]) || dflt; }

  // Shape check on static data (also run offline): a typo in a key list fails loudly, not silently in play.
  for (const id in BY) for (const key of BY[id].keys) if (!VOCAB.includes(key)) throw new Error('kinds.js: ' + id + ' lists unknown key ' + key);

  return { BY, VOCAB, hasKey, effectKey, noun };
})();
