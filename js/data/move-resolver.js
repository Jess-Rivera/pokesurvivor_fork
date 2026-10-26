/* ============ move-resolver.js, raw move facts to final move definitions (slice 2 of the move-schema rewrite, #2) ============
 * Eager at load: G.MoveDefs = resolve(G.MoveData, G.MoveOverrides, G.MoveHandlers). Tools call G.MoveResolver.resolve directly.
 * Order per move: grammar defaults (field d, except the ones only valid beside a parent field), derived values (only cd, and not for a move that lasts while active),
 * overrides, handler attachment. A field with no data and no behavior-carrying default is simply absent; combat ignores it.
 * Output is the new definition only: no kind, no flat projection in old field names, no damage normalization
 * (power stays the raw Power; whether normalization is needed waits for a damage simulator). Accuracy, flavor_text and
 * every other raw fact pass through untouched. The resolver checks only its own inputs and throws on an unknown override
 * move or field, an unknown handler name or a bad registry entry. Grammar validation stays in tools/validate_moves.js.
 * Load order: move-attributes.js, moves-generated.js, move-overrides.js, move-handler.js, move-resolver.js.
 * GROUNDWORK: not listed in dev.html and read by nothing in the game yet. */
(() => {
  const A = G.MoveAttrs;
  // Cooldown tuning: cd = ANCHOR_CD * (ANCHOR_PP / PP) ^ BETA, for moves with Power above 0 that do not last while active (endOn notActive: their pacing is rehit or an emitter's every, not a cooldown).
  //   ANCHOR_CD  cooldown (s) of the anchor move, Tackle = 0.5
  //   ANCHOR_PP  PP of the anchor move, Tackle = 35
  //   BETA       exponent: 1.0 = pure 1/PP (equal sustained DPS where power x PP is constant); lower compresses long cooldowns (0.5 = square root)
  const TUNING = { ANCHOR_CD: 0.5, ANCHOR_PP: 35, BETA: 1 };
  // Grammar defaults that are only valid beside a parent field (turn, aim and return rules), so they stay absent unless the data sets them.
  // shortcut: a hand list by name, revisit if the grammar gains another gated default (tools/validate_moves.js --resolved catches it).
  const GATED = new Set(['turnRate', 'aimTrack', 'returnHits']);
  const lastsWhileActive = m => (m.delivery.endOn || []).some(e => e.notActive);
  const isObj = v => v !== null && typeof v === 'object';

  // Fill every absent field that has a grammar default `d`, walking the spec the way the validator does.
  // shortcut: anyOf is followed only through a ref option (emit.move inline), no other anyOf option has a default; revisit if one gains a d.
  function defaults(spec, v) {
    if (!isObj(spec) || !isObj(v)) return;
    switch (spec.t) {
      case 'obj':
        for (const [k, s] of Object.entries(spec.f)) {
          if (!(k in v)) { if (isObj(s) && 'd' in s && !GATED.has(k)) v[k] = s.d; } else defaults(s, v[k]);
        }
        break;
      case 'list': if (Array.isArray(v)) v.forEach(x => defaults(spec.of, x)); break;
      case 'union': defaults(spec.of[v[spec.key]], v); break;
      case 'ref': defaults(A.NAMED[spec.n], v); break;
      case 'anyOf': spec.of.filter(s => isObj(s) && s.t === 'ref').forEach(s => defaults(s, v)); break;
    }
  }

  function resolve(data, overrides, handlers, tuning = TUNING) {
    const fields = Object.keys(A.MOVE.f);
    for (const [id, o] of Object.entries(overrides)) {
      if (!data[id]) throw new Error('move-overrides: "' + id + '" is not a move in the data');
      for (const k of Object.keys(o)) if (k !== 'why' && (k === 'id' || !fields.includes(k))) throw new Error('move-overrides: ' + id + ' has unknown field "' + k + '"');
    }
    for (const [name, h] of Object.entries(handlers.byName)) {
      if (!handlers.triggers.includes(h.trigger)) throw new Error('move-handler: ' + name + ' has unknown trigger "' + h.trigger + '"');
      if (h.condition && !handlers.conditions.includes(h.condition)) throw new Error('move-handler: ' + name + ' has unknown condition "' + h.condition + '"');
    }
    const out = {};
    for (const [id, src] of Object.entries(data)) {
      const m = structuredClone(src);
      defaults(A.MOVE, m);
      if (!('cd' in m) && m.power > 0 && !lastsWhileActive(m)) m.cd = +(tuning.ANCHOR_CD * Math.pow(tuning.ANCHOR_PP / m.pp, tuning.BETA)).toFixed(3);   // 3 decimals like legacy moves.js
      const { why, ...fix } = overrides[id] || {};
      Object.assign(m, fix);
      const hs = [];
      for (const e of m.payload) if (e.t === 'special') {
        const h = handlers.byName[e.handler];
        if (!h) throw new Error('move-handler: ' + id + ' uses unknown handler "' + e.handler + '"');
        hs.push({ handler: e.handler, trigger: h.trigger, ...(h.condition && { condition: h.condition }), stub: h.stub });
      }
      if (hs.length) m.handlers = hs;
      out[id] = m;
    }
    return out;
  }

  G.MoveResolver = { resolve, TUNING };
  G.MoveDefs = resolve(G.MoveData, G.MoveOverrides, G.MoveHandlers);
})();
