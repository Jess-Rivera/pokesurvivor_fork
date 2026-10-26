// tools/validate_moves.js: checks js/data/moves-generated.js against the grammar in js/data/move-attributes.js.
// Usage: node tools/validate_moves.js            self-test, validate every move, print the coverage buckets
//        node tools/validate_moves.js --report   also write docs/current feature planning/move-coverage-report.md
//        node tools/validate_moves.js --resolved   validate the resolver output (G.MoveDefs) instead of the raw data
// Exit code 1 if the self-test or any move fails.
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
global.G = {};
require(path.join(root, 'js/data/move-attributes.js'));
require(path.join(root, 'js/data/moves-generated.js'));
const A = G.MoveAttrs, RESOLVED = process.argv.includes('--resolved');
let DATA = G.MoveData;
if (RESOLVED) {   // handlers is the resolver's own addition, not a grammar field, so strip it before checking
  for (const f of ['move-overrides', 'move-handler', 'move-resolver']) require(path.join(root, 'js/data', f + '.js'));
  DATA = structuredClone(G.MoveDefs); for (const m of Object.values(DATA)) delete m.handlers;
}

// ---------- rules: conditions over paths ----------
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const pick = (o, p) => p.split('.').reduce((cur, k) => cur.flatMap(x => (isObj(x) && k in x) ? (Array.isArray(x[k]) ? x[k] : [x[k]]) : []), [o]);
const test = (c, o) => c.has ? pick(o, c.has).length > 0
  : c.eq ? pick(o, c.eq[0]).some(x => x === c.eq[1])
  : c.in ? pick(o, c.in[0]).some(x => c.in[1].includes(x))
  : c.gt ? pick(o, c.gt[0]).some(x => x > c.gt[1])
  : c.not ? !test(c.not, o)
  : c.any ? c.any.some(d => test(d, o)) : c.all.every(d => test(d, o));

// ---------- formulas ----------
const refsIn = x => isObj(x) ? (x.op === 'ref' ? [x.path] : (x.args || []).flatMap(refsIn)) : [];
function formula(v, p, err, ctx) {
  if (typeof v === 'number') { if (!isFinite(v)) err(p, 'must be finite'); return; }
  if (!isObj(v)) return err(p, 'must be a number or a formula object');
  if (v.op === 'ref') {
    if (A.FORMULA.refs.includes(v.path)) {
      if (v.path === 'cast.paid' && !(ctx.move.payload || []).some(e => e.t === 'recoil' && e.trigger === 'cast')) err(p, 'cast.paid is undefined: the move has no recoil on cast');
    } else if (typeof v.path === 'string' && v.path.startsWith('effect.')) {
      if (!(v.path.slice(7) in ctx.obj)) err(p, v.path + ' does not exist on this effect');
    } else err(p, 'unknown reference "' + v.path + '"');
    return;
  }
  const op = A.FORMULA.ops[v.op];
  if (!op) return err(p, 'unknown operation "' + v.op + '"');
  if (!Array.isArray(v.args) || v.args.length < op.min) return err(p, v.op + ' needs at least ' + op.min + ' arguments');
  v.args.forEach((a, i) => formula(a, p + '.args[' + i + ']', err, ctx));
}
function hasCycle(g) {   // g: name -> [names it refers to]
  const state = {};
  const visit = n => { if (state[n] === 1) return true; if (state[n] === 2) return false; state[n] = 1;
    const bad = (g[n] || []).some(visit); state[n] = 2; return bad; };
  return Object.keys(g).some(visit);
}

