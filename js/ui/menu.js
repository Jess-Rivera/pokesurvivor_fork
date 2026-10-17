/* ============ menu.js — main menu, collection and upgrades ============ */
G.MenuUI = (() => {
  const $ = G.UI.$;
  const GEN_NAMES = ['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Teselia', 'Kalos', 'Alola', 'Galar', 'Paldea'];
  let dexSel = null;
  // Pokedex control state. region: 'all' | gen#; own: 'all'|'own'|'miss';
  // q: search; types/rarity/bst: multi-select (empty = all); sort + dir.
  const dexCtrl = { region: 'all', own: 'all', q: '', types: [], rarity: [], bst: [], sort: 'dex', dir: 1 };
  const BST_BANDS = [
    { k: 'lo',  label: '≤300',    lo: 0,   hi: 300,  stars: 3 },
    { k: 'mid', label: '301-400', lo: 301, hi: 400,  stars: 4 },
    { k: 'hi',  label: '401-500', lo: 401, hi: 500,  stars: 5 },
    { k: 'vhi', label: '501-600', lo: 501, hi: 600,  stars: 6 },
    { k: 'top', label: '600+',    lo: 601, hi: 9999, stars: 7 },
  ];
  // N bright stars out of 7 (dim for the rest), matching bstStars' 100-BST-per-star scale.
  const bstTierStars = (n, size = 11) => {
    let out = '';
    for (let i = 0; i < 7; i++) out += G.Icons.html(i < n ? 'star' : 'starDim', size);
    return out;
  };
  const SORTS = [['dex','Dex #'],['name','Name'],['bst','BST'],['hp','HP'],['atk','Atk'],['def','Def'],['spa','SpA'],['spd','SpD'],['spe','Spe']];
  const STAT_IDX = { hp:0, atk:1, def:2, spa:3, spd:4, spe:5 };
  // null = the Pokédex is browse-only; 0-5 = choosing a Pokémon for that team slot.
  let pickSlot = null;

  function init() {
    const ICON = { play: 'ball', dex: 'book', upgrades: 'up', gacha: 'ball4', goals: 'medal3', friends: 'friends', rank: 'trophy', settings: 'gear' };
    document.querySelectorAll('#scr-menu [data-go]').forEach(b => {
      b.insertAdjacentHTML('afterbegin', `<span class="mi-ico">${G.Icons.html(ICON[b.dataset.go], 26)}</span>`);
      b.dataset.sfx = b.dataset.go === 'play' ? 'confirm' : 'click';
      b.onclick = () => {
        const go = b.dataset.go;
        if (go === 'play') { if (G.Social.room) G.LobbyUI.open(); else G.Flow.play(); }
        else if (go === 'dex') browseDex();
        else if (go === 'upgrades') openUpgrades();
        else if (go === 'gacha') G.GachaUI.open();
        else if (go === 'goals') G.GoalsUI.open();
        else if (go === 'friends') G.FriendsUI.open();
        else if (go === 'rank') G.RankingUI.open();
        else if (go === 'settings') G.SettingsUI.open();
      };
    });
    document.querySelectorAll('[data-back]').forEach(b => { b.onclick = open; });
    G.Social.on(() => { if (G.UI.isOpen('scr-menu')) socialLine(); });
    $('btn-logout').onclick = () => {
      if (G.DB.guest && !confirm('Eres invitado: se perderá todo el progreso. ¿Salir?')) return;
      G.Audio.music(null);
      G.DB.logout().then(() => G.Flow.toLogin());
    };
  }

  // ---------------- main menu ----------------

  function open() {
    const s = G.DB.save;
    pickSlot = null;
    G.UI.chrome(true);
    G.UI.show('scr-menu');
    renderRoster();

    const owned = Object.keys(s.owned).filter(d => G.DEX_BY[d]).length;
    const shinies = Object.keys(s.shiny || {}).length;
    $('menu-dex-count').textContent = `${owned} / ${G.DEX.length}` + (shinies ? ` · ${shinies} shiny` : '');

    const st = s.stats;
    $('menu-stats').innerHTML =
      `Runs <b style="color:#fff">${st.runs}</b> · Mejor tiempo <b style="color:#fff">${G.U.mmss(st.bestTime)}</b><br>` +
      `Mejor nivel <b style="color:#fff">${st.bestLevel}</b> · Derrotados <b style="color:#fff">${st.totalKills.toLocaleString('es')}</b>` +
      (G.DB.guest ? '<br><span style="color:#ffb0b8">Modo invitado: no se guarda</span>' : '');

    socialLine();
    // Mission prizes to claim.
    G.Progress.checkAch();
    const pend = G.Progress.pending();
    $('menu-goals-sub').textContent = pend ? pend + (pend === 1 ? ' premio por recoger' : ' premios por recoger') : 'Misiones, logros y perfil';
    $('menu-goals-sub').classList.toggle('gold', pend > 0);
    // With a cloud account: friends online, invitations and (once) the nickname.
    if (G.DB.online && !G.Social.started) {
      G.Social.start().then(r => {
        if (r === 'need-nick' && !G.NickUI.skipped && G.UI.isOpen('scr-menu')) G.NickUI.open();
        socialLine();
      });
    }
    G.InvitePop.refresh();
  }

  /** Text under "Friends" and "Play": who is online, requests, room. */
  function socialLine() {
    const room = G.Social.room;
    const play = document.querySelector('#scr-menu [data-go=play] small');
    if (play) play.textContent = room ? 'Volver a tu sala (' + room.members.length + '/' + G.Social.MAX_PLAYERS + ')' : 'Entra en la mazmorra';
    const fr = G.Social.friends;
    const on = fr.filter(f => f.status === 'ok' && f.online).length;
    const req = fr.filter(f => f.status === 'in').length;
    const parts = [];
    if (on) parts.push(on + ' en línea');
    if (req) parts.push(req + (req === 1 ? ' solicitud' : ' solicitudes'));
    $('menu-friends-sub').textContent = parts.length ? parts.join(' · ') : 'Juega en grupo, hasta 4';
    $('menu-friends-sub').classList.toggle('gold', req > 0);
  }

  /** Home screen: the 6 fixed team slots as buttons. Each opens the Pokédex to choose for that slot. */
  function renderRoster() {
    const s = G.DB.save;
    G.DB.normalizeTeam(s);
    const box = $('menu-roster');
    box.innerHTML = '';
    s.team.forEach((t, slot) => {
      const b = document.createElement('button');
      const mon = t && G.DEX_BY[t.dex];
      const shiny = !!(mon && t.shiny && G.DB.ownsShiny(t.dex));
      b.className = 'roster-card' + (mon ? '' : ' empty') + (slot === 0 ? ' lead' : '');
      b.title = mon ? `Slot ${slot + 1}: ${mon.name} (click to change)` : `Slot ${slot + 1}: empty (click to add)`;
      b.insertAdjacentHTML('beforeend',
        `<span class="rn">${slot === 0 ? G.Icons.html('crown', 12) : ''}${slot + 1}</span>`);
      if (shiny) b.insertAdjacentHTML('beforeend', `<span class="rsh">${G.Icons.html('shiny', 12)}</span>`);
      if (mon) {
        b.appendChild(G.UI.spriteCanvas(mon.dex, 92, 80, { lively: true, scale: 2, hero: true, shiny }));
        b.insertAdjacentHTML('beforeend', `<span class="rname">${mon.name}</span>`);
      } else {
        b.insertAdjacentHTML('beforeend', '<span class="rslot">+</span><span class="rname">Empty</span>');
      }
      b.onclick = () => pickDex(slot);
      box.appendChild(b);
    });
  }

  // ---------------- collection ----------------

  /** Pokédex from the menu button: browse only, nothing to pick. */
  function browseDex() {
    pickSlot = null;
    showDetail.last = null;            // re-read the shiny variant from the team
    openDex();
  }

  /** Pokédex opened from a roster card: browse, then Commit to Roster for that slot. */
  function pickDex(slot) {
    const s = G.DB.save;
    const cur = s.team[slot];
    pickSlot = slot;
    dexSel = cur ? cur.dex : (dexSel != null ? dexSel : s.partner);
    viewShiny = !!(cur && cur.shiny && G.DB.ownsShiny(cur.dex));
    showDetail.last = dexSel;          // keep the variant just chosen
    openDex();
  }

  /**
   * Put `dex` in fixed slot `slot`. A Pokémon already on the team in another slot
   * SWAPS places with whoever is in `slot`, so nobody drops off the team. Slot 1
   * (the lead) can never be left empty.
   */
  function commitToSlot(slot, dex, shiny) {
    const s = G.DB.save;
    const team = s.team.slice();
    const from = team.findIndex(t => t && t.dex === dex);
    const displaced = team[slot] || null;
    if (from >= 0 && from !== slot) {
      if (from === 0 && !displaced) { G.UI.toast('Slot 1 is the lead and cannot be left empty'); return; }
      team[from] = displaced;
    }
    team[slot] = { dex, shiny: !!shiny };
    s.team = team;
    s.partner = team[0].dex;                  // the lead is the companion
    s.partnerShiny = !!team[0].shiny;
    G.DB.commit();
    const name = G.DEX_BY[dex].name;
    G.UI.toast(from >= 0 && from !== slot && displaced
      ? `${name} and ${G.DEX_BY[displaced.dex].name} swapped slots`
      : `${name} is now in Slot ${slot + 1}`);
    open();
  }

  function removeFromSlot(slot) {
    if (slot === 0) return;
    const s = G.DB.save;
    const t = s.team[slot];
    if (!t) return;
    s.team = s.team.slice();
    s.team[slot] = null;
    G.DB.commit();
    G.UI.toast(`${G.DEX_BY[t.dex].name} removed from Slot ${slot + 1}`);
    open();
  }

  function openDex() {
    G.UI.show('scr-dex', true);
    const s = G.DB.save;
    if (dexSel == null) dexSel = s.partner;
    const owned = Object.keys(s.owned).filter(d => G.DEX_BY[d]).length;
    $('dex-total').textContent = `${owned} / ${G.DEX.length}`;
    const banner = $('dex-pick-banner');
    banner.classList.toggle('hidden', pickSlot == null);
    if (pickSlot != null) {
      const cur = s.team[pickSlot];
      banner.textContent = `Choosing for Slot ${pickSlot + 1}` + (pickSlot === 0 ? ' (lead)' : '')
        + ' \u00b7 ' + (cur ? 'now ' + G.DEX_BY[cur.dex].name : 'empty');
    }
    $('dex-back').textContent = pickSlot != null ? 'Cancel' : 'Volver';
    buildControls();
    renderGrid();
    showDetail(dexSel);
  }

  function buildControls() {
    const s = G.DB.save;
    const region = $('dex-region');
    region.innerHTML = ['<option value="all">All regions</option>'].concat(
      GEN_NAMES.map((name, i) => {
        const g = i + 1;
        const total = G.DEX.filter(p => p.gen === g).length;
        const have = G.DEX.filter(p => p.gen === g && s.owned[p.dex]).length;
        return `<option value="${g}">[Gen. ${g}] ${name} (${have}/${total})</option>`;
      })).join('');
    region.value = String(dexCtrl.region);
    region.onchange = () => { dexCtrl.region = region.value === 'all' ? 'all' : +region.value; renderGrid(); };

    const own = $('dex-own');
    own.innerHTML = ['<option value="all">Owned & unowned</option>',
                     '<option value="own">Owned only</option>',
                     '<option value="miss">Unowned only</option>'].join('');
    own.value = dexCtrl.own;
    own.onchange = () => { dexCtrl.own = own.value; renderGrid(); };

    const sort = $('dex-sort');
    sort.innerHTML = SORTS.map(([k, label]) => `<option value="${k}">Sort: ${label}</option>`).join('');
    sort.value = dexCtrl.sort;
    sort.onchange = () => { dexCtrl.sort = sort.value; renderGrid(); };
    const dir = $('dex-dir');
    dir.textContent = dexCtrl.dir === 1 ? '\u2193' : '\u2191';
    dir.onclick = () => { dexCtrl.dir *= -1; dir.textContent = dexCtrl.dir === 1 ? '\u2193' : '\u2191'; renderGrid(); };

    const search = $('dex-search');
    if (search.value !== dexCtrl.q) search.value = dexCtrl.q;
    search.oninput = () => {
      clearTimeout(buildControls._t);
      buildControls._t = setTimeout(() => { dexCtrl.q = search.value.trim().toLowerCase(); renderGrid(); }, 120);
    };

    const typeBox = $('dex-types');
    typeBox.innerHTML = '';
    for (const t of Object.keys(G.U.TYPE_COLOR)) {
      const c = document.createElement('button');
      c.className = 'chip type-chip' + (dexCtrl.types.includes(t) ? ' on' : '');
      c.style.setProperty('--tc', G.U.TYPE_COLOR[t]);
      c.textContent = G.U.TYPE_NAME[t];
      c.onclick = () => { toggle(dexCtrl.types, t); buildControls(); renderGrid(); };
      typeBox.appendChild(c);
    }

    const rareBox = $('dex-rarity');
    rareBox.innerHTML = '';
    for (let r = 1; r <= 5; r++) {
      const c = document.createElement('button');
      c.className = 'chip' + (dexCtrl.rarity.includes(r) ? ' on' : '');
      c.innerHTML = G.Icons.rarity(r, 12) + ' ' + G.Gacha.RARITY_NAME[r];
      c.onclick = () => { toggle(dexCtrl.rarity, r); buildControls(); renderGrid(); };
      rareBox.appendChild(c);
    }

    const bstBox = $('dex-bst');
    bstBox.innerHTML = '';
    for (const band of BST_BANDS) {
      const c = document.createElement('button');
      c.className = 'chip bst-chip' + (dexCtrl.bst.includes(band.k) ? ' on' : '');
      c.innerHTML = bstTierStars(band.stars);
      c.title = 'BST ' + band.label;
      c.onclick = () => { toggle(dexCtrl.bst, band.k); buildControls(); renderGrid(); };
      bstBox.appendChild(c);
    }

    $('dex-clear').onclick = () => {
      dexCtrl.region = 'all'; dexCtrl.own = 'all'; dexCtrl.q = '';
      dexCtrl.types = []; dexCtrl.rarity = []; dexCtrl.bst = [];
      dexCtrl.sort = 'dex'; dexCtrl.dir = 1;
      buildControls(); renderGrid();
    };
  }

  function toggle(arr, v) { const i = arr.indexOf(v); if (i < 0) arr.push(v); else arr.splice(i, 1); }

  function filterSortDex() {
    const s = G.DB.save, c = dexCtrl;
    const list = G.DEX.filter(p => {
      if (c.region !== 'all' && p.gen !== c.region) return false;
      const own = !!s.owned[p.dex];
      if (c.own === 'own' && !own) return false;
      if (c.own === 'miss' && own) return false;
      if (c.types.length && !c.types.some(t => p.types.includes(t))) return false;
      if (c.rarity.length && !c.rarity.includes(p.rarity)) return false;
      if (c.bst.length && !c.bst.some(k => { const b = BST_BANDS.find(x => x.k === k); return p.bst >= b.lo && p.bst <= b.hi; })) return false;
      if (c.q) {
        const num = String(p.dex).padStart(3, '0');
        if (!(own && p.name.toLowerCase().includes(c.q)) && !num.includes(c.q) && String(p.dex) !== c.q) return false;
      }
      return true;
    });
    const key = c.sort;
    // Stat/BST sorts are power-revealing: sink UNOWNED to the bottom (owned-first),
    // then order by the chosen stat within each group. Dex/name sorts are not sunk.
    const sinkUnowned = key !== 'dex' && key !== 'name';
    list.sort((a, b) => {
      if (sinkUnowned) {
        const oa = !!s.owned[a.dex], ob = !!s.owned[b.dex];
        if (oa !== ob) return oa ? -1 : 1;
      }
      if (key === 'name') return c.dir * a.name.localeCompare(b.name);
      let va, vb;
      if (key === 'dex') { va = a.dex; vb = b.dex; }
      else if (key === 'bst') { va = a.bst; vb = b.bst; }
      else { const idx = STAT_IDX[key]; va = a.stats ? a.stats[idx] : 0; vb = b.stats ? b.stats[idx] : 0; }
      return c.dir * (va - vb);
    });
    return list;
  }

  function renderGrid() {
    const s = G.DB.save;
    const grid = $('dex-grid');
    grid.innerHTML = '';
    const list = filterSortDex();
    $('dex-shown').textContent = `${list.length} shown`;
    for (const p of list) {
      const own = !!s.owned[p.dex], sh = !!(s.shiny && s.shiny[p.dex]);
      const cell = document.createElement('div');
      cell.className = 'cell' + (own ? '' : ' locked') + (p.dex === dexSel ? ' on' : '');
      cell.insertAdjacentHTML('beforeend', `<span class="no">${String(p.dex).padStart(3, '0')}</span>`);
      const ts = s.team.findIndex(t => t && t.dex === p.dex);
      if (ts === 0) cell.insertAdjacentHTML('beforeend', `<span class="badge-r" title="Lead (slot 1)">${G.Icons.html('crown', 14)}</span>`);
      else if (ts > 0) cell.insertAdjacentHTML('beforeend', `<span class="badge-r badge-slot" title="Roster slot ${ts + 1}">${ts + 1}</span>`);
      else if (sh) cell.insertAdjacentHTML('beforeend', `<span class="badge-r" title="Tienes su shiny">${G.Icons.html('shiny', 12)}</span>`);
      const useShiny = sh && ts >= 0 && !!s.team[ts].shiny;
      cell.appendChild(G.UI.spriteCanvas(p.dex, 92, 80, { scale: 2, silhouette: !own, shadow: own, shiny: useShiny }));
      cell.insertAdjacentHTML('beforeend', `<b>${own ? p.name : '???'}</b>${G.UI.stars(p.rarity, 9)}`);
      cell.onclick = () => {
        dexSel = p.dex;
        grid.querySelectorAll('.cell').forEach(x => x.classList.remove('on'));
        cell.classList.add('on');
        showDetail(p.dex);
      };
      grid.appendChild(cell);
    }
    if (!grid.children.length) grid.innerHTML = '<p class="sub" style="grid-column:1/-1">No Pokemon match these filters.</p>';
  }

  // Variant currently shown on the card (normal or shiny).
  let viewShiny = false;

  function showDetail(dex) {
    const s = G.DB.save;
    const p = G.DEX_BY[dex];
    const own = !!s.owned[dex];
    const hasSh = G.DB.ownsShiny(dex);
    const slotOf = s.team.findIndex(t => t && t.dex === dex);   // roster slot of this Pokémon, or -1
    if (!hasSh) viewShiny = false;
    else if (slotOf >= 0 && dex !== showDetail.last) viewShiny = !!s.team[slotOf].shiny;
    showDetail.last = dex;

    const max = { hp: 183, atk: 1.55, spd: 137 };
    const bar = (label, v, m, txt) =>
      `<div class="stat"><span>${label}</span><div class="bar"><i style="width:${Math.min(100, v / m * 100)}%"></i></div><span>${txt}</span></div>`;

    const box = $('dex-detail');
    box.innerHTML = `
      <canvas id="dex-big" class="stage" width="220" height="190"></canvas>
      ${hasSh ? `<div class="seg">
          <button class="${viewShiny ? '' : 'on'}" data-v="0">Normal</button>
          <button class="${viewShiny ? 'on' : ''}" data-v="1">${G.Icons.html('shiny', 12)} Shiny</button></div>` : ''}
      <div class="center">
        <div style="color:var(--muted);font-size:13px">Nº ${String(p.dex).padStart(3, '0')} · ${GEN_NAMES[p.gen - 1]}</div>
        <h3>${own ? p.name : '???'}</h3>
        <div class="rarity-line" style="color:${G.Gacha.RARITY_COLOR[p.rarity]}">${G.UI.stars(p.rarity, 24)}<span>${G.Gacha.RARITY_NAME[p.rarity]}</span>${own ? G.Icons.bstStars(p.bst) : ''}</div>
        <div style="margin:6px 0">${own ? G.UI.typeChips(p.types) : ''}</div>
      </div>
      ${own ? `
        ${bar('Vida', p.hp, max.hp, p.hp)}
        ${bar('Ataque', p.atk, max.atk, '×' + p.atk.toFixed(2))}
        ${bar('Velocidad', p.spd, max.spd, p.spd)}
        ${p.stats ? '<div id="dex-hex" class="hex-wrap"></div>' : ''}
        <p style="font-size:14px;margin:10px 0 4px">Empieza con <b class="gold">${G.Moves.BY_ID[G.startMoveOf(dex)].name}</b></p>
        <p class="move-icons" title="Movimientos que puede aprender">
          ${G.Moves.poolFor(p).map(id => `<span title="${G.Moves.BY_ID[id].name}">${G.Icons.html('move:' + id, 16)}</span>`).join('')}</p>
        ${rosterPanel(dex, slotOf, hasSh)}
      ` : `<p class="center" style="color:var(--muted)">Aún no lo tienes.<br>Consíguelo en el banner de <b class="gold">${GEN_NAMES[p.gen - 1]}</b>
            o derrotándolo cuando salga shiny.</p>`}
    `;
    $('dex-big').style.setProperty('--stage-c', !own ? '#5b83d6' : viewShiny ? '#9ae6ff' : G.U.TYPE_COLOR[p.types[0]]);
    $('dex-big').classList.toggle('shiny', own && viewShiny);
    // Base stats as a hexagon, like the main games (only for Pokémon you have).
    const hex = $('dex-hex');
    if (hex) hex.appendChild(G.StatChart.make(p.stats, viewShiny ? '#9ae6ff' : G.U.TYPE_COLOR[p.types[0]]));
    G.UI.sprite($('dex-big'), dex, { lively: own, spin: own, silhouette: !own, scale: 3, hero: true, shiny: own && viewShiny });
    box.querySelectorAll('.seg button').forEach(b => {
      b.onclick = () => { viewShiny = b.dataset.v === '1'; showDetail(dex); };
    });
    const commit = $('dex-commit');
    if (commit) commit.onclick = () => commitToSlot(pickSlot, dex, hasSh && viewShiny);
    const rm = $('dex-remove');
    if (rm) rm.onclick = () => removeFromSlot(pickSlot);
  }

  /**
   * The roster area of the detail card. Browse mode: plain text only, no buttons.
   * Pick mode: Commit to Roster (and Remove from Roster for a filled non-lead slot).
   */
  function rosterPanel(dex, slotOf, hasSh) {
    const s = G.DB.save;
    if (pickSlot == null) {
      return slotOf >= 0 ? `<p class="roster-note">On your roster · Slot ${slotOf + 1}${slotOf === 0 ? ' (lead)' : ''}</p>` : '';
    }
    const cur = s.team[pickSlot];
    const same = !!cur && cur.dex === dex && !!cur.shiny === (hasSh && viewShiny);
    let note = '';
    if (slotOf >= 0 && slotOf !== pickSlot) {
      note = `<p class="roster-note">Currently in Slot ${slotOf + 1}: committing swaps it with Slot ${pickSlot + 1}.</p>`;
    }
    return note
      + `<button id="dex-commit" class="btn gold" data-sfx="confirm" style="width:100%"${same ? ' disabled' : ''}>`
      + (same ? `Already in Slot ${pickSlot + 1}` : 'Commit to Roster' + (hasSh && viewShiny ? ' (shiny)' : '')) + '</button>'
      + (cur && pickSlot !== 0
          ? '<button id="dex-remove" class="btn ghost" style="width:100%;margin-top:6px">Remove from Roster</button>' : '');
  }

  // ---------------- mejoras ----------------

  let upgDex = null;

  function openUpgrades() {
    G.UI.show('scr-upgrades', true);
    const s = G.DB.save;
    if (!upgDex || !s.owned[upgDex]) upgDex = s.partner;
    // Selector with your Pokemon: the companion first, then the ones that already have upgrades.
    const sel = $('upg-mon');
    const lv = d => Object.values(s.pupg[d] || {}).reduce((a, b) => a + b, 0);
    const mons = Object.keys(s.owned).map(Number).filter(d => G.DEX_BY[d])
      .sort((a, b) => (b === s.partner) - (a === s.partner) || lv(b) - lv(a) || a - b);
    sel.innerHTML = mons.map(d => `<option value="${d}">${G.DEX_BY[d].name}${d === s.partner ? ' (compañero)' : ''}${lv(d) ? ' · ' + lv(d) + ' niveles' : ''}</option>`).join('');
    sel.value = upgDex;
    sel.onchange = () => { upgDex = +sel.value; G.Audio.sfx('select'); renderUpgrades(); };
    renderUpgrades();
  }

  function renderUpgrades() {
    const s = G.DB.save;
    const levels = G.DB.upgradesOf(upgDex);
    const mon = G.DEX_BY[upgDex];
    const shiny = upgDex === s.partner && !!s.partnerShiny && G.DB.ownsShiny(upgDex);
    G.UI.sprite($('upg-stage'), upgDex, { lively: true, scale: 2, hero: true, shiny });
    $('upg-stage').style.setProperty('--stage-c', shiny ? '#9ae6ff' : G.U.TYPE_COLOR[mon.types[0]]);
    const box = $('upg-list');
    box.innerHTML = '';
    for (const u of G.Upgrades.LIST) {
      const lvl = levels[u.id] || 0;
      const maxed = lvl >= u.max;
      const cost = maxed ? 0 : G.Upgrades.cost(u.id, lvl);
      const el = document.createElement('div');
      el.className = 'panel upg-item';
      el.innerHTML = `
        <div class="ic">${G.Icons.html(u.icon, 32)}</div>
        <div>
          <b>${u.name}</b> <span style="color:var(--muted);font-size:13px">${u.unit}</span>
          <div class="pips">${Array.from({ length: u.max }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('')}</div>
        </div>
        <div class="upg-btns">
          ${u.id === 'ban' && lvl > 0 ? `<button class="btn small" data-ban>Elegir (${banList().length}/${lvl})</button>` : ''}
          <button class="btn small ${maxed ? '' : 'gold'}" data-buy data-sfx="none" ${maxed || s.coins < cost ? 'disabled' : ''}>
          ${maxed ? 'Máx.' : `<span class="coin"></span> ${cost}`}</button></div>`;
      if (u.id === 'ban' && lvl > 0) el.querySelector('[data-ban]').onclick = () => { banOpen = !banOpen; renderUpgrades(); };
      el.querySelector('[data-buy]').onclick = () => {
        // Everything is re-read on press (the save may have changed since it was drawn).
        const sv = G.DB.save, lv = G.DB.upgradesOf(upgDex), now = lv[u.id] || 0;
        if (now >= u.max) { renderUpgrades(); return; }
        const price = G.Upgrades.cost(u.id, now);
        if (sv.coins < price) { renderUpgrades(); return; }
        sv.coins -= price;
        lv[u.id] = now + 1;
        G.DB.commit(true);
        G.Audio.sfx('buy');
        G.UI.refreshCoins();
        G.UI.toast(`${mon.name} · ${u.name}: nivel ${now + 1}`);
        renderUpgrades();
      };
      box.appendChild(el);
      if (u.id === 'ban' && lvl > 0 && banOpen) box.appendChild(banPicker(lvl));
    }
    box.appendChild(bindPanel());
  }

  // ---------------- shortcuts: a fixed slot for each move ----------------
  // save.pbind[dex] = [move of slot 1, of 2, of 3, of 4] (or null).
  function bindPanel() {
    const s = G.DB.save;
    s.pbind = s.pbind || {};
    const list = s.pbind[upgDex] || [null, null, null, null];
    const mon = G.DEX_BY[upgDex];
    const ids = G.Moves.poolFor(mon).concat([G.startMoveOf(upgDex)]).filter((v, i, a) => a.indexOf(v) === i)
      .sort((a, b) => G.Moves.BY_ID[a].name.localeCompare(G.Moves.BY_ID[b].name, 'es'));
    const el = document.createElement('div');
    el.className = 'panel bind-panel';
    el.innerHTML = `<b>Atajos de movimientos</b>
      <p class="sub" style="margin:2px 0 8px">Elige qué movimiento va siempre en cada hueco (teclas 1-4 o los iconos de abajo), para la memoria muscular. Si aún no tienes tantos movimientos, va al hueco más cercano.</p>
      <div class="bind-slots">${[0, 1, 2, 3].map(i => `<label class="bind-slot"><span>${i + 1}</span>
        <select class="field" data-slot="${i}"><option value="">Libre</option>${ids.map(id =>
          `<option value="${id}" ${list[i] === id ? 'selected' : ''}>${G.Moves.BY_ID[id].name}</option>`).join('')}</select></label>`).join('')}</div>`;
    el.querySelectorAll('select[data-slot]').forEach(sel => {
      sel.onchange = () => {
        const l = (s.pbind[upgDex] || [null, null, null, null]).slice(0, 4);
        while (l.length < 4) l.push(null);
        const i = +sel.dataset.slot, id = sel.value || null;
        // A move can only be in one slot.
        for (let j = 0; j < 4; j++) if (id && l[j] === id) l[j] = null;
        l[i] = id;
        s.pbind[upgDex] = l;
        G.DB.commit();
        G.Audio.sfx('select');
        renderUpgrades();
      };
    });
    return el;
  }

  // ---------------- veto: movimientos bloqueados ----------------
  // List per Pokemon in save.pban[dex]; with N levels of Veto, N moves.
  let banOpen = false;
  function banList() {
    const s = G.DB.save;
    s.pban = s.pban || {};
    return s.pban[upgDex] || (s.pban[upgDex] = []);
  }
  function banPicker(max) {
    const mon = G.DEX_BY[upgDex];
    const start = G.startMoveOf(upgDex);
    const ids = G.Moves.poolFor(mon).filter(id => id !== start)
      .sort((a, b) => G.Moves.BY_ID[a].name.localeCompare(G.Moves.BY_ID[b].name, 'es'));
    const list = banList();
    const el = document.createElement('div');
    el.className = 'panel ban-picker';
    el.innerHTML = `<p class="sub" style="margin:0 0 8px">Toca los movimientos que no quieres que te salgan en las cartas (${list.length}/${max}). El movimiento de inicio no se puede vetar.</p>
      <div class="ban-moves">${ids.map(id => { const d = G.Moves.BY_ID[id]; const on = list.includes(id);
        return `<button class="chip ${on ? 'on ban' : ''}" data-id="${id}">${G.Icons.html('move:' + id, 16)} ${d.name}${on ? ' ' + G.Icons.html('ban', 14) : ''}</button>`; }).join('')}</div>`;
    el.querySelectorAll('[data-id]').forEach(b => {
      b.onclick = () => {
        const l = banList(), id = b.dataset.id, i = l.indexOf(id);
        if (i >= 0) l.splice(i, 1);
        else if (l.length >= max) { G.UI.toast('Ya tienes ' + max + ' vetados: quita uno primero'); return; }
        else l.push(id);
        G.DB.commit();
        G.Audio.sfx('select');
        renderUpgrades();
      };
    });
    return el;
  }

  return { init, open, GEN_NAMES };
})();
