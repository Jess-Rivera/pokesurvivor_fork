/* ============ log.js, developer event log (only with ?dev) ============
 * Records what happens in a run as numbers in preallocated typed arrays, so logging
 * allocates nothing and builds no strings while you play. Text is built on request.
 * Without ?dev, G.Log.on is false and every call site skips its work.
 *
 *   G.Log.text(n)      last n records as text (default 40)
 *   G.Log.print(n)     console output, colored by attack type
 *   G.Log.pacing()     table: level reached, run time, seconds since the previous level
 *   G.Log.cast()       table: this run's cast, tier by tier, with class, Tank and Runner flags
 *   G.Log.bands()      table: where live enemies stand right now, by behavior, in screen units, against their spacing band
 *   G.Log.download()   JSON of every buffered record (text plus raw slots)
 *   G.Log.clear()
 *
 * Damage lines are a waterfall: a neutral baseline, then one signed delta per stage, adding
 * up to the final damage. Neutral = the hit as if the defender's stat were 50 (the same
 * neutral value props use). The buffer keeps the newest 8192 records.
 */
G.Log = (() => {
  const CAP = 8192, NF = 20;
  const F = new Float32Array(CAP * NF), K = new Uint8Array(CAP), T = new Float32Array(CAP);
  let head = 0, count = 0;
  const strs = [''], strIx = new Map([['', 0]]);
  const S = s => {
    s = s == null ? '' : String(s);
    let i = strIx.get(s);
    if (i === undefined) { i = strs.length; strs.push(s); strIx.set(s, i); }
    return i;
  };
  const HIT_IN = 1, HIT_OUT = 2, KILL = 3, XP = 4, OFFER = 5, PICK = 6, HEAL = 7, FAINT = 8, BLOCK = 9, DOT = 10;
  const KIND_NAME = ['', 'HIT_IN', 'HIT_OUT', 'KILL', 'XP', 'OFFER', 'PICK', 'HEAL', 'FAINT', 'BLOCK', 'DOT'];
  const api = { on: /[?&]dev\b/.test(location.search), t: 0 };

  function rec(kind) {
    const i = head;
    head = (head + 1) % CAP;
    if (count < CAP) count++;
    K[i] = kind; T[i] = api.t;
    return i * NF;
  }

  // Reused by Player.hurt call sites to name the attacker without allocating.
  const _who = { e: null, kind: '' };
  api.who = (e, kind) => { _who.e = e; _who.kind = kind; return _who; };

  // ---------------- recorders (numbers only) ----------------
  api.hitIn = (w, type, cat, neutral, dStat, afterDef, typeK, wxK, red, close, fin, hp0, hp1, flags, myPx) => {
    const o = rec(HIT_IN), e = w && w.e;
    F[o] = e ? e.dex : 0; F[o + 1] = (e && e.atkLvl) || 0; F[o + 2] = S(w ? w.kind : 'flat');
    F[o + 3] = cat; F[o + 4] = neutral; F[o + 5] = dStat; F[o + 6] = afterDef; F[o + 7] = typeK; F[o + 8] = wxK;
    F[o + 9] = red; F[o + 10] = close; F[o + 11] = fin; F[o + 12] = hp0; F[o + 13] = hp1; F[o + 14] = flags | (e && e.fl ? 8 : 0) | (e && e.boss ? 32 : 0);    // 8 = active flanker, 32 = boss
    F[o + 15] = S(type);
    F[o + 16] = e ? e.spd : 0; F[o + 17] = myPx || 0;   // attacker and your px/s at the moment of the hit
    // Where the attacker stood relative to you, in screen units (1.0 = screen edge; for a shot, where the shooter is when it lands),
    // and how many enemies were alive.
    const me = G.Game.player;
    F[o + 18] = e && me ? Math.hypot((e.x - me.x) / (G.Camera.w / 2), (e.y - me.y) / (G.Camera.h / 2)) : 0;
    F[o + 19] = G.EnemyMgr.count;
  };
  api.hitOut = (pl, m, e, cat, factor, dStat, stab, typeK, crit, fin, hp0, hp1, absorbed, norm) => {
    const o = rec(HIT_OUT);
    F[o] = pl.mon.dex; F[o + 1] = S(m.id); F[o + 2] = S(m.type); F[o + 3] = cat; F[o + 4] = pl.level;
    F[o + 5] = factor; F[o + 6] = dStat; F[o + 7] = stab; F[o + 8] = typeK; F[o + 9] = crit ? 1 : 0;
    F[o + 10] = fin; F[o + 11] = e.dex; F[o + 12] = hp0; F[o + 13] = hp1; F[o + 14] = absorbed; F[o + 15] = e.boss ? 1 : 0; F[o + 16] = norm || 1;
  };
  api.kill = e => {
    const o = rec(KILL);
    F[o] = e.dex; F[o + 1] = e.boss ? 1 : 0; F[o + 2] = e.atkLvl || 0; F[o + 3] = e.xp || 0;
    F[o + 4] = e.golden ? 1 : 0; F[o + 5] = e.shiny ? 1 : 0;
  };
  api.xp = (value, coopK, xpMul, lvl0, lvl1, xp1, xpNext) => {
    const o = rec(XP);
    F[o] = value; F[o + 1] = coopK; F[o + 2] = xpMul; F[o + 3] = lvl0; F[o + 4] = lvl1; F[o + 5] = xp1; F[o + 6] = xpNext;
  };
  api.offer = (level, cards, rerolls) => {
    const o = rec(OFFER);
    F[o] = level; F[o + 4] = rerolls; F[o + 5] = cards.length;
    for (let i = 0; i < 3 && i < cards.length; i++) F[o + 1 + i] = S(cards[i].key);
  };
  api.pick = key => { F[rec(PICK)] = S(key); };
  api.heal = (asked, got, hp, maxHp) => {
    const o = rec(HEAL);
    F[o] = asked; F[o + 1] = got; F[o + 2] = hp; F[o + 3] = maxHp;
  };
  api.faint = (saved, hp) => { const o = rec(FAINT); F[o] = saved ? 1 : 0; F[o + 1] = hp; };
  api.block = (w, factor, invuln) => {
    const o = rec(BLOCK), e = w && w.e;
    F[o] = e ? e.dex : 0; F[o + 1] = S(w ? w.kind : 'flat'); F[o + 2] = factor; F[o + 3] = invuln;
  };
  api.dot = (e, kind, amount, hp0, hp1) => {
    const o = rec(DOT);
    F[o] = e ? e.dex : 0; F[o + 1] = S(kind); F[o + 2] = amount; F[o + 3] = hp0; F[o + 4] = hp1; F[o + 5] = e && e.boss ? 1 : 0; F[o + 6] = e ? e.maxHp : 0;
  };
  api.clear = () => { head = 0; count = 0; };

  // ---------------- text (built only on request) ----------------
  const mmss = t => {
    const q = Math.round(t * 10), s = Math.floor(q / 10);   // tenths, rounded (times are stored as float32)
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') + '.' + (q % 10);
  };
  const n1 = x => (Math.round(x * 10) / 10).toFixed(1);
  const r2 = x => +x.toFixed(2);   // multipliers: strips float32 noise (1.600000023 -> 1.6)
  const sd = x => (x >= 0 ? '+' : '') + n1(x);
  const dexName = d => (G.DEX_BY[d] && G.DEX_BY[d].name) || (d ? '#' + d : 'env');
  const CAT = ['physical', 'special', 'status'];

  // Class tag from the class table: " (shielder)", " (plain+tank)", " (shooter+flanker)". Empty for bosses and anything not in the table.
  const tagOf = (dex, boss, flanker) => {
    const c = dex && !boss && G.ENEMY_CLASSES && G.ENEMY_CLASSES[dex];
    return c ? ' (' + c.c + (c.t ? '+tank' : '') + (flanker ? '+flanker' : '') + ')' : '';
  };

  function lineIn(v) {
    const [dex, lvl, kS, cat, neu, dS, aD, tK, wK, red, cl, fin, hp0, hp1, fl, tyS, aPx, myPx, sCr, live] = v;
    const who = (dex ? dexName(dex) + (lvl ? ' L' + n1(lvl) : '') + tagOf(dex, fl & 32, fl & 8) + ' ' : '') + strs[kS];
    const p = ['neutral ' + n1(neu)];
    let cur = neu;
    if (dS > 0) { p.push((cat === 1 ? 'SpD ' : 'Def ') + Math.round(dS) + ' ' + sd(aD - cur)); cur = aD; }
    else if (cat < 0 && dex) p.push('flat (no defense step)');
    if (tK !== 1) { p.push('type x' + r2(tK) + ' ' + sd(cur * tK - cur)); cur *= tK; }
    if (wK !== 1) { p.push('weather x' + r2(wK) + ' ' + sd(cur * wK - cur)); cur *= wK; }
    if (red) { const nx = cur * (1 - red); p.push('reduction ' + Math.round(red * 100) + '% ' + sd(nx - cur)); cur = nx; }
    if (cl !== 1) { const nx = cur * cl; p.push('melee x' + r2(cl) + ' ' + sd(nx - cur)); cur = nx; }
    if (fl & 1) p.push('floor ' + sd(fin - cur));
    if (fl & 4) p.push('pure');
    if (aPx > 0 && myPx > 0) p.push('speed ' + Math.round(aPx) + ' vs you ' + Math.round(myPx));
    if (sCr > 0) p.push('s ' + sCr.toFixed(2) + ', ' + live + ' alive');
    return 'IN   ' + who + ' [' + (strs[tyS] || 'none') + '] > you | ' + p.join(' | ') +
           ' | FINAL ' + n1(fin) + '  HP ' + n1(hp0) + ' > ' + n1(hp1);
  }
  function lineOut(v) {
    const [pdex, mS, tyS, cat, lvl, factor, dS, stab, tK, crit, fin, edex, hp0, hp1, abs, boss, nm] = v, norm = nm || 1;
    const sc = G.Stats.DMG_SCALAR;
    const neu = (factor / 50 + 2) * sc, st = neu * stab, aD = (factor / Math.max(1, dS) + 2) * stab * sc;
    const p = ['neutral ' + n1(neu)];
    if (stab !== 1) p.push('STAB x' + r2(stab) + ' ' + sd(st - neu));
    p.push((cat === 1 ? 'SpD ' : cat === 0 ? 'Def ' : 'prop ') + Math.round(dS) + ' ' + sd(aD - st));
    const aN = aD * norm;
    if (norm !== 1) p.push('per-cast x' + r2(norm) + ' ' + sd(aN - aD));
    if (tK !== 1) p.push('type x' + r2(tK) + ' ' + sd(aN * tK - aN));
    if (crit) p.push('crit x1.5 ' + sd(aN * tK * 0.5));
    p.push('FINAL ' + n1(fin) + (abs ? ' (shield took ' + Math.round(abs) + ')' : ''));
    return 'OUT  ' + dexName(pdex) + ' L' + lvl + ' ' + strs[mS] + ' [' + strs[tyS] + ' ' + CAT[cat] + '] > ' +
           dexName(edex) + (boss ? ' (boss)' : '') + ' | ' + p.join(' | ') + '  HP ' + n1(hp0) + ' > ' + n1(hp1);
  }
  function fmt(i) {
    const v = Array.from(F.subarray(i * NF, i * NF + NF)), k = K[i];
    let s;
    if (k === HIT_IN) s = lineIn(v);
    else if (k === HIT_OUT) s = lineOut(v);
    else if (k === KILL) s = 'KILL ' + dexName(v[0]) + (v[1] ? ' (boss)' : tagOf(v[0], 0, 0)) + (v[2] ? ' L' + n1(v[2]) : '') + ' dropped ' + v[3].toFixed(2) + ' xp' + (v[4] ? ' (golden)' : '') + (v[5] ? ' (shiny)' : '');
    else if (k === XP) s = 'XP   +' + n1(v[0] * v[1] * v[2]) + ' (orb ' + v[0].toFixed(2) + ' x coop ' + v[1] + ' x bonus ' + n1(v[2]) + ')  ' + Math.round(v[5]) + '/' + v[6] + (v[4] > v[3] ? '  LEVEL ' + v[3] + ' > ' + v[4] : '');
    else if (k === OFFER) s = 'OFFER L' + v[0] + ' [' + [v[1], v[2], v[3]].slice(0, v[5]).map(x => strs[x]).join(', ') + '] rerolls used ' + v[4];
    else if (k === PICK) s = 'PICK  ' + strs[v[0]];
    else if (k === HEAL) s = 'HEAL +' + n1(v[1]) + ' (asked ' + n1(v[0]) + ')  HP ' + n1(v[2]) + '/' + n1(v[3]);
    else if (k === FAINT) s = v[0] ? 'FOCUS BAND saved you at HP ' + v[1] : 'FAINT';
    else if (k === BLOCK) s = 'BLOCKED ' + (v[0] ? dexName(v[0]) + ' ' : '') + strs[v[1]] + ' (i-frames, ' + v[3].toFixed(2) + 's left)';
    else if (k === DOT) s = 'DOT  ' + strs[v[1]] + ' > ' + dexName(v[0]) + (v[5] ? ' (boss)' : '') + ' | ' + n1(v[2]) + (v[6] ? ' (' + n1(100 * v[2] / v[6]) + '% of max)' : '') + '  HP ' + n1(v[3]) + ' > ' + n1(v[4]);
    else s = '?';
    return mmss(T[i]) + '  ' + s;
  }
  const COLORS = { 3: '#ffd23f', 4: '#5fe08a', 5: '#9fb1c9', 6: '#9fb1c9', 7: '#5fe08a', 8: '#ff3048', 9: '#8a93a3', 10: '#ff9a4d' };
  function color(i) {
    const k = K[i];
    if (k === HIT_IN || k === HIT_OUT) {
      const ty = strs[F[i * NF + (k === HIT_IN ? 15 : 2)]];
      return (G.U.TYPE_COLOR && G.U.TYPE_COLOR[ty]) || '#ccc';
    }
    return COLORS[k] || '#ccc';
  }
  const order = n => {
    const m = Math.min(n, count), out = [];
    for (let j = m; j > 0; j--) out.push((head - j + CAP) % CAP);
    return out;
  };

  api.text = (n = 40) => order(n).map(fmt).join('\n');
  api.print = (n = 40) => { for (const i of order(n)) console.log('%c' + fmt(i), 'color:' + color(i)); };
  api.pacing = () => {
    const rows = []; let prev = 0;
    for (const i of order(count)) {
      if (K[i] !== XP || F[i * NF + 4] <= F[i * NF + 3]) continue;
      rows.push({ level: F[i * NF + 4], at: mmss(T[i]), sinceLast: +(T[i] - prev).toFixed(1) });
      prev = T[i];
    }
    console.table(rows);
    return rows;
  };
  api.cast = () => {
    const rows = [];
    G.Enemies.cast.forEach((t, ti) => { for (const d of t.list) rows.push({ tier: ti + 1, species: d.name, class: G.Enemies.classOf(G.DEX_BY[d.dex]), tank: d.tank ? 'yes' : '', flanker: d.flanker ? 'yes' : '' }); });
    console.table(rows);
    return rows;
  };
  api.bands = () => {
    const pl = G.Game.player, B = G.Enemies.BANDS, by = {};
    if (!pl) return [];
    for (const e of G.EnemyMgr.all()) {
      if (e.dead || e.boss) continue;
      (by[e.behavior] = by[e.behavior] || []).push(Math.hypot((e.x - pl.x) / (G.Camera.w / 2), (e.y - pl.y) / (G.Camera.h / 2)));
    }
    const rows = Object.keys(by).map(k => {
      const a = by[k].sort((x, y) => x - y), b = B[k];
      return { behavior: k, n: a.length, min: +a[0].toFixed(2), median: +a[a.length >> 1].toFixed(2), max: +a[a.length - 1].toFixed(2),
               band: b ? b[0] + ' to ' + b[1] : (k === 'shielder' || k === 'healer' ? 'floor ' + G.Enemies.SEEK.floor : '-'), inBand: b ? a.filter(x => x >= b[0] && x <= b[1] * 1.05).length : '-' };
    });
    console.table(rows);
    return rows;
  };
  api.download = () => {
    const rows = order(count).map(i => ({ t: +T[i].toFixed(2), kind: KIND_NAME[K[i]], text: fmt(i), v: Array.from(F.subarray(i * NF, i * NF + NF)) }));
    // First row: this run's cast with class and modifier flags, so a log can be read without the game open.
    rows.unshift({ t: 0, kind: 'CAST', v: [], text: 'region ' + (G.Enemies.region == null ? 'all' : G.Enemies.region) + '\n' +
      G.Enemies.cast.map((t, ti) => 'T' + (ti + 1) + ': ' + t.list.map(d => d.name + ' (' + G.Enemies.classOf(G.DEX_BY[d.dex]) + (d.tank ? '+tank' : '') + (d.flanker ? '+flanker' : '') + ')').join(', ')).join('\n') });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(rows)], { type: 'application/json' }));
    a.download = 'pokesurvivor-log-' + Date.now() + '.json';
    a.click();
    return rows.length;
  };
  return api;
})();
