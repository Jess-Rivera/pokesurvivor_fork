/* ============ run-ui.js — level cards, pause and end of run ============ */
G.RunUI = (() => {
  const $ = G.UI.$;
  let offers = null, offerCb = null, coopMode = false;
  let flow = null;            // mechanic card in progress: { card, idx, targets, step, target, monSkipped }
  let autoT = 0;              // auto-advance timer (a single legal choice is shown for a beat, then taken)
  const AUTO_MS = 700;

  /** @param coop  in a group: after choosing, it waits for the others */
  function showLevelUp(level, list, cb, coop = false) {
    offerCb = cb; coopMode = coop; flow = null; clearAuto();
    $('lvl-num').textContent = level;
    $('lvl-wait').textContent = '';
    $('lvl-wait').classList.toggle('hidden', !coop);
    $('cards').classList.remove('done');
    $('lvl-back').onclick = back;
    renderCards(list);
    $('lvl-reroll').onclick = reroll;
    G.UI.show('scr-levelup');
  }

  /**
   * Reroll the cards: 1 free time per game and 1 more per boss
   * defeated (in a group the team's bosses count; each one has their own).
   */
  function rerollsLeft() {
    const p = G.Game.player;
    // 1 free + the ones bought in Upgrades (before, 1 more per boss).
    return p ? Math.max(0, 1 + (p.rerollBonus || 0) - (p.rerolls || 0)) : 0;
  }

  function reroll() {
    if (!offers || flow || rerollsLeft() <= 0) return;
    const p = G.Game.player;
    p.rerolls = (p.rerolls || 0) + 1;
    G.Audio.sfx('select');
    renderCards(G.LevelUp.offer(p, 3, G.Game.roster));
  }

  function clearAuto() { if (autoT) { clearTimeout(autoT); autoT = 0; } }

  /** One row of the level-up screen (card, Pokemon or move). */
  function row(o) {
    const el = document.createElement('div');
    el.className = 'card' + (o.dim ? ' dim' : '') + (o.flash ? ' flash' : '');
    const chip = o.chip ? `<span class="tag-chip" style="background:${o.chipColor || '#9fb1c9'}">${o.chip}</span>` : '';
    el.innerHTML =
      `<div class="ico" style="background:${o.color}33"></div>
       <div class="txt"><div class="nm">${o.title} ${chip}</div><div class="ds">${o.desc}</div></div>
       <div class="key">${o.key || ''}</div>`;
    const ico = el.querySelector('.ico');
    if (o.icoNode) ico.appendChild(o.icoNode);
    else if (o.icoHtml) ico.innerHTML = o.icoHtml;
    else { ico.textContent = o.icoText || ''; ico.style.color = o.color; ico.style.fontWeight = '800'; ico.style.fontSize = '15px'; }
    el.dataset.sfx = 'none';             // el juego pone su propio sonido al elegir
    if (!o.dim && o.onclick) el.onclick = o.onclick;
    return el;
  }

  function setHeader(step) {
    $('lvl-sub').classList.toggle('hidden', !!step);
    $('lvl-step').classList.toggle('hidden', !step);
    $('lvl-step').textContent = step || '';
    $('lvl-back').classList.toggle('hidden', !step);
  }

  function renderCards(list, doneIdx = null) {
    offers = list;
    setHeader('');
    const left = rerollsLeft();
    $('lvl-rr-n').textContent = left;
    $('lvl-reroll').classList.toggle('hidden', left <= 0);
    const box = $('cards');
    box.innerHTML = '';
    list.forEach((c, i) => {
      const el = row({
        title: c.title, desc: c.desc, color: c.color, key: G.Input.keyLabel('attack_' + (i + 1)),
        chip: c.type === 'new' ? 'Nuevo · ' + c.tag : c.tag, chipColor: c.color === '#ffd23f' ? '#ffd23f' : c.color,
        icoHtml: c.icon ? G.Icons.html(c.icon, 32) : '', icoText: c.ico, onclick: () => pick(i)
      });
      if (doneIdx === i) el.classList.add('picked');
      box.appendChild(el);
    });
    if (doneIdx != null) box.classList.add('done');
  }

  // ---- card -> Pokemon -> move ----

  function pick(i) {
    if (!offers || !offers[i]) return;
    if (flow) return;                       // rows of the later steps have their own handlers
    const c = offers[i];
    if (c.type !== 'mech') { finish(c, null, i); return; }
    G.Audio.sfx('select');
    flow = { card: c, idx: i, targets: c.targets(G.Game.roster), step: 'pokemon', target: null, monSkipped: false };
    renderMonStep();
  }

  function renderMonStep() {
    clearAuto();
    flow.step = 'pokemon';
    setHeader('Choose a Pokémon for ' + flow.card.title);
    $('lvl-reroll').classList.add('hidden');
    const ok = flow.targets.filter(t => t.ok);
    const only = ok.length === 1 ? ok[0] : null;
    const box = $('cards');
    box.innerHTML = '';
    flow.targets.forEach((t, ti) => {
      const n = t.moves.filter(x => x.ok).length;
      const f = t.pl;
      box.appendChild(row({
        title: f.mon.name, color: G.U.TYPE_COLOR[f.mon.types[0]] || '#6b7a94',
        desc: n ? n + (n === 1 ? ' move can take it' : ' moves can take it') : 'No move can take it',
        chip: f.dead ? 'Fainted' : (G.Game.player === f ? 'On field' : ''), chipColor: f.dead ? '#8a93a3' : '#5fcb6a',
        key: G.Input.keyLabel('swap_' + ((f.teamSlot != null ? f.teamSlot : ti) + 1)),
        icoNode: G.UI.spriteCanvas(f.dex, 46, 46, { scale: 1, shiny: f.shiny }),
        dim: !t.ok, flash: t === only, onclick: () => pickMon(ti)
      }));
    });
    if (only) autoT = setTimeout(() => { autoT = 0; if (flow && flow.step === 'pokemon') pickMon(flow.targets.indexOf(only), true); }, AUTO_MS);
  }

  function pickMon(ti, auto = false) {
    if (!flow || flow.step !== 'pokemon' || !flow.targets[ti] || !flow.targets[ti].ok) return;
    clearAuto();
    flow.target = flow.targets[ti];
    flow.monSkipped = auto || flow.targets.filter(t => t.ok).length === 1;
    G.Audio.sfx('select');
    renderMoveStep();
  }

  function renderMoveStep() {
    clearAuto();
    flow.step = 'move';
    const { card, target } = flow;
    setHeader('Choose a move for ' + target.pl.mon.name + ': ' + card.title);
    const ok = target.moves.filter(x => x.ok);
    const only = ok.length === 1 ? ok[0] : null;
    const box = $('cards');
    box.innerHTML = '';
    target.moves.forEach((x, mi) => {
      const m = x.m, n = G.Moves.stackTotal(m);
      box.appendChild(row({
        title: m.name, color: G.U.TYPE_COLOR[m.type],
        desc: x.ok ? G.Mechanics.text(m, card.mech) + ' (' + G.Mechanics.preview(m, card.mech) + ')' : x.why,
        chip: n ? '+' + n : '', chipColor: G.U.TYPE_COLOR[m.type],
        key: mi < 4 ? G.Input.keyLabel('attack_' + (mi + 1)) : '',
        icoHtml: G.Icons.html('move:' + m.id, 32), dim: !x.ok, flash: x === only, onclick: () => pickMove(mi)
      }));
    });
    if (only) autoT = setTimeout(() => { autoT = 0; if (flow && flow.step === 'move') pickMove(flow.target.moves.indexOf(only)); }, AUTO_MS);
  }

  function pickMove(mi) {
    if (!flow || flow.step !== 'move') return;
    const x = flow.target.moves[mi];
    if (!x || !x.ok) return;
    finish(flow.card, { pl: flow.target.pl, move: x.m }, flow.idx);
  }

  /** One step back. From the first step it returns to the cards. */
  function back() {
    if (!flow) return;
    clearAuto();
    G.Audio.sfx('select');
    if (flow.step === 'move' && !flow.monSkipped) { renderMonStep(); return; }
    const list = offers;
    flow = null;
    renderCards(list);
  }

  function finish(c, tgt, idx) {
    clearAuto();
    const cb = offerCb, list = offers;
    offers = null; offerCb = null; flow = null;
    $('lvl-reroll').classList.add('hidden');
    if (coopMode) {
      // The chosen card stays in view while the others choose.
      renderCards(list, idx);
      offers = null;
    } else G.UI.hide('scr-levelup');
    cb(c, tgt);
  }

  /** Keyboard for the level-up screen: slot keys 1-3 (cards), team keys (Pokemon), 1-4 (moves), R reroll, Backspace back. */
  function levelKeys() {
    if (!offers && !flow) return;
    if (!flow) {
      for (let i = 0; i < 3; i++) if (G.Input.action('attack_' + (i + 1))) pick(i);
      if (G.Input.tap('keyr')) reroll();
      return;
    }
    if (G.Input.tap('backspace')) { back(); return; }
    if (flow.step === 'pokemon') {
      flow.targets.forEach((t, ti) => {
        const slot = t.pl.teamSlot != null ? t.pl.teamSlot : ti;
        if (G.Input.action('swap_' + (slot + 1))) pickMon(ti);
      });
    } else {
      for (let i = 0; i < 4; i++) if (G.Input.action('attack_' + (i + 1))) pickMove(i);
    }
  }

  /** Co-op: who still has to choose. */
  function setWaiting(names) {
    const me = G.Social.me ? G.Social.me.name : '';
    const others = names.filter(n => n !== me);
    const list = a => a.length > 1 ? a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1] : a[0];
    $('lvl-wait').textContent = !names.length ? ''
      : !others.length ? 'Elige tu carta'
      : names.includes(me) ? 'Faltan por elegir: ' + list([...others, 'tú'])
      : 'Esperando a ' + list(others) + '…';
  }

  function closeLevelUp() {
    offers = null; offerCb = null; flow = null; clearAuto();
    $('cards').classList.remove('done');
    G.UI.hide('scr-levelup');
  }

  /**
   * Support message (Ko-fi) on finishing: after a record or every 10 games,
   * never on the first and at most once a day. Closed with the X.
   */
  function askSupport(r) {
    if (!G.Funding || !G.Funding.url) return false;
    const runs = (G.DB.save && G.DB.save.stats && G.DB.save.stats.runs) || 0;
    if (runs < 2 || !(r.record || runs % 10 === 0)) return false;
    const today = new Date().toISOString().slice(0, 10);
    try { if (localStorage.getItem('ps.ask') === today) return false; localStorage.setItem('ps.ask', today); } catch (e) { return false; }
    return true;
  }

  function showOver(r, onBack) {
    $('over-title').textContent = r.dead ? 'Has caído…' : 'Run terminada';
    $('over-stats').innerHTML = `
      ${G.Enemies.region ? `<div style="grid-column:1/-1"><span>Region</span><b class="gold">${G.MenuUI.GEN_NAMES[G.Enemies.region - 1]} Run</b></div>` : ''}
      <div><span>Tiempo</span><b>${G.U.mmss(r.time)}</b></div>
      <div><span>Nivel</span><b>${r.level}</b></div>
      <div><span>Derrotados</span><b>${r.kills}</b></div>
      <div><span>Jefes</span><b>${r.bosses}</b></div>
      ${r.judge ? `<div style="grid-column:1/-1"><span>Ante Arceus</span><b class="gold">${G.U.mmss(r.judge.time)} · ${r.judge.bosses} ${r.judge.bosses === 1 ? 'legendario' : 'legendarios'}</b></div>` : ''}
      <div style="grid-column:1/-1"><span>Pokémonedas ganadas</span>
        <b class="gold"><span class="coin"></span> +${r.coins}</b>
        <div style="font-size:12px;color:var(--muted)">${r.breakdown}</div></div>
      ${r.t1 || r.t10 ? `<div style="grid-column:1/-1"><span>Tickets del gacha</span><b>
        ${r.t1 ? G.Icons.html('ticket', 22) + ' +' + r.t1 + ' ' : ''}${r.t10 ? G.Icons.html('ticket10', 22) + ' +' + r.t10 + ' ×10' : ''}</b></div>` : ''}
      <div style="grid-column:1/-1"><span>Movimientos</span><b style="font-size:15px">
        ${r.moves.map(m => `${G.Icons.html('move:' + m.id, 16)} ${m.name}${G.Moves.stackTotal(m) ? ' +' + G.Moves.stackTotal(m) : ''}`).join(' · ') || '—'}</b></div>
      ${r.caught && r.caught.length ? `<div style="grid-column:1/-1" class="caught"><span>${G.Icons.html('shiny', 12)} Shinies conseguidos</span>
        <div class="caught-row" id="over-caught"></div></div>` : ''}
      ${r.record ? '<div style="grid-column:1/-1;text-align:center" class="gold">¡Nuevo récord de tiempo!</div>' : ''}
      ${askSupport(r) ? `<div class="support-ask" id="over-ask" style="grid-column:1/-1">
        <button class="x" type="button" aria-label="Cerrar">×</button>
        <p>¿Te está gustando PokéSurvivor? Lo hago yo solo y los servidores cuestan dinero. Si quieres, puedes ayudarme a mantenerlo en línea.</p>
        <a class="btn small gold" href="${G.Funding.url}" target="_blank" rel="noopener">${G.Icons.html('heart', 14)} Apoyar en Ko-fi</a>
      </div>` : ''}`;
    const ask = $('over-ask');
    if (ask) ask.querySelector('.x').onclick = () => ask.remove();
    $('btn-again').onclick = onBack;
    if (r.caught && r.caught.length) {
      const row = $('over-caught');
      for (const c of r.caught) {
        const w = document.createElement('div');
        w.appendChild(G.UI.spriteCanvas(c.dex, 90, 72, { shiny: true, lively: true, scale: 2 }));
        w.insertAdjacentHTML('beforeend', `<small>${G.DEX_BY[c.dex].name}${c.isNew ? ' · ¡nuevo!' : ''}</small>`);
        row.appendChild(w);
      }
    }
    G.UI.show('scr-over');
  }

  /** You found an item while already carrying one: which do you keep? */
  function showItemChoice(cur, next, cb) {
    const box = $('item-cards');
    box.innerHTML = '';
    [[cur, 'Quedarme con'], [next, 'Cambiar a']].forEach(([id, verb], i) => {
      const it = G.Items.BY[id];
      const el = document.createElement('div');
      el.className = 'card' + (i === 1 ? ' evo' : '');
      el.innerHTML = `<div class="ico">${G.Icons.html(id, 36)}</div>
        <div class="txt"><div class="nm">${verb} ${it.name}</div><div class="ds">${it.desc}</div></div>
        <div class="key">${G.Input.keyLabel('attack_' + (i + 1))}</div>`;
      el.onclick = () => { G.UI.hide('scr-item'); cb(id); };
      box.appendChild(el);
    });
    G.UI.show('scr-item');
  }

  // ---------------- link: which moves fuse ----------------

  let bond = null;          // { opt, cb, first, list }

  /**
   * @param opt  pl.bondOptions(): 'add' (one loose into the group) or 'pair' (two loose, in two steps)
   * @param cb   receives the list of moves that combine
   */
  function showBond(opt, cb) {
    bond = { opt, cb, first: null, list: [] };
    $('bond-back').onclick = bondBack;
    renderBond();
    G.UI.show('scr-bond');
  }

  function renderBond() {
    const { opt, first } = bond;
    const names = ms => ms.map(m => m.name).join(' + ');
    const step2 = opt.mode === 'pair' && first;
    $('bond-sub').textContent = opt.mode === 'add' ? 'Elige qué movimiento se une a ' + names(opt.group)
      : step2 ? '¿Con cuál unes ' + first.name + '?' : 'Elige el primer movimiento que vas a unir';
    $('bond-back').classList.toggle('hidden', !step2);
    bond.list = step2 ? opt.loose.filter(m => m !== first) : opt.loose;
    const box = $('bond-cards');
    box.innerHTML = '';
    bond.list.forEach((m, i) => {
      const col = G.U.TYPE_COLOR[m.type];
      const desc = opt.mode === 'add' ? 'Se lanzará a la vez que ' + names(opt.group) + '.'
        : step2 ? 'Se lanzará a la vez que ' + first.name + '. Queda un hueco libre.'
        : m.desc || '';
      const el = document.createElement('div');
      el.className = 'card' + (opt.mode === 'add' || step2 ? ' bond' : '');
      el.innerHTML =
        `<div class="ico" style="background:${col}33">${G.Icons.html('move:' + m.id, 32)}</div>
         <div class="txt"><div class="nm">${m.name} ${G.Moves.stackTotal(m) ? `<span class="tag-chip" style="background:${col}">+${G.Moves.stackTotal(m)}</span>` : ''}</div><div class="ds">${desc}</div></div>
         <div class="key">${G.Input.keyLabel('attack_' + (i + 1))}</div>`;
      el.dataset.sfx = 'none';
      el.onclick = () => pickBond(i);
      box.appendChild(el);
    });
  }

  function pickBond(i) {
    if (!bond || !bond.list[i]) return;
    const m = bond.list[i];
    if (bond.opt.mode === 'pair' && !bond.first) {
      bond.first = m;
      G.Audio.sfx('select');
      renderBond();
      return;
    }
    const picked = bond.opt.mode === 'add' ? [m] : [bond.first, m];
    const cb = bond.cb;
    bond = null;
    G.UI.hide('scr-bond');
    cb(picked);
  }

  function bondBack() {
    if (!bond) return;
    bond.first = null;
    renderBond();
  }

  function showPause(coop = false) {
    G.UI.soundControls($('pause-sound'));
    $('pause-coop').classList.toggle('hidden', !coop);
    $('btn-quit').textContent = coop ? 'Salir de la partida' : 'Abandonar run';
    G.UI.show('scr-pause');
  }

  function wirePause(onResume, onQuit) {
    $('btn-resume').onclick = onResume;
    $('btn-quit').onclick = onQuit;
  }

  return { showLevelUp, reroll, showItemChoice, showBond, pickBond, bondBack, pick, levelKeys, setWaiting, closeLevelUp, showOver, wirePause, showPause };
})();
