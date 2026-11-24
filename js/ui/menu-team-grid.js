/* ============ menu-team-grid.js: the Team menu's portrait grid (G.MenuTeamGrid; #167) ============
 * The search, filter and sort row, the scrolling grid of portraits (a box's copies, or every species on the Pokedex tab),
 * and the tabs under it: Pokedex, the boxes you have, a price for each you do not. What is shown and in which order is
 * G.TeamList's; js/ui/menu-team.js owns the state and hands it in as `menu`.
 */
G.MenuTeamGrid = (() => {
  const overlay = G.HudOverlay,
    windowKit = G.MenuWindowKit,
    lib = G.Lib;
  if (!overlay || !overlay.ready || !windowKit.ready || !lib.Field || !lib.Field.ready) return { ready: false };
  const { html, hooks, preact, IconCanvas, RoundPortrait, portraitSource, portraitFallback, ScrollBox } = overlay.kit;
  const { showTooltip, hideTooltip } = overlay.kit;
  const { px, CursorButton, SHORT_PRICE_FROM } = windowKit;
  const { TextField, DropdownBox, DropdownRows } = lib.Field;

  // ---------- sizes and places (stage pixels) ----------
  const ROW = { top: 96 },
    SEARCH = { left: 404, width: 440 },
    FILTER = { left: 856, width: 220, listWidth: 280 },
    SORT = { left: 1088, width: 247, listWidth: 247 },
    LIST = { top: 144, height: 560, pad: 4 },
    BOX = { left: 404, top: 153, width: 931, height: 790 },
    GRID = { columns: 8, cell: 88, gapX: 22, gapY: 38, padLeft: 28, padTop: 18, stroke: 3, scrollRight: 8 },
    MARK_SIZE = 18,
    TABS = { left: 594, top: 954, width: 88, height: 44, gap: 6, fontSize: 10 };
  const AREA = 'grid'; // the cursor area: Up from the top row reaches the search, filter and sort boxes

  // ---------- the filter list ----------
  const titled = (text) => text.charAt(0).toUpperCase() + text.slice(1);
  /** The filter's accordions: { key in the filter, name, choices: [[value, label]] }. */
  function filterGroups(pokedexTab) {
    const groups = [
      { key: 'regions', name: 'Region', choices: G.MenuUI.REGION_NAMES.map((name, index) => [index + 1, name]) },
      { key: 'types', name: 'Type', choices: Object.keys(G.U.TYPE_COLOR).map((type) => [type, titled(type)]) },
      { key: 'rarity', name: 'Rarity', choices: [1, 2, 3, 4, 5].map((tier) => [tier, G.Copies.RARITY_NAME[tier]]) },
      { key: 'bst', name: 'BST', choices: G.Copies.BST_BANDS.map((band) => [band.k, band.label]) },
    ];
    if (pokedexTab)
      groups.unshift({
        key: 'own',
        name: 'Ownership',
        choices: [
          ['own', 'Owned'],
          ['miss', 'Unowned'],
        ],
      });
    return groups;
  }
  /** The filter list's rows; each carries the change its press makes. */
  function filterRows(menu) {
    const filter = menu.filter(),
      pokedexTab = menu.tab() === 'dex',
      rows = [];
    for (const group of filterGroups(pokedexTab)) {
      const chosen = [].concat(filter[group.key]),
        open = menu.isGroupOpen(group.key),
        count = group.choices.filter(([value]) => chosen.includes(value)).length;
      rows.push({
        id: 'filter:' + group.key,
        kind: 'header',
        label: count ? group.name + ' (' + count + ')' : group.name,
        open,
        press: () => menu.toggleGroup(group.key),
      });
      if (!open) continue;
      for (const [value, label] of group.choices)
        rows.push({
          id: 'filter:' + group.key + ':' + value,
          kind: 'choice',
          indent: true,
          label,
          on: chosen.includes(value),
          press: () => menu.toggleFilter(group.key, value),
        });
    }
    const flat = (id, label, on, press) => rows.push({ id: 'filter:' + id, kind: 'choice', label, on, press });
    if (!pokedexTab) {
      flat('favorite', 'Favorite', filter.favorite, () => menu.toggleFilter('favorite'));
      flat('locked', 'Locked', filter.locked, () => menu.toggleFilter('locked'));
    }
    flat('clear', 'Clear all', undefined, menu.clearFilter);
    return rows;
  }
  /** How many choices the filter has on (the search aside). */
  function filterCount(menu) {
    const filter = menu.filter();
    const lists = [filter.regions, filter.types, filter.rarity, filter.bst];
    const onTab = menu.tab() === 'dex' ? [filter.own !== 'all'] : [filter.favorite, filter.locked];
    return lists.reduce((total, list) => total + list.length, 0) + onTab.filter(Boolean).length;
  }

  // ---------- the sort list ----------
  function sortRows(menu) {
    const pokedexTab = menu.tab() === 'dex',
      used = menu.sortUsed(),
      rows = [],
      headers = new Set();
    for (const sort of G.TeamList.sortsFor(pokedexTab)) {
      if (sort.group && !headers.has(sort.group)) {
        headers.add(sort.group);
        rows.push({
          id: 'sort:' + sort.group,
          kind: 'header',
          label: sort.group,
          open: menu.isGroupOpen(sort.group),
          press: () => menu.toggleGroup(sort.group),
        });
      }
      if (sort.group && !menu.isGroupOpen(sort.group)) continue;
      const on = used.sort.key === sort.key;
      rows.push({
        id: 'sort:' + sort.key,
        kind: 'choice',
        indent: !!sort.group,
        label: sort.label,
        mark: on ? (used.direction > 0 ? 'Up' : 'Down') : '',
        press: () => menu.chooseSort(sort.key),
      });
    }
    return rows;
  }
  const ROWS_OF = { filter: filterRows, sort: sortRows };

  function OpenList({ menu, at }) {
    const which = menu.openList();
    if (!which) return null;
    const place = which === 'filter' ? FILTER : SORT,
      rows = ROWS_OF[which](menu),
      byId = new Map(rows.map((row) => [row.id, row]));
    const inner = { width: place.listWidth - 2 - 2 * LIST.pad, height: LIST.height - 2 - 2 * LIST.pad };
    return html`<div class="tm-catcher" onClick=${menu.closeList}></div>
      <div
        class="panel-clean tm-list"
        style=${{ left: px(place.left), top: px(LIST.top), width: px(place.listWidth), height: px(LIST.height) }}
      >
        <${ScrollBox}
          box=${{ left: LIST.pad, top: LIST.pad, width: inner.width - 12, height: inner.height }}
          trackRight=${LIST.pad}
          look="clean"
          resetOn=${[which]}
        >
          <${DropdownRows}
            rows=${rows}
            at=${at}
            press=${(id) => byId.get(id).press()}
            hover=${menu.cursor.hover}
            attrsFor=${(id) => ({ 'data-cursor-id': id, 'data-cursor-area': 'list' })}
          />
        </${ScrollBox}>
      </div>`;
  }

  // ---------- the search, filter and sort boxes ----------
  function Finder({ menu, at }) {
    const used = menu.sortUsed(),
      sortName = used.sort.group ? used.sort.group + ' ' + used.sort.label : used.sort.label;
    const box = (which, place, label, count) =>
      html`<div class="tm-stop" style=${{ left: px(place.left), top: px(ROW.top) }}>
        <${DropdownBox}
          label=${label}
          count=${count}
          width=${place.width}
          open=${menu.openList() === which}
          cursor=${at === which}
          onClick=${() => menu.toggleList(which)}
          attrs=${{
            'data-cursor-id': which,
            'data-cursor-area': menu.openList() === which ? 'list' : AREA,
            'data-cursor-search': '',
            onMouseEnter: () => menu.cursor.hover(which),
            onMouseLeave: () => menu.cursor.hover(null),
          }}
        />
      </div>`;
    return html`<div
        class="tm-stop"
        style=${{ left: px(SEARCH.left), top: px(ROW.top) }}
        data-cursor-id="search"
        data-cursor-area=${AREA}
        data-cursor-search
      >
        <${TextField}
          value=${menu.filter().query}
          onChange=${menu.search}
          placeholder="Search name, move or #"
          width=${SEARCH.width}
          cursor=${at === 'search'}
        />
      </div>
      ${box('filter', FILTER, 'Filter', filterCount(menu))} ${box('sort', SORT, 'Sort: ' + sortName)}`;
  }

  // ---------- the portraits ----------
  /** A species not owned: its shape. A portrait's background is solid, so it has no shape of its own to show. */
  function Silhouette({ dex }) {
    const host = hooks.useRef(null),
      inside = GRID.cell - 2 * GRID.stroke;
    hooks.useEffect(() => {
      host.current.replaceChildren(G.UI.spriteCanvas(dex, inside, inside, { scale: 2, silhouette: true }));
    }, [dex]);
    return html`<div ref=${host}></div>`;
  }
  /** One portrait. Redrawn only when one of its own props changed: a box holds up to 500. */
  class Cell extends preact.Component {
    shouldComponentUpdate(next) {
      return Object.keys(next).some((key) => next[key] !== this.props[key]);
    }
    render({ id, dex, shiny, state, cursor, slotNumber, favorite, locked }) {
      return html`<div
        class="tm-cell"
        data-cursor-id=${id}
        data-cursor-area=${AREA}
        draggable=${!id.startsWith('dex-')}
      >
        <${RoundPortrait}
          size=${GRID.cell}
          stroke=${GRID.stroke}
          rim="var(--color-grey-slate)"
          src=${state === 'silhouette' ? null : portraitSource(dex, shiny)}
          dex=${dex}
          onError=${portraitFallback}
          lazy
          state=${state}
          className=${cursor ? 'is-cursor' : ''}
        >
          ${state === 'silhouette' ? html`<${Silhouette} dex=${dex} />` : null}
        </${RoundPortrait}>
        ${slotNumber ? html`<span class="tm-cell-slot">${slotNumber}</span>` : null}
        ${shiny ? html`<${IconCanvas} icon="shiny" size=${MARK_SIZE} className="tm-cell-mark is-shiny" />` : null}
        ${favorite ? html`<${IconCanvas} icon="heart" size=${MARK_SIZE} className="tm-cell-mark is-favorite" />` : null}
        ${locked ? html`<${IconCanvas} icon="lock" size=${MARK_SIZE} className="tm-cell-mark is-locked" />` : null}
      </div>`;
    }
  }
  const idOf = ({ copy, species }) => (copy ? 'copy-' + copy.pokemonUUID : 'dex-' + species.dex);

  function cellState(menu, { copy, species }) {
    if (copy && menu.sell.isPicked(copy.pokemonUUID)) return 'sale';
    if (menu.isSelected(copy && copy.pokemonUUID, species.dex)) return 'selected';
    return copy || G.DB.save.owned[species.dex] ? null : 'silhouette';
  }

  /** A portrait's name and level, for its tooltip. */
  function tipOf(menu, id) {
    const entry = menu.entries().find((candidate) => idOf(candidate) === id);
    if (!entry) return null;
    const { copy, species } = entry;
    if (!copy) return { name: G.DB.save.owned[species.dex] ? species.name : '???', lines: [], variant: 'plain' };
    const level = 'Lv. ' + G.Candy.levelFor(copy.speciesID, copy.candyXp);
    return { name: copy.nickname || species.name, lines: [level], variant: 'plain' };
  }

  function Grid({ menu, at }) {
    const entries = menu.entries(),
      byKeys = menu.byKeys();
    const idUnder = (event) => {
      const cell = event.target.closest('[data-cursor-id]');
      return cell && cell.dataset.cursorId;
    };
    const cells = entries.map((entry) => {
      const { copy, species } = entry,
        id = idOf(entry),
        slot = copy ? G.TeamDraft.slotOfUid(menu.draft(), copy.pokemonUUID) : -1;
      return html`<${Cell}
        key=${id}
        id=${id}
        dex=${species.dex}
        shiny=${!!copy && copy.isShiny}
        state=${cellState(menu, entry)}
        cursor=${byKeys && at === id}
        slotNumber=${slot + 1}
        favorite=${!!copy && copy.isFavorite}
        locked=${!!copy && copy.isLocked}
      />`;
    });
    return html`<div
      class="panel-clean tm-box"
      style=${{ left: px(BOX.left), top: px(BOX.top), width: px(BOX.width), height: px(BOX.height) }}
      ...${menu.dropHandlers({ kind: 'grid' })}
    >
      <${ScrollBox}
        box=${{ left: 0, top: 0, width: BOX.width - 2 - 24, height: BOX.height - 2 }}
        trackRight=${GRID.scrollRight}
        look="clean"
        resetOn=${[menu.listKey()]}
      >
        <div
          class="tm-grid"
          style=${{
            gridTemplateColumns: `repeat(${GRID.columns}, ${px(GRID.cell)})`,
            columnGap: px(GRID.gapX),
            rowGap: px(GRID.gapY),
            padding: `${px(GRID.padTop)} 0 ${px(GRID.padTop)} ${px(GRID.padLeft)}`,
          }}
          onMouseOver=${(event) => {
            const id = idUnder(event);
            menu.cursor.hover(id || null);
            if (id) showTooltip(event.target.closest('[data-cursor-id]'), tipOf(menu, id));
            else hideTooltip();
          }}
          onMouseLeave=${() => {
            menu.cursor.hover(null);
            hideTooltip();
          }}
          onClick=${(event) => idUnder(event) && menu.clickCell(idUnder(event))}
          onDblClick=${(event) => idUnder(event) && menu.doubleClickCell(idUnder(event))}
          onDragStart=${(event) => menu.startDrag(event, { uid: idUnder(event).slice('copy-'.length), fromSlot: null })}
          onDragEnd=${menu.endDrag}
        >
          ${cells}
        </div>
        ${entries.length ? null : html`<div class="tm-empty">${menu.emptyText()}</div>`}
      </${ScrollBox}>
    </div>`;
  }

  // ---------- the tabs ----------
  /** The tabs: { id, label, kind: 'dex' | 'box' | 'buy', box (from 0) }. */
  function tabs() {
    const have = G.Copies.boxCount(G.DB.save),
      list = [{ id: 'tab-dex', label: 'Pokedex', kind: 'dex' }];
    for (let box = 0; box < G.Copies.BOX_MAX; box++)
      list.push(
        box < have
          ? { id: 'tab-' + box, label: 'Box ' + (box + 1), kind: 'box', box }
          : {
              id: 'tab-' + box,
              label: G.U.compact(G.Copies.boxPrice(box + 1), SHORT_PRICE_FROM),
              kind: 'buy',
              box,
            }
      );
    return list;
  }
  function Tabs({ menu }) {
    return tabs().map((tab, index) => {
      const shown = tab.kind === 'dex' ? menu.tab() === 'dex' : menu.tab() === tab.box;
      const drop = tab.kind === 'dex' ? {} : menu.dropHandlers({ kind: 'box', box: tab.box });
      return html`<div
        key=${tab.id}
        class=${'tm-tab is-' + tab.kind + (shown ? ' is-shown' : '')}
        data-tab=${tab.kind === 'dex' ? 'dex' : tab.box}
        style=${{ left: px(TABS.left + index * (TABS.width + TABS.gap)), top: px(TABS.top) }}
        ...${drop}
      >
        <${CursorButton}
          cursor=${menu.cursor}
          id=${tab.id}
          label=${tab.label}
          look="glitch"
          intent=${tab.kind === 'buy' ? 'positive' : 'neutral'}
          width=${TABS.width}
          height=${TABS.height}
          fontSize=${TABS.fontSize}
          refusal=${menu.held() ? null : menu.tabRefusal(tab)}
          onPress=${() => menu.pressTab(tab)}
        />
      </div>`;
    });
  }

  return { ready: true, Finder, OpenList, Grid, Tabs, tabs, idOf, ROWS_OF, tipOf };
})();
