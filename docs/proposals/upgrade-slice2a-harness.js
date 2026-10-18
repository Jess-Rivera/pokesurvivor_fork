const fs=require('fs'),vm=require('vm');
const R=process.argv[2]; // repo root
const load=(p)=>vm.runInThisContext(fs.readFileSync(p,'utf8'));
global.G={U:{}};
const N=process.env.NEW||'new';
load(`${N}/js/data/kinds.js`);load(`${N}/js/data/mechanics.js`);load(`${N}/js/data/moves.js`);
const cat=JSON.parse(fs.readFileSync(R+'/docs/move-catalogue-preview.json','utf8'));
let fail=0;const bad=(m)=>{fail++;if(fail<25)console.log('FAIL',m)};
const A=G.Moves.ALL,TOL=1e-9;
// 0. kinds cover every kind in moves, vocab ok
for(const m of A) if(!G.Kinds.BY[m.kind]) bad('no kind '+m.kind);
// 1. eligibility + text equal the catalogue export for all 64 moves
for(const cm of cat.moves){
  const m=G.Moves.BY_ID[cm.id];
  const got=G.Mechanics.eligibleFor(m).map(x=>x.id).join(),want=cm.eligible.map(e=>e.id).join();
  if(got!==want)bad(`${cm.id} eligible got [${got}] want [${want}]`);
  for(const e of cm.eligible){const t=G.Mechanics.text(m,G.Mechanics.BY_ID[e.id]);if(t!==e.text)bad(`${cm.id} ${e.id} text "${t}" vs "${e.text}"`);}
}
console.log('1 eligibility+text vs export: checked',cat.moves.length,'moves');
// 2. derive with no mods equals the definition; instance fields equal def
for(const m of A){const s=G.Moves.instance(m.id);G.Moves.derive(s);for(const k of Object.keys(m)){if(k==='ups')continue;if(typeof m[k]==='number'&&Math.abs(s[k]-m[k])>TOL)bad(`${m.id}.${k} drift`);}}
console.log('2 derive(no mods) == definition');
// 3. one stack changes exactly one field, by the step
const num=(o)=>Object.fromEntries(Object.entries(o).filter(([k,v])=>typeof v==='number'));
for(const m of A)for(const mech of G.Mechanics.eligibleFor(m)){
  const s=G.Moves.instance(m.id),before=num(s);
  if(!G.Moves.addStack(s,mech.id)){bad(`${m.id} ${mech.id} addStack refused`);continue;}
  const after=num(s),key=mech.keyFor(m),b=before[key]==null?0:before[key];
  let want=mech.mode==='add'?b+mech.step:mech.mode==='inc'?b*(1+mech.step):b/(1+mech.step);
  if(key==='arc')want=Math.min(want,G.Mechanics.TWO_PI);
  if(Math.abs(after[key]-want)>1e-6)bad(`${m.id} ${mech.id} ${key} ${after[key]} want ${want}`);
  for(const k in after)if(k!==key&&Math.abs(after[k]-(before[k]==null?0:before[k]))>TOL&&!(k==='t'))bad(`${m.id} ${mech.id} also changed ${k}`);
}
console.log('3 one stack = one field, exact step');
// 4. ineligible pairs are refused
let ref=0;for(const m of A)for(const mech of G.Mechanics.ALL){if(G.Mechanics.check(m,mech).ok)continue;const s=G.Moves.instance(m.id);if(G.Moves.addStack(s,mech.id))bad(`${m.id} ${mech.id} accepted though ineligible`);ref++;}
console.log('4 ineligible refused:',ref);
// 5. order independence + 50-stack stress: finite, cd>0, arc<=2pi, integer counts, ceilings flip eligibility
for(const m of A){
  const a=G.Moves.instance(m.id),b=G.Moves.instance(m.id);
  const el=G.Mechanics.eligibleFor(m).map(x=>x.id);
  for(let r=0;r<50;r++)for(const id of el)G.Moves.addStack(a,id);
  for(let r=0;r<50;r++)for(const id of el.slice().reverse())G.Moves.addStack(b,id);
  for(const k in num(a)){if(!Number.isFinite(a[k]))bad(`${m.id}.${k} not finite`);if(Math.abs(a[k]-b[k])>1e-6*Math.max(1,Math.abs(a[k])))bad(`${m.id}.${k} order dependent`);}
  if(!(a.cd>0))bad(`${m.id} cd ${a.cd}`);if(a.arc!=null&&a.arc>G.Mechanics.TWO_PI+1e-9)bad(`${m.id} arc ${a.arc}`);
  if(a.count!=null&&!Number.isInteger(a.count))bad(`${m.id} count ${a.count}`);
  if(a.norm!==m.norm||a.floor!==m.floor)bad(`${m.id} norm/floor touched`);
  if(a.arc!=null&&a.arc>=G.Mechanics.TWO_PI-0.01&&G.Mechanics.check(a,G.Mechanics.BY_ID.arc).ok)bad(`${m.id} arc ceiling not enforced`);
}
console.log('5 order independent, 50x stress finite, ceilings, norm/floor untouched');
// 6. every (kind,key) pair is read by the engine source
const src=fs.readFileSync(R+'/js/systems/combat.js','utf8').replace(/\r\n/g,'\n');
const fn=(name)=>{const i=src.search(new RegExp('function '+name+'\\('));if(i<0)return '';const j=src.indexOf('\n  function ',i+10);return src.slice(i,j<0?undefined:j);};
const HOOK={projectile:['fireProjectiles'],cone:['cone'],nova:['nova'],melee:['melee'],dash:['dash'],beam:['beam'],aura:['aura'],orbit:['orbit'],boomerang:['boomerang','updateFields'],chain:['chain'],trail:['trailPatch','updateFields'],mine:['mines','updateFields'],meteor:['meteors','updateFields'],turret:['turret','updateFields'],buff:['buff']};
const PAY=['knock']; // read through payload(m)/hit knock args
const usesPayload=(t)=>/payload\(m\)/.test(t);
let c6=0;
for(const [kind,def] of Object.entries(G.Kinds.BY))for(const key of def.keys){
  if(key==='dmg'||key==='cd')continue; // dmg via moveFactor(m), cd via tickMove (all kinds)
  const text=(HOOK[kind]||[]).map(fn).join('\n');
  const direct=new RegExp('\\bm\\.'+key+'\\b').test(text)||new RegExp('\\.m\\.'+key+'\\b').test(text);
  const viaPayload=key==='knock'&&usesPayload(text);
  if(!direct&&!viaPayload)bad(`engine: ${kind}.${key} not read in ${HOOK[kind]}`);c6++;
}
console.log('6 (kind,key) pairs backed by engine source:',c6);
console.log(fail?`FAILURES: ${fail}`:'ALL PASS');process.exit(fail?1:0);
