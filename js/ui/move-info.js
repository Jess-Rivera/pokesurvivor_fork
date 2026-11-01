/* ============ move-info.js: what the menus, level-up cards and icons show about a move (slice 7a) ============
 * Display reads come from the resolved move data (G.MoveDefs), never from the legacy move table.
 *
 *   G.MoveInfo.def(id)       the resolved def, or null
 *   name(id), type(id)       display name and type
 *   cat(id)                  'physical' | 'special' | 'status'
 *   isBuff(id)               the 2-buff learn limit test: every effect lands on its own side (G.TeamCards.selfOnly, Jess 2026-10-31)
 *   badge(id)                the icon's move family badge (a key of icons.js KIND_GLYPH), or null. Presentation only: animation,
 *                            sound and icons; no gameplay code reads it.
 *   desc(id)                 a one-line description built from the def (Jess, 2026-10-31: generated, option c)
 *   effects(def)             the effect list as short phrases (the sheet uses it too)
 *
 * Bubble has no def yet (D-BUBBLE, slice 7b), so its name and type still come from the legacy row.
 */
G.MoveInfo = (() => {
  const TAU = Math.PI * 2;
  const def = id => (G.MoveDefs && G.MoveDefs[id]) || null;
  const legacy = id => (G.Moves && G.Moves.BY_ID[id]) || null;     // legacy-7b: D-BUBBLE, the one move with no def

  const name = id => { const d = def(id) || legacy(id); return d ? d.name : id; };
  const type = id => { const d = def(id) || legacy(id); return d ? d.type : 'normal'; };
  const cat = id => { const d = def(id); return d ? d.category : 'physical'; };
  const isBuff = id => { const d = def(id); return !!d && G.TeamCards.selfOnly(d); };

  const kids = d => (d.payload || []).filter(fx => fx.t === 'emit' && fx.move).map(fx => ({ fx, d: typeof fx.move === 'string' ? def(fx.move) : fx.move })).filter(x => x.d);
  const special = (d, h) => (d.payload || []).some(fx => fx.t === 'special' && fx.handler === h);

  /** The badge from shape, motion and anchor. An emitter with no shape of its own takes its first child's badge. */
  function badgeOf(d, root) {
    if (!d) return null;
    if (root && G.TeamCards.selfOnly(d)) return 'buff';
    const s = d.space, v = d.delivery || {};
    const MOTION = { orbits: 'orbit', returns: 'boomerang', falls: 'meteor', repositions: 'dash' };
    if (MOTION[v.motion]) return MOTION[v.motion];
    if (v.anchor === 'world' && v.targeting === 'location') return (d.payload || []).some(fx => fx.t === 'emit' && fx.trigger === 'interval') ? 'turret' : 'mine';
    if (v.anchor === 'target' || special(d, 'chainDamageFalloff')) return 'chain';
    if (!s) {
      const k = kids(d);
      if (k.some(x => x.fx.trigger === 'casterMove')) return 'trail';
      return k.length ? badgeOf(k[0].d, false) : null;
    }
    if (s.shape === 'linear') return 'beam';
    if (v.motion === 'travels') return 'projectile';
    if (s.radArc == null || s.radArc >= TAU - 0.01) return d.persistent ? 'aura' : 'nova';
    return d.category === 'physical' ? 'melee' : 'cone';
  }
  const badge = id => badgeOf(def(id), true);

  // ---- the one-line description ----
  const STAT = { atk: 'Attack', def: 'Defense', spAtk: 'Sp. Atk', spDef: 'Sp. Def', spd: 'Speed', spa: 'Sp. Atk', spe: 'Speed' };
  const AIL = { burn: 'burn', paralysis: 'paralysis', freeze: 'freeze', poison: 'poison', toxic: 'bad poison', sleep: 'sleep', confusion: 'confusion', trap: 'trap' };
  const SURE = { burn: 'burns', paralysis: 'paralyzes', freeze: 'freezes', poison: 'poisons', toxic: 'badly poisons', sleep: 'puts to sleep', confusion: 'confuses', trap: 'traps' };
  const SHAPE = { melee: 'Close strike', cone: 'Cone', projectile: 'Shot', beam: 'Beam', nova: 'Burst around you', aura: 'Field around you',
    orbit: 'Circles you', boomerang: 'Returning shot', chain: 'Chains between foes', mine: 'Placed on the ground', meteor: 'Falls from above',
    dash: 'Dash strike', trail: 'Leaves a trail as you move', buff: 'Self', turret: 'Placed turret' };
  const pct = c => (c != null && c < 100 ? c + '% ' : '');
  const signed = n => (n > 0 ? '+' : '') + n;

  function phrase(fx, d) {
    switch (fx.t) {
      case 'damage': return d.basePower > 0 || d.power > 0 ? 'damage' : null;
      case 'ailment': return fx.chance >= 100 ? SURE[fx.id] || fx.id : pct(fx.chance) + (AIL[fx.id] || fx.id);
      case 'stat': {
        const who = fx.side === 'foe' ? 'foe ' : fx.scope === 'team' ? 'team ' : 'own ';
        return pct(fx.chance) + who + (STAT[fx.stat] || fx.stat) + ' ' + signed(fx.stages);
      }
      case 'heal': {
        const a = fx.amount || {};
        if (a.from === 'dealt') return 'heals ' + Math.round((a.fraction || 0) * 100) + '% of damage dealt';
        return 'heals ' + Math.round((a.fraction || 0) * 1000) / 10 + '% max HP' + (fx.per ? ' every ' + fx.per + ' s' : '');
      }
      case 'knockback': return 'knockback';
      case 'flinch': return pct(fx.chance) + 'flinch';
      case 'crit': return 'high critical chance';
      case 'recoil': return 'costs ' + Math.round((fx.fraction || 0) * 100) + '% HP';
      case 'shield': return 'shield' + (fx.duration ? ' for ' + fx.duration + ' s' : '');
      case 'special': {
        if (fx.handler === 'fixedDamage') return fx.amount + ' fixed damage';
        if (fx.handler === 'levelDamage') return 'damage equal to your level';
        if (fx.handler === 'statusBonus') return 'x' + fx.multiplier + ' on a statused foe';
        if (fx.handler === 'chainDamageFalloff') return 'hops to more foes';
        if (fx.handler === 'setWeather') return 'sets ' + fx.weather + (fx.duration ? ' for ' + fx.duration + ' s' : '');
        return null;
      }
      default: return null;
    }
  }
  /** Short effect phrases for a def and its emitted children, once each. */
  function effects(d) {
    const out = [];
    const add = (p, x) => { const t = p && phrase(p, x); if (t && !out.includes(t)) out.push(t); };
    (function walk(x, seen) {
      if (!x || seen.has(x)) return;
      seen.add(x);
      for (const fx of x.payload || []) { if (fx.t === 'emit') continue; add(fx, x); }
      for (const k of kids(x)) walk(Object.assign({ basePower: x.basePower, power: x.power }, k.d), seen);
    })(d, new Set());
    return out;
  }
  function desc(id) {
    const d = def(id);
    if (!d) { const l = legacy(id); return l ? l.desc : ''; }
    const b = badgeOf(d, true), fx = effects(d);
    const head = (SHAPE[b] || 'Effect') + (d.persistent ? ', always on' : '');
    return head + (fx.length ? ': ' + fx.join(', ') : '') + '.';
  }

  return { def, name, type, cat, isBuff, badge, desc, effects };
})();
