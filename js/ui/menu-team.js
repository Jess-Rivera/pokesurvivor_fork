/* ============ menu-team.js: the Team screen (team slots, the detail column, box tabs and the box list) ============
 * Split from menu.js (#154). Nicknames and selling: menu-team-copies.js. Filter bar and grid: menu-dex-grid.js. */
G.MenuTeam = (() => {
  const $ = G.UI.$;
  const GEN_NAMES = G.MenuUI.GEN_NAMES;
  const { newCtrl, buildControls, filterSortDex, markGrid, renderGrid, refreshCells } = G.MenuDexGrid;
  const rosCtrl = newCtrl(); // the Team screen keeps its own filters, separate from the Pokédex
  const rosView = {
    pre: 'ros-',
    ctrl: rosCtrl,
    team: () => ros.team,
    sel: () => ros.dex,
    selUid: () => ros.uid,
    boxTab: () => (ros.tab === 'dex' ? null : ros.tab),
    pick: (dex) => rosSelectDex(dex),
    assign: true, // cells can be double-clicked or dragged onto a team slot
    renderBox: (v) => rosRenderBox(v), // a box tab shows the box's copies instead of the species grid
    place: (dex) => rosPlace(ros.slot, dex),
    setDrag: (what) => {
      ros.drag = what;
    },
    compact: true, // filter chips show icons only (the name is the tooltip)
  };

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
      !(await G.UI.ask('Discard your team changes?', {
        title: 'Unsaved team',
        ok: 'Discard',
        cancel: 'Keep editing',
        intent: 'negative',
      }))
    )
      return;
    G.MenuUI.open();
  }

  function rosCommit() {
    const s = G.DB.save;
    if (!ros.team[0] || !rosDirty()) return;
    s.team = ros.team.map(rosSlotOf);
    s.partner = s.team[0].dex; // the lead is the companion
    s.partnerShiny = !!s.team[0].shiny;
    G.DB.commit();
    G.UI.toast('Team saved');
    G.MenuUI.open();
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
      G.UI.toast('Unable to Afford');
      return;
    }
    const yes = await G.UI.ask(`Spend ${rosCoins(price)} PokéCoins on Box ${n}?`, {
      title: 'Buy box',
      ok: 'Buy',
      intent: 'positive', // a purchase: it opens on Buy (decision 2026-11-21, until #126 drops it)
      note: `You have ${rosCoins(s.coins)}. You will have ${rosCoins(s.coins - price)} left.`,
    });
    if (!yes) return;
    const r = G.Copies.buyBox(s);
    if (!r.ok) {
      G.Audio.sfx('error');
      G.UI.toast(r.error === 'poor' ? 'Unable to Afford' : 'You have every box');
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
    const markOk = (c) =>
      !marks.length || (marks.includes('fav') && c.isFavorite) || (marks.includes('lock') && c.isLocked);
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
          G.MenuTeamCopies.rosTickClass(cell, c);
          cell.onclick = () => {
            if (!G.MenuTeamCopies.rosCanBulk(c)) return;
            if (ros.ticked.has(c.pokemonUUID)) ros.ticked.delete(c.pokemonUUID);
            else ros.ticked.add(c.pokemonUUID);
            G.MenuTeamCopies.rosTickClass(cell, c);
            G.MenuTeamCopies.rosBulkBar();
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
    G.MenuTeamCopies.rosBulkBar();
    if (!shown)
      grid.innerHTML = `<p class="sub" style="grid-column:1/-1">${
        !total
          ? 'This box is empty.'
          : marks.length && !marked
            ? 'No marked Pokémon in this box.'
            : 'No Pokemon match these filters.'
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
      if (ros.select) G.MenuTeamCopies.rosTickClass(cell, c);
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
          G.MenuUpgrades.open(mon.dex, rosReturn);
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
        <div class="ros-row"><span title="${G.Copies.RARITY_NAME[p.rarity]}">${G.UI.stars(p.rarity, 24)}</span><span class="rtypes">${G.UI.typeChips(p.types)}</span></div>
        <div class="ros-box ros-stats"><span class="ros-bst">${G.Icons.bstStars(p.bst)}</span>${p.stats ? '<div id="ros-hex" class="hex-wrap"></div>' : ''}</div>
        ${rosInfoRows(copy, dex)}
        <div class="ros-box ros-mbox"><div class="ros-mh">Moves</div><div class="ros-moves">${moves}</div></div>
        ${copy ? G.MenuTeamCopies.rosSellHtml(copy) : ''}
      </div>`;
    const hex = $('ros-hex');
    if (hex)
      hex.appendChild(
        G.StatChart.make(p.stats, color, 380, 364, { radius: 0.33, teamHex: true, iv: copy ? copy.iv : null })
      );
    const sellBtn = $('ros-sell');
    if (sellBtn && copy) sellBtn.onclick = () => G.MenuTeamCopies.rosSell(copy.pokemonUUID);
    const lockBtn = $('ros-lock'),
      favBtn = $('ros-fav');
    if (lockBtn && copy) lockBtn.onclick = () => G.MenuTeamCopies.rosToggle(copy.pokemonUUID, 'lock');
    if (favBtn && copy) favBtn.onclick = () => G.MenuTeamCopies.rosToggle(copy.pokemonUUID, 'fav');
    const nickBtn = $('ros-nick'),
      nameEl = box.querySelector('.ros-dh .ros-nm');
    if (nickBtn && copy) nickBtn.onclick = () => G.MenuTeamCopies.rosRename(copy.pokemonUUID);
    if (nameEl && copy) {
      nameEl.classList.add('renamable');
      nameEl.onclick = () => G.MenuTeamCopies.rosRename(copy.pokemonUUID);
    }
  }

  /** Nature, Ability, Height, Weight and EVs of a copy. A species from the Pokedex tab has its possible abilities and real size, no nature. */
  function rosInfoRows(copy, dex) {
    const row = (label, value) => `<div class="ros-row"><span>${label}</span><b>${value}</b></div>`;
    const abilityText = (a) => a.name + (a.hidden ? ' (Hidden)' : '');
    // Pokebox step 5: the nonzero EVs and the total, "Atk 252 · HP 180 · 432 / 510" (earned at the end of a run).
    const evText = (c) =>
      ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe']
        .map((n, k) => (c.ev[k] ? n + ' ' + c.ev[k] : ''))
        .filter(Boolean)
        .concat(c.evTotal + ' / 510')
        .join(' · ');
    if (copy)
      return (
        row('Nature', copy.natureName) +
        row('Ability', abilityText({ name: copy.abilityName, hidden: copy.abilityHidden })) +
        row('Height', copy.heightM.toFixed(2) + ' m') +
        row('Weight', copy.weightKg.toFixed(1) + ' kg') +
        row('EVs', evText(copy))
      );
    const sp = G.Copies.species(dex);
    return (
      row('Ability', sp.abilities.map(abilityText).join(' / ')) +
      row('Height', sp.heightM.toFixed(1) + ' m') +
      row('Weight', sp.weightKg.toFixed(1) + ' kg')
    );
  }

  /** The Team screen's listeners. Called by G.MenuUI.init, which keeps the order menu.js always used. */
  function init() {
    // PokeCoins changed while the Team screen is open (a purchase, a debug command): the box price tabs follow at once.
    // Only the tab row is redrawn: the grid, the selection and pending team edits stay as they are.
    G.DB.onSave(() => {
      if (G.UI.isOpen('scr-roster')) rosRenderTabs();
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
  }

  return {
    init,
    open: openRoster,
    ros,
    rosView,
    rosChrome,
    rosReturn,
    rosCoins,
    rosRenderAll,
    rosRenderTabs,
    rosRefreshList,
  };
})();
