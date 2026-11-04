/* ============ menu.js — main menu, collection and upgrades ============ */
G.MenuUI = (() => {
  const $ = G.UI.$;
  const GEN_NAMES = ['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Teselia', 'Kalos', 'Alola', 'Galar', 'Paldea'];
  // Region select cards (new English text; GEN_NAMES above is the old key list other screens use).
  const REGION_CARDS = ['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Unova', 'Kalos', 'Alola', 'Galar', 'Paldea'];
  // Generations you can pick for now. TODO: unlock the rest by region completion (BOSS-REWORK). Random stays locked
  // because it rolls any generation.
  const REGIONS_OPEN = [1];
  let dexSel = null;
  // Pokedex control state. region: 'all' | gen#; own: 'all'|'own'|'miss';
  // q: search; types/rarity/bst: multi-select (empty = all); sort + dir.
  // marks (3b-2 E3): 'fav' and 'lock' chips, Team screen box tabs only.
  const newCtrl = () => ({ region: 'all', own: 'all', q: '', types: [], rarity: [], bst: [], marks: [], sort: 'dex', dir: 1 });
  const dexCtrl = newCtrl();
  const rosCtrl = newCtrl(); // the Team screen keeps its own filters, separate from the Pokédex
  const BST_BANDS = [
    { k: 'lo', label: '≤300', lo: 0, hi: 300, stars: 3 },
    { k: 'mid', label: '301-400', lo: 301, hi: 400, stars: 4 },
    { k: 'hi', label: '401-500', lo: 401, hi: 500, stars: 5 },
    { k: 'vhi', label: '501-600', lo: 501, hi: 600, stars: 6 },
    { k: 'top', label: '600+', lo: 601, hi: 9999, stars: 7 },
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
    let i = 0,
      out = '<span class="bst-grid">';
    for (const len of [2, 3, 2]) {
      out += '<span class="r">';
      for (let k = 0; k < len; k++, i++) out += G.Icons.html(STAR_RANK[i] < n ? 'star' : 'starDim', 12);
      out += '</span>';
    }
    return out + '</span>';
  };
  const SORTS = [
    ['dex', 'Dex #'],
    ['name', 'Name'],
    ['bst', 'BST'],
    ['hp', 'HP'],
    ['atk', 'Atk'],
    ['def', 'Def'],
    ['spa', 'SpA'],
    ['spd', 'SpD'],
    ['spe', 'Spe'],
  ];
  const STAT_IDX = { hp: 0, atk: 1, def: 2, spa: 3, spd: 4, spe: 5 };
  // The Pokédex and the Team screen share the filter bar and the grid. A "view" says which element ids
  // (prefix), which filter state, which team and which selection each one reads.
  const dexView = {
    pre: 'dex-',
    ctrl: dexCtrl,
    team: () => G.DB.save.team,
    sel: () => dexSel,
    pick: (dex) => {
      dexSel = dex;
      showDetail(dex);
    },
    compact: true, // icon-only filter chips, same as the Team screen
  };
  const rosView = {
    pre: 'ros-',
    ctrl: rosCtrl,
    team: () => ros.team,
    sel: () => ros.dex,
    selUid: () => ros.uid,
    boxTab: () => (ros.tab === 'dex' ? null : ros.tab),
    pick: (dex) => rosSelectDex(dex),
    assign: true, // cells can be double-clicked or dragged onto a team slot
    compact: true, // filter chips show icons only (the name is the tooltip)
  };

  // Main menu cursor: one row is always selected (Black/White style); hover, focus and the arrow keys move it.
  let rows = [],
    menuCur = 0;
  function select(i) {
    menuCur = (i + rows.length) % rows.length;
    rows.forEach((b, k) => b.classList.toggle('sel', k === menuCur));
  }
  /** The main menu is the top screen: nothing (Settings, a dialog, another screen) open over it. */
  const menuOnTop = () => G.UI.isOpen('scr-menu') && document.querySelectorAll('.scr:not(.hidden)').length === 1;

  function init() {
    // PokeCoins changed while the Team screen is open (a purchase, a debug command): the box price tabs follow at once.
    // Only the tab row is redrawn: the grid, the selection and pending team edits stay as they are.
    G.DB.onSave(() => {
      if (G.UI.isOpen('scr-roster')) rosRenderTabs();
    });
    // Preload the row art and fonts, so the first hover and the first open never draw half a menu.
    for (const n of ['row', 'row-sel', 'play', 'play-sel']) new Image().src = `assets/ui/menu/${n}.png`;
    for (const n of [
      'slot-blank',
      'slot-rect',
      'slot-rect-sel',
      'slot-round',
      'slot-round-sel',
      'btn',
      'btn-sel',
      'arrow',
    ])
      new Image().src = `assets/ui/team/${n}.png`;
    for (const n of ['box', 'box-sel']) new Image().src = `assets/ui/upgrades/${n}.png`;
    if (document.fonts) {
      document.fonts.load('16px PokeBW').catch(() => {});
      document.fonts.load('800 16px Korataki').catch(() => {});
    }
    rows = [...document.querySelectorAll('#scr-menu [data-go]')];
    rows.forEach((b, i) => {
      b.addEventListener('pointerenter', () => !rgOpen && select(i));
      b.addEventListener('focus', () => !rgOpen && select(i));
    });
    addEventListener('keydown', (e) => {
      if (!menuOnTop() || rgOpen || e.target.closest('input, textarea, select')) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        select(menuCur + (e.key === 'ArrowDown' ? 1 : -1));
        G.Audio.sfx('hover');
      } else if (e.key === 'Enter' || e.key === ' ') rows[menuCur].click();
      else return;
      e.preventDefault();
    });
    // Team screen: Enter puts the previewed Pokémon in the targeted slot.
    addEventListener('keydown', (e) => {
      if (
        e.key !== 'Enter' ||
        ros.select || // select mode (3b-3): Enter places nothing
        !G.UI.isOpen('scr-roster') ||
        G.UI.isOpen('scr-upgrades') ||
        e.target.closest('input, textarea, select, button')
      )
        return;
      const cur = ros.team[ros.slot];
      if (ros.dex == null || !G.DB.save.owned[ros.dex] || (ros.uid && cur && cur.uid === ros.uid)) return;
      e.preventDefault();
      rosPlace(ros.slot, ros.uid || ros.dex);
    });
    addEventListener('keydown', upgKey);
    document.querySelectorAll('#scr-menu [data-go]').forEach((b) => {
      b.dataset.sfx = b.dataset.go === 'play' ? 'confirm' : 'click';
      b.onclick = () => {
        const go = b.dataset.go;
        if (go === 'play') {
          if (G.Social.room) G.LobbyUI.open();
          else openRegionPicker();
        } else if (go === 'team') openRoster();
        else if (go === 'inventory') openInventory();
        else if (go === 'dex') browseDex();
        else if (go === 'upgrades') openUpgrades();
        else if (go === 'gacha') G.GachaUI.open();
        else if (go === 'goals') G.GoalsUI.open();
        else if (go === 'friends') G.FriendsUI.open();
        else if (go === 'rank') G.RankingUI.open();
        else if (go === 'settings') G.SettingsUI.open();
      };
    });
    document.querySelectorAll('[data-back]').forEach((b) => {
      b.onclick = open;
    });
    initRegionPicker();
    G.Social.on(() => {
      if (G.UI.isOpen('scr-menu')) socialLine();
    });
    $('btn-logout').onclick = async () => {
      if (
        G.DB.guest &&
        !(await G.UI.ask(G.T('Eres invitado: se perderá todo el progreso. ¿Salir?'), {
          title: 'Sign out',
          ok: 'Sign out',
        }))
      )
        return;
      G.Audio.music(null);
      G.DB.logout().then(() => G.Flow.toLogin());
    };
  }

  // ---------------- main menu ----------------

  function open() {
    const s = G.DB.save;
    closeRegionPicker();
    G.UI.chrome(true);
    G.UI.show('scr-menu');

    const owned = Object.keys(s.owned).filter((d) => G.DEX_BY[d]).length;
    const shinies = Object.keys(s.shiny || {}).length;
    $('menu-dex-count').textContent = `${owned}/${G.DEX.length} - ${shinies} shiny`; // under Team (the separate Pokémon menu entry is gone)

    const st = s.stats;
    $('menu-stats').innerHTML =
      `Runs <b>${st.runs}</b> · Best <b>${G.U.mmss(st.bestTime)}</b> · ` +
      `Lv <b>${st.bestLevel}</b> · KOs <b>${st.totalKills.toLocaleString('en')}</b>`;
    $('guest-note').classList.toggle('hidden', !G.DB.guest);

    socialLine();
    // Mission prizes to claim.
    G.Progress.checkAch();
    const pend = G.Progress.pending();
    $('menu-goals-sub').textContent = pend
      ? pend + (pend === 1 ? ' premio por recoger' : ' premios por recoger')
      : 'Misiones, logros y perfil';
    $('menu-goals-sub').classList.toggle('gold', pend > 0);
    // With a cloud account: friends online, invitations and (once) the nickname.
    if (G.DB.online && !G.Social.started) {
      G.Social.start().then((r) => {
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
    if (play)
      play.textContent = room
        ? 'Volver a tu sala (' + room.members.length + '/' + G.Social.MAX_PLAYERS + ')'
        : 'Entra en la mazmorra';
    const fr = G.Social.friends;
    const on = fr.filter((f) => f.status === 'ok' && f.online).length;
    const req = fr.filter((f) => f.status === 'in').length;
    const parts = [];
    if (on) parts.push(on + ' en línea');
    if (req) parts.push(req + (req === 1 ? ' solicitud' : ' solicitudes'));
    $('menu-friends-sub').textContent = parts.length ? parts.join(' · ') : 'Juega en grupo, hasta 4';
    $('menu-friends-sub').classList.toggle('gold', req > 0);
  }

  // ---------------- collection ----------------

  /** Region select before a solo run: the cards slide out from under the main panel over a dimmed overworld
   *  (css/bw-menu.css .rg). Pick a generation; only it and the earlier ones spawn this run. Per-run, not saved. */
  let rgOpen = false,
    rgCur = 0;
  const rgCards = () => [...document.querySelectorAll('#rg-cards .rg-card')];
  const rgFree = () => rgCards().flatMap((c, i) => (c.classList.contains('locked') ? [] : [i]));

  function initRegionPicker() {
    const box = $('rg-cards');
    const card = (name, sub, gen, i) => {
      const b = document.createElement('button');
      const locked = !REGIONS_OPEN.includes(gen);
      b.className = 'rg-card' + (locked ? ' locked' : '');
      b.style.setProperty('--i', i);
      b.innerHTML = `<b translate="no">${name}</b><small>${sub}</small>`;
      if (locked) {
        b.setAttribute('aria-disabled', 'true');
        b.tabIndex = -1;
      } else {
        b.dataset.sfx = 'confirm';
        b.onclick = () => startRegion(gen);
        b.addEventListener('pointerenter', () => rgSelect(i));
      }
      box.appendChild(b);
    };
    REGION_CARDS.forEach((name, i) => card(name, `Generation ${i + 1}`, i + 1, i));
    card('Random', 'Random Selection', 0, REGION_CARDS.length);
    // Any click that is not on a card (the dim, the panel, the space by the bars) folds the cards back and does nothing else.
    $('scr-menu').addEventListener(
      'click',
      (e) => {
        if (!rgOpen || e.target.closest('.rg-card')) return;
        e.stopPropagation();
        e.preventDefault();
        G.Audio.sfx('back');
        closeRegionPicker();
      },
      true
    );
    addEventListener('keydown', (e) => {
      if (!rgOpen) return;
      const free = rgFree();
      if (e.key === 'Escape') {
        G.Audio.sfx('back');
        closeRegionPicker();
      } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && free.length) {
        const at = Math.max(0, free.indexOf(rgCur));
        rgSelect(free[(at + (e.key === 'ArrowDown' ? 1 : -1) + free.length) % free.length]);
        G.Audio.sfx('hover');
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (free.includes(rgCur)) rgCards()[rgCur].click();
      } else return;
      e.preventDefault();
    });
  }

  function rgSelect(i) {
    rgCur = i;
    rgCards().forEach((c, k) => c.classList.toggle('sel', k === i));
  }

  function openRegionPicker() {
    rgOpen = true;
    rgSelect(rgFree()[0] || 0);
    select(0); // Play stays lit, the other rows dim
    $('rg').classList.add('open');
    $('scr-menu').classList.add('rg-on');
  }

  function closeRegionPicker() {
    rgOpen = false;
    $('rg').classList.remove('open');
    $('scr-menu').classList.remove('rg-on');
  }

  /** Commit the region choice and start the run. */
  function startRegion(gen) {
    closeRegionPicker(); // or its key handler stays live in the run, and Space or Enter starts a new one
    G.Enemies.setRegion(gen);
    G.Flow.play();
  }

  /** Pokédex from the menu button: browse only, nothing to pick. */
  function browseDex() {
    showDetail.last = null; // re-read the shiny variant from the team
    openDex();
  }

  function openDex() {
    G.UI.show('scr-dex', true);
    const s = G.DB.save;
    if (dexSel == null) dexSel = s.partner;
    const owned = Object.keys(s.owned).filter((d) => G.DEX_BY[d]).length;
    $('dex-total').textContent = `${owned} / ${G.DEX.length}`;
    buildControls(dexView);
    renderGrid(dexView);
    showDetail(dexSel);
  }

  /** Filter bar shared by the Pokédex and the Team screen. `v` is the view (element-id prefix + filter state). */
  function buildControls(v) {
    const s = G.DB.save,
      c = v.ctrl,
      el = (k) => $(v.pre + k);
    const again = () => {
      buildControls(v);
      renderGrid(v);
    };
    const region = el('region');
    region.innerHTML = ['<option value="all">All regions</option>']
      .concat(
        GEN_NAMES.map((name, i) => {
          const g = i + 1;
          const total = G.DEX.filter((p) => p.gen === g).length;
          const have = G.DEX.filter((p) => p.gen === g && s.owned[p.dex]).length;
          return `<option value="${g}">[Gen. ${g}] ${name} (${have}/${total})</option>`;
        })
      )
      .join('');
    region.value = String(c.region);
    region.onchange = () => {
      c.region = region.value === 'all' ? 'all' : +region.value;
      renderGrid(v);
    };

    const own = el('own');
    own.innerHTML = [
      '<option value="all">Owned & unowned</option>',
      '<option value="own">Owned only</option>',
      '<option value="miss">Unowned only</option>',
    ].join('');
    own.value = c.own;
    own.onchange = () => {
      c.own = own.value;
      renderGrid(v);
    };

    const sort = el('sort');
    sort.innerHTML = SORTS.map(([k, label]) => `<option value="${k}">Sort: ${label}</option>`).join('');
    sort.value = c.sort;
    sort.onchange = () => {
      c.sort = sort.value;
      renderGrid(v);
    };
    const dir = el('dir');
    dir.textContent = c.dir === 1 ? '↓' : '↑';
    dir.onclick = () => {
      c.dir *= -1;
      dir.textContent = c.dir === 1 ? '↓' : '↑';
      renderGrid(v);
    };

    const search = el('search');
    if (search.value !== c.q) search.value = c.q;
    search.oninput = () => {
      clearTimeout(v._t);
      v._t = setTimeout(() => {
        c.q = search.value.trim().toLowerCase();
        renderGrid(v);
      }, 120);
    };

    // Icon-only chips, both pixel art, 36 px of art: the 20x20 type icons at 2x (assets/icons/types/<type>.png,
    // 18x18 of art) and the 12x12 balls at 3x (G.Icons.rarity, art from assets/icons/pokeball/). If a type PNG is
    // missing the code-drawn emblem takes its place.
    const ICON_PX = 36;
    const typeIcon = (t) =>
      `<img class="pix tic" src="assets/icons/types/${t}.png" width="${(ICON_PX * 20) / 18}" height="${(ICON_PX * 20) / 18}" alt="" draggable="false" onerror="this.outerHTML=G.Icons.html('type:${t}',16)">`;

    const typeBox = el('types');
    typeBox.innerHTML = '';
    for (const t of Object.keys(G.U.TYPE_COLOR)) {
      const b = document.createElement('button');
      b.className = 'chip type-chip' + (c.types.includes(t) ? ' on' : '');
      b.style.setProperty('--tc', G.U.TYPE_COLOR[t]);
      if (v.compact) {
        b.classList.add('icon');
        b.innerHTML = typeIcon(t);
        b.title = G.U.TYPE_NAME[t];
      } else b.textContent = G.U.TYPE_NAME[t];
      b.onclick = () => {
        toggle(c.types, t);
        again();
      };
      typeBox.appendChild(b);
    }

    const rareBox = el('rarity');
    rareBox.innerHTML = '';
    for (let r = 1; r <= 5; r++) {
      const b = document.createElement('button');
      b.className = 'chip' + (c.rarity.includes(r) ? ' on' : '');
      if (v.compact) {
        b.classList.add('icon');
        b.innerHTML = G.Icons.rarity(r, ICON_PX);
        b.title = G.Gacha.RARITY_NAME[r];
      } else b.innerHTML = G.Icons.rarity(r, 12) + ' ' + G.Gacha.RARITY_NAME[r];
      b.onclick = () => {
        toggle(c.rarity, r);
        again();
      };
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
      b.onclick = () => {
        toggle(c.bst, band.k);
        again();
      };
      bstBox.appendChild(b);
    }

    // Favorites and Locked (3b-2 E3), after BST: only the Team screen has this chip set. Box tabs only; hidden on the Pokedex tab.
    const markBox = el('marks');
    if (markBox) {
      if (!Array.isArray(c.marks)) c.marks = [];
      markBox.innerHTML = '';
      for (const [k, icon, label] of [
        ['fav', 'heart', 'Favorites'],
        ['lock', 'lock', 'Locked'],
      ]) {
        const b = document.createElement('button');
        b.className = 'chip icon mark-chip' + (c.marks.includes(k) ? ' on' : '');
        b.innerHTML = G.Icons.html(icon, 24);
        b.title = label;
        b.onclick = () => {
          toggle(c.marks, k);
          again();
        };
        markBox.appendChild(b);
      }
    }

    el('clear').onclick = () => {
      c.region = 'all';
      c.own = 'all';
      c.q = '';
      c.types = [];
      c.rarity = [];
      c.bst = [];
      c.marks = [];
      c.sort = 'dex';
      c.dir = 1;
      again();
    };
  }

  function toggle(arr, v) {
    const i = arr.indexOf(v);
    if (i < 0) arr.push(v);
    else arr.splice(i, 1);
  }

  /** Move search (Pokedex and Team): the Pokemon that can learn a move whose name matches `q` (a word of the name starts with it (name-start matches rank first), so 'pulse'
   *  finds Dark Pulse). Learnable = the Pokemon's type pools plus the shared Normal pool (G.Moves.poolFor). A Normal-type move is learnable
   *  by everyone, so it matches only on its FULL name (typing 'bod' must not list the whole dex). Returns null when nothing applies. */
  function moveQuery(q) {
    if (!q || q.length < 3) return null;
    const types = new Set(),
      weak = new Set();
    let all = false; // types: the move NAME starts with q (ranked first); weak: only a later word does ('bit' -> Bug Bite)
    for (const m of G.Moves.ALL) {
      if (G.Moves.RETIRED[m.id] || G.Moves.HELD.has(m.id)) continue; // retired (slice 7b) and held (Kanto batch 1) moves are learnable by no one
      const nm = m.name.toLowerCase();
      if (m.type === 'normal') {
        if (nm === q) all = true;
      } else if (nm.startsWith(q)) types.add(m.type);
      else if (nm.split(/[\s-]+/).some((w) => w.startsWith(q))) weak.add(m.type);
    }
    for (const t of types) weak.delete(t);
    return all || types.size || weak.size ? { all, types, weak } : null;
  }

  function filterSortDex(c) {
    const s = G.DB.save;
    const mq = moveQuery(c.q);
    const list = G.DEX.filter((p) => {
      if (c.region !== 'all' && p.gen !== c.region) return false;
      const own = !!s.owned[p.dex];
      if (c.own === 'own' && !own) return false;
      if (c.own === 'miss' && own) return false;
      if (c.types.length && !c.types.some((t) => p.types.includes(t))) return false;
      if (c.rarity.length && !c.rarity.includes(p.rarity)) return false;
      if (
        c.bst.length &&
        !c.bst.some((k) => {
          const b = BST_BANDS.find((x) => x.k === k);
          return p.bst >= b.lo && p.bst <= b.hi;
        })
      )
        return false;
      if (c.q) {
        const num = String(p.dex).padStart(3, '0');
        const byMove = !!mq && (mq.all || p.types.some((t) => mq.types.has(t) || mq.weak.has(t))); // can learn a move that matches (shown for unowned too: the type filters already reveal types)
        if (!(own && p.name.toLowerCase().includes(c.q)) && !num.includes(c.q) && String(p.dex) !== c.q && !byMove)
          return false;
      }
      return true;
    });
    const key = c.sort;
    // Stat/BST sorts are power-revealing: sink UNOWNED to the bottom (owned-first),
    // then order by the chosen stat within each group. Dex/name sorts are not sunk.
    const sinkUnowned = key !== 'dex' && key !== 'name';
    // Ranking of a move search: name/# hits and moves whose NAME starts with the query first, word-only matches (Bug Bite for 'bit') below.
    const tier = (p) => {
      if (!mq || mq.all || p.types.some((t) => mq.types.has(t))) return 0;
      const num = String(p.dex).padStart(3, '0');
      return (s.owned[p.dex] && p.name.toLowerCase().includes(c.q)) || num.includes(c.q) || String(p.dex) === c.q
        ? 0
        : 1;
    };
    list.sort((a, b) => {
      if (mq) {
        const d = tier(a) - tier(b);
        if (d) return d;
      }
      if (sinkUnowned) {
        const oa = !!s.owned[a.dex],
          ob = !!s.owned[b.dex];
        if (oa !== ob) return oa ? -1 : 1;
      }
      if (key === 'name') return c.dir * a.name.localeCompare(b.name);
      let va, vb;
      if (key === 'dex') {
        va = a.dex;
        vb = b.dex;
      } else if (key === 'bst') {
        va = a.bst;
        vb = b.bst;
      } else {
        const idx = STAT_IDX[key];
        va = a.stats ? a.stats[idx] : 0;
        vb = b.stats ? b.stats[idx] : 0;
      }
      return c.dir * (va - vb);
    });
    return list;
  }

  /** Fill one grid cell (number, roster badge, sprite, name, rarity). Also used to refresh a cell in place. */
  function fillCell(cell, p, v) {
    const s = G.DB.save,
      team = v.team();
    const own = !!s.owned[p.dex],
      sh = !!(s.shiny && s.shiny[p.dex]);
    cell.className = 'cell' + (own ? '' : ' locked') + (p.dex === v.sel() ? ' on' : '');
    cell.innerHTML = '';
    cell.insertAdjacentHTML('beforeend', `<span class="no">${String(p.dex).padStart(3, '0')}</span>`);
    const ts = team.findIndex((t) => t && t.dex === p.dex);
    if (ts === 0)
      cell.insertAdjacentHTML(
        'beforeend',
        `<span class="badge-r" title="Lead (slot 1)">${G.Icons.html('crown', 14)}</span>`
      );
    else if (ts > 0)
      cell.insertAdjacentHTML(
        'beforeend',
        `<span class="badge-r badge-slot" title="Roster slot ${ts + 1}">${ts + 1}</span>`
      );
    else if (sh)
      cell.insertAdjacentHTML(
        'beforeend',
        `<span class="badge-r" title="Tienes su shiny">${G.Icons.html('shiny', 12)}</span>`
      );
    const useShiny = sh && ts >= 0 && !!team[ts].shiny;
    cell.appendChild(G.UI.spriteCanvas(p.dex, 92, 80, { scale: 2, silhouette: !own, shadow: own, shiny: useShiny }));
    cell.insertAdjacentHTML('beforeend', `<b>${own ? p.name : '???'}</b>${G.UI.stars(p.rarity, 9)}`);
  }

  function markGrid(v) {
    const sel = v.sel();
    $(v.pre + 'grid')
      .querySelectorAll('.cell')
      .forEach((x) =>
        x.classList.toggle('on', x.dataset.uid ? x.dataset.uid === (v.selUid && v.selUid()) : +x.dataset.dex === sel)
      );
  }

  function renderGrid(v) {
    if (v.boxTab && v.boxTab() != null) {
      rosRenderBox(v);
      return;
    }
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
      cell.onclick = () => {
        v.pick(p.dex);
        markGrid(v);
      };
      if (v.assign && own) {
        // Team screen: double-click puts it in the highlighted slot, or drag it onto any slot.
        cell.draggable = true;
        cell.ondblclick = () => rosPlace(ros.slot, p.dex);
        cell.ondragstart = (e) => {
          ros.drag = p.dex;
          e.dataTransfer.setData('text/plain', String(p.dex));
          e.dataTransfer.effectAllowed = 'move';
        };
        cell.ondragend = () => {
          ros.drag = null;
        };
      }
      grid.appendChild(cell);
    }
    if (!grid.children.length)
      grid.innerHTML = '<p class="sub" style="grid-column:1/-1">No Pokemon match these filters.</p>';
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
    const slotOf = s.team.findIndex((t) => t && t.dex === dex); // roster slot of this Pokémon, or -1
    if (!hasSh) viewShiny = false;
    else if (slotOf >= 0 && dex !== showDetail.last) viewShiny = !!s.team[slotOf].shiny;
    showDetail.last = dex;

    const max = { hp: 183, atk: 1.55, spd: 137 };
    const bar = (label, v, m, txt) =>
      `<div class="stat"><span>${label}</span><div class="bar"><i style="width:${Math.min(100, (v / m) * 100)}%"></i></div><span>${txt}</span></div>`;

    const box = $('dex-detail');
    box.innerHTML = `
      <canvas id="dex-big" class="stage" width="220" height="190"></canvas>
      ${
        hasSh
          ? `<div class="seg">
          <button class="${viewShiny ? '' : 'on'}" data-v="0">Normal</button>
          <button class="${viewShiny ? 'on' : ''}" data-v="1">${G.Icons.html('shiny', 12)} Shiny</button></div>`
          : ''
      }
      <div class="center">
        <div style="color:var(--muted);font-size:13px">Nº ${String(p.dex).padStart(3, '0')} · ${GEN_NAMES[p.gen - 1]}</div>
        <h3>${own ? p.name : '???'}</h3>
        <div class="rarity-line" style="color:${G.Gacha.RARITY_COLOR[p.rarity]}">${G.UI.stars(p.rarity, 24)}<span>${G.Gacha.RARITY_NAME[p.rarity]}</span>${own ? G.Icons.bstStars(p.bst) : ''}</div>
        <div style="margin:6px 0">${own ? G.UI.typeChips(p.types) : ''}</div>
      </div>
      ${
        own
          ? `
        ${bar('Vida', p.hp, max.hp, p.hp)}
        ${bar('Ataque', p.atk, max.atk, '×' + p.atk.toFixed(2))}
        ${bar('Velocidad', p.spd, max.spd, p.spd)}
        ${p.stats ? '<div id="dex-hex" class="hex-wrap"></div>' : ''}
        <p style="font-size:14px;margin:10px 0 4px">Empieza con <b class="gold">${G.MoveInfo.name(G.startMoveOf(dex))}</b></p>
        <p class="move-icons" title="Movimientos que puede aprender">
          ${G.Moves.poolFor(p)
            .map((id) => `<span title="${G.MoveInfo.name(id)}">${G.Icons.html('move:' + id, 16)}</span>`)
            .join('')}</p>
        ${slotOf >= 0 ? `<p class="roster-note">On your roster · Slot ${slotOf + 1}${slotOf === 0 ? ' (lead)' : ''}</p>` : ''}
      `
          : `<p class="center" style="color:var(--muted)">Aún no lo tienes.<br>Consíguelo en el banner de <b class="gold">${GEN_NAMES[p.gen - 1]}</b>
            o derrotándolo cuando salga shiny.</p>`
      }
    `;
    $('dex-big').style.setProperty('--stage-c', !own ? '#5b83d6' : viewShiny ? '#9ae6ff' : G.U.TYPE_COLOR[p.types[0]]);
    $('dex-big').classList.toggle('shiny', own && viewShiny);
    // Base stats as a hexagon, like the main games (only for Pokémon you have).
    const hex = $('dex-hex');
    if (hex) hex.appendChild(G.StatChart.make(p.stats, viewShiny ? '#9ae6ff' : G.U.TYPE_COLOR[p.types[0]]));
    G.UI.sprite($('dex-big'), dex, {
      lively: own,
      spin: own,
      silhouette: !own,
      scale: 3,
      hero: true,
      shiny: own && viewShiny,
    });
    box.querySelectorAll('.seg button').forEach((b) => {
      b.onclick = () => {
        viewShiny = b.dataset.v === '1';
        showDetail(dex);
      };
    });
  }

  // ---------------- inventory: the pre-run team item loadout (F3d-2) ----------------
  // save.teamItems = unlocked ids, save.teamLoadout = equipped ids BY SLOT (null = empty; G.Items.cleanLoadout keeps it valid). Saves at once.
  // Two INDEPENDENT highlights: inv.sel = the item shown in the detail column, inv.slot = the target slot. A double-click joins them.
  const inv = { slot: 0, sel: null };
  // The controls, on every slot's and item's tooltip (no buttons in the window).
  const INV_TIP =
    'Click a slot to target it. Double-click an item to equip it in the targeted slot, or to unequip it if it is already there. Right-click a slot to empty it.';
  const invUnlocked = () => G.Items.LIST.filter((i) => i.tier === 'run' && G.Items.unlocked(G.DB.save, i.id));

  function openInventory() {
    const s = G.DB.save;
    G.Items.cleanLoadout(s);
    inv.slot = 0;
    inv.sel = s.teamLoadout.find(Boolean) || (invUnlocked()[0] || {}).id || null;
    G.UI.show('scr-inventory', true);
    renderInventory();
  }

  function invSave() {
    G.Items.cleanLoadout(G.DB.save);
    G.DB.commit();
    renderInventory();
  }

  /** Put `id` in the highlighted slot (replacing what is there). It leaves any other slot it was in; a same-group item (a second Stone) is removed. */
  function invEquip(id) {
    const s = G.DB.save,
      load = s.teamLoadout,
      def = G.Items.BY[id],
      n = G.Items.runSlots(s);
    if (!def || !G.Items.unlocked(s, id) || inv.slot >= n) return;
    for (let k = 0; k < load.length; k++) {
      const x = load[k];
      if (x === id || (x && def.group && G.Items.BY[x] && G.Items.BY[x].group === def.group)) load[k] = null;
    }
    while (load.length < inv.slot) load.push(null);
    load[inv.slot] = id;
    inv.sel = id;
    G.Audio.sfx('select');
    invSave();
  }

  function invUnequip(id) {
    const load = G.DB.save.teamLoadout,
      i = load.indexOf(id);
    if (i < 0) return;
    load[i] = null;
    G.Audio.sfx('select');
    invSave();
  }

  function renderInventory() {
    const s = G.DB.save,
      load = s.teamLoadout,
      n = G.Items.runSlots(s);
    inv.slot = Math.min(inv.slot, n - 1);
    const total = G.Items.LIST.filter((i) => i.tier === 'run').length,
      have = invUnlocked();
    $('inv-count').textContent = `${have.length} of ${total} unlocked`;
    const icon = (it, sz) => G.Icons.html(it.icon || it.id, sz);

    // Left: the unlocked slots (only those), slot 1 on top. Clicking one only moves the target slot; the selected item does not change.
    const slots = $('inv-slots');
    slots.innerHTML = '';
    for (let k = 0; k < n; k++) {
      const it = G.Items.BY[load[k]];
      const el = document.createElement('div');
      el.className = 'inv-slot' + (it ? ' full' : '') + (k === inv.slot ? ' on' : '');
      el.innerHTML = (it ? icon(it, 36) : '') + `<span class="inv-sn">Slot ${k + 1}</span>`;
      el.title = (it ? it.name : 'Empty slot') + '\n' + INV_TIP;
      el.onclick = () => {
        inv.slot = k;
        G.Audio.sfx('click');
        renderInventory();
      };
      el.ondblclick = () => {
        if (it) {
          inv.sel = it.id;
          renderInventory();
        }
      }; // double-click a filled slot to inspect its item
      el.oncontextmenu = (e) => {
        e.preventDefault();
        if (it) invUnequip(it.id);
      };
      slots.appendChild(el);
    }

    // Middle: everything you have unlocked.
    const grid = $('inv-grid');
    grid.innerHTML = '';
    if (!have.length)
      grid.innerHTML =
        '<div class="sub" style="grid-column:1/-1;padding:12px">Nothing unlocked yet. Gym leaders and bosses can drop team items.</div>';
    for (const it of have) {
      const k = load.indexOf(it.id);
      const el = document.createElement('div');
      el.className = 'inv-cell' + (inv.sel === it.id ? ' on' : '');
      el.title = it.name + '\n' + INV_TIP;
      el.innerHTML =
        `<div class="inv-ico">${icon(it, 36)}</div><b>${it.name}</b>` +
        (k >= 0 ? `<span class="inv-eq">Slot ${k + 1}</span>` : '');
      el.onclick = () => {
        inv.sel = it.id;
        G.Audio.sfx('click');
        renderInventory();
      };
      // In the targeted slot: unequip. Anywhere else (or nowhere): equip it there, moving it if needed.
      el.ondblclick = () => {
        if (load[inv.slot] === it.id) invUnequip(it.id);
        else invEquip(it.id);
      };
      grid.appendChild(el);
    }

    // Right: the selected item, in the Team screen's alternating blues. The hint always names the HIGHLIGHTED slot.
    const det = $('inv-detail');
    const it = G.Items.BY[inv.sel];
    if (!it || !G.Items.unlocked(s, it.id)) {
      det.innerHTML = '<div class="inv-drow">Pick an item to see what it does.</div>';
      return;
    }
    const k = load.indexOf(it.id),
      T = inv.slot;
    const here = G.Items.BY[load[T]];
    const clashId = it.group
      ? load.find((x, i) => x && x !== it.id && i !== T && G.Items.BY[x] && G.Items.BY[x].group === it.group)
      : null;
    let note = '';
    if (k !== T && here) note = `Replaces ${here.name} in Slot ${T + 1}.`;
    if (clashId)
      note +=
        (note ? ' ' : '') +
        `Only one ${it.group === 'stone' ? 'Stone' : 'of this kind'} at a time: ${G.Items.BY[clashId].name} is removed.`;
    const hint =
      k === T
        ? `In Slot ${T + 1}. Double-click it to unequip.`
        : `Double-click it to ${k >= 0 ? 'move it from Slot ' + (k + 1) + ' to' : 'equip it in'} Slot ${T + 1}.`;
    det.innerHTML = `<div class="inv-dbox"><div class="inv-dico">${icon(it, 56)}</div><b>${it.name}</b></div>
      <div class="inv-drow">${it.desc}</div>
      ${note ? `<div class="inv-note">${note}</div>` : ''}
      <div class="inv-hint">${hint}</div>`;
  }

  // ---------------- team screen ----------------
  // A fullscreen editor for the 6 fixed team slots. It works on a COPY of the team (ros.team);
  // nothing is saved until Commit Team, and Back discards the edits.
  //   ros.slot   the highlighted slot (where Enter, a double-click or a drop goes)
  //   ros.dex    the species shown on the right (a team member, or a preview from the list), null = empty slot
  //   ros.uid    the copy shown on the right, null when it is a species from the Pokedex tab
  //   ros.shiny  Normal / Shiny look for what is shown
  //   ros.tab    the list below the filters: 'dex', or a box counted from 0
  //   ros.drag   what is being dragged: a copy's uid (a box cell or a filled slot), or a dex (a Pokedex tab cell)
  const ros = {
    team: [],
    slot: 0,
    dex: null,
    uid: null,
    shiny: false,
    tab: 0,
    drag: null,
    dragSlot: null,
    select: false, // bulk sell select mode (3b-3), one box tab at a time
    ticked: new Set(), // copy UUIDs ticked in select mode
    bulk: null, // the open box's shown copies, for the select bar
  };
  const teamKey = (t) => JSON.stringify(t.map((x) => (x ? [x.dex, x.shiny ? 1 : 0, x.uid || null] : null)));
  const rosSlotOf = (t) => (t ? { dex: t.dex, shiny: !!t.shiny, uid: t.uid } : null);
  const escHtml = (s) =>
    String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  /** A copy's name (its nickname, else the species) with its gender symbol at the end. */
  function rosNameHtml(c, p) {
    const sym = c && c.gender === 'male' ? '♂' : c && c.gender === 'female' ? '♀' : '';
    const name =
      c && c.nickname
        ? `<span class="nm" translate="no">${escHtml(c.nickname)}</span>`
        : `<span class="nm">${p.name}</span>`;
    return `<b class="ros-nm">${name}${sym ? `<span class="ros-gender ${c.gender}" title="${c.gender === 'male' ? 'Male' : 'Female'}">${sym}</span>` : ''}</b>`;
  }
  const rosDirty = () => teamKey(ros.team) !== teamKey(G.DB.save.team);

  function openRoster() {
    const s = G.DB.save;
    G.DB.normalizeTeam(s);
    ros.team = s.team.map(rosSlotOf);
    ros.drag = null;
    ros.select = false;
    ros.ticked.clear();
    if (ros.tab !== 'dex' && ros.tab >= G.Copies.boxCount(s)) ros.tab = 0;
    rosChrome();
    G.UI.show('scr-roster'); // (no keepMenu: the main menu is hidden too)
    $('ros-back').onclick = rosBack;
    $('ros-commit').onclick = rosCommit;
    buildControls(rosView);
    rosRenderTabs();
    renderGrid(rosView);
    // Drop a team card back on the list: that slot is freed.
    const grid = $('ros-grid');
    grid.ondragover = (e) => {
      if (ros.dragSlot > 0) {
        e.preventDefault();
        grid.classList.add('drop');
      }
    };
    grid.ondragleave = (e) => {
      if (!grid.contains(e.relatedTarget)) grid.classList.remove('drop');
    };
    grid.ondrop = (e) => {
      grid.classList.remove('drop');
      if (!(ros.dragSlot > 0)) return;
      e.preventDefault();
      const slot = ros.dragSlot;
      ros.drag = ros.dragSlot = null;
      rosFreeSlot(slot);
    };
    rosSelectSlot(0);
  }

  /** The Team screen keeps the main menu's top bar (the counters) but not its bottom bar: it has its own. */
  function rosChrome() {
    G.UI.chrome(false);
    $('topbar').classList.remove('hidden');
    G.UI.refreshCoins();
  }

  /** Back to the Team screen from Upgrades, keeping the unsaved draft and the selection. */
  function rosReturn() {
    rosChrome();
    G.UI.show('scr-roster');
    rosRenderAll();
  }

  async function rosBack() {
    if (
      rosDirty() &&
      !(await G.UI.ask('Discard your team changes?', { title: 'Unsaved team', ok: 'Discard', cancel: 'Keep editing' }))
    )
      return;
    open();
  }

  function rosCommit() {
    const s = G.DB.save;
    if (!ros.team[0] || !rosDirty()) return;
    s.team = ros.team.map(rosSlotOf);
    s.partner = s.team[0].dex; // the lead is the companion
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
    ros.uid = (t && t.uid) || null;
    ros.shiny = !!(t && t.shiny && G.DB.ownsShiny(t.dex));
    rosRenderAll();
    markGrid(rosView);
  }

  /**
   * Target a slot WITHOUT touching the preview: the Pokémon on the right stays, and its Put button re-labels for this slot.
   * Only when nothing is previewed does a filled slot show its own Pokémon (so there is still something to look at).
   */
  function rosFocusSlot(slot) {
    if (ros.dex == null) {
      rosSelectSlot(slot);
      return;
    }
    ros.slot = slot;
    rosRenderAll();
    markGrid(rosView);
  }

  /** Preview a species from the Pokedex tab on the right (the highlighted slot does not change). */
  function rosSelectDex(dex) {
    ros.dex = dex;
    ros.uid = null;
    ros.shiny = false;
    rosRenderAll();
  }

  /** Preview a copy from a box on the right (the highlighted slot does not change). */
  function rosSelectCopy(c) {
    ros.dex = c.speciesID;
    ros.uid = c.pokemonUUID;
    ros.shiny = c.isShiny;
    rosRenderAll();
  }

  // ---------------- the tab row and the box list ----------------

  function rosRenderTabs() {
    const s = G.DB.save,
      box = $('ros-tabs');
    box.innerHTML = '';
    const tab = (label, value, title) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ros-tab' + (ros.tab === value ? ' on' : '');
      b.dataset.sfx = 'click';
      b.textContent = label;
      b.title = title;
      b.onclick = () => {
        if (ros.tab !== value) {
          // leaving a box tab ends select mode (3b D9)
          ros.select = false;
          ros.ticked.clear();
        }
        ros.tab = value;
        rosRenderTabs();
        renderGrid(rosView);
        markGrid(rosView);
      };
      if (value !== 'dex') {
        // Drop a copy on a box tab: it moves there. This is storage, so it saves at once and does not wait for Commit.
        b.ondragover = (e) => {
          if (typeof ros.drag !== 'string') return;
          e.preventDefault();
          b.classList.add('drop');
        };
        b.ondragleave = () => b.classList.remove('drop');
        b.ondrop = (e) => {
          e.preventDefault();
          b.classList.remove('drop');
          const uid = ros.drag;
          ros.drag = ros.dragSlot = null;
          if (typeof uid !== 'string') return;
          const r = G.Copies.move(s, uid, value);
          if (r === 'full') G.UI.toast(`${label} is full`);
          else if (r === 'ok') {
            G.DB.commit();
            rosRenderTabs();
            renderGrid(rosView);
            markGrid(rosView);
          }
        };
      }
      box.appendChild(b);
    };
    tab('Pokédex', 'dex', 'Every species. Pick a copy from a box to put it on your team.');
    for (let i = 0; i < G.Copies.boxCount(s); i++)
      tab(`Box ${i + 1}`, i, `${G.Copies.inBox(s, i)} / ${G.Copies.BOX_SIZE} Pokémon`);
    // Boxes not bought yet: one price tab each. Only the next one is buyable; no drag and drop on these.
    const have = G.Copies.boxCount(s);
    for (let n = have + 1; n <= G.Copies.BOX_MAX; n++) {
      const price = G.Copies.boxPrice(n),
        next = n === have + 1,
        live = next && s.coins >= price,
        b = document.createElement('button');
      b.type = 'button';
      b.className = 'ros-tab ros-buy' + (live ? '' : ' dim');
      if (live) b.dataset.sfx = 'click';
      b.innerHTML = `<span class="coin"></span> ${rosCoins(price)}`;
      b.title = !next
        ? `Buy Box ${n - 1} first`
        : live
          ? `Buy Box ${n} for ${rosCoins(price)} PokéCoins`
          : `Box ${n} costs ${rosCoins(price)} PokéCoins. You have ${rosCoins(s.coins || 0)}.`;
      b.onclick = () => rosBuyBox(n);
      box.appendChild(b);
    }
    $('ros-own').style.display = ros.tab === 'dex' ? '' : 'none';
    const marks = $('ros-marks'); // marks belong to copies, not species: no chips on the Pokedex tab
    if (marks) marks.style.display = ros.tab === 'dex' ? 'none' : '';
  }

  function rosCoins(v) {
    return Math.floor(v).toLocaleString('en-US');
  }

  /** Buy box n from its price tab. Storage, like a box move: it saves at once, and pending team edits stay pending. */
  async function rosBuyBox(n) {
    const s = G.DB.save,
      have = G.Copies.boxCount(s),
      price = G.Copies.boxPrice(n);
    if (n !== have + 1) {
      G.Audio.sfx('error');
      G.UI.toast(`Buy Box ${have + 1} first`);
      return;
    }
    if (!(s.coins >= price)) {
      G.Audio.sfx('error');
      G.UI.toast('Not enough PokéCoins');
      return;
    }
    const yes = await G.UI.ask(`Spend ${rosCoins(price)} PokéCoins on Box ${n}?`, {
      title: 'Buy box',
      ok: 'Buy',
      note: `You have ${rosCoins(s.coins)}. You will have ${rosCoins(s.coins - price)} left.`,
    });
    if (!yes) return;
    const r = G.Copies.buyBox(s);
    if (!r.ok) {
      G.Audio.sfx('error');
      G.UI.toast(r.error === 'poor' ? 'Not enough PokéCoins' : 'You have every box');
      rosRenderTabs();
      return;
    }
    G.Audio.sfx('confirm');
    G.DB.commit(true);
    G.UI.toast(`Box ${r.boxes} unlocked!`);
    ros.tab = r.boxes - 1;
    rosRenderTabs();
    renderGrid(rosView);
    markGrid(rosView);
  }

  /** One copy's cell in a box: number, team badge or shiny mark, sprite, name with gender, rarity. */
  function fillCopyCell(cell, c, p) {
    const ts = ros.team.findIndex((t) => t && t.uid === c.pokemonUUID);
    cell.className = 'cell' + (c.pokemonUUID === ros.uid ? ' on' : '');
    cell.innerHTML = `<span class="no">${String(p.dex).padStart(3, '0')}</span>`;
    if (ts === 0)
      cell.insertAdjacentHTML(
        'beforeend',
        `<span class="badge-r" title="Lead (slot 1)">${G.Icons.html('crown', 14)}</span>`
      );
    else if (ts > 0)
      cell.insertAdjacentHTML(
        'beforeend',
        `<span class="badge-r badge-slot" title="Roster slot ${ts + 1}">${ts + 1}</span>`
      );
    else if (c.isShiny)
      cell.insertAdjacentHTML('beforeend', `<span class="badge-r" title="Shiny">${G.Icons.html('shiny', 12)}</span>`);
    // Favorite and lock marks, bottom-left (3b-1). Not the class "locked": Pokedex cells use it for species you lack.
    if (c.isFavorite || c.isLocked)
      cell.insertAdjacentHTML(
        'beforeend',
        `<span class="badge-l">${c.isFavorite ? `<span title="Favorite">${G.Icons.html('heart', 12)}</span>` : ''}${
          c.isLocked ? `<span title="Locked">${G.Icons.html('lock', 12)}</span>` : ''
        }</span>`
      );
    cell.appendChild(G.UI.spriteCanvas(p.dex, 92, 80, { scale: 2, shadow: true, shiny: c.isShiny }));
    cell.insertAdjacentHTML('beforeend', rosNameHtml(c, p) + G.UI.stars(p.rarity, 9));
  }

  /** The open box, in the order the filters and sort give its species. */
  function rosRenderBox(v) {
    const s = G.DB.save,
      grid = $(v.pre + 'grid');
    grid.innerHTML = '';
    const bySpecies = new Map();
    let total = 0,
      marked = 0;
    const marks = v.ctrl.marks || [];
    const markOk = (c) => !marks.length || (marks.includes('fav') && c.isFavorite) || (marks.includes('lock') && c.isLocked);
    for (const c of G.Copies.all(s)) {
      if (c.box !== ros.tab) continue;
      total++;
      if (!markOk(c)) continue; // Favorites / Locked chips (3b-2 E3): either mark when both are on
      marked++;
      if (!bySpecies.has(c.speciesID)) bySpecies.set(c.speciesID, []);
      bySpecies.get(c.speciesID).push(c);
    }
    let shown = 0;
    const shownIds = new Set();
    for (const p of filterSortDex(Object.assign({}, v.ctrl, { own: 'all' }))) {
      for (const c of bySpecies.get(p.dex) || []) {
        shown++;
        const cell = document.createElement('div');
        cell.dataset.dex = p.dex;
        cell.dataset.uid = c.pokemonUUID;
        fillCopyCell(cell, c, p);
        shownIds.add(c.pokemonUUID);
        if (ros.select) {
          // Select mode (3b-3): a click ticks or unticks; no selecting, placing or dragging. Team, locked and favorite copies cannot be ticked.
          rosTickClass(cell, c);
          cell.onclick = () => {
            if (!rosCanBulk(c)) return;
            if (ros.ticked.has(c.pokemonUUID)) ros.ticked.delete(c.pokemonUUID);
            else ros.ticked.add(c.pokemonUUID);
            rosTickClass(cell, c);
            rosBulkBar();
          };
        } else {
          cell.onclick = () => {
            rosSelectCopy(c);
            markGrid(v);
          };
          cell.ondblclick = () => rosPlace(ros.slot, c.pokemonUUID);
          cell.draggable = true;
          cell.ondragstart = (e) => {
            ros.drag = c.pokemonUUID;
            e.dataTransfer.setData('text/plain', c.pokemonUUID);
            e.dataTransfer.effectAllowed = 'move';
          };
          cell.ondragend = () => {
            ros.drag = null;
          };
        }
        grid.appendChild(cell);
      }
    }
    ros.bulk = { v, shown, total, ids: shownIds };
    rosBulkBar();
    if (!shown)
      grid.innerHTML = `<p class="sub" style="grid-column:1/-1">${
        !total ? 'This box is empty.' : marks.length && !marked ? 'No marked Pokémon in this box.' : 'No Pokemon match these filters.'
      }</p>`;
  }

  /** Redraw the list's team badges after the team changed. */
  function rosRefreshList(dexes) {
    if (ros.tab === 'dex') {
      refreshCells(rosView, dexes);
      return;
    }
    const grid = $('ros-grid'),
      cells = grid.querySelectorAll('.cell[data-uid]');
    if (!cells.length) return;
    const copies = new Map(G.Copies.all(G.DB.save).map((c) => [c.pokemonUUID, c]));
    cells.forEach((cell) => {
      const c = copies.get(cell.dataset.uid);
      if (!c) return;
      fillCopyCell(cell, c, G.DEX_BY[c.speciesID]);
      if (ros.select) rosTickClass(cell, c);
    });
  }

  /** Put what was picked in a slot: a copy goes in, a species from the Pokedex tab asks for a copy. */
  function rosPlace(slot, what) {
    if (typeof what === 'string') rosAssign(slot, what);
    else G.UI.toast('Pick a copy from a box');
  }

  function rosRenderAll() {
    rosRenderSlots();
    rosRenderDetail();
    $('ros-commit').disabled = !rosDirty();
  }

  /**
   * Put copy `uid` in team slot `slot` (on the working copy). A copy already on the team in another slot
   * SWAPS places with whoever is in `slot`, so nobody drops off. Slot 1 (the lead) can never be left empty.
   */
  function rosAssign(slot, uid) {
    const s = G.DB.save,
      c = G.Copies.get(s, uid),
      p = c && G.DEX_BY[c.speciesID];
    if (!p) return;
    const dex = c.speciesID;
    const before = ros.team.map((t) => t && t.dex);
    const team = ros.team.slice();
    const from = team.findIndex((t) => t && t.uid === uid);
    if (from === slot) {
      rosSelectSlot(slot);
      return;
    }
    const displaced = team[slot] || null;
    if (from >= 0) {
      if (from === 0 && !displaced) {
        G.UI.toast('Slot 1 is the lead and cannot be left empty');
        return;
      }
      team[from] = displaced;
    }
    team[slot] = { dex, shiny: c.isShiny, uid };
    ros.team = team;
    ros.slot = slot;
    ros.dex = dex;
    ros.uid = uid;
    ros.shiny = c.isShiny;
    if (from >= 0 && displaced) G.UI.toast(`${p.name} and ${G.DEX_BY[displaced.dex].name} swapped slots`);
    rosRenderAll();
    rosRefreshList(before.concat(ros.team.map((t) => t && t.dex)));
    markGrid(rosView);
  }

  /** Empty team slot `i` (on the working copy). Slot 1, the lead, is never emptied. */
  function rosFreeSlot(i) {
    if (i <= 0 || !ros.team[i]) return;
    const gone = ros.team[i];
    ros.team = ros.team.slice();
    ros.team[i] = null;
    ros.slot = i;
    if (ros.uid && ros.uid === gone.uid) {
      ros.dex = null;
      ros.uid = null;
    }
    rosRenderAll();
    rosRefreshList([gone.dex]);
    markGrid(rosView);
  }

  // The controls, on every slot's tooltip (the bar has no room for a hint line).
  const ROS_TIP =
    'Click a slot to target it, double-click it to inspect its Pokémon. Put a Pokémon in the targeted slot by double-clicking it, dragging it onto a slot or pressing Enter. Drag a slot onto another to swap them, right-click a slot to free it.';

  function rosRenderSlots() {
    const box = $('ros-slots');
    box.innerHTML = '';
    ros.team.forEach((t, slot) => {
      const mon = t && G.DEX_BY[t.dex];
      const copy = t && t.uid ? G.Copies.get(G.DB.save, t.uid) : null;
      const shiny = !!(t && t.shiny);
      const b = document.createElement('div');
      b.className = 'ros-slot' + (mon ? '' : ' empty') + (slot === 0 ? ' lead' : '') + (slot === ros.slot ? ' on' : '');
      b.dataset.sfx = 'click';
      b.title = (mon ? `Slot ${slot + 1}: ${mon.name}` : `Slot ${slot + 1}: empty`) + '\n' + ROS_TIP;
      if (mon) {
        b.appendChild(G.UI.spriteCanvas(mon.dex, 120, 120, { lively: true, scale: 3, hero: true, shiny }));
        b.insertAdjacentHTML(
          'beforeend',
          `<div class="rinfo">${rosNameHtml(copy, mon)}<span class="rtypes">${G.UI.typeChips(mon.types)}</span></div>`
        );
        if (shiny)
          b.insertAdjacentHTML('beforeend', `<span class="rsh" title="Shiny">${G.Icons.html('shiny', 18)}</span>`);
        const up = document.createElement('button');
        up.type = 'button';
        up.className = 'rupg';
        up.dataset.sfx = 'click';
        up.title = `Upgrades for ${mon.name}`;
        up.innerHTML = 'Upgrade<img src="assets/ui/team/arrow.png" alt="" />';
        up.onclick = (e) => {
          e.stopPropagation();
          openUpgrades(mon.dex, rosReturn);
        };
        up.ondblclick = (e) => e.stopPropagation();
        b.appendChild(up);
      } else {
        b.insertAdjacentHTML('beforeend', '<div class="rinfo"><b>Empty</b></div>');
      }
      // Click = target this slot (the previewed Pokémon stays, so Enter can put it here). Double-click = inspect the Pokémon in it.
      b.onclick = () => {
        rosFocusSlot(slot);
      };
      b.ondblclick = () => {
        rosSelectSlot(slot);
        markGrid(rosView);
      };
      b.oncontextmenu = (e) => {
        e.preventDefault();
        if (slot === 0) G.UI.toast('Slot 1 is the lead and cannot be left empty');
        else rosFreeSlot(slot);
      };
      // Drop a Pokémon from the list (or another slot) here.
      b.ondragover = (e) => {
        if (ros.drag != null) {
          e.preventDefault();
          b.classList.add('drop');
        }
      };
      b.ondragleave = () => b.classList.remove('drop');
      b.ondrop = (e) => {
        e.preventDefault();
        b.classList.remove('drop');
        const d = ros.drag;
        ros.drag = ros.dragSlot = null;
        if (d != null) rosPlace(slot, d);
      };
      if (mon && t.uid) {
        b.draggable = true; // drag a team card onto another slot to swap
        b.ondragstart = (e) => {
          ros.drag = t.uid;
          ros.dragSlot = slot; // dropped on the list, it frees this slot
          e.dataTransfer.setData('text/plain', t.uid);
          e.dataTransfer.effectAllowed = 'move';
        };
        b.ondragend = () => {
          ros.drag = ros.dragSlot = null;
          $('ros-grid').classList.remove('drop');
        };
      }
      box.appendChild(b);
    });
  }

  /** The detail column: name row, rarity and types, BST and the stat hexagon, nature, ability, size, moves. No buttons. */
  function rosRenderDetail() {
    const s = G.DB.save,
      box = $('ros-detail');
    const dex = ros.dex,
      n = ros.slot + 1;
    if (dex == null) {
      box.innerHTML = `<div class="ros-dh"><b>Slot ${n} is empty</b></div>
        <div class="ros-db"><div class="ros-box"><p class="sub">Pick a Pokémon from the list, then double-click it, drag it onto a slot, or press Enter to put it in Slot ${n}.</p></div></div>`;
      return;
    }
    const p = G.DEX_BY[dex];
    const own = !!s.owned[dex];
    const copy = ros.uid ? G.Copies.get(s, ros.uid) : null;
    ros.shiny = !!(copy && copy.isShiny);
    const color = !own ? '#5b83d6' : ros.shiny ? '#9ae6ff' : G.U.TYPE_COLOR[p.types[0]];
    // A box copy gets a pencil to rename it (3b-2); the name itself is clickable too.
    const pencil = copy
      ? `<button type="button" class="ros-nick-btn" id="ros-nick" title="Rename (up to ${G.Copies.NICK_MAX} characters)">${G.Icons.html('pencil', 16)}</button>`
      : '';
    const head = `<div class="ros-dh"><div class="ros-dn">${own ? rosNameHtml(copy, p) : '<b>???</b>'}${pencil}</div><span>Nº ${String(p.dex).padStart(3, '0')} · ${GEN_NAMES[p.gen - 1]}</span></div>`;
    if (!own) {
      box.innerHTML =
        head +
        `<div class="ros-db"><div class="ros-box"><p class="center" style="color:var(--muted)">Aún no lo tienes.<br>Consíguelo en el banner de <b class="gold">${GEN_NAMES[p.gen - 1]}</b>
            o derrotándolo cuando salga shiny.</p></div></div>`;
      return;
    }
    const start = G.startMoveOf(dex);
    const moves = [start]
      .concat(G.Moves.poolFor(p).filter((id) => id !== start))
      .map(
        (id, i) =>
          `<div class="ros-mv${i === 0 ? ' start' : ''}"${i === 0 ? ' title="Starting move"' : ''}>${G.Icons.html('move:' + id, 16)}<span>${G.MoveInfo.name(id)}</span></div>`
      )
      .join('');
    box.innerHTML =
      head +
      `<div class="ros-db">
        <div class="ros-row"><span title="${G.Gacha.RARITY_NAME[p.rarity]}">${G.UI.stars(p.rarity, 24)}</span><span class="rtypes">${G.UI.typeChips(p.types)}</span></div>
        <div class="ros-box ros-stats"><span class="ros-bst">${G.Icons.bstStars(p.bst)}</span>${p.stats ? '<div id="ros-hex" class="hex-wrap"></div>' : ''}</div>
        ${rosInfoRows(copy, dex)}
        <div class="ros-box ros-mbox"><div class="ros-mh">Moves</div><div class="ros-moves">${moves}</div></div>
        ${copy ? rosSellHtml(copy) : ''}
      </div>`;
    const hex = $('ros-hex');
    if (hex)
      hex.appendChild(
        G.StatChart.make(p.stats, color, 380, 364, { radius: 0.33, teamHex: true, iv: copy ? copy.iv : null })
      );
    const sellBtn = $('ros-sell');
    if (sellBtn && copy) sellBtn.onclick = () => rosSell(copy.pokemonUUID);
    const lockBtn = $('ros-lock'),
      favBtn = $('ros-fav');
    if (lockBtn && copy) lockBtn.onclick = () => rosToggle(copy.pokemonUUID, 'lock');
    if (favBtn && copy) favBtn.onclick = () => rosToggle(copy.pokemonUUID, 'fav');
    const nickBtn = $('ros-nick'),
      nameEl = box.querySelector('.ros-dh .ros-nm');
    if (nickBtn && copy) nickBtn.onclick = () => rosRename(copy.pokemonUUID);
    if (nameEl && copy) {
      nameEl.classList.add('renamable');
      nameEl.onclick = () => rosRename(copy.pokemonUUID);
    }
  }

  // ---------------- nicknames (step 3b-2) ----------------

  /**
   * Rename a box copy in place: the header name becomes a text field. Enter saves, Esc or clicking away cancels, an empty
   * name goes back to the species name. Every key is cleaned as you type (G.Copies.cleanNickname), and again on save.
   * Storage, like a box move: it saves at once and pending team edits stay pending.
   */
  function rosRename(uid) {
    const s = G.DB.save,
      c = G.Copies.get(s, uid),
      dn = document.querySelector('#ros-detail .ros-dn');
    if (!c || !dn) return;
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'field ros-nick-field';
    inp.maxLength = G.Copies.NICK_MAX;
    inp.setAttribute('translate', 'no');
    inp.setAttribute('autocomplete', 'off');
    inp.spellcheck = false;
    inp.placeholder = G.DEX_BY[c.speciesID].name;
    inp.value = c.nickname;
    dn.innerHTML = '';
    dn.appendChild(inp);
    inp.focus();
    inp.select();
    let done = false;
    const finish = (keep) => {
      if (done) return;
      done = true;
      if (keep && G.Copies.setNickname(s, uid, inp.value) != null) {
        G.Audio.sfx('confirm');
        G.DB.commit(true);
      }
      rosRenderAll();
      rosRefreshList([c.speciesID]);
      markGrid(rosView);
    };
    inp.oninput = () => {
      const clean = G.Copies.cleanNickname(inp.value, true);
      if (clean === inp.value) return;
      const at = Math.max(0, (inp.selectionStart || 0) - (inp.value.length - clean.length));
      inp.value = clean;
      inp.setSelectionRange(at, at);
    };
    inp.onkeydown = (e) => {
      e.stopPropagation(); // the Team screen's Enter (place in slot) must not see this
      if (e.key === 'Enter') {
        e.preventDefault();
        finish(true);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        finish(false);
      }
    };
    inp.onblur = () => finish(false);
  }

  // ---------------- selling a copy (step 3a-3) ----------------

  /** On the saved team, or in the uncommitted team edits: either way it cannot be sold. */
  function rosOnTeam(uid) {
    const has = (list) => (list || []).some((t) => t && t.uid === uid);
    return has(G.DB.save.team) || has(ros.team);
  }

  /** Sell, Lock and Favorite under Moves for a copy; Sell is disabled with the reason when it cannot be sold. */
  function rosSellHtml(copy) {
    const price = G.Copies.sellPrice(G.DB.save, copy.pokemonUUID);
    if (price == null) return '';
    const why = rosOnTeam(copy.pokemonUUID) ? 'Remove it from your team first.' : copy.isLocked ? 'Unlock it first.' : '';
    const lock = `<button type="button" class="btn ghost small" id="ros-lock" data-sfx="click" title="${copy.isLocked ? 'It can be sold again' : 'A locked Pokémon is never sold'}">${G.Icons.html('lock', 14)} ${copy.isLocked ? 'Unlock' : 'Lock'}</button>`;
    const fav = `<button type="button" class="btn ghost small" id="ros-fav" data-sfx="click" title="${copy.isFavorite ? 'Remove the mark' : 'Bulk sell skips favorites'}">${G.Icons.html('heart', 14)} ${copy.isFavorite ? 'Unfavorite' : 'Favorite'}</button>`;
    return `<div class="ros-sell"><button type="button" class="btn gold small" id="ros-sell"${why ? ' disabled' : ' data-sfx="click"'}><span class="coin"></span> Sell for ${rosCoins(price)}</button>${lock}${fav}${why ? `<span class="sub">${why}</span>` : ''}</div>`;
  }

  /** Lock / unlock or favorite / unfavorite a box copy (3b-1). Storage, like a box move: it saves at once, pending team edits stay pending. */
  function rosToggle(uid, which) {
    const s = G.DB.save,
      c = G.Copies.get(s, uid);
    if (!c) return;
    const ok =
      which === 'lock' ? G.Copies.setLocked(s, uid, !c.isLocked) : G.Copies.setFavorite(s, uid, !c.isFavorite);
    if (!ok) return;
    G.DB.commit(true);
    rosRenderAll();
    rosRefreshList([c.speciesID]);
    markGrid(rosView);
  }

  /** Sell copy uid from the box: always a confirm first. Storage, like a box move: it saves at once and pending team edits stay pending. */
  async function rosSell(uid) {
    const s = G.DB.save,
      c = G.Copies.get(s, uid);
    if (!c) return;
    const p = G.DEX_BY[c.speciesID],
      price = G.Copies.sellPrice(s, uid),
      name = (c.isShiny ? 'shiny ' : '') + p.name,
      last = G.Copies.all(s).filter((x) => x.speciesID === c.speciesID).length === 1;
    const yes = await G.UI.ask(`Sell ${name} for ${rosCoins(price)} PokéCoins?`, {
      title: 'Sell Pokémon',
      ok: 'Sell',
      note:
        (c.isFavorite ? `${p.name} is a favorite. ` : '') +
        (last
          ? `This is your last ${p.name}. The Pokédex keeps it.`
          : `You will have ${rosCoins((s.coins || 0) + price)} PokéCoins.`),
    });
    if (!yes) return;
    const r = G.Copies.sell(s, uid, rosPending());
    if (!r.ok) {
      G.Audio.sfx('error');
      G.UI.toast(
        r.error === 'team'
          ? 'Remove it from your team first.'
          : r.error === 'locked'
            ? 'Unlock it first.'
            : 'That Pokémon is gone.'
      );
      rosRenderAll();
      return;
    }
    G.Audio.sfx('confirm');
    G.DB.commit(true);
    G.UI.toast(`Sold ${name} for ${rosCoins(r.coins)} PokéCoins`);
    if (ros.uid === uid) ros.uid = null; // the species view, never the next copy (no second sale by accident)
    rosRenderTabs();
    renderGrid(rosView);
    markGrid(rosView);
    rosRenderAll();
  }

  // ---------------- bulk sell (step 3b-3) ----------------

  /** The uncommitted team edits' copies: none of them can be sold. */
  function rosPending() {
    return ros.team.filter((t) => t && t.uid).map((t) => t.uid);
  }

  /** Can this copy go in a batch? Never one on the team (saved or pending), locked, or a favorite (3b D2). */
  function rosCanBulk(c) {
    return !rosOnTeam(c.pokemonUUID) && !c.isLocked && !c.isFavorite;
  }

  /** A cell's look in select mode: ticked, or dimmed when it cannot be ticked. */
  function rosTickClass(cell, c) {
    cell.classList.toggle('tick', ros.ticked.has(c.pokemonUUID));
    cell.classList.toggle('notick', !rosCanBulk(c));
    if (!cell.querySelector('.tick-box')) cell.insertAdjacentHTML('beforeend', '<span class="tick-box"></span>');
    cell.title = rosCanBulk(c) ? '' : rosOnTeam(c.pokemonUUID) ? 'On your team' : c.isLocked ? 'Locked' : 'Favorite';
  }

  /** The shown-count line, with Select, or in select mode: Select repeats, Clear, Sell N for X, Cancel (3b D9, D12). */
  function rosBulkBar() {
    const b = ros.bulk;
    if (!b) return;
    const s = G.DB.save,
      bar = $(b.v.pre + 'shown');
    bar.innerHTML = '';
    bar.appendChild(document.createTextNode(`${b.shown} shown · ${b.total} / ${G.Copies.BOX_SIZE} in this box`));
    if (!b.total) {
      ros.select = false;
      ros.ticked.clear();
      return;
    }
    const wrap = document.createElement('span');
    wrap.className = 'ros-bulk';
    const btn = (label, cls, fn, off) => {
      const x = document.createElement('button');
      x.type = 'button';
      x.className = 'btn small ' + cls;
      x.innerHTML = label;
      x.disabled = !!off;
      if (!off) x.dataset.sfx = 'click';
      x.onclick = fn;
      wrap.appendChild(x);
    };
    const redraw = () => {
      renderGrid(b.v);
      markGrid(b.v);
    };
    if (!ros.select) {
      btn('Select', 'ghost', () => {
        ros.select = true;
        ros.ticked.clear();
        redraw();
      });
    } else {
      for (const id of [...ros.ticked]) if (!b.ids.has(id) || !G.Copies.get(s, id)) ros.ticked.delete(id); // only what is shown
      let coins = 0;
      for (const id of ros.ticked) coins += G.Copies.sellPrice(s, id) || 0;
      const n = ros.ticked.size;
      btn('Select repeats', 'ghost', rosSelectRepeats);
      btn('Clear', 'ghost', () => {
        ros.ticked.clear();
        redraw();
      }, !n);
      btn(`<span class="coin"></span> Sell ${n} for ${rosCoins(coins)}`, 'gold', rosSellTicked, !n);
      btn('Cancel', 'ghost', () => {
        ros.select = false;
        ros.ticked.clear();
        redraw();
      });
    }
    bar.appendChild(wrap);
  }

  /** Tick every repeat in this box beyond the one kept (G.Copies.repeatsIn, 3b D10), among the copies the filters show. */
  function rosSelectRepeats() {
    const b = ros.bulk;
    if (!b || typeof ros.tab !== 'number') return;
    const pick = G.Copies.repeatsIn(G.DB.save, ros.tab, rosPending()).filter((id) => b.ids.has(id));
    if (!pick.length) {
      G.UI.toast('No repeats to select in this box');
      return;
    }
    ros.ticked = new Set(pick);
    renderGrid(b.v);
    markGrid(b.v);
  }

  /** Sell every ticked copy after one confirm with the count and total (3b D12). Storage: it saves at once, pending team edits stay pending. */
  async function rosSellTicked() {
    const s = G.DB.save,
      ids = [...ros.ticked];
    if (!ids.length) return;
    let coins = 0;
    for (const id of ids) coins += G.Copies.sellPrice(s, id) || 0;
    const yes = await G.UI.ask(`Sell ${ids.length} Pokémon for ${rosCoins(coins)} PokéCoins?`, {
      title: 'Sell Pokémon',
      ok: 'Sell',
      note: 'Team, locked and favorite Pokémon are never part of a batch.',
    });
    if (!yes) return;
    const r = G.Copies.sellMany(s, ids, rosPending());
    ros.ticked.clear();
    if (r.sold) {
      G.Audio.sfx('confirm');
      G.DB.commit(true);
      G.UI.toast(`Sold ${r.sold} Pokémon for ${rosCoins(r.coins)} PokéCoins`);
    } else {
      G.Audio.sfx('error');
      G.UI.toast('Nothing was sold');
    }
    if (ros.uid && !G.Copies.get(s, ros.uid)) ros.uid = null; // the species view, as after a single sale
    rosRenderTabs();
    renderGrid(rosView);
    markGrid(rosView);
    rosRenderAll();
  }

  /** Nature, Ability, Height, Weight of a copy. A species from the Pokedex tab has its possible abilities and real size, no nature. */
  function rosInfoRows(copy, dex) {
    const row = (label, value) => `<div class="ros-row"><span>${label}</span><b>${value}</b></div>`;
    const abilityText = (a) => a.name + (a.hidden ? ' (Hidden)' : '');
    if (copy)
      return (
        row('Nature', copy.natureName) +
        row('Ability', abilityText({ name: copy.abilityName, hidden: copy.abilityHidden })) +
        row('Height', copy.heightM.toFixed(2) + ' m') +
        row('Weight', copy.weightKg.toFixed(1) + ' kg')
      );
    const sp = G.Copies.species(dex);
    return (
      row('Ability', sp.abilities.map(abilityText).join(' / ')) +
      row('Height', sp.heightM.toFixed(1) + ' m') +
      row('Weight', sp.weightKg.toFixed(1) + ' kg')
    );
  }

  // ---------------- upgrades (B/W screen, display only) ----------------
  // The catalog from docs/Economy Balance Ideas.md. Not wired yet: every rank reads 0 and nothing can be
  // bought (the old G.Upgrades shop is being deprecated). A 5-rank upgrade is Pokémon-specific and grows by
  // `step` per rank; a 3-rank one is run-wide and lists its ranks. `soon` waits on the dodge mechanic.
  const UPG_COLS = [
    [
      'Survivability',
      [
        { name: 'Maximum HP', step: 8, unit: '%' },
        { name: 'Defense', step: 5, unit: '%' },
        { name: 'HP Regeneration', step: 0.15, unit: '%/s' },
      ],
    ],
    [
      'Combat',
      [
        { name: 'Damage', step: 5, unit: '%' },
        { name: 'Movement Speed', step: 4, unit: '%' },
        { name: 'Cooldown Reduction', step: -4, unit: '%' },
        { name: 'Critical Chance', step: 2, unit: '%' },
        { name: 'Critical Damage', step: 10, unit: '%' },
        { name: 'Status Chance', step: 5, unit: '%' },
        { name: 'Dodge Cooldown Reduction', step: -5, unit: '%', soon: true },
        { name: 'Dodge Distance', step: 5, unit: '%', soon: true },
      ],
    ],
    [
      'Economy',
      [
        { name: 'EXP Gain', ranks: [10, 25, 45], unit: '%' },
        { name: 'Gold Gain', ranks: [10, 25, 45], unit: '%' },
        { name: 'Pickup Range', ranks: [15, 35, 60], unit: '%' },
        { name: 'Item Drop Chance', ranks: [5, 12, 20], unit: '%' },
      ],
    ],
    [
      'Tactical Utility',
      [
        { name: 'Card Rerolls', ranks: [1, 2, 3], unit: '' },
        { name: 'Card Banish', ranks: [1, 2, 3], unit: '' },
        { name: 'Starting Moves', ranks: [1, 2, 3], unit: '' },
        { name: 'Team Swap Cooldown Reduction', step: -10, unit: '%' },
      ],
    ],
  ];
  const UPG_MAX_POINTS = 40;

  let upgDex = null,
    upgBack = open,
    upgCur = [0, 0]; // keyboard cursor: [column, box]

  /** The Pokémon the tab cycles through: the Team screen's draft team, else the saved one. */
  function upgParty() {
    const t = ros.team.some(Boolean) ? ros.team : G.DB.save.team || [];
    return [...new Set(t.filter(Boolean).map((x) => x.dex))];
  }

  /**
   * @param dex   the Pokémon to open on (a Team screen slot's Upgrade button)
   * @param back  where Back goes (default: the main menu)
   */
  function openUpgrades(dex, back = open) {
    // A popup: the screen under it (the Team screen) stays drawn, dimmed. Back reopens that screen, which hides this one.
    rosChrome();
    $('scr-upgrades').classList.remove('hidden');
    upgBack = back;
    $('upg-back').onclick = () => upgBack();
    $('upg-prev').onclick = () => upgStep(-1);
    $('upg-next').onclick = () => upgStep(1);
    if (dex != null) upgDex = dex;
    const party = upgParty();
    if (!party.includes(upgDex)) upgDex = party[0] != null ? party[0] : G.DB.save.partner;
    upgCur = [0, 0];
    renderUpgrades();
  }

  function upgStep(d) {
    const party = upgParty();
    if (party.length < 2) return;
    upgDex = party[(party.indexOf(upgDex) + d + party.length) % party.length];
    G.Audio.sfx('select');
    renderUpgrades();
  }

  const upgNum = (n) => (n > 0 ? '+' : n < 0 ? '-' : '+') + Math.abs(Math.round(n * 100) / 100);

  function renderUpgrades() {
    $('upg-name').textContent = G.DEX_BY[upgDex] ? G.DEX_BY[upgDex].name : '';
    $('upg-points').textContent = `0 / ${UPG_MAX_POINTS}`;
    $('upg-prev').disabled = $('upg-next').disabled = upgParty().length < 2;
    const cols = $('upg-cols');
    cols.innerHTML = '';
    UPG_COLS.forEach(([title, list], c) => {
      const col = document.createElement('div');
      col.className = 'upg-col';
      col.innerHTML = `<h3>${title}</h3>`;
      list.forEach((u, i) => {
        const rank = 0; // not wired yet
        const max = u.ranks ? u.ranks.length : 5;
        const total = rank === 0 ? 0 : u.ranks ? u.ranks[rank - 1] : u.step * rank;
        const per = u.ranks
          ? `${upgNum(u.ranks[0])} / ${u.ranks.slice(1).join(' / ')}${u.unit}`
          : `${upgNum(u.step)}${u.unit} per Rank`;
        const el = document.createElement('div');
        el.className = 'upg-box' + (u.soon ? ' soon' : '');
        el.title = u.soon ? `${u.name}: coming with the dodge mechanic` : u.name;
        el.innerHTML = `<span class="rk">Rank</span>
          <span class="pips r${max}">${Array.from({ length: max }, (_, k) => `<i${k < rank ? ' class="on"' : ''}></i>`).join('')}</span>
          <span class="txt"><span class="nm${u.name.length > 16 ? ' long' : ''}">${u.name}</span><span class="per">${u.soon ? 'Soon' : per}</span></span>
          <span class="tot">${upgNum(total)}${u.unit}</span>`;
        el.addEventListener('pointerenter', () => upgSelect(c, i));
        col.appendChild(el);
      });
      cols.appendChild(col);
    });
    upgSelect(upgCur[0], upgCur[1]);
  }

  function upgSelect(c, i) {
    const cols = $('upg-cols').children;
    c = (c + cols.length) % cols.length;
    const boxes = cols[c].querySelectorAll('.upg-box');
    i = Math.max(0, Math.min(boxes.length - 1, i));
    upgCur = [c, i];
    $('upg-cols')
      .querySelectorAll('.upg-box.sel')
      .forEach((b) => b.classList.remove('sel'));
    boxes[i].classList.add('sel');
    boxes[i].scrollIntoView({ block: 'nearest' });
  }

  /** Arrows move the cursor, Q / E change Pokémon, Esc goes back. */
  function upgKey(e) {
    if (!G.UI.isOpen('scr-upgrades') || (e.target.closest && e.target.closest('input, textarea, select'))) return;
    const [c, i] = upgCur;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') upgSelect(c, i + (e.key === 'ArrowDown' ? 1 : -1));
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') upgSelect(c + (e.key === 'ArrowRight' ? 1 : -1), i);
    else if (e.key === 'q' || e.key === 'Q') return upgStep(-1);
    else if (e.key === 'e' || e.key === 'E') return upgStep(1);
    else if (e.key === 'Escape') {
      G.Audio.sfx('back');
      upgBack();
    } else return;
    if (e.key.startsWith('Arrow')) G.Audio.sfx('hover');
    e.preventDefault();
  }

  return { init, open, GEN_NAMES };
})();