// ---------- the checker ----------
function check(spec, v, p, err, ctx) {
  if (typeof spec === 'string') spec = { t: spec };
  if (v === null) return spec.nullable ? 0 : err(p, 'must not be null');
  const sub = (k) => p ? p + '.' + k : k;
  switch (spec.t) {
    case 'str': if (typeof v !== 'string' || (!v && !spec.empty)) err(p, 'must be a non-empty string'); break;
    case 'bool': if (typeof v !== 'boolean') err(p, 'must be true or false'); break;
    case 'num': case 'int':
      if (v === A.UNLIMITED) { if (!spec.u) err(p, 'UNLIMITED is not allowed here'); break; }
      if (typeof v !== 'number' || !isFinite(v)) return err(p, 'must be a number (got ' + JSON.stringify(v) + ')');
      if (spec.t === 'int' && !Number.isInteger(v)) return err(p, 'must be a whole number');
      if (spec.min !== undefined && v < spec.min) err(p, 'must be at least ' + spec.min);
      if (spec.max !== undefined && v > spec.max) err(p, 'must be at most ' + spec.max);
      if (spec.gt !== undefined && v <= spec.gt) err(p, 'must be above ' + spec.gt);
      break;
    case 'enum': if (!spec.v.includes(v)) err(p, 'must be one of ' + spec.v.join(', ') + ' (got ' + JSON.stringify(v) + ')'); break;
    case 'list':
      if (!Array.isArray(v)) return err(p, 'must be a list');
      if (spec.min && v.length < spec.min) err(p, 'needs at least ' + spec.min + ' item(s)');
      v.forEach((x, i) => check(spec.of, x, p + '[' + i + ']', err, ctx));
      break;
    case 'obj': {
      if (!isObj(v)) return err(p, 'must be an object');
      const c = { ...ctx, obj: v, move: spec.root ? v : ctx.move };
      for (const k of Object.keys(v)) { if (k in spec.f) check(spec.f[k], v[k], sub(k), err, c); else err(sub(k), 'unknown field'); }
      for (const k of spec.req) if (!(k in v)) err(sub(k), 'required');
      for (const r of spec.rules || []) if ([].concat(r.when).every(w => test(w, v)) && ![].concat(r.then).every(t => test(t, v))) err(p, r.id + ': ' + r.msg);
      const fm = Object.keys(spec.f).filter(k => k in v && spec.f[k].t === 'formula');   // formula fields must not refer in a circle
      if (fm.length) { const g = {}; for (const k of fm) g[k] = refsIn(v[k]).filter(r => r.startsWith('effect.')).map(r => r.slice(7)).filter(n => fm.includes(n));
        if (hasCycle(g)) err(p, 'formula fields refer to each other in a cycle'); }
      break;
    }
    case 'oneKey': {
      const ks = isObj(v) ? Object.keys(v) : [];
      if (ks.length !== 1) return err(p, 'must have exactly one key of ' + Object.keys(spec.f).join(', '));
      if (!(ks[0] in spec.f)) return err(p, 'unknown condition "' + ks[0] + '"');
      check(spec.f[ks[0]], v[ks[0]], p + '.' + ks[0], err, ctx);
      break;
    }
    case 'union': {
      if (!isObj(v)) return err(p, 'must be an object');
      const k = v[spec.key];
      if (!(k in spec.of)) return err(p, 'unknown ' + spec.key + ' "' + k + '"');
      const { [spec.key]: _, ...rest } = v;
      check(spec.of[k], rest, p, err, ctx);
      break;
    }
    case 'anyOf': {
      let best = null;
      for (const s of spec.of) {
        const e = []; check(s, v, p, (pp, m) => e.push([pp, m]), ctx);
        if (!e.length) { best = null; break; }
        if (!best || e.length <= best.length) best = e;
      }
      if (best) best.forEach(([pp, m]) => err(pp, m));
      break;
    }
    case 'ref': check(A.NAMED[spec.n], v, p, err, ctx); break;
    case 'formula': formula(v, p, err, ctx); break;
    default: throw new Error('bad spec ' + JSON.stringify(spec));
  }
}

function validateMoves(moves) {   // -> { id: [errors] } for the failing ones
  const bad = {}, ids = Object.keys(moves), edges = {};
  for (const id of ids) {
    const errs = [], err = (p, m) => errs.push((p || '(move)') + ': ' + m);
    check(A.MOVE, moves[id], '', err, {});
    if (moves[id].id !== id) err('id', 'does not match its key "' + id + '"');
    edges[id] = (moves[id].payload || []).filter(e => e && e.t === 'emit' && typeof e.move === 'string').map(e => e.move);
    for (const to of edges[id]) if (!moves[to]) err('payload', 'emit refers to unknown move "' + to + '"');
    if (errs.length) bad[id] = errs;
  }
  if (hasCycle(edges)) bad['(emit graph)'] = ['moves emit each other in a cycle'];
  return bad;
}

