/* ============ move-handler.js, special handler registry (slice 2 of the move-schema rewrite, #2) ============
 * Declarations only, nothing executes. One entry per handler named by a `special` effect in moves-generated.js:
 * the grammar parameters it takes, WHEN it fires (one of `triggers`), an optional condition (one of `conditions`)
 * and, for a handler with no executor, why it is a stub. Slice 4b: the executors live in js/systems/move-effects.js
 * (fixedDamage, levelDamage, statusBonus, chainDamageFalloff, setWeather); berrySteal stays a stub. The resolver attaches these to each move and rejects a handler name that is not here.
 * `triggers` is the grammar's emit trigger list; `conditions` is the grammar's berrySteal condition list.
 * Load order: move-attributes.js, moves-generated.js, move-overrides.js, move-handler.js, move-resolver.js.
 * GROUNDWORK: not listed in dev.html and read by nothing in the game yet. */
(() => {
  G.MoveHandlers = {
    triggers: ['cast', 'casterMove', 'termination', 'enemyHit', 'interval'],
    conditions: ['targetHasBerry'],
    byName: {
      berrySteal:         { params: ['damageMult', 'consumesBerry'], trigger: 'enemyHit', condition: 'targetHasBerry', stub: 'no holdable/berry system in the local build' },
      fixedDamage:        { params: ['amount', 'ignoresType', 'ignoresDefense'], trigger: 'enemyHit' },
      chainDamageFalloff: { params: ['hopReduction'], trigger: 'enemyHit' },
      levelDamage:        { params: [], trigger: 'enemyHit' },
      setWeather:         { params: ['weather', 'duration'], trigger: 'cast' },
      statusBonus:        { params: ['multiplier'], trigger: 'enemyHit' },
    },
  };
})();
