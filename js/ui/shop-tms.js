/* ============ shop-tms.js: the Main Menu Shop's TMs tab (G.ShopTmsPane; #149 149f) ============
 * Mockup: assets/excalidraw/Shop-TR-Menu.svg (drawn as "TRs"; renamed TMs by decision 2026-11-17-tm-for-good-tr-for-one-run);
 * plan and rulings (R2, R6 to R8, F1 to F9): docs/ASCII Concept Maps/149 - Shop Rework Opening.md. Drawn into #shop-tms by
 * js/ui/gacha-ui.js, which owns the window, the rail, Exit and the cursor (create() takes them). The rules are G.TMs'.
 *   bar      a search bar (move names), the Type filter (a kit Dropdown) and the Able to Learn toggle (on at each
 *            opening: only the TMs the chosen Pokemon can use)
 *   cards    a scrolling 3-column grid of the kit's item cards, one per TM shown: its type's TM disc, name, one line
 *            (G.MoveInfo.desc) and one button. Buy and its price; Learned once bought; Known when its level-up and egg
 *            pool has it (the Move Trainer offers it anyway); dimmed when it cannot learn it. A button that cannot buy
 *            refuses with a toast (#151). Buy asks first (G.UI.ask); a shift-click skips the question (mockup).
 *   Pokemon  the chosen Pokemon (its portrait and name; the team's lead at each opening), the 6 team slots, a search bar
 *            (name or nickname) and a filter (box, region, type, BST stars, rarity; several at once, F5), over a
 *            scrolling 3-wide grid of Pokebox portraits. No search or filter: box 1, by dex. A click or Enter on a slot
 *            or a portrait chooses that Pokemon.
 */