// ---------- self-test: broken moves must be rejected for the right reason ----------
function selfTest() {
  const base = () => JSON.parse(JSON.stringify({ id: 'x', name: 'X', balanceClass: 'melee', type: 'normal', category: 'physical', power: 40, pp: 35, accuracy: 100, priority: 0,
    space: { shape: 'radial', radArc: 1.7, radRadius: 48, count: 1 }, delivery: { anchor: 'caster', targeting: 'nearest', motion: 'static', endOn: [{ time: 0.15 }] },
    hitPolicy: 'oncePerInstance', payload: [{ t: 'damage' }] }));
  const sub = () => { const m = { ...base(), category: 'status', delivery: { anchor: 'self', targeting: 'self' }, payload: [
    { t: 'recoil', fraction: 0.25, trigger: 'cast' },
    { t: 'shield', amount: { op: 'multiply', args: [{ op: 'ref', path: 'cast.paid' }, 2] }, duration: 6 }] }; delete m.space; return m; };
  const cases = [
    ['good move passes', m => m, null],
    ['good formula passes', () => sub(), null],
    ['retired field kind', m => (m.kind = 'melee', m), 'kind: unknown field'],
    ['retired field hitCap', m => (m.space.hitCap = 3, m), 'space.hitCap: unknown field'],
    ['unknown payload type', m => (m.payload.push({ t: 'bogus' }), m), 'unknown t "bogus"'],
    ['grow without an end', m => (m.delivery.grow = { growSpeed: 100 }, delete m.delivery.endOn, m), 'grow-needs-end'],
    ['interval without rehit', m => (m.hitPolicy = 'interval', m), 'interval-needs-rehit'],
    ['trigger lasting until triggered passes', m => (m.delivery.trigger = 'contact', m.delivery.endOn = [{ notActive: true }], m), null],
    ['trigger with no end condition', m => (m.delivery.trigger = 'contact', delete m.delivery.endOn, m), 'trigger-needs-end'],
    ['returns with an arc shape', m => (m.delivery.motion = 'returns', m.delivery.moveSpeed = 300, m), 'returns-needs-point-or-linear'],
    ['spread beside count 1 is kept', m => (m.space.spread = 0.2, m), null],
    ['UNLIMITED outside pierce', m => (m.space.count = A.UNLIMITED, m), 'UNLIMITED is not allowed here'],
    ['leftover UNLIMITED string', m => (m.space.pierce = 'UNLIMITED', m), 'space.pierce: must be a number'],
    ['unknown formula op', () => { const m = sub(); m.payload[1].amount.op = 'power'; return m; }, 'unknown operation "power"'],
    ['unknown formula reference', () => { const m = sub(); m.payload[1].amount.args[0].path = 'cast.nope'; return m; }, 'unknown reference'],
    ['cast.paid without recoil', () => { const m = sub(); m.payload.shift(); return m; }, 'cast.paid is undefined'],
    ['formula cycle', () => { const m = sub(); m.payload[1].max = { op: 'ref', path: 'effect.regen' }; m.payload[1].regen = { op: 'ref', path: 'effect.max' }; return m; }, 'cycle'],
    ['unknown special handler', m => (m.payload.push({ t: 'special', handler: 'nope' }), m), 'unknown handler "nope"'],
    ['stat without scope', m => (m.payload.push({ t: 'stat', stat: 'atk', stages: 1, side: 'self' }), m), 'scope: required'],
    ['emit of an unknown move id', m => (m.payload.push({ t: 'emit', move: 'ghost', trigger: 'cast' }), m), 'unknown move "ghost"'],
  ];
  let fails = 0;
  for (const [name, mut, expect] of cases) {
    const bad = validateMoves({ x: mut(base()) }), msgs = (bad.x || []).concat(bad['(emit graph)'] || []);
    const ok = expect === null ? msgs.length === 0 : msgs.some(m => m.includes(expect));
    if (!ok) { fails++; console.log('SELFTEST FAIL: ' + name + ' (expected ' + (expect || 'no errors') + ', got ' + (msgs.join(' | ') || 'no errors') + ')'); }
  }
  const cyc = validateMoves({ a: { ...base(), id: 'a', payload: [{ t: 'emit', move: 'b', trigger: 'cast' }] }, b: { ...base(), id: 'b', payload: [{ t: 'emit', move: 'a', trigger: 'cast' }] } });
  if (!cyc['(emit graph)']) { fails++; console.log('SELFTEST FAIL: emit cycle between two moves was not caught'); }
  console.log('self-test: ' + (cases.length + 1 - fails) + '/' + (cases.length + 1) + ' passed');
  return fails;
}

// ---------- coverage buckets ----------
function coverage(moves) {
  const buckets = { geometry: {}, motion: {}, anchor: {}, targeting: {}, payload: {} };
  const put = (axis, key, id) => ((buckets[axis][key] = buckets[axis][key] || []).push(id));
  for (const [id, m] of Object.entries(moves)) {
    const s = m.space, d = m.delivery;
    put('geometry', !s ? 'none (shapeless)' : s.shape === 'linear' ? 'linear' : s.radArc === undefined ? 'radial point' : s.radArc >= 6.28 ? 'radial full circle' : 'radial arc', id);
    put('motion', d.motion || '(none)', id); put('anchor', d.anchor, id); put('targeting', d.targeting, id);
    put('payload', [...new Set(m.payload.map(e => e.t === 'special' ? 'special:' + e.handler : e.t))].sort().join(' + '), id);
  }
  return buckets;
}
const bucketText = b => Object.entries(b).map(([axis, g]) => '## ' + axis + '\n\n' + Object.entries(g).sort((x, y) => y[1].length - x[1].length)
  .map(([k, ids]) => '- ' + k + ' (' + ids.length + '): ' + ids.join(', ')).join('\n')).join('\n\n');

// ---------- run ----------
let failed = selfTest();
const bad = validateMoves(DATA), total = Object.keys(DATA).length;
for (const [id, errs] of Object.entries(bad)) for (const e of errs) console.log('INVALID ' + id + ' > ' + e);
console.log((RESOLVED ? 'resolved ' : '') + 'moves: ' + (total - Object.keys(bad).length) + '/' + total + ' valid');
const cov = bucketText(coverage(DATA));
if (process.argv.includes('--report')) {
  const out = path.join(root, 'docs/current feature planning/move-coverage-report.md');
  fs.writeFileSync(out, '# Move coverage report (generated by tools/validate_moves.js, do not edit)\n\nEvery move bucketed by realized geometry, motion, anchor, targeting and payload set. Validation: ' + (total - Object.keys(bad).length) + '/' + total + ' moves valid.\n\n' + cov + '\n');
  console.log('wrote ' + path.relative(root, out));
} else console.log('\n' + cov);
process.exit(failed || Object.keys(bad).length ? 1 : 0);
