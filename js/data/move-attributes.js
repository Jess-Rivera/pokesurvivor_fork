/* ============ move-attributes.js, the move grammar (groundwork for the move-schema rewrite, #2) ============
 *
 * What a move definition may contain: legal fields, value types, documented defaults and the cross-field rules.
 * Design source: docs/MOVE-AXIS-SCHEMA.md. This file is data plus one constant, no behavior.
 * tools/validate_moves.js checks js/data/moves-generated.js against it; the resolver will do the same later.
 * GROUNDWORK: not listed in dev.html and read by nothing in the game yet. Any field not listed here is rejected,
 * which is how retired fields (kind, hitCap) stay out.
 *
 * Specs (a bare string is shorthand for { t: string }):
 *   'str' | 'bool'
 *   { t:'num'|'int', min, max, gt, u }   min/max inclusive, gt exclusive, u:true also accepts UNLIMITED
 *   { t:'enum', v:[...] }                { t:'list', of, min }
 *   { t:'obj', f:{field:spec}, req:[fields], rules:[...] }   unknown fields are errors
 *   { t:'oneKey', f:{key:spec} }         exactly one of the keys
 *   { t:'union', key, of:{value:spec} }  the object's `key` field picks the spec for the rest
 *   { t:'anyOf', of:[specs] }            { t:'ref', n:name }   { t:'formula' }
 *   d: the documented default when the field is absent (the resolver applies it)   nullable: accepts null
 *
 * Rules: { id, when: cond|[cond], then: cond|[cond], msg }. If every `when` holds, every `then` must hold.
 *   cond = { has: path } | { eq: [path, value] } | { in: [path, [values]] } | { gt: [path, n] }
 *        | { not: cond } | { any: [cond] } | { all: [cond] }
 *   Paths are relative to the object carrying the rules; a list on the way is searched element by element.
 */
