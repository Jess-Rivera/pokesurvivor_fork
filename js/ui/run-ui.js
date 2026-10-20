/* ============ run-ui.js — level cards, pause and end of run ============ */
G.RunUI = (() => {
  const $ = G.UI.$;
  let offers = null, offerCb = null, coopMode = false;
  let flow = null;            // a mechanic / stat card being applied on the choose sheet: { card, idx, info }

  /** @param coop  in a group: after choosing, it waits for the others */
  function showLevelUp(level, list, cb, coop = false) {
    offerCb = cb; coopMode = coop; flow = null;
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
    if (!offers || flow || rerollsLeft() <= 0) return;
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
    if (!offers || !offers[i] || flow) return;
    const c = offers[i];
    if (c.type !== 'mech' && c.type !== 'stat') { finish(c, null, i); return; }
    G.Audio.sfx('select');
    openChoose(c, i);
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
    offers = null; offerCb = null; flow = null;
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
    offers = null; offerCb = null; flow = null;
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
      ${r.t1 || r.t10 ? `<div style="grid-column:1/-1"><span>Gacha tickets</span><b>
        ${r.t1 ? G.Icons.html('ticket', 22) + ' +' + r.t1 + ' ' : ''}${r.t10 ? G.Icons.html('ticket10', 22) + ' +' + r.t10 + ' ×10' : ''}</b></div>` : ''}
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

  /** You found an item while the slot is full: which do you keep? `run` = a run-tier item (team-wide grid, not one Pokemon). */
  function showItemChoice(cur, next, cb, run = false) {
    const box = $('item-cards');
    box.innerHTML = '';
    const scr = $('scr-item');
    scr.querySelector('h2').textContent = run ? 'A run item!' : 'An item!';
    scr.querySelector('.sub').innerHTML = (run ? 'Your run slots are full' : 'Only one per Pokemon') + ' · <kbd>1</kbd> <kbd>2</kbd>';
    [[cur, 'Keep'], [next, 'Switch to']].forEach(([id, verb], i) => {
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
    $('pause-coop').classList.toggle('hidden', !coop);
    $('btn-quit').textContent = coop ? 'Leave the game' : 'Quit run';
    const roster = G.Game.roster || [];
    G.Sheet.render($('pause-sheet'), roster, { sel: Math.max(0, roster.indexOf(G.Game.player)) });
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

  return { showLevelUp, reroll, showItemChoice, showBond, pickBond, bondBack, pick, levelKeys, setWaiting, closeLevelUp, showOver, wirePause, showPause, pauseKeys };
})();
