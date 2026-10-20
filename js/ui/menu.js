/* ============ menu.js — main menu, collection and upgrades ============ */
G.MenuUI = (() => {
  const $ = G.UI.$;
  const GEN_NAMES = ['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Teselia', 'Kalos', 'Alola', 'Galar', 'Paldea'];
  let dexSel = null;
  // Pokedex control state. region: 'all' | gen#; own: 'all'|'own'|'miss';
  // q: search; types/rarity/bst: multi-select (empty = all); sort + dir.
  const newCtrl = () => ({ region: 'all', own: 'all', q: '', types: [], rarity: [], bst: [], sort: 'dex', dir: 1 });
  const dexCtrl = newCtrl();
  const rosCtrl = newCtrl();          // the Team screen keeps its own filters, separate from the Pokédex
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
  // The same N-out-of-7 rating packed into a square (the icon-only filter bar): 7 stars in rows of 2, 3 and 2
  // (3 x 12 px across and down = 36 x 36). The 6 outer stars light up first, clockwise from the top left, and the
  // center one is the 7th. RANK[i] is when star i (in reading order) lights up.
  const STAR_RANK = [0, 1, 5, 6, 2, 4, 3];
  const bstTierGrid = (n) => {
    let i = 0, out = '<span class="bst-grid">';
    for (const len of [2, 3, 2]) {
      out += '<span class="r">';
      for (let k = 0; k < len; k++, i++) out += G.Icons.html(STAR_RANK[i] < n ? 'star' : 'starDim', 12);
      out += '</span>';
    }
    return out + '</span>';
  };
  const SORTS = [['dex','Dex #'],['name','Name'],['bst','BST'],['hp','HP'],['atk','Atk'],['def','Def'],['spa','SpA'],['spd','SpD'],['spe','Spe']];
  const STAT_IDX = { hp:0, atk:1, def:2, spa:3, spd:4, spe:5 };
  // The Pokédex and the Team screen share the filter bar and the grid. A "view" says which element ids
  // (prefix), which filter state, which team and which selection each one reads.
  const dexView = {
    pre: 'dex-', ctrl: dexCtrl,
    team: () => G.DB.save.team,
    sel: () => dexSel,
    pick: (dex) => { dexSel = dex; showDetail(dex); },
    compact: true,                     // icon-only filter chips, same as the Team screen
  };
  const rosView = {
    pre: 'ros-', ctrl: rosCtrl,
    team: () => ros.team,
    sel: () => ros.dex,
    pick: (dex) => rosSelectDex(dex),
    assign: true,                      // cells can be double-clicked or dragged onto a team slot
    compact: true,                     // filter chips show icons only (the name is the tooltip)
  };

  function init() {
    const ICON = { play: 'ball', team: 'crown', dex: 'book', upgrades: 'up', gacha: 'ball4', goals: 'medal3', friends: 'friends', rank: 'trophy', settings: 'gear' };
    document.querySelectorAll('#scr-menu [data-go]').forEach(b => {
      b.insertAdjacentHTML('afterbegin', `<span class="mi-ico">${G.Icons.html(ICON[b.dataset.go], 26)}</span>`);
      b.dataset.sfx = b.dataset.go === 'play' ? 'confirm' : 'click';
      b.onclick = () => {
        const go = b.dataset.go;
        if (go === 'play') { if (G.Social.room) G.LobbyUI.open(); else openRegionPicker(); }
        else if (go === 'team') openRoster();
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
    G.UI.chrome(true);
    G.UI.show('scr-menu');

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

  // ---------------- collection ----------------

  /** Region select before a solo run. Pick a region (or All); only that region's
   *  Pokemon (and earlier gens) spawn this run. Per-run, not saved. See DECISIONS.md. */
  function openRegionPicker() {
    G.UI.show('scr-region', true);
    const grid = $('region-grid');
    grid.innerHTML = '';
    const card = (label, onclick, cls) => {
      const b = document.createElement('button');
      b.className = 'region-card' + (cls ? ' ' + cls : '');
      b.innerHTML = `<b>${label}</b>`;
      b.dataset.sfx = 'confirm';
      b.onclick = onclick;
      grid.appendChild(b);
    };
    // Random: rolls a gen 1-9 at click time; the run then shows the actual region it landed on.
    card('Random', () => startRegion(G.U.randInt(1, GEN_NAMES.length)), 'all');
    // One card per generation. (No "All regions" card: Paldea (gen 9) already = every
    // earlier gen = the full dex.)
    GEN_NAMES.forEach((name, i) => {
      const g = i + 1;
      card(`[Gen. ${g}] ${name}`, () => startRegion(g));
    });
  }

  /** Commit the region choice and start the run. */
  function startRegion(gen) {
    G.Enemies.setRegion(gen);
    G.Flow.play();
  }

  /** Pokédex from the menu button: browse only, nothing to pick. */
  function browseDex() {
    showDetail.last = null;            // re-read the shiny variant from the team
    openDex();
  }

  function openDex() {
    G.UI.show('scr-dex', true);
    const s = G.DB.save;
    if (dexSel == null) dexSel = s.partner;
    const owned = Object.keys(s.owned).filter(d => G.DEX_BY[d]).length;
    $('dex-total').textContent = `${owned} / ${G.DEX.length}`;
    buildControls(dexView);
    renderGrid(dexView);
    showDetail(dexSel);
  }

  /** Filter bar shared by the Pokédex and the Team screen. `v` is the view (element-id prefix + filter state). */
  function buildControls(v) {
    const s = G.DB.save, c = v.ctrl, el = k => $(v.pre + k);
    const again = () => { buildControls(v); renderGrid(v); };
    const region = el('region');
    region.innerHTML = ['<option value="all">All regions</option>'].concat(
      GEN_NAMES.map((name, i) => {
        const g = i + 1;
        const total = G.DEX.filter(p => p.gen === g).length;
        const have = G.DEX.filter(p => p.gen === g && s.owned[p.dex]).length;
        return `<option value="${g}">[Gen. ${g}] ${name} (${have}/${total})</option>`;
      })).join('');
    region.value = String(c.region);
    region.onchange = () => { c.region = region.value === 'all' ? 'all' : +region.value; renderGrid(v); };

    const own = el('own');
    own.innerHTML = ['<option value="all">Owned & unowned</option>',
                     '<option value="own">Owned only</option>',
                     '<option value="miss">Unowned only</option>'].join('');
    own.value = c.own;
    own.onchange = () => { c.own = own.value; renderGrid(v); };

    const sort = el('sort');
    sort.innerHTML = SORTS.map(([k, label]) => `<option value="${k}">Sort: ${label}</option>`).join('');
    sort.value = c.sort;
    sort.onchange = () => { c.sort = sort.value; renderGrid(v); };
    const dir = el('dir');
    dir.textContent = c.dir === 1 ? '↓' : '↑';
    dir.onclick = () => { c.dir *= -1; dir.textContent = c.dir === 1 ? '↓' : '↑'; renderGrid(v); };

    const search = el('search');
    if (search.value !== c.q) search.value = c.q;
    search.oninput = () => {
      clearTimeout(v._t);
      v._t = setTimeout(() => { c.q = search.value.trim().toLowerCase(); renderGrid(v); }, 120);
    };

    // Icon-only chips, both pixel art, 36 px of art: the 20x20 type icons at 2x (assets/icons/types/<type>.png,
    // 18x18 of art) and the 12x12 balls at 3x (G.Icons.rarity, art from assets/icons/pokeball/). If a type PNG is
    // missing the code-drawn emblem takes its place.
    const ICON_PX = 36;
    const typeIcon = (t) => `<img class="pix tic" src="assets/icons/types/${t}.png" width="${ICON_PX * 20 / 18}" height="${ICON_PX * 20 / 18}" alt="" draggable="false" onerror="this.outerHTML=G.Icons.html('type:${t}',16)">`;

    const typeBox = el('types');
    typeBox.innerHTML = '';
    for (const t of Object.keys(G.U.TYPE_COLOR)) {
      const b = document.createElement('button');
      b.className = 'chip type-chip' + (c.types.includes(t) ? ' on' : '');
      b.style.setProperty('--tc', G.U.TYPE_COLOR[t]);
      if (v.compact) { b.classList.add('icon'); b.innerHTML = typeIcon(t); b.title = G.U.TYPE_NAME[t]; }
      else b.textContent = G.U.TYPE_NAME[t];
      b.onclick = () => { toggle(c.types, t); again(); };
      typeBox.appendChild(b);
    }

    const rareBox = el('rarity');
    rareBox.innerHTML = '';
    for (let r = 1; r <= 5; r++) {
      const b = document.createElement('button');
      b.className = 'chip' + (c.rarity.includes(r) ? ' on' : '');
      if (v.compact) { b.classList.add('icon'); b.innerHTML = G.Icons.rarity(r, ICON_PX); b.title = G.Gacha.RARITY_NAME[r]; }
      else b.innerHTML = G.Icons.rarity(r, 12) + ' ' + G.Gacha.RARITY_NAME[r];
      b.onclick = () => { toggle(c.rarity, r); again(); };
      rareBox.appendChild(b);
    }

    const bstBox = el('bst');
    bstBox.innerHTML = '';
    for (const band of BST_BANDS) {
      const b = document.createElement('button');
      b.className = 'chip bst-chip' + (c.bst.includes(band.k) ? ' on' : '');
      if (v.compact) b.classList.add('icon');
      b.innerHTML = v.compact ? bstTierGrid(band.stars) : bstTierStars(band.stars);
      b.title = 'BST ' + band.label;
      b.onclick = () => { toggle(c.bst, band.k); again(); };
      bstBox.appendChild(b);
    }

    el('clear').onclick = () => {
      c.region = 'all'; c.own = 'all'; c.q = '';
      c.types = []; c.rarity = []; c.bst = [];
      c.sort = 'dex'; c.dir = 1;
      again();
    };
  }

  function toggle(arr, v) { const i = arr.indexOf(v); if (i < 0) arr.push(v); else arr.splice(i, 1); }

  /** Move search (Pokedex and Team): the Pokemon that can learn a move whose name matches `q` (a word of the name starts with it, so 'pulse'
   *  finds Dark Pulse). Learnable = the Pokemon's type pools plus the shared Normal pool (G.Moves.poolFor). A Normal-type move is learnable
   *  by everyone, so it matches only on its FULL name (typing 'bod' must not list the whole dex). Returns null when nothing applies. */
  function moveQuery(q) {
    if (!q || q.length < 3) return null;
    const types = new Set(); let all = false;
    for (const m of G.Moves.ALL) {
      const nm = m.name.toLowerCase();
      if (m.type === 'normal') { if (nm === q) all = true; }
      else if (nm.split(/[\s-]+/).some(w => w.startsWith(q)) || nm.startsWith(q)) types.add(m.type);
    }
    return all || types.size ? { all, types } : null;
  }

  function filterSortDex(c) {
    const s = G.DB.save;
    const mq = moveQuery(c.q);
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
        const byMove = !!mq && (mq.all || p.types.some(t => mq.types.has(t)));     // can learn a move that matches (shown for unowned too: the type filters already reveal types)
        if (!(own && p.name.toLowerCase().includes(c.q)) && !num.includes(c.q) && String(p.dex) !== c.q && !byMove) return false;
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

  /** Fill one grid cell (number, roster badge, sprite, name, rarity). Also used to refresh a cell in place. */
  function fillCell(cell, p, v) {
    const s = G.DB.save, team = v.team();
    const own = !!s.owned[p.dex], sh = !!(s.shiny && s.shiny[p.dex]);
    cell.className = 'cell' + (own ? '' : ' locked') + (p.dex === v.sel() ? ' on' : '');
    cell.innerHTML = '';
    cell.insertAdjacentHTML('beforeend', `<span class="no">${String(p.dex).padStart(3, '0')}</span>`);
    const ts = team.findIndex(t => t && t.dex === p.dex);
    if (ts === 0) cell.insertAdjacentHTML('beforeend', `<span class="badge-r" title="Lead (slot 1)">${G.Icons.html('crown', 14)}</span>`);
    else if (ts > 0) cell.insertAdjacentHTML('beforeend', `<span class="badge-r badge-slot" title="Roster slot ${ts + 1}">${ts + 1}</span>`);
    else if (sh) cell.insertAdjacentHTML('beforeend', `<span class="badge-r" title="Tienes su shiny">${G.Icons.html('shiny', 12)}</span>`);
    const useShiny = sh && ts >= 0 && !!team[ts].shiny;
    cell.appendChild(G.UI.spriteCanvas(p.dex, 92, 80, { scale: 2, silhouette: !own, shadow: own, shiny: useShiny }));
    cell.insertAdjacentHTML('beforeend', `<b>${own ? p.name : '???'}</b>${G.UI.stars(p.rarity, 9)}`);
  }

  function markGrid(v) {
    const sel = v.sel();
    $(v.pre + 'grid').querySelectorAll('.cell').forEach(x => x.classList.toggle('on', +x.dataset.dex === sel));
  }

  function renderGrid(v) {
    const s = G.DB.save;
    const grid = $(v.pre + 'grid');
    grid.innerHTML = '';
    const list = filterSortDex(v.ctrl);
    $(v.pre + 'shown').textContent = `${list.length} shown`;
    for (const p of list) {
      const own = !!s.owned[p.dex];
      const cell = document.createElement('div');
      cell.dataset.dex = p.dex;
      fillCell(cell, p, v);
      cell.onclick = () => { v.pick(p.dex); markGrid(v); };
      if (v.assign && own) {
        // Team screen: double-click puts it in the highlighted slot, or drag it onto any slot.
        cell.draggable = true;
        cell.ondblclick = () => rosAssign(ros.slot, p.dex);
        cell.ondragstart = e => {
          ros.drag = p.dex;
          e.dataTransfer.setData('text/plain', String(p.dex));
          e.dataTransfer.effectAllowed = 'move';
        };
        cell.ondragend = () => { ros.drag = null; };
      }
      grid.appendChild(cell);
    }
    if (!grid.children.length) grid.innerHTML = '<p class="sub" style="grid-column:1/-1">No Pokemon match these filters.</p>';
  }

  /** Re-draw only the cells of these Pokémon (team badges and shiny sprites), without rebuilding the whole grid. */
  function refreshCells(v, dexes) {
    const grid = $(v.pre + 'grid');
    for (const d of new Set(dexes)) {
      if (d == null) continue;
      const cell = grid.querySelector(`.cell[data-dex="${d}"]`);
      if (cell) fillCell(cell, G.DEX_BY[d], v);
    }
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
        ${slotOf >= 0 ? `<p class="roster-note">On your roster · Slot ${slotOf + 1}${slotOf === 0 ? ' (lead)' : ''}</p>` : ''}
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
  }

  // ---------------- team screen ----------------
  // A fullscreen editor for the 6 fixed team slots. It works on a COPY of the team (ros.team);
  // nothing is saved until Commit Team, and Back discards the edits.
  //   ros.slot   the highlighted slot (where "Put in Slot N", a double-click or a drop goes)
  //   ros.dex    the Pokémon shown on the right (a team member, or a preview from the list), null = empty slot
  //   ros.shiny  Normal / Shiny toggle for ros.dex
  //   ros.drag   dex being dragged (a list cell or a filled slot)
  const ros = { team: [], slot: 0, dex: null, shiny: false, drag: null };
  const teamKey = t => JSON.stringify(t.map(x => x ? [x.dex, x.shiny ? 1 : 0] : null));
  const rosDirty = () => teamKey(ros.team) !== teamKey(G.DB.save.team);

  function openRoster() {
    const s = G.DB.save;
    G.DB.normalizeTeam(s);
    ros.team = s.team.map(t => t ? { dex: t.dex, shiny: !!t.shiny } : null);
    ros.drag = null;
    G.UI.chrome(false);                       // fullscreen: no coins / tickets bar
    G.UI.show('scr-roster');                  // (no keepMenu: the main menu is hidden too)
    $('ros-back').onclick = rosBack;
    $('ros-commit').onclick = rosCommit;
    buildControls(rosView);
    renderGrid(rosView);
    rosSelectSlot(0);
  }

  function rosBack() {
    if (rosDirty() && !confirm('Discard your team changes?')) return;
    open();
  }

  function rosCommit() {
    const s = G.DB.save;
    if (!ros.team[0] || !rosDirty()) return;
    s.team = ros.team.map(t => t ? { dex: t.dex, shiny: !!t.shiny } : null);
    s.partner = s.team[0].dex;                // the lead is the companion
    s.partnerShiny = !!s.team[0].shiny;
    G.DB.commit();
    G.UI.toast('Team saved');
    open();
  }

  /** Highlight a slot and show its Pokémon (or the empty-slot hint). */
  function rosSelectSlot(slot) {
    ros.slot = slot;
    const t = ros.team[slot];
    ros.dex = t ? t.dex : null;
    ros.shiny = !!(t && t.shiny && G.DB.ownsShiny(t.dex));
    rosRenderAll();
    markGrid(rosView);
  }

  /** Preview a Pokémon from the list on the right (the highlighted slot does not change). */
  function rosSelectDex(dex) {
    const t = ros.team.find(x => x && x.dex === dex);
    ros.dex = dex;
    ros.shiny = !!(t && t.shiny && G.DB.ownsShiny(dex));
    rosRenderAll();
  }

  function rosRenderAll() {
    rosRenderSlots();
    rosRenderDetail();
    $('ros-commit').disabled = !rosDirty();
  }

  /**
   * Put `dex` in team slot `slot` (on the working copy). A Pokémon already on the team in another slot
   * SWAPS places with whoever is in `slot`, so nobody drops off. Slot 1 (the lead) can never be left empty.
   */
  function rosAssign(slot, dex) {
    const s = G.DB.save, p = G.DEX_BY[dex];
    if (!p) return;
    if (!s.owned[dex]) { G.UI.toast('You do not own that Pokémon yet'); return; }
    const before = ros.team.map(t => t && t.dex);
    const team = ros.team.slice();
    const from = team.findIndex(t => t && t.dex === dex);
    if (from === slot) { rosSelectSlot(slot); return; }
    const displaced = team[slot] || null;
    let shiny;
    if (from >= 0) {
      if (from === 0 && !displaced) { G.UI.toast('Slot 1 is the lead and cannot be left empty'); return; }
      shiny = !!team[from].shiny;
      team[from] = displaced;
    } else {
      shiny = ros.dex === dex && ros.shiny && G.DB.ownsShiny(dex);
    }
    team[slot] = { dex, shiny: !!shiny };
    ros.team = team;
    ros.slot = slot;
    ros.dex = dex;
    ros.shiny = !!shiny;
    if (from >= 0 && displaced) G.UI.toast(`${p.name} and ${G.DEX_BY[displaced.dex].name} swapped slots`);
    rosRenderAll();
    refreshCells(rosView, before.concat(ros.team.map(t => t && t.dex)));
    markGrid(rosView);
  }

  function rosRemove() {
    const i = ros.team.findIndex(t => t && t.dex === ros.dex);
    if (i <= 0) return;                       // not on the team, or the lead (never empty)
    const gone = ros.team[i].dex;
    ros.team = ros.team.slice();
    ros.team[i] = null;
    ros.slot = i;
    ros.dex = null;
    rosRenderAll();
    refreshCells(rosView, [gone]);
    markGrid(rosView);
  }

  function rosRenderSlots() {
    const box = $('ros-slots');
    box.innerHTML = '';
    ros.team.forEach((t, slot) => {
      const mon = t && G.DEX_BY[t.dex];
      const shiny = !!(mon && t.shiny && G.DB.ownsShiny(t.dex));
      const b = document.createElement('div');
      b.className = 'ros-slot' + (mon ? '' : ' empty') + (slot === 0 ? ' lead' : '') + (slot === ros.slot ? ' on' : '');
      b.dataset.sfx = 'click';
      b.title = mon ? `Slot ${slot + 1}: ${mon.name}` : `Slot ${slot + 1}: empty`;
      b.insertAdjacentHTML('beforeend', `<span class="rn">${slot === 0 ? G.Icons.html('crown', 12) : ''}${slot + 1}</span>`);
      if (mon) {
        b.insertAdjacentHTML('beforeend',
          `<div class="rinfo"><b>${mon.name}</b><span class="rtypes">${G.UI.typeChips(mon.types)}</span></div>`);
        if (shiny) b.insertAdjacentHTML('beforeend', `<span class="rsh">${G.Icons.html('shiny', 12)}</span>`);
        b.appendChild(G.UI.spriteCanvas(mon.dex, 138, 120, { lively: true, scale: 3, hero: true, shiny }));
      } else {
        b.insertAdjacentHTML('beforeend', '<div class="rinfo"><b>Empty</b></div><span class="rplus">+</span>');
      }
      b.onclick = () => { rosSelectSlot(slot); markGrid(rosView); };
      // Drop a Pokémon from the list (or another slot) here.
      b.ondragover = e => { if (ros.drag != null) { e.preventDefault(); b.classList.add('drop'); } };
      b.ondragleave = () => b.classList.remove('drop');
      b.ondrop = e => {
        e.preventDefault();
        b.classList.remove('drop');
        const d = ros.drag != null ? ros.drag : +e.dataTransfer.getData('text/plain');
        ros.drag = null;
        if (d) rosAssign(slot, d);
      };
      if (mon) {
        b.draggable = true;                   // drag a team card onto another slot to swap
        b.ondragstart = e => { ros.drag = mon.dex; e.dataTransfer.setData('text/plain', String(mon.dex)); e.dataTransfer.effectAllowed = 'move'; };
        b.ondragend = () => { ros.drag = null; };
      }
      box.appendChild(b);
    });
  }

  function rosRenderDetail() {
    const s = G.DB.save, box = $('ros-detail');
    const dex = ros.dex;
    if (dex == null) {
      box.innerHTML = `<div class="ros-hint"><h3>Slot ${ros.slot + 1} is empty</h3>
        <p class="sub">Pick a Pokémon from the list, then use <b class="gold">Put in Slot ${ros.slot + 1}</b>, double-click it, or drag it onto a slot.</p></div>`;
      return;
    }
    const p = G.DEX_BY[dex];
    const own = !!s.owned[dex];
    const hasSh = G.DB.ownsShiny(dex);
    if (!hasSh) ros.shiny = false;
    const onTeam = ros.team.findIndex(t => t && t.dex === dex);
    const slotT = ros.slot, cur = ros.team[slotT];
    const color = !own ? '#5b83d6' : ros.shiny ? '#9ae6ff' : G.U.TYPE_COLOR[p.types[0]];

    let moves = '';
    if (own) {
      const start = G.startMoveOf(dex);
      const ids = [start].concat(G.Moves.poolFor(p).filter(id => id !== start));
      moves = ids.map((id, i) => `<div class="ros-mv${i === 0 ? ' start' : ''}"${i === 0 ? ' title="Starting move"' : ''}>${G.Icons.html('move:' + id, 16)}<span>${G.Moves.BY_ID[id].name}</span></div>`).join('');
    }

    let note = '', act = '';
    if (own) {
      const same = onTeam === slotT;
      if (!same && onTeam >= 0) note = `Currently in Slot ${onTeam + 1}: swaps with Slot ${slotT + 1}.`;
      else if (!same && cur) note = `Replaces ${G.DEX_BY[cur.dex].name} in Slot ${slotT + 1}.`;
      act = `<button id="ros-put" class="btn gold" data-sfx="confirm"${same ? ' disabled' : ''}>`
        + (same ? `Already in Slot ${slotT + 1}` : `Put in Slot ${slotT + 1}` + (hasSh && ros.shiny ? ' (shiny)' : '')) + '</button>'
        + (onTeam > 0 ? '<button id="ros-remove" class="btn ghost">Remove from team</button>' : '');
    }

    box.innerHTML = `
      <div class="ros-dh"><b>${own ? p.name : '???'}</b><span>Nº ${String(p.dex).padStart(3, '0')} · ${GEN_NAMES[p.gen - 1]}</span></div>
      <div class="ros-db">
        <canvas id="ros-big" class="stage" width="220" height="190"></canvas>
        ${hasSh ? `<div class="seg">
          <button class="${ros.shiny ? '' : 'on'}" data-v="0">Normal</button>
          <button class="${ros.shiny ? 'on' : ''}" data-v="1">${G.Icons.html('shiny', 12)} Shiny</button></div>` : ''}
        ${own ? `
          <div class="center">
            <div class="rarity-line" style="color:${G.Gacha.RARITY_COLOR[p.rarity]}">${G.UI.stars(p.rarity, 24)}<span>${G.Gacha.RARITY_NAME[p.rarity]}</span>${G.Icons.bstStars(p.bst)}</div>
            <div style="margin:6px 0">${G.UI.typeChips(p.types)}</div>
          </div>
          ${p.stats ? '<div id="ros-hex" class="hex-wrap"></div>' : ''}
          <div class="ros-line"><span>Ability</span><b>Coming soon</b></div>
          <div class="ros-mh">Moves</div>
          <div class="ros-moves">${moves}</div>
        ` : `<p class="center" style="color:var(--muted)">Aún no lo tienes.<br>Consíguelo en el banner de <b class="gold">${GEN_NAMES[p.gen - 1]}</b>
            o derrotándolo cuando salga shiny.</p>`}
      </div>
      <div class="ros-da">${note ? `<p class="roster-note">${note}</p>` : ''}${act}</div>`;
    $('ros-big').style.setProperty('--stage-c', color);
    $('ros-big').classList.toggle('shiny', own && ros.shiny);
    const hex = $('ros-hex');
    if (hex) hex.appendChild(G.StatChart.make(p.stats, color, 340, 400, { radius: 0.40 }));
    G.UI.sprite($('ros-big'), dex, { lively: own, spin: own, silhouette: !own, scale: 3, hero: true, shiny: own && ros.shiny });
    box.querySelectorAll('.seg button').forEach(b => {
      b.onclick = () => {
        ros.shiny = b.dataset.v === '1';
        if (onTeam >= 0) {                    // a team member's Normal / Shiny choice is part of the draft
          ros.team = ros.team.slice();
          ros.team[onTeam] = { dex, shiny: ros.shiny };
          refreshCells(rosView, [dex]);
        }
        rosRenderAll();
      };
    });
    const put = $('ros-put');
    if (put) put.onclick = () => rosAssign(ros.slot, dex);
    const rm = $('ros-remove');
    if (rm) rm.onclick = rosRemove;
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