(() => {
  const UNLIMITED = Infinity;   // pierce only; a named value so 0 keeps meaning "dies on the first enemy hit"

  const num = (o = {}) => ({ t: 'num', ...o }), int = (o = {}) => ({ t: 'int', ...o });
  const en = (v, o = {}) => ({ t: 'enum', v, ...o });
  const obj = (f, req = [], o = {}) => ({ t: 'obj', f, req, ...o });
  const list = (of, o = {}) => ({ t: 'list', of, ...o });
  const pct = int({ min: 1, max: 100 });
  const SECS = num({ gt: 0 });
  const SIDE = en(['self', 'ally', 'foe']);

  const TYPES = ['normal', 'fire', 'water', 'grass', 'electric', 'ice', 'fighting', 'poison', 'ground', 'flying',
    'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'];
  const AILMENTS = ['burn', 'paralysis', 'poison', 'freeze', 'trap', 'confusion'];   // the ones status.js implements
  const STATS = ['atk', 'def', 'spAtk', 'spDef', 'spd'];
  const WEATHER = ['sun', 'rain', 'sand', 'snow', 'fog'];                            // weather.js ids

  // ---- axis 1: SPACE ----
  const SPACE = obj({
    shape: en(['radial', 'linear']),
    radArc: num({ gt: 0, max: 6.2832 }), radRadius: num({ gt: 0 }),
    linLength: num({ gt: 0 }), linWidth: num({ gt: 0 }),
    count: int({ min: 1, d: 1 }),
    spread: num({ min: 0, max: 6.2832, d: 0 }),   // TOTAL fan angle across all instances, evenly spaced; at 2 pi or more they are spaced 2 pi / count around the circle; kept in the data at any count, ignored when count is 1
    pierce: int({ min: 0, u: true, d: UNLIMITED }),   // omitted = UNLIMITED; 0 = dies on the first hit; n = dies after passing n enemies
    chainHops: int({ min: 1 }), hopRange: num({ gt: 0 }),
    splash: obj({ radius: num({ min: 0, d: 0 }), falloff: num({ min: 0, max: 1, d: 0 }),
      trigger: en(['enemyHit', 'terrainHit', 'termination'], { d: 'enemyHit' }) }, ['radius']),
  }, ['shape'], { rules: [
    { id: 'radial-fields', when: { eq: ['shape', 'radial'] }, then: [{ has: 'radRadius' }, { not: { has: 'linLength' } }, { not: { has: 'linWidth' } }], msg: 'a radial shape needs radRadius and rejects linLength/linWidth' },
    { id: 'linear-fields', when: { eq: ['shape', 'linear'] }, then: [{ has: 'linLength' }, { has: 'linWidth' }, { not: { has: 'radArc' } }, { not: { has: 'radRadius' } }], msg: 'a linear shape needs linLength and linWidth and rejects radArc/radRadius' },
    { id: 'hops-need-range', when: { has: 'chainHops' }, then: { has: 'hopRange' }, msg: 'chainHops needs hopRange' },
    { id: 'range-needs-hops', when: { has: 'hopRange' }, then: { has: 'chainHops' }, msg: 'hopRange needs chainHops' },
  ] });

  // ---- axis 2: DELIVERY ----
  const ENDON = { t: 'oneKey', f: {
    time: num({ min: 0 }), contact: en(['wall']), ownerDeath: en([true]), notActive: en([true]),
    offScreen: en([true]), returned: en([true]) } };

  const DELIVERY = obj({
    anchor: en(['caster', 'target', 'world', 'self']),
    targeting: en(['direction', 'nearest', 'selected', 'location', 'self', 'none']),
    locationPick: en(['caster', 'enemy']),   // only with targeting location: where it lands. Absent = enemy (a random enemy within range); the resolver writes it
    range: num({ gt: 0 }),   // px: nearest acquisition, location reach, returns turnaround, max reposition distance. Absent = the resolver fills TUNING.RANGE where one of those applies
    delay: SECS,   // s: wind-up on the INSTANCE (meteor telegraph). No hitbox until it ends; endOn time counts from activation
    motion: en(['static', 'travels', 'falls', 'returns', 'orbits', 'repositions'], { d: 'static' }),
    moveSpeed: num({ gt: 0 }), angularSpeed: num({ gt: 0 }), orbitRadius: num({ gt: 0 }),
    path: obj({ curve: num(), oscillate: obj({ amplitude: num({ gt: 0 }), frequency: num({ gt: 0 }) }, ['amplitude', 'frequency']) }),
    repositionMode: en(['teleport', 'swept']), returnToOrigin: 'bool', returnHits: en(['out', 'outAndBack'], { d: 'out' }),
    dashMult: num({ gt: 0 }),
    grow: obj({ growSpeed: num({ gt: 0 }), dim: en(['radRadius', 'radArc', 'linLength'], { d: 'radRadius' }),
      per: en(['time', 'distance'], { d: 'time' }), max: num({ gt: 0 }) }, ['growSpeed']),
    turnRate: num({ min: 0, d: 0 }), aimTrack: num({ min: 0, d: 0 }),
    trigger: en(['contact']),   // a placed instance detonates once on contact and is gone; it still needs an endOn (see rules)
    endOn: list(ENDON, { min: 1 }),
  }, ['anchor', 'targeting']);

  // ---- caster state ----
  // Commitment (slice 4b, S13): t is seconds, or 'untilEffectEnd' (the life of the cast's shield); absent = the move's endOn time.
  // No commitment means normal cooldown ticking (there is no 'tick' value). freeze id: absent = every cooldown of the caster.
  const COMMIT_T = { t: 'anyOf', of: [SECS, en(['untilEffectEnd'])] };
  const CASTER = obj({
    iframes: num({ min: 0 }),
    commitment: obj({
      movement: obj({ type: en(['slowed', 'rooted']), t: COMMIT_T }, ['type']),   // slowed: -2 Speed stages on the caster; rooted: move speed 0
      cooldown: obj({ type: en(['freeze']), id: { t: 'anyOf', of: ['str', list('str', { min: 1 })] }, t: COMMIT_T }, ['type']),   // frozen timers do not run, they arm when the freeze ends
    }),
  });

  // ---- axis 3: PAYLOAD ----
  const special = (f, req = []) => obj({ ...f, deferred: 'str' }, req);   // deferred: why a stub is acceptable for now
  const HANDLERS = { t: 'union', key: 'handler', of: {
    berrySteal: special({ condition: en(['targetHasBerry']), damageMult: num({ gt: 0 }), consumesBerry: 'bool' }, ['condition', 'damageMult']),
    fixedDamage: special({ amount: num({ gt: 0 }), ignoresType: 'bool', ignoresDefense: 'bool' }, ['amount']),
    chainDamageFalloff: special({ hopReduction: num({ gt: 0, max: 1 }) }, ['hopReduction']),   // per hop: chain hop k deals x (1 - hopReduction)^k, applied last (D15)
    levelDamage: special({}),
    setWeather: special({ weather: en(WEATHER), duration: SECS }, ['weather', 'duration']),
    statusBonus: special({ multiplier: num({ gt: 1 }) }, ['multiplier']),
  } };

  const HEAL_AMOUNT = { t: 'anyOf', of: [
    { t: 'formula' },
    obj({ fraction: num({ gt: 0, max: 1 }), of: en(['maxHP']) }, ['fraction', 'of']),
    obj({ from: en(['dealt']), fraction: num({ gt: 0, max: 1 }) }, ['from', 'fraction']),
  ] };

  const EFFECT = { t: 'union', key: 't', of: {
    damage: obj({}),
    knockback: obj({ distance: num({ min: 0, d: 0 }), direction: en(['travel']) }, ['distance']),
    ailment: obj({ id: en(AILMENTS), chance: pct, side: SIDE, duration: SECS }, ['id', 'chance', 'side']),
    stat: obj({ stat: en(STATS), stages: int({ min: -6, max: 6 }), side: SIDE, scope: en(['caster', 'individual', 'team']),
      chance: pct, duration: num({ gt: 0, d: 6 }), maxStacks: int({ min: 1, d: 6 }) }, ['stat', 'stages', 'side', 'scope']),   // duration (s) and maxStacks default to 6
    heal: obj({ amount: HEAL_AMOUNT, per: SECS, side: SIDE, duration: SECS }, ['amount', 'side']),
    shield: obj({ amount: { t: 'formula' }, max: { t: 'formula' }, regen: { t: 'formula' }, duration: SECS,
      absorbsAll: 'bool', overflow: 'bool', blocksStatus: 'bool' }, ['amount', 'duration']),
    flinch: obj({ chance: pct, duration: SECS }, ['chance']),
    crit: obj({ critChance: int({ min: 0 }) }, ['critChance']),
    recoil: obj({ fraction: num({ gt: 0, max: 1 }), trigger: en(['cast', 'hit']) }, ['fraction', 'trigger']),
    emit: obj({ move: { t: 'anyOf', of: ['str', { t: 'ref', n: 'inline' }] }, every: SECS, count: int({ min: 1 }),
      trigger: en(['cast', 'casterMove', 'termination', 'enemyHit', 'interval']), endOn: list(ENDON, { min: 1 }) },
      ['move', 'trigger'], { rules: [
        { id: 'interval-needs-every', when: { eq: ['trigger', 'interval'] }, then: { has: 'every' }, msg: 'an interval emitter needs every' },
      ] }),
    special: HANDLERS,
  } };

  // ---- cross-field rules for a whole move (and for an inline emitted move) ----
  const motionIs = (...v) => ({ in: ['delivery.motion', v] });
  const MOVE_RULES = [
    { id: 'grow-needs-end', when: { has: 'delivery.grow' }, then: { has: 'delivery.endOn' }, msg: 'grow needs an endOn condition so it terminates' },
    { id: 'grow-dim-radial', when: { in: ['delivery.grow.dim', ['radRadius', 'radArc']] }, then: { eq: ['space.shape', 'radial'] }, msg: 'growing radRadius/radArc needs a radial shape' },
    { id: 'grow-dim-linear', when: { eq: ['delivery.grow.dim', 'linLength'] }, then: { eq: ['space.shape', 'linear'] }, msg: 'growing linLength needs a linear shape' },
    { id: 'turn-needs-travel', when: { has: 'delivery.turnRate' }, then: motionIs('travels', 'returns'), msg: 'turnRate needs a moving, steerable motion (travels or returns)' },
    { id: 'returns-needs-point-or-linear', when: motionIs('returns'), then: { not: { has: 'space.radArc' } }, msg: 'returns needs a point or linear shape (no radArc)' },
    { id: 'aim-needs-static', when: { has: 'delivery.aimTrack' }, then: motionIs('static'), msg: 'aimTrack needs a static shape' },
    { id: 'speed-needs-travel', when: { has: 'delivery.moveSpeed' }, then: motionIs('travels', 'falls', 'returns'), msg: 'moveSpeed needs a translating motion (travels, falls or returns)' },
    { id: 'orbit-needs-fields', when: motionIs('orbits'), then: [{ has: 'delivery.orbitRadius' }, { has: 'delivery.angularSpeed' }], msg: 'orbits needs orbitRadius and angularSpeed' },
    { id: 'orbit-radius-only-orbits', when: { has: 'delivery.orbitRadius' }, then: motionIs('orbits'), msg: 'orbitRadius needs motion orbits' },
    { id: 'angular-only-orbits', when: { has: 'delivery.angularSpeed' }, then: motionIs('orbits'), msg: 'angularSpeed needs motion orbits' },
    { id: 'reposition-needs-mode', when: motionIs('repositions'), then: { has: 'delivery.repositionMode' }, msg: 'repositions needs repositionMode' },
    { id: 'mode-only-repositions', when: { has: 'delivery.repositionMode' }, then: motionIs('repositions'), msg: 'repositionMode needs motion repositions' },
    { id: 'return-only-repositions', when: { has: 'delivery.returnToOrigin' }, then: motionIs('repositions'), msg: 'returnToOrigin needs motion repositions' },
    { id: 'dash-needs-swept', when: { has: 'delivery.dashMult' }, then: { eq: ['delivery.repositionMode', 'swept'] }, msg: 'dashMult needs repositionMode swept' },
    { id: 'hits-need-return', when: { has: 'delivery.returnHits' }, then: { any: [motionIs('returns'), { eq: ['delivery.returnToOrigin', true] }] }, msg: 'returnHits needs motion returns or returnToOrigin true' },
    { id: 'interval-needs-rehit', when: { eq: ['hitPolicy', 'interval'] }, then: { has: 'rehit' }, msg: 'hitPolicy interval needs rehit' },
    { id: 'rehit-needs-interval', when: { has: 'rehit' }, then: { eq: ['hitPolicy', 'interval'] }, msg: 'rehit needs hitPolicy interval' },
    { id: 'pick-needs-location', when: { has: 'delivery.locationPick' }, then: { eq: ['delivery.targeting', 'location'] }, msg: 'locationPick needs targeting location' },
    { id: 'trigger-needs-end', when: { has: 'delivery.trigger' }, then: { has: 'delivery.endOn' }, msg: 'a triggered instance needs an endOn condition so it cannot outlive its move (a timeout is optional: Spikes lasts until triggered)' },
    { id: 'self-has-no-shape', when: { eq: ['delivery.anchor', 'self'] }, then: { not: { has: 'space' } }, msg: 'anchor self is a shapeless cast and rejects space' },
    { id: 'freeze-default-needs-time', when: [{ has: 'casterState.commitment.cooldown' }, { not: { has: 'casterState.commitment.cooldown.t' } }], then: { has: 'delivery.endOn.time' }, msg: 'a cooldown freeze with no t lasts the endOn time, so the move needs one' },
    { id: 'movement-default-needs-time', when: [{ has: 'casterState.commitment.movement' }, { not: { has: 'casterState.commitment.movement.t' } }], then: { has: 'delivery.endOn.time' }, msg: 'a movement commitment with no t lasts the endOn time, so the move needs one' },
    { id: 'freeze-effect-needs-shield', when: { eq: ['casterState.commitment.cooldown.t', 'untilEffectEnd'] }, then: { eq: ['payload.t', 'shield'] }, msg: 'untilEffectEnd needs an effect with a lifetime (a shield)' },
    { id: 'movement-effect-needs-shield', when: { eq: ['casterState.commitment.movement.t', 'untilEffectEnd'] }, then: { eq: ['payload.t', 'shield'] }, msg: 'untilEffectEnd needs an effect with a lifetime (a shield)' },
  ];

  // ---- the move itself ----
  const MOVE = obj({
    id: 'str', name: 'str', balanceClass: en(['melee', 'ranged', 'other']),
    type: en(TYPES), category: en(['physical', 'special', 'status']),
    power: num({ min: 0, nullable: true }), pp: int({ min: 1 }), accuracy: int({ min: 1, max: 100, nullable: true }),
    priority: int({ min: -7, max: 7 }), flavor_text: { t: 'str', empty: true },   // source prose, blank for some moves
    cd: num({ gt: 0 }),   // optional hand override; otherwise derived from pp by the resolver
    persistent: 'bool',   // true = lasts while the move is the active one: no cd, one live instance per slot (the resolver skips the cd formula). Absent = a cooldown move
    rehit: SECS, hitPolicy: en(['oncePerInstance', 'interval', 'onReentry'], { d: 'oncePerInstance' }),
    cardLock: list('str'), casterState: CASTER, space: SPACE, delivery: DELIVERY, payload: list({ t: 'ref', n: 'effect' }, { min: 1 }),
  }, ['id', 'name', 'balanceClass', 'type', 'category', 'power', 'pp', 'accuracy', 'priority', 'delivery', 'payload'],
  { root: true, rules: MOVE_RULES });

  // a move emitted by an emit effect: geometry, delivery and payload only (damage and type come from the parent)
  const INLINE = obj({
    rehit: SECS, hitPolicy: en(['oncePerInstance', 'interval', 'onReentry'], { d: 'oncePerInstance' }),
    casterState: CASTER, space: SPACE, delivery: DELIVERY, payload: list({ t: 'ref', n: 'effect' }, { min: 1 }),
  }, ['delivery', 'payload'], { root: true, rules: MOVE_RULES });

  const FORMULA = { ops: { multiply: { min: 2 } }, refs: ['cast.paid'] };   // plus effect.<field> on the same effect

  G.MoveAttrs = { UNLIMITED, MOVE, INLINE, NAMED: { effect: EFFECT, inline: INLINE }, FORMULA, TYPES, AILMENTS, STATS, WEATHER };
})();
