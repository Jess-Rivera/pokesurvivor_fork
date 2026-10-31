/* ============ run-ui.js — level cards, pause and end of run ============ */
G.RunUI = (() => {
  const $ = G.UI.$;
  let offers = null, offerCb = null, coopMode = false;
  let flow = null;            // a mechanic / stat card being applied on the choose sheet: { card, idx, info }
  let vit = null;             // slice 5b: the Vitamins card's stat pick, shown on the card screen itself: { card, idx }

  /** @param coop  in a group: after choosing, it waits for the others */
  function showLevelUp(level, list, cb, coop = false) {
    offerCb = cb; coopMode = coop; flow = null; vit = null;
    $('lvl-num').textContent = level;
    $('lvl-wait').textContent = '';
    $('lvl-wait').classList.toggle('hidden', !coop);
    $('cards').classList.remove('done');
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
    if (!offers || flow || vit || rerollsLeft() <= 0) return;
    const p = G.Game.player;
    p.rerolls = (p.rerolls || 0) + 1;
    G.Audio.sfx('select');
    renderCards(G.LevelUp.offer(p, 3, G.Game.roster));
  }

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

  function renderCards(list, doneIdx = null) {
    offers = list;
    const left = rerollsLeft();
    $('lvl-rr-n').textContent = left;
    $('lvl-reroll').classList.toggle('hidden', left <= 0);
    const box = $('cards');
    box.innerHTML = '';
    list.forEach((c, i) => {
      const el = row({
        title: c.title, desc: c.desc, color: c.color, key: G.Input.keyLabel('attack_' + (i + 1)),
        chip: c.type === 'new' ? 'New · ' + c.tag : c.tag, chipColor: c.color === '#ffd23f' ? '#ffd23f' : c.color,
        icoHtml: c.icon ? G.Icons.html(c.icon, 32) : '', icoText: c.ico, onclick: () => pick(i)
      });
      if (doneIdx === i) el.classList.add('picked');
      box.appendChild(el);
    });
    if (doneIdx != null) box.classList.add('done');
  }

  // ---- card -> choose sheet (Pokemon strip + move block) -> Confirm ----

  function pick(i) {
    if (!offers || !offers[i] || flow || vit) return;
    const c = offers[i];
    if (c.type === 'vitamins') { G.Audio.sfx('select'); openVitamins(c, i); return; }
    if (c.type !== 'mech' && c.type !== 'stat') { finish(c, null, i); return; }     // a new move, and the 5b team cards (no choose sheet)
    G.Audio.sfx('select');
    openChoose(c, i);
  }

  // ---- slice 5b: the Vitamins card's stat pick (3 rows on the card screen, keys 1-3, Backspace back) ----
  function openVitamins(c, idx) {
    vit = { card: c, idx };
    $('lvl-reroll').classList.add('hidden');
    const box = $('cards'), pct = v => Math.round(v * 100) + '%';
    box.innerHTML = '';
    c.options.forEach((o, j) => box.appendChild(row({
      title: o.label + ': ' + o.stat + ' +' + pct(o.next - o.now), desc: 'Team-wide ' + o.stat + ' bonus +' + pct(o.now) + ' to +' + pct(o.next),
      color: o.color, chip: 'Vitamins', chipColor: o.color, icoText: '+' + pct(o.next - o.now),
      key: G.Input.keyLabel('attack_' + (j + 1)), onclick: () => pickVit(j)
    })));
    box.appendChild(row({ title: 'Back', desc: 'Return to the three cards', color: '#9fb1c9', icoText: '\u2190', key: 'Bksp', onclick: vitBack }));
  }
  function pickVit(j) {
    if (!vit || !vit.card.options[j]) return;
    const { card, idx } = vit;
    vit = null;
    card.choice = card.options[j].id;
    finish(card, null, idx);
  }
  function vitBack() {
    if (!vit) return;
    G.Audio.sfx('select');
    vit = null;
    renderCards(offers);
  }

  /** Open the summary sheet in choose mode for card `c`: pick a Pokemon (and, for a mechanic card, one of its moves). */
  function openChoose(c, idx) {
    const roster = G.Game.roster;
    flow = { card: c, idx, info: { ok: false, why: '' } };
    $('choose-title').textContent = 'Apply ' + c.title;
    $('choose-sub').textContent = 'Level ' + $('lvl-num').textContent;
    $('btn-choose-back').onclick = back;
    $('btn-choose-ok').onclick = confirm;
    G.Sheet.render($('choose-sheet'), roster, {
      sel: Math.max(0, roster.indexOf(G.Game.player)),
      choose: {
        card: c, targets: c.targets(roster), onConfirm: confirm,
        onChange: info => { if (!flow) return; flow.info = info; $('btn-choose-ok').disabled = !info.ok; $('choose-note').textContent = info.ok ? '' : info.why; }
      }
    });
    G.UI.show('scr-choose');
  }

  function confirm() {
    if (!flow || !flow.info.ok) return;
    const ch = G.Sheet.chosen($('choose-sheet'));
    finish(flow.card, { pl: ch.pl, move: ch.move }, flow.idx);
  }

  /** Back to the three cards (same offer, nothing spent). */
  function back() {
    if (!flow) return;
    G.Audio.sfx('select');
    flow = null;
    G.UI.show('scr-levelup');
  }

  function finish(c, tgt, idx) {
    const cb = offerCb, list = offers;
    offers = null; offerCb = null; flow = null; vit = null;
    $('lvl-reroll').classList.add('hidden');
    G.UI.hide('scr-choose');
    if (coopMode) {
      // The chosen card stays in view while the others choose.
      renderCards(list, idx);
      offers = null;
      G.UI.show('scr-levelup');
    } else G.UI.hide('scr-levelup');
    cb(c, tgt);
  }

  /** Keyboard for the level-up screens. Cards: slot keys 1-3, R reroll. Choose sheet: swap keys / arrows switch Pokemon,
   *  1-4 pick a move and confirm, Enter confirm, Backspace back. */
  function levelKeys() {
    if (!offers && !flow) return;
    if (vit) {     // 5b Vitamins: 1-3 pick a stat, Backspace back to the cards
      for (let i = 0; i < vit.card.options.length; i++) if (G.Input.action('attack_' + (i + 1))) { pickVit(i); return; }
      if (G.Input.tap('backspace')) vitBack();
      return;
    }
    if (!flow) {
      for (let i = 0; i < 3; i++) if (G.Input.action('attack_' + (i + 1))) pick(i);
      if (G.Input.tap('keyr')) reroll();
      return;
    }
    if (G.Input.tap('backspace')) { back(); return; }
    if (G.Input.tap('enter')) { confirm(); return; }
    G.Sheet.keys($('choose-sheet'));
    if (flow && flow.card.type === 'mech') {
      for (let i = 0; i < 4; i++) if (G.Input.action('attack_' + (i + 1)) && G.Sheet.pickMoveIndex($('choose-sheet'), i)) { confirm(); return; }
    }
  }

  /** Co-op: who still has to choose. */
  function setWaiting(names) {
    const me = G.Social.me ? G.Social.me.name : '';
    const others = names.filter(n => n !== me);
    const list = a => a.length > 1 ? a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1] : a[0];
    $('lvl-wait').textContent = !names.length ? ''
      : !others.length ? 'Choose your card'
      : names.includes(me) ? 'Still choosing: ' + list([...others, 'you'])
      : 'Waiting for ' + list(others) + '…';
  }

  function closeLevelUp() {
    offers = null; offerCb = null; flow = null; vit = null;
    $('cards').classList.remove('done');
    G.UI.hide('scr-levelup');
    G.UI.hide('scr-choose');
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
    $('over-title').textContent = r.dead ? 'You fell…' : 'Run over';
    $('over-stats').innerHTML = `
      ${G.Enemies.region ? `<div style="grid-column:1/-1"><span>Region</span><b class="gold">${G.MenuUI.GEN_NAMES[G.Enemies.region - 1]} Run</b></div>` : ''}
      <div><span>Time</span><b>${G.U.mmss(r.time)}</b></div>
      <div><span>Level</span><b>${r.level}</b></div>
      <div><span>Defeated</span><b>${r.kills}</b></div>
      <div><span>Bosses</span><b>${r.bosses}</b></div>
      ${r.judge ? `<div style="grid-column:1/-1"><span>Against Arceus</span><b class="gold">${G.U.mmss(r.judge.time)} · ${r.judge.bosses} ${r.judge.bosses === 1 ? 'legendary' : 'legendaries'}</b></div>` : ''}
      <div style="grid-column:1/-1"><span>PokéCoins earned</span>
        <b class="gold"><span class="coin"></span> +${r.coins}</b>
        <div style="font-size:12px;color:var(--muted)">${r.breakdown}</div></div>
      ${r.t1 || r.t10 ? `<div style="grid-column:1/-1"><span>Pokeballs and Master Balls</span><b>
        ${r.t1 ? G.Icons.html('ball', 24) + ' +' + r.t1 + ' ' : ''}${r.t10 ? G.Icons.html('ball4', 24) + ' +' + r.t10 : ''}</b></div>` : ''}
      ${r.caught && r.caught.length ? `<div style="grid-column:1/-1" class="caught"><span>${G.Icons.html('shiny', 12)} Shinies caught</span>
        <div class="caught-row" id="over-caught"></div></div>` : ''}
      ${r.record ? '<div style="grid-column:1/-1;text-align:center" class="gold">New time record!</div>' : ''}
      ${askSupport(r) ? `<div class="support-ask" id="over-ask" style="grid-column:1/-1">
        <button class="x" type="button" aria-label="Close">×</button>
        <p>Enjoying PokéSurvivor? I make it on my own and the servers cost money. If you'd like, you can help keep it online.</p>
        <a class="btn small gold" href="${G.Funding.url}" target="_blank" rel="noopener">${G.Icons.html('heart', 14)} Support on Ko-fi</a>
      </div>` : ''}`;
    const ask = $('over-ask');
    if (ask) ask.querySelector('.x').onclick = () => ask.remove();
    $('btn-again').onclick = onBack;
    // Team summary: every Pokemon's moves, upgrades and stat cards (the results card keeps only the run totals).
    const roster = r.roster || [];
    $('btn-team').classList.toggle('hidden', !roster.length);
    $('btn-team').onclick = () => {
      G.Sheet.render($('team-sheet'), roster, { sel: Math.max(0, roster.indexOf(G.Game.player)) });
      G.UI.show('scr-team');
    };
    $('btn-team-back').onclick = () => G.UI.show('scr-over');
    if (r.caught && r.caught.length) {
      const row = $('over-caught');
      for (const c of r.caught) {
        const w = document.createElement('div');
        w.appendChild(G.UI.spriteCanvas(c.dex, 90, 72, { shiny: true, lively: true, scale: 2 }));
        w.insertAdjacentHTML('beforeend', `<small>${G.DEX_BY[c.dex].name}${c.isNew ? ' · new!' : ''}</small>`);
        row.appendChild(w);
      }
    }
    G.UI.show('scr-over');
  }

  /**
   * You found an item and something is in the way: the NEW item is row 1, what you hold is row 2. Pick the one it replaces and Confirm, or Leave it.
   * @param held  item ids that could be replaced (the Pokemon's item, or the filled run slots)
   * @param cb    receives the id being replaced, or null for Leave it
   * @param lock  run tier only: the one held id that MUST be the one replaced (same-group rule, e.g. a second Stone); the others are dimmed
   */
  function showItemChoice(next, held, cb, run = false, lock = null) {
    const box = $('item-cards');
    box.innerHTML = '';
    const scr = $('scr-item');
    scr.querySelector('h2').textContent = run ? 'A team item!' : 'An item!';
    scr.querySelector('.sub').textContent = lock && run ? 'Only one Stone at a time'
      : run ? 'Your team item slots are full' : 'Only one per Pokemon';
    const confirm = $('item-confirm'), leave = $('item-leave');
    // SINGLE: one thing can be replaced (a lone held item, or a Stone lock). The held card starts highlighted (= keep it);
    // click the new card to take it instead. MULTI: several run slots; click the slot to replace (nothing is highlighted at first).
    const target = lock || (held.length === 1 ? held[0] : null);
    const single = !!target;
    const mk = (id, chip, k, extra = '') => {
      const it = G.Items.BY[id];
      const el = document.createElement('div');
      el.className = 'card' + extra;
      el.dataset.id = id; el.dataset.k = k;
      el.innerHTML = `<div class="ico">${G.Icons.html(it.icon || it.id, 36)}</div>
        <div class="txt"><div class="nm">${it.name}</div><div class="ds">${it.desc}</div></div>
        <span class="item-chip">${chip}</span>`;
      box.appendChild(el);
      return el;
    };
    // Row 1: the incoming item.
    const newEl = mk(next, 'New', single ? 2 : 0);
    // Row 2: what you hold now (one wide card per item).
    const lab = document.createElement('div');
    lab.className = 'item-row-label';
    lab.textContent = single ? 'You are holding' : 'Click the item to replace';
    box.appendChild(lab);
    const heldEls = held.map((id, i) => {
      const chip = run ? 'Slot ' + (i + 1) : 'Held';
      const el = mk(id, chip, single ? (id === target ? 1 : 0) : i + 1, lock && id !== lock ? ' dim' : '');
      return el;
    });
    let sel = null;                 // single: 'new' or the held id.  multi: the held id to replace.
    const paint = () => {
      newEl.classList.toggle('evo', single && sel === 'new');
      heldEls.forEach(e => e.classList.toggle('evo', sel === e.dataset.id));
      confirm.disabled = sel == null;
    };
    if (single) {
      sel = target;
      newEl.onclick = () => { sel = 'new'; paint(); };
      heldEls.forEach(e => { if (e.dataset.id === target) e.onclick = () => { sel = target; paint(); }; });
    } else {
      newEl.style.cursor = 'default';
      heldEls.forEach(e => { e.onclick = () => { sel = e.dataset.id; paint(); }; });
    }
    paint();
    const done = replace => { G.UI.hide('scr-item'); cb(replace); };
    // single + held highlighted = keep what you have (same as Leave it); single + new highlighted = swap; multi = replace the clicked slot.
    confirm.onclick = () => { if (sel == null) return; done(single ? (sel === 'new' ? target : null) : sel); };
    leave.onclick = () => done(null);
    G.UI.show('scr-item');
  }

  /** Keyboard on the item chooser: 1 to 4 pick a card (single: 1 = held, 2 = new; multi: the slot number); Enter confirms. */
  function itemKey(i) {
    const el = document.querySelector('#item-cards .card[data-k="' + (i + 1) + '"]');
    if (el && !el.classList.contains('dim')) el.click();
  }
  function itemConfirm() { const b = $('item-confirm'); if (b && !b.disabled) b.click(); }

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
    $('pause-coop').classList.toggle('hidden', !coop);
    $('btn-quit').textContent = coop ? 'Leave the game' : 'Quit run';
    const roster = G.Game.roster || [];
    G.Sheet.render($('pause-sheet'), roster, { sel: Math.max(0, roster.indexOf(G.Game.player)), canMoveItems: true });
    G.UI.show('scr-pause');
  }
  /** Solo pause: keyboard for the sheet (switch Pokemon, scroll the moves). */
  function pauseKeys() {
    if (G.UI.isOpen('scr-pause')) G.Sheet.keys($('pause-sheet'));
    else if (G.UI.isOpen('scr-team')) G.Sheet.keys($('team-sheet'));
  }

  function wirePause(onResume, onQuit) {
    $('btn-resume').onclick = onResume;
    $('btn-quit').onclick = onQuit;
  }

  return { showLevelUp, reroll, showItemChoice, itemKey, itemConfirm, showBond, pickBond, bondBack, pick, levelKeys, setWaiting, closeLevelUp, showOver, wirePause, showPause, pauseKeys };
})();
