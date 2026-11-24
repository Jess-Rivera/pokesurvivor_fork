/* ============ menu-dex-grid.js: the filter bar and Pokemon grid the Pokedex and the Team screen share ============
 * Split from menu.js (#154). A "view" object (element-id prefix, filter state, team, selection) says which screen
 * draws; the Team screen's view adds hooks for its box list and its slots. */
G.MenuDexGrid = (() => {
  const $ = G.UI.$;
  const GEN_NAMES = G.MenuUI.GEN_NAMES;
  const { moveQuery, learnsAny, namedBy, speciesMatches, speciesFound } = G.TeamList; // shared with the Team menu (#167)
  // Pokedex control state. region: 'all' | gen#; own: 'all'|'own'|'miss';
  // q: search; types/rarity/bst: multi-select (empty = all); sort + dir.
  // marks (3b-2 E3): 'fav' and 'lock' chips, Team screen box tabs only.
  const newCtrl = () => ({
    region: 'all',
    own: 'all',
    q: '',
    types: [],
    rarity: [],
    bst: [],
    marks: [],
    sort: 'dex',
    dir: 1,
  });
  const BST_BANDS = G.Copies.BST_BANDS; // shared with the Shop's TMs tab (#149 149f)
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
        b.title = G.Copies.RARITY_NAME[r];
      } else b.innerHTML = G.Icons.rarity(r, 12) + ' ' + G.Copies.RARITY_NAME[r];
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

  function filterSortDex(c) {
    const s = G.DB.save;
    const mq = moveQuery(c.q);
    const filter = {
      own: c.own,
      regions: c.region === 'all' ? [] : [c.region],
      types: c.types,
      rarity: c.rarity,
      bst: c.bst,
    };
    const list = G.DEX.filter((p) => {
      const own = !!s.owned[p.dex];
      return speciesMatches(p, filter, own) && speciesFound(p, c.q, mq, own);
    });
    const key = c.sort;
    // Stat/BST sorts are power-revealing: sink UNOWNED to the bottom (owned-first),
    // then order by the chosen stat within each group. Dex/name sorts are not sunk.
    const sinkUnowned = key !== 'dex' && key !== 'name';
    // Ranking of a move search: name/# hits and moves whose NAME starts with the query first, word-only matches (Bug Bite for 'bit') below.
    const tier = (p) => {
      if (!mq || learnsAny(p, mq.strong)) return 0;
      return namedBy(p, c.q, !!s.owned[p.dex]) ? 0 : 1;
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
      v.renderBox(v);
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
        cell.ondblclick = () => v.place(p.dex);
        cell.ondragstart = (e) => {
          v.setDrag(p.dex);
          e.dataTransfer.setData('text/plain', String(p.dex));
          e.dataTransfer.effectAllowed = 'move';
        };
        cell.ondragend = () => {
          v.setDrag(null);
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

  return { newCtrl, buildControls, filterSortDex, markGrid, renderGrid, refreshCells };
})();
