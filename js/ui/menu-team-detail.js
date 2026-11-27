/* ============ menu-team-detail.js: the Team menu's detail panel and its Moves popup (G.MenuTeamDetail; #167) ============
 * The pause menu's two-tier panel for one Pokemon: name (a pencil renames), favorite and lock, level, types, the six stat
 * rows or the stat hex, nature, ability, size, starting move, Moves. Space is kept for Evolve beside Moves. Level Up, the
 * XP bar, candy dropped on the panel (#139 Part F). js/ui/menu-team.js owns the state and hands it in as `menu`.
 * ShortPanel (#173): the same panel without rename, Level Up, starting move and Moves, for the catch screen and the
 * keep-or-sell list. It takes the copy itself (a wild or held catch is not in the save), the screen's own Hex state and
 * cursor, and (an owned copy only) toggleMark, which adds the level, the EXP bar and the favorite and lock marks.
 *   cursor  { at: the id the keys' cursor is on, hover(id | null), area, Bar: ({ id, height }) => the cursor bar }
 *   hex     { on, toggle, id }
 */
G.MenuTeamDetail = (() => {
  const overlay = G.HudOverlay,
    windowKit = G.MenuWindowKit,
    lib = G.Lib,
    slots = G.MenuTeamSlots;
  if (
    !overlay ||
    !overlay.ready ||
    !windowKit.ready ||
    !lib.StatRow ||
    !lib.StatRow.ready ||
    !lib.Bar.ready ||
    !slots.ready
  )
    return { ready: false };
  const { html, hooks, IconCanvas, ScrollBox, typeColours } = overlay.kit;
  const { px, CursorButton } = windowKit;
  const { MarkToggle, NameText } = slots;

  // ---------- sizes and places (panel pixels; the panel's own come from the layout) ----------
  // the two bars are the same size: a band, and a deeper end down a 45 degree step (top right, bottom left)
  const BARS = { band: 48, deep: 68, step: 20, topEnd: 103, bottomEnd: 136, border: 4 },
    LEVEL_UP = { left: 104, top: 56, width: 104, height: 26, fontSize: 11 },
    STATS = { top: 102, height: 334 },
    HEX = { width: 515, height: 276, radius: 0.33 },
    MOVES_BUTTON = { left: 8, width: 120, height: 44, fontSize: 15 },
    MOVES = { width: 640, height: 700, rowsTop: 70, pad: 16, close: { width: 150, height: 44 } };
  // #173: the Team panel's width; its height ends below the size rows (infos top 446 + three 36 px rows and two 8 px gaps
  // + 12) plus the deep bar
  const SHORT_PANEL = { width: 549, height: 650 };
  // the game's stat order (HP, Atk, Def, SpA, SpD, Spe) as the stat tokens' keys
  const STAT_KEYS = ['hp', 'attack', 'defense', 'specialAttack', 'specialDefense', 'speed'];
  const STAT_LABELS = ['HP', 'Attack', 'Defense', 'Sp. Atk', 'Sp. Def', 'Speed'];
  const AREA = 'detail'; // the cursor area: Up and Down stay in the panel
  const IV_MOST = 31,
    EV_MOST = 252;

  const pointList = (points) => points.map(([x, y]) => x + ',' + y).join(' ');
  /** The side of each bar that meets the body, from one panel edge to the other. */
  const topContact = ({ width }) => [
    [width, BARS.deep],
    [width - BARS.topEnd, BARS.deep],
    [width - BARS.topEnd - BARS.step, BARS.band],
    [0, BARS.band],
  ];
  const bottomContact = ({ width, height }) => [
    [0, height - BARS.deep],
    [BARS.bottomEnd, height - BARS.deep],
    [BARS.bottomEnd + BARS.step, height - BARS.band],
    [width, height - BARS.band],
  ];
  /** One bar (the board's pause.pokemonDetail.background): its type's base, a border in its dark on the contact side. */
  function TypeBar({ id, contact, outerY, colours }) {
    const [start] = contact,
      end = contact[contact.length - 1],
      shape = pointList([...contact, [end[0], outerY], [start[0], outerY]]);
    return html`<clipPath id=${id}><polygon points=${shape} /></clipPath>
      <polygon points=${shape} fill=${colours.base} />
      <polyline
        points=${pointList(contact)}
        fill="none"
        stroke=${colours.dark}
        stroke-width=${BARS.border * 2}
        clip-path=${`url(#${id})`}
      />`;
  }
  const UNKNOWN = { base: 'var(--color-grey-slate)', dark: 'var(--color-grey-mid)' }; // a species not owned

  // ---------- the stats: rows or hex, the box itself still while its content plays the CRT ----------
  function StatRows({ species, copy }) {
    return STAT_KEYS.map((stat, index) => {
      const changed = copy && copy.natureUp !== copy.natureDown;
      const nature = changed && copy.natureUp === index ? 'up' : changed && copy.natureDown === index ? 'down' : null;
      return html`<${lib.StatRow.StatRow}
        key=${stat}
        stat=${stat}
        label=${STAT_LABELS[index]}
        nature=${nature}
        base=${species.stats[index]}
        iv=${copy ? { value: copy.iv[index], most: IV_MOST } : null}
        ev=${copy ? { value: copy.ev[index], most: EV_MOST } : null}
      />`;
    });
  }
  function StatHex({ species, copy }) {
    const host = hooks.useRef(null);
    hooks.useEffect(() => {
      const colour = G.U.TYPE_COLOR[species.types[0]];
      const options = { radius: HEX.radius, teamHex: true, iv: copy ? copy.iv : null };
      host.current.replaceChildren(G.StatChart.make(species.stats, colour, HEX.width, HEX.height, options));
    }, [species, copy && copy.pokemonUUID]);
    return html`<div ref=${host} class="tm-hex"></div>`;
  }
  function Stats({ species, copy, hex, cursor }) {
    const { pressMs, releaseMs } = lib.Button.GLITCH_TIMING;
    const [view, setView] = hooks.useState({ hex: hex.on, phase: '' });
    hooks.useEffect(() => {
      if (view.hex === hex.on) return undefined;
      setView({ ...view, phase: 'off' });
      const timers = [
        setTimeout(() => setView({ hex: hex.on, phase: 'on' }), pressMs),
        setTimeout(() => setView({ hex: hex.on, phase: '' }), pressMs + releaseMs),
      ];
      return () => timers.forEach(clearTimeout);
    }, [hex.on]);
    return html`<div class="panel-clean tm-stats" style=${{ top: px(STATS.top), height: px(STATS.height) }}>
      <div
        class=${'tm-stats-view' + (view.phase ? ' crt-' + view.phase : '')}
        style=${{ '--crt-off': pressMs + 'ms', '--crt-on': releaseMs + 'ms' }}
      >
        ${
          view.hex
            ? html`<${StatHex} species=${species} copy=${copy} />`
            : html`<${StatRows} species=${species} copy=${copy} />`
        }
      </div>
      <div class="tm-stats-foot">
        <span>${'No. ' + String(species.dex).padStart(3, '0')}</span>
        <span>${G.MenuUI.REGION_NAMES[species.gen - 1]}</span>
        <span>${G.T(G.Copies.RARITY_NAME[species.rarity])}</span>
        <span>${'BST ' + species.bst}</span>
        <${lib.Toggle.PowerToggle}
          on=${hex.on}
          label="Hex"
          cursor=${cursor.at === hex.id}
          onPress=${hex.toggle}
          attrs=${{
            'data-cursor-id': hex.id,
            'data-cursor-area': cursor.area,
            onMouseEnter: () => cursor.hover(hex.id),
            onMouseLeave: () => cursor.hover(null),
          }}
        />
      </div>
    </div>`;
  }

  // ---------- the name, and renaming ----------
  function RenameField({ menu, copy, species }) {
    const input = hooks.useRef(null),
      [text, setText] = hooks.useState(copy.nickname);
    hooks.useEffect(() => {
      input.current.focus();
      input.current.select();
    }, []);
    function onChange(typed, element) {
      const clean = G.Copies.cleanNickname(typed, true);
      if (clean !== typed) {
        const caret = Math.max(0, element.selectionStart - (typed.length - clean.length));
        element.value = clean;
        element.setSelectionRange(caret, caret);
      }
      setText(clean);
    }
    return html`<div class="tm-rename">
      <${lib.Field.TextField}
        inputRef=${input}
        value=${text}
        onChange=${onChange}
        onEnter=${() => menu.finishRename(input.current.value)}
        onEscape=${() => menu.finishRename(null)}
        onBlur=${() => menu.finishRename(null)}
        placeholder=${species.name}
        maxLength=${G.Copies.NICK_MAX}
        width=${360}
      />
    </div>`;
  }
  function Name({ menu, copy, species, owned }) {
    if (copy && menu.renaming()) return html`<${RenameField} menu=${menu} copy=${copy} species=${species} />`;
    return html`<div class="tm-silver tm-detail-name">
      ${owned ? html`<${NameText} copy=${copy} species=${species} />` : '???'}
      ${
        copy
          ? html`<span
              class="tm-mark is-on tm-pencil"
              data-cursor-id="rename"
              data-cursor-area=${AREA}
              title=${'Rename (up to ' + G.Copies.NICK_MAX + ' characters)'}
              onMouseEnter=${() => menu.cursor.hover('rename')}
              onMouseLeave=${() => menu.cursor.hover(null)}
              onClick=${menu.startRename}
            >
              <${IconCanvas} icon="pencil" size=${16} />
              <${menu.Bar} id="rename" height=${16} />
            </span>`
          : null
      }
    </div>`;
  }

  // ---------- the rows under the stats ----------
  const abilityText = (ability) => ability.name + (ability.hidden ? ' (Hidden)' : '');
  function infoOf(copy, dex) {
    if (copy)
      return {
        nature: copy.natureName,
        ability: abilityText({ name: copy.abilityName, hidden: copy.abilityHidden }),
        height: copy.heightM.toFixed(2) + ' m',
        weight: copy.weightKg.toFixed(1) + ' kg',
      };
    const species = G.Copies.species(dex);
    return {
      nature: '',
      ability: species.abilities.map(abilityText).join(' / '),
      height: species.heightM.toFixed(1) + ' m',
      weight: species.weightKg.toFixed(1) + ' kg',
    };
  }
  const InfoRow = ({ label, value }) =>
    html`<div class="panel-clean tm-info"><span>${label}</span><span>${value}</span></div>`;

  function StartingMove({ dex }) {
    const id = G.startMoveOf(dex),
      def = G.MoveInfo.def(id);
    return html`<div class="panel-clean tm-start-move">
      <div class="is-name">${G.MoveInfo.name(id)}</div>
      <div class="is-prose">${(def && def.flavor_text) || ''}</div>
      <div class="is-short">${G.MoveInfo.desc(id)}</div>
    </div>`;
  }

  /** What a species can learn: its starting move first. */
  const learnsetOf = (species) => {
    const start = G.startMoveOf(species.dex);
    return [start, ...G.Moves.poolFor(species).filter((id) => id !== start)];
  };

  /** The level and its EXP bar (an owned copy's out-of-run level, G.Candy). */
  function LevelLine({ species, copy, width }) {
    return html`<${lib.Bar.ExpBar}
        className="tm-exp"
        fraction=${G.Candy.levelProgress(species.dex, copy.candyXp)}
        style=${{ top: px(BARS.band), width: px(width - BARS.topEnd - BARS.step) }}
      />
      <div class="tm-level">${'Lv. ' + G.Candy.levelFor(species.dex, copy.candyXp)}</div>`;
  }

  /** The types, the stats and the rows under them; infoExtras go last in the rows (the Team menu's starting move). */
  function PanelContent({ species, copy, hex, cursor, infoExtras = null }) {
    const info = infoOf(copy, species.dex);
    return html`<div class="tm-detail-types">
        ${species.types.map((type) => html`<${lib.Chip.TypeChip} key=${type} type=${type} />`)}
      </div>
      <${Stats} key=${'stats'} species=${species} copy=${copy} hex=${hex} cursor=${cursor} />
      <div class="tm-infos">
        <${InfoRow} label="Nature" value=${info.nature} />
        <${InfoRow} label="Ability" value=${info.ability} />
        <div class="tm-info-pair">
          <${InfoRow} label="Height" value=${info.height} />
          <${InfoRow} label="Weight" value=${info.weight} />
        </div>
        ${infoExtras}
      </div>`;
  }

  /** The two type bars behind a panel; the ids must differ between panels on one page. */
  const PanelBars = ({ idPrefix, panel, top, bottom }) =>
    html`<svg class="tm-detail-bars" width=${panel.width} height=${panel.height}>
      <${TypeBar} id=${idPrefix + '-top'} contact=${topContact(panel)} outerY=${0} colours=${top} />
      <${TypeBar} id=${idPrefix + '-bottom'} contact=${bottomContact(panel)} outerY=${panel.height} colours=${bottom} />
    </svg>`;
  /** A species' two bar colours: its first type above, its second (or first) below. */
  function typeRims(species) {
    const rims = species.types.map(typeColours);
    return { top: rims[0], bottom: rims[1] || rims[0] };
  }

  function Known({ menu, species, copy, at }) {
    const cursor = { at, hover: menu.cursor.hover, area: AREA },
      hex = { on: menu.showHex(), toggle: menu.toggleHex, id: 'hex' };
    return html`${copy ? html`<${LevelLine} species=${species} copy=${copy} width=${menu.layout().detail.width} />` : null}
      ${
        copy
          ? html`<${CursorButton}
              cursor=${menu.cursor}
              id="levelup"
              label="Level Up"
              look="glitch"
              width=${LEVEL_UP.width}
              height=${LEVEL_UP.height}
              fontSize=${LEVEL_UP.fontSize}
              area=${AREA}
              refusal=${menu.bag.refusal(copy.pokemonUUID)}
              onPress=${() => menu.bag.levelUp(copy.pokemonUUID)}
              style=${{ left: px(LEVEL_UP.left), top: px(LEVEL_UP.top) }}
            />`
          : null
      }
      <${PanelContent}
        species=${species}
        copy=${copy}
        hex=${hex}
        cursor=${cursor}
        infoExtras=${html`<${StartingMove} dex=${species.dex} />`}
      />
      <${CursorButton}
        cursor=${menu.cursor}
        id="moves"
        label="Moves"
        look="glitch"
        width=${MOVES_BUTTON.width}
        height=${MOVES_BUTTON.height}
        fontSize=${MOVES_BUTTON.fontSize}
        onPress=${menu.openMoves}
        area=${AREA}
        style=${{ left: px(MOVES_BUTTON.left), bottom: px((BARS.deep - MOVES_BUTTON.height) / 2) }}
      />`;
  }

  // ---------- the short panel (#173): the catch screen and the keep-or-sell list ----------
  /**
   * One Pokemon's short panel at SHORT_PANEL's size. copy: a full copy (G.Copies.read), or null for the species alone
   * (an old save's held catch). toggleMark(which): given only for a copy in the save, which then shows its level, EXP
   * bar and marks. children: the screen's own pieces (Sell).
   */
  function ShortPanel({ species, copy, idPrefix, hex, cursor, toggleMark = null, children = null }) {
    const rims = typeRims(species),
      owned = !!(copy && toggleMark),
      marksMenu = owned && { cursor, toggleMark: (uid, which) => toggleMark(which), Bar: cursor.Bar };
    const mark = (which, on, left) =>
      html`<${MarkToggle}
        menu=${marksMenu}
        id=${idPrefix + '-' + which}
        uid=${copy.pokemonUUID}
        which=${which}
        on=${on}
        size=${28}
        area=${cursor.area}
        style=${{ left: px(left), top: px(20) }}
      />`;
    return html`<div
      class="panel-clean tm-detail tm-short"
      style=${{ width: px(SHORT_PANEL.width), height: px(SHORT_PANEL.height) }}
      data-dex=${species.dex}
      data-uid=${copy ? copy.pokemonUUID : ''}
    >
      <${PanelBars} idPrefix=${idPrefix} panel=${SHORT_PANEL} top=${rims.top} bottom=${rims.bottom} />
      <div class="tm-silver tm-detail-name"><${NameText} copy=${copy} species=${species} /></div>
      ${
        owned
          ? html`${mark('favorite', copy.isFavorite, 464)} ${mark('lock', copy.isLocked, 504)}
              <${LevelLine} species=${species} copy=${copy} width=${SHORT_PANEL.width} />`
          : null
      }
      <${PanelContent} species=${species} copy=${copy} hex=${hex} cursor=${cursor} />
      ${children}
    </div>`;
  }

  function Detail({ menu, at }) {
    const { dex, uid } = menu.selected();
    const panel = menu.layout().detail,
      place = { left: px(panel.left), top: px(panel.top), width: px(panel.width), height: px(panel.height) };
    if (dex == null)
      return html`<div class="panel-clean tm-detail" style=${place}>
        <div class="tm-empty">Slot ${menu.slot() + 1} is empty.</div>
      </div>`;
    const species = G.DEX_BY[dex],
      copy = uid ? G.Copies.get(G.DB.save, uid) : null,
      owned = !!copy || !!G.DB.save.owned[dex],
      rims = owned ? typeRims(species) : { top: UNKNOWN, bottom: UNKNOWN };
    const mark = (which, on, left) =>
      html`<${MarkToggle}
        menu=${menu}
        id=${'detail-' + which}
        uid=${uid}
        which=${which}
        on=${on}
        size=${28}
        area=${AREA}
        style=${{ left: px(left), top: px(20) }}
      />`;
    return html`<div
      class="panel-clean tm-detail"
      style=${place}
      data-dex=${dex}
      data-uid=${uid || ''}
      onClick=${menu.clickDetail}
    >
      <${PanelBars} idPrefix="tm-detail" panel=${panel} top=${rims.top} bottom=${rims.bottom} />
      <${Name} menu=${menu} copy=${copy} species=${species} owned=${owned} />
      ${copy ? [mark('favorite', copy.isFavorite, 464), mark('lock', copy.isLocked, 504)] : null}
      ${
        owned
          ? html`<${Known} menu=${menu} species=${species} copy=${copy} at=${at} />`
          : html`<div class="tm-empty">You have not caught this Pokemon yet.</div>`
      }
    </div>`;
  }

  // ---------- the Moves popup: the learnset ----------
  const MOVE_ROW = 'move-';
  function MovesPopup({ menu, at }) {
    if (!menu.movesOpen()) return null;
    const stage = menu.layout(),
      left = (stage.width - MOVES.width) / 2,
      top = (stage.height - MOVES.height) / 2,
      species = G.DEX_BY[menu.selected().dex],
      start = G.startMoveOf(species.dex),
      width = MOVES.width - 2 * MOVES.pad,
      height = MOVES.height - MOVES.rowsTop - MOVES.close.height - 2 * MOVES.pad;
    return html`<div class="tm-dim" onClick=${menu.closeMoves}></div>
      <div
        class="panel-clean tm-moves"
        style=${{ left: px(left), top: px(top), width: px(MOVES.width), height: px(MOVES.height) }}
      >
        <div class="tm-moves-title">${species.name} moves</div>
        <${ScrollBox}
          box=${{ left: MOVES.pad, top: MOVES.rowsTop, width: width - 16, height }}
          trackRight=${MOVES.pad}
          look="clean"
          resetOn=${[species.dex]}
        >
          ${learnsetOf(species).map(
            (id) =>
              html`<div
                key=${id}
                class=${'tm-move' + (at === MOVE_ROW + id ? ' is-cursor' : '')}
                data-move=${id}
                data-cursor-id=${MOVE_ROW + id}
                data-cursor-area="moves"
              >
                <${IconCanvas} icon=${'move:' + id} size=${32} />
                <div class="tm-move-text">
                  <div class=${'tm-move-name' + (id === start ? ' is-start' : '')}>${G.MoveInfo.name(id)}</div>
                  <div class="tm-move-desc">${G.MoveInfo.desc(id)}</div>
                </div>
                <${lib.Chip.TypeChip} type=${G.MoveInfo.type(id)} />
              </div>`
          )}
        </${ScrollBox}>
        <${CursorButton}
          cursor=${menu.cursor}
          id="moves-close"
          label="Close"
          look="glitch"
          width=${MOVES.close.width}
          height=${MOVES.close.height}
          fontSize=${15}
          onPress=${menu.closeMoves}
          style=${{ left: px(MOVES.width - MOVES.pad - MOVES.close.width), bottom: px(MOVES.pad) }}
        />
      </div>`;
  }
  /** The popup's cursor stops. */
  const movesItems = (species) => [...learnsetOf(species).map((id) => MOVE_ROW + id), 'moves-close'];

  return { ready: true, Detail, MovesPopup, movesItems, ShortPanel, SHORT_PANEL };
})();