G.ShopTmsPane = (() => {
  const kitOverlay = G.HudOverlay,
    windowKit = G.MenuWindowKit;
  if (!kitOverlay || !kitOverlay.ready || !windowKit.ready || !G.TMs) return { ready: false };
  const { html, signal, ScrollBox, SearchBar, portraitSource, portraitFallback, RoundPortrait } = kitOverlay.kit;
  const { CARD, CURSOR_ROOM, SCROLL_COLOURS, SHORT_PRICE_FROM, px, ItemCard, SearchStop, Dropdown, dropdownItems } =
    windowKit;
  const { nameHas } = windowKit;

  // ---------- sizes and places (pane pixels; the pane is 1005 x 616, down to the bottom of Exit) ----------
  const PANE_HEIGHT = 616;
  // the left side: the bar, then the cards, CURSOR_ROOM in from the pane's edges. The card list is the Team Items sale
  // side's width: 3 cards of CARD.width and their gaps (582), then the scroll bar 8 px clear of them (at 584 it covered
  // the third card's rim, 2026-11-18) and 16 px clear of the Pokemon panel
  const BAR = { searchWidth: 250, typeLeft: 262, typeWidth: 170, toggleLeft: 446, toggleSize: 32, labelLeft: 486 };
  const GRID = { columns: 3, width: 600, top: 56 };
  GRID.height = PANE_HEIGHT - CURSOR_ROOM - GRID.top;
  const TYPE_LIST = { top: 48, width: 220, height: 420 }; // the Type filter's open list, under its box
  // the Pokemon panel: the Team Items owned panel's place and size. Every portrait is a round face in its cell, the
  // catch screen's look (css/bw-catch.css .catch-owned-face; Jess 2026-11-17), the cursor's corners on the cell's edges
  const PANEL = { left: 624, width: 377, height: 530, inset: 14 };
  const CHOSEN = { top: 44, size: 88, nameTop: 12 };
  const TEAM = { left: 144, top: 44, size: 52, gap: 10, columns: 3 };
  const DIVIDER_TOP = 166;
  const FINDER = { top: 180, searchWidth: 200, filterLeft: 226, filterWidth: 137 };
  const BOX_GRID = { top: 232, columns: 4, cell: 76, gap: 10, trackRight: 6 }; // four across (Jess 2026-11-17)
  BOX_GRID.width = BOX_GRID.columns * BOX_GRID.cell + (BOX_GRID.columns - 1) * BOX_GRID.gap; // 334
  BOX_GRID.height = PANEL.height - BOX_GRID.top - PANEL.inset;
  const FILTER_LIST = { top: 224, width: 240, height: 296 }; // the Pokemon filter's open list, right-aligned to its box
  // a portrait face: the catch screen's light grey rim (the Normal type's Light)
  const FACE = { stroke: 2, rim: G.Tokens.color('color.type.normal.light') };
  // cursor ids
  const TM_SEARCH = 'tm-search',
    TM_TYPE = 'tm-type',
    TM_ABLE = 'tm-able',
    TM_CARD = 'tm-card-',
    TEAM_SLOT = 'team-slot-',
    MON_SEARCH = 'mon-search',
    MON_FILTER = 'mon-filter',
    MON_CELL = 'mon-cell-';
  // what a TM button that cannot buy says (#151), by G.TMs.standing or teach's error
  const REFUSALS = {
    poor: 'Unable to Afford',
    learned: 'Already learned.',
    known: 'Already in its Move Trainer pool.',
    cannot: "Can't learn this TM.",
    none: 'Choose a Pokemon first.',
  };
  const fmt = (n) => n.toLocaleString('en-US'); // the whole number: asks, notes and toasts
  const shortPrice = (n) => G.U.compact(n, SHORT_PRICE_FROM); // a button's price: "9k"
  const titled = (text) => text.charAt(0).toUpperCase() + text.slice(1);

  // a shift-click on Buy skips the question (mockup); a key press never does
  let shiftClick = false;
  addEventListener('pointerdown', (event) => (shiftClick = event.shiftKey), true);
  addEventListener('keydown', () => (shiftClick = false), true);

  /**
   * One remembered result: the last key and value; a call with the same key gives the value back without computing it.
   * The cursor asks for the tab's items once per drawn button, so the lists below are computed once per change, not
   * once per button (Jess 2026-11-17: with every Pokemon owned, moving the cursor was slow).
   */
  function remembered(compute) {
    let lastKey = null,
      lastValue = null;
    return (key, ...args) => {
      if (key !== lastKey) {
        lastValue = compute(...args);
        lastKey = key;
      }
      return lastValue;
    };
  }

  /** The tab for one Shop window: cursor is its selection cursor, refresh redraws the Shop after a purchase. */
  function create({ cursor, refresh }) {
    const tmQuery = signal(''),
      typesChosen = signal([]),
      ableOnly = signal(true),
      monQuery = signal(''),
      monFilters = signal([]),
      chosenUid = signal(null),
      openDropdown = signal(null); // TM_TYPE, MON_FILTER or null
    let saveVersion = 0; // bumped at each opening and purchase: the remembered lists are computed again

    /** Each opening: filters cleared, Able to Learn on, the team's lead chosen. */
    function reset() {
      tmQuery.value = '';
      typesChosen.value = [];
      ableOnly.value = true;
      monQuery.value = '';
      monFilters.value = [];
      openDropdown.value = null;
      saveVersion++;
      const lead = (G.DB.save && G.DB.save.team.find((slot) => slot && slot.uid)) || null;
      chosenUid.value = lead ? lead.uid : null;
    }

    // ---------- what is shown ----------
    /** The chosen copy (read), or the first copy in the box when the chosen one is gone; null with an empty box. */
    const chosenCopyOf = remembered(
      (save) => (chosenUid.value && G.Copies.get(save, chosenUid.value)) || G.Copies.all(save)[0] || null
    );
    function chosenCopy() {
      const save = G.DB.save;
      if (!save) return null;
      return chosenCopyOf([saveVersion, save.box.length, chosenUid.value].join('|'), save);
    }
    const nameOfCopy = (copy) => copy.nickname || G.DEX_BY[copy.speciesID].name;

    /** The TMs the cards show: by name, narrowed by the search, the Type filter and Able to Learn. */
    const shownTmsFor = remembered((save, uid) => {
      const named = nameHas(tmQuery.value);
      return G.TMs.list().filter((moveId) => {
        const def = G.MoveDefs[moveId];
        if (!named(def)) return false;
        if (typesChosen.value.length && !typesChosen.value.includes(def.type)) return false;
        return !ableOnly.value || G.TMs.standing(save, uid, moveId) !== 'cannot';
      });
    });
    function shownTms(copy) {
      const uid = copy && copy.pokemonUUID,
        key = [saveVersion, uid, tmQuery.value, typesChosen.value.join(), ableOnly.value].join('|');
      return shownTmsFor(key, G.DB.save, uid);
    }

    const typeGroups = () => [
      { name: 'Type', choices: G.MoveAttrs.TYPES.map((type) => ({ key: type, label: titled(type) })) },
    ];
    function monGroups() {
      const boxes = G.Copies.boxCount(G.DB.save);
      return [
        {
          name: 'Pokebox',
          choices: Array.from({ length: boxes }, (_, box) => ({ key: 'box:' + box, label: 'Box ' + (box + 1) })),
        },
        {
          name: 'Region',
          choices: G.MenuUI.REGION_NAMES.map((name, index) => ({ key: 'region:' + (index + 1), label: name })),
        },
        { name: 'Type', choices: G.MoveAttrs.TYPES.map((type) => ({ key: 'type:' + type, label: titled(type) })) },
        {
          name: 'BST',
          choices: G.Copies.BST_BANDS.map((band) => ({ key: 'bst:' + band.k, label: band.stars + ' stars' })),
        },
        {
          name: 'Rarity',
          choices: [1, 2, 3, 4, 5].map((rarity) => ({
            key: 'rarity:' + rarity,
            label: G.T(G.Copies.RARITY_NAME[rarity]),
          })),
        },
      ];
    }
    // how each filter group tests a copy (copy, its species, the chosen value); any chosen value in a group matches
    const MON_TESTS = {
      box: (copy, species, value) => copy.box === +value,
      region: (copy, species, value) => species.gen === +value,
      type: (copy, species, value) => species.types.includes(value),
      bst: (copy, species, value) => {
        const band = G.Copies.BST_BANDS.find((entry) => entry.k === value);
        return species.bst >= band.lo && species.bst <= band.hi;
      },
      rarity: (copy, species, value) => species.rarity === +value,
    };
    /** The Pokebox portraits shown: no search or filter, box 1; else every box, narrowed by both. By dex, then oldest. */
    function shownCopies() {
      const save = G.DB.save;
      if (!save) return [];
      const key = [saveVersion, save.box.length, save.boxCount, monQuery.value, monFilters.value.join()].join('|');
      return shownCopiesOf(key, save);
    }
    const shownCopiesOf = remembered((save) => {
      const text = monQuery.value.trim().toLowerCase(),
        chosenByGroup = {};
      for (const key of monFilters.value) {
        const [group, value] = key.split(':');
        (chosenByGroup[group] = chosenByGroup[group] || []).push(value);
      }
      const groups = Object.keys(chosenByGroup);
      const passes = (copy) => {
        const species = G.DEX_BY[copy.speciesID];
        if (text && !nameOfCopy(copy).toLowerCase().includes(text)) return false;
        if (!text && !groups.length) return copy.box === 0;
        return groups.every((group) => chosenByGroup[group].some((value) => MON_TESTS[group](copy, species, value)));
      };
      return G.Copies.all(save)
        .filter(passes)
        .sort((a, b) => a.speciesID - b.speciesID || a.dateObtained - b.dateObtained);
    });
    /** The team's six slots: each { slot, uid, dex, shiny } or null. A slot with no copy cannot be chosen. */
    const teamSlots = () => (G.DB.save ? G.DB.save.team : []).slice(0, 6);

    /** What the cursor may reach on this tab, in reading order, Exit last; an open dropdown keeps it inside. */
    function cursorItems() {
      if (openDropdown.value === TM_TYPE) return dropdownItems(TM_TYPE, typeGroups());
      if (openDropdown.value === MON_FILTER) return dropdownItems(MON_FILTER, monGroups());
      return [
        TM_SEARCH,
        TM_TYPE,
        TM_ABLE,
        ...shownTms(chosenCopy()).map((moveId) => TM_CARD + moveId),
        ...teamSlots().flatMap((slot, index) => (slot && slot.uid ? [TEAM_SLOT + index] : [])),
        MON_SEARCH,
        MON_FILTER,
        ...shownCopies().map((copy) => MON_CELL + copy.pokemonUUID),
        'exit',
      ];
    }

    // ---------- input ----------
    function toggleIn(list, key) {
      list.value = list.value.includes(key) ? list.value.filter((entry) => entry !== key) : [...list.value, key];
      G.Audio.sfx('select');
    }
    /** Opens dropdown id (TM_TYPE or MON_FILTER); the cursor stays on its box, which is now the list's first stop. */
    function openDropdownBox(id) {
      openDropdown.value = id;
      cursor.moveTo(id);
      G.Audio.sfx('select');
    }
    function choose(uid) {
      chosenUid.value = uid;
      G.Audio.sfx('select');
    }
    /** Enter on an item of this tab; false when it is not this tab's (Exit). */
    function press(at) {
      if (at === TM_SEARCH || at === MON_SEARCH) {
        cursor.elementOf(at).querySelector('input').focus(); // type; Enter or Esc gives the keys back
        return true;
      }
      if (at === TM_TYPE || at === MON_FILTER) {
        if (openDropdown.value) closeDropdown();
        else openDropdownBox(at);
        return true;
      }
      for (const [dropdown, list] of [
        [TM_TYPE, typesChosen],
        [MON_FILTER, monFilters],
      ])
        if (at.startsWith(dropdown + ':')) {
          toggleIn(list, at.slice(dropdown.length + 1));
          return true;
        }
      if (at === TM_ABLE) {
        ableOnly.value = !ableOnly.value;
        G.Audio.sfx('select');
        return true;
      }
      if (at.startsWith(TM_CARD)) {
        buy(at.slice(TM_CARD.length)); // a refusing Buy never gets here: the cursor's Enter refuses it (the kit)
        return true;
      }
      if (at.startsWith(TEAM_SLOT)) {
        choose(teamSlots()[+at.slice(TEAM_SLOT.length)].uid);
        return true;
      }
      if (at.startsWith(MON_CELL)) {
        choose(at.slice(MON_CELL.length));
        return true;
      }
      return false;
    }
    /** Back to the dropdown's box, the list closed. */
    function closeDropdown() {
      const wasOpen = openDropdown.value;
      openDropdown.value = null;
      cursor.moveTo(wasOpen);
      G.Audio.sfx('back');
    }
    /** Esc: closes an open dropdown (true); otherwise the Shop's own Esc (false). */
    function escape() {
      if (!openDropdown.value) return false;
      closeDropdown();
      return true;
    }

    async function buy(moveId) {
      const save = G.DB.save,
        copy = chosenCopy();
      if (!copy) return;
      const uid = copy.pokemonUUID,
        price = G.TMs.price(moveId),
        moveName = G.MoveDefs[moveId].name,
        pokemonName = nameOfCopy(copy);
      if (!shiftClick) {
        const yes = await G.UI.ask(`Teach ${pokemonName} ${moveName}?`, {
          title: 'Buy TM',
          ok: 'Buy',
          intent: 'positive', // a purchase: it opens on Buy (decision 2026-11-21, until #126 drops it)
          note: `${fmt(price)} PokéCoins. You will have ${fmt(Math.max(0, save.coins - price))} left.`,
        });
        if (!yes) return;
      }
      const result = G.TMs.teach(save, uid, moveId);
      if (!result.ok) {
        G.Audio.sfx('error');
        G.UI.toast(REFUSALS[result.error]);
        refresh();
        return;
      }
      G.Audio.sfx('confirm');
      saveVersion++;
      G.DB.commit(true);
      G.UI.toast(`${pokemonName} learned ${moveName} for good!`);
      refresh();
    }

    // ---------- drawing ----------
    function TmCard({ moveId, copy, coins }) {
      const def = G.MoveDefs[moveId],
        standing = G.TMs.standing(G.DB.save, copy && copy.pokemonUUID, moveId),
        price = G.TMs.price(moveId);
      const refusal = standing === 'buy' ? (coins >= price ? null : REFUSALS.poor) : REFUSALS[standing];
      const label = standing === 'learned' ? 'Learned' : standing === 'known' ? 'Known' : 'Buy ' + shortPrice(price);
      return html`<${ItemCard}
        cursor=${cursor}
        item=${{ id: moveId, name: def.name, desc: G.MoveInfo.desc(moveId), icon: 'ps:tm.' + def.type }}
        buttonId=${TM_CARD + moveId}
        buttonLabel=${label}
        refusal=${refusal}
        onPress=${() => buy(moveId)}
        area="tms"
        dimmed=${standing === 'cannot'}
      />`;
    }

    function Bar({ at }) {
      return html`<${SearchStop} id=${TM_SEARCH} area="tms" at=${at} className="shop-tms-search-host">
          <${SearchBar}
            value=${tmQuery.value}
            onChange=${(text) => (tmQuery.value = text)}
            placeholder="Search TMs"
            width=${BAR.searchWidth}
          />
        </${SearchStop}>
        <${Dropdown}
          cursor=${cursor}
          id=${TM_TYPE}
          area="tm-bar"
          label="Type"
          groups=${typeGroups()}
          chosen=${typesChosen.value}
          at=${at}
          isOpen=${openDropdown.value === TM_TYPE}
          onOpenChange=${(open) => (open ? openDropdownBox(TM_TYPE) : closeDropdown())}
          onToggle=${(key) => toggleIn(typesChosen, key)}
          box=${{ left: BAR.typeLeft, top: 0, width: BAR.typeWidth }}
          list=${{ left: BAR.typeLeft, top: TYPE_LIST.top, width: TYPE_LIST.width, height: TYPE_LIST.height }}
        />
        <div
          class=${'shop-toggle' + (ableOnly.value ? ' is-on' : '')}
          data-cursor-id=${TM_ABLE}
          data-cursor-area="tm-bar"
          style=${{ left: px(BAR.toggleLeft), top: px(4), width: px(BAR.toggleSize), height: px(BAR.toggleSize) }}
          onMouseEnter=${() => cursor.hover(TM_ABLE)}
          onMouseLeave=${() => cursor.hover(null)}
          onClick=${() => press(TM_ABLE)}
        >
          <span class="shop-check"></span>
          ${cursor.cornersIf(at === TM_ABLE)}
        </div>
        <div class="hud-text shop-toggle-label" style=${{ left: px(BAR.labelLeft), top: px(2) }}>Able to<br />Learn</div>`;
    }

    /** A round portrait face (the catch screen's look, the library's portrait.round), filling its cell less the
     *  cursor's room. */
    const Face = ({ dex, shiny }) =>
      html`<${RoundPortrait}
        className="shop-tms-face"
        stroke=${FACE.stroke}
        rim=${FACE.rim}
        src=${dex ? portraitSource(dex, shiny) : null}
        dex=${dex}
        onError=${portraitFallback}
        lazy
      />`;

    /** A Pokemon the cursor can choose: a team slot or a Pokebox cell. place: its left and top in the panel (team slots). */
    function FaceCell({ id, area, uid, dex, shiny, size, place, at, chosen }) {
      return html`<div
        class=${'shop-tms-face-cell' + (chosen ? ' is-chosen' : '')}
        data-cursor-id=${id}
        data-cursor-area=${area}
        data-uid=${uid}
        style=${{ ...place, width: px(size), height: px(size) }}
        onMouseEnter=${() => cursor.hover(id)}
        onMouseLeave=${() => cursor.hover(null)}
        onClick=${() => choose(uid)}
      >
        <${Face} dex=${dex} shiny=${shiny} />
        ${cursor.cornersIf(at === id)}
      </div>`;
    }

    function PokemonPanel({ at, copy }) {
      const chosenUidNow = copy && copy.pokemonUUID;
      return html`<div
        class="shop-tms-panel"
        style=${{ left: px(PANEL.left), width: px(PANEL.width), height: px(PANEL.height) }}
      >
        <div class="hud-text shop-tms-chosen-name" style=${{ left: px(PANEL.inset), top: px(CHOSEN.nameTop) }}>
          ${copy ? nameOfCopy(copy) : 'No Pokemon'}
        </div>
        <div
          class="shop-tms-chosen"
          style=${{ left: px(PANEL.inset), top: px(CHOSEN.top), width: px(CHOSEN.size), height: px(CHOSEN.size) }}
        >
          <${Face} dex=${copy && copy.speciesID} shiny=${copy && copy.isShiny} />
        </div>
        ${teamSlots().map((slot, index) => {
          const place = {
            left: px(TEAM.left + (index % TEAM.columns) * (TEAM.size + TEAM.gap)),
            top: px(TEAM.top + Math.floor(index / TEAM.columns) * (TEAM.size + TEAM.gap)),
          };
          if (!slot || !slot.uid)
            return html`<div
              key=${index}
              class="shop-tms-face-cell is-empty"
              style=${{ ...place, width: px(TEAM.size), height: px(TEAM.size) }}
            >
              <${Face} dex=${slot && slot.dex} shiny=${slot && slot.shiny} />
            </div>`;
          return html`<${FaceCell}
            key=${index}
            id=${TEAM_SLOT + index}
            area="team"
            uid=${slot.uid}
            dex=${slot.dex}
            shiny=${slot.shiny}
            size=${TEAM.size}
            place=${place}
            at=${at}
            chosen=${slot.uid === chosenUidNow}
          />`;
        })}
        <div class="shop-pocket-divider shop-tms-divider" style=${{ left: px(PANEL.inset), right: px(PANEL.inset), top: px(DIVIDER_TOP) }}></div>
        <div class="shop-tms-finder" style=${{ left: px(PANEL.inset), top: px(FINDER.top) }}>
          <${SearchStop} id=${MON_SEARCH} area="box" at=${at} className="shop-tms-mon-search-host">
            <${SearchBar}
              value=${monQuery.value}
              onChange=${(text) => (monQuery.value = text)}
              placeholder="Search"
              width=${FINDER.searchWidth}
            />
          </${SearchStop}>
          <${Dropdown}
            cursor=${cursor}
            id=${MON_FILTER}
            area="box-bar"
            label="Filter"
            groups=${monGroups()}
            chosen=${monFilters.value}
            at=${at}
            isOpen=${openDropdown.value === MON_FILTER}
            onOpenChange=${(open) => (open ? openDropdownBox(MON_FILTER) : closeDropdown())}
            onToggle=${(key) => toggleIn(monFilters, key)}
            box=${{ left: FINDER.filterLeft - PANEL.inset, top: 0, width: FINDER.filterWidth }}
            list=${{
              left: FINDER.filterLeft + FINDER.filterWidth - FILTER_LIST.width - PANEL.inset,
              top: FILTER_LIST.top - FINDER.top,
              width: FILTER_LIST.width,
              height: FILTER_LIST.height,
            }}
          />
        </div>
        <${ScrollBox}
          box=${{ left: PANEL.inset, top: BOX_GRID.top, width: BOX_GRID.width, height: BOX_GRID.height }}
          trackRight=${BOX_GRID.trackRight}
          colours=${SCROLL_COLOURS}
          resetOn=${[monQuery.value, monFilters.value.join()]}
        >
          <div
            class="shop-tms-box-grid"
            style=${{ gridTemplateColumns: `repeat(${BOX_GRID.columns}, ${px(BOX_GRID.cell)})`, gap: px(BOX_GRID.gap) }}
          >
            ${shownCopies().map(
              (entry) =>
                html`<${FaceCell}
                  key=${entry.pokemonUUID}
                  id=${MON_CELL + entry.pokemonUUID}
                  area="box"
                  uid=${entry.pokemonUUID}
                  dex=${entry.speciesID}
                  shiny=${entry.isShiny}
                  size=${BOX_GRID.cell}
                  at=${at}
                  chosen=${entry.pokemonUUID === chosenUidNow}
                />`
            )}
          </div>
        </${ScrollBox}>
      </div>`;
    }

    /** The tab: the bar and cards on the left, the Pokemon panel on the right. openCount sends the lists back to the top. */
    function Pane({ openCount }) {
      const save = G.DB.save;
      if (!save) return null;
      const at = cursor.cursorOn(),
        copy = chosenCopy(),
        tms = shownTms(copy);
      return html`<div class="shop-tms-pane">
        <div class="shop-tms-bar" style=${{ left: px(CURSOR_ROOM), top: px(CURSOR_ROOM) }}>
          <${Bar} at=${at} />
        </div>
        <div
          class="shop-tms-list"
          style=${{ left: px(CURSOR_ROOM), top: px(CURSOR_ROOM + GRID.top), width: px(GRID.width), height: px(GRID.height) }}
        >
          <${ScrollBox}
            box=${{ left: 0, top: 0, width: GRID.width, height: GRID.height }}
            trackRight=${0}
            colours=${SCROLL_COLOURS}
            resetOn=${[openCount, tmQuery.value, typesChosen.value.join(), ableOnly.value, copy && copy.pokemonUUID]}
          >
            <div
              class="shop-sale-grid"
              style=${{
                gridTemplateColumns: `repeat(${GRID.columns}, ${px(CARD.width)})`,
                gap: px(CARD.gap),
                paddingBottom: px(CARD.gap),
              }}
            >
              ${tms.map((moveId) => html`<${TmCard} key=${moveId} moveId=${moveId} copy=${copy} coins=${save.coins} />`)}
            </div>
            ${tms.length ? null : html`<div class="hud-text shop-empty">No TM matches.</div>`}
          </${ScrollBox}>
        </div>
        <${PokemonPanel} at=${at} copy=${copy} />
      </div>`;
    }

    return { Pane, cursorItems, press, escape, reset };
  }

  return { ready: true, create };
})();
