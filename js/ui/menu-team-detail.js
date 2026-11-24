/* ============ menu-team-detail.js: the Team menu's detail panel and its Moves popup (G.MenuTeamDetail; #167) ============
 * The pause menu's two-tier panel for one Pokemon: name (a pencil renames), favorite and lock, level, types, the six stat
 * rows or the stat hex, nature, ability, size, starting move, Moves. Space is kept for Evolve beside Moves. Level Up is
 * disabled until #139 Part F. js/ui/menu-team.js owns the state and hands it in as `menu`.
 */
G.MenuTeamDetail = (() => {
  const overlay = G.HudOverlay,
    windowKit = G.MenuWindowKit,
    lib = G.Lib,
    slots = G.MenuTeamSlots;
  if (!overlay || !overlay.ready || !windowKit.ready || !lib.StatRow || !lib.StatRow.ready || !slots.ready)
    return { ready: false };
  const { html, hooks, IconCanvas, ScrollBox, typeColours } = overlay.kit;
  const { px, CursorButton } = windowKit;
  const { MarkToggle, NameText } = slots;

  // ---------- sizes and places (panel pixels) ----------
  const PANEL = { left: 1351, top: 72, width: 549, height: 933 },
    BARS = {
      name: 64,
      level: 104,
      boxLeft: 446,
      stepLeft: 414,
      bottom: 893,
      tabTop: 861,
      tabRight: 170,
      stepRight: 196,
    },
    LEVEL_UP = { left: 104, top: 72, width: 104, height: 26, fontSize: 11 },
    STATS = { top: 118, height: 334 },
    HEX = { width: 515, height: 276, radius: 0.33 },
    MOVES_BUTTON = { left: 16, top: 800, width: 174, height: 44, fontSize: 15 },
    MOVES = { left: 640, top: 190, width: 640, height: 700, rowsTop: 70, pad: 16, close: { width: 150, height: 44 } };
  // the game's stat order (HP, Atk, Def, SpA, SpD, Spe) as the stat tokens' keys
  const STAT_KEYS = ['hp', 'attack', 'defense', 'specialAttack', 'specialDefense', 'speed'];
  const STAT_LABELS = ['HP', 'Attack', 'Defense', 'Sp. Atk', 'Sp. Def', 'Speed'];
  const AREA = 'detail'; // the cursor area: Up and Down stay in the panel
  const IV_MOST = 31,
    EV_MOST = 252;

  const pointList = (points) => points.map(([x, y]) => x + ',' + y).join(' ');
  const TOP_BAR = pointList([
    [0, 0],
    [PANEL.width, 0],
    [PANEL.width, BARS.level],
    [BARS.boxLeft, BARS.level],
    [BARS.stepLeft, BARS.name],
    [0, BARS.name],
  ]);
  const BOTTOM_BAR = pointList([
    [0, BARS.tabTop],
    [BARS.tabRight, BARS.tabTop],
    [BARS.stepRight, BARS.bottom],
    [PANEL.width, BARS.bottom],
    [PANEL.width, PANEL.height],
    [0, PANEL.height],
  ]);

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
  function Stats({ menu, species, copy, at }) {
    const { pressMs, releaseMs } = lib.Button.GLITCH_TIMING;
    const [view, setView] = hooks.useState({ hex: menu.showHex(), phase: '' });
    hooks.useEffect(() => {
      if (view.hex === menu.showHex()) return undefined;
      setView({ ...view, phase: 'off' });
      const timers = [
        setTimeout(() => setView({ hex: menu.showHex(), phase: 'on' }), pressMs),
        setTimeout(() => setView({ hex: menu.showHex(), phase: '' }), pressMs + releaseMs),
      ];
      return () => timers.forEach(clearTimeout);
    }, [menu.showHex()]);
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
        <span>${G.Copies.RARITY_NAME[species.rarity]}</span>
        <span>${'BST ' + species.bst}</span>
        <${lib.Toggle.PowerToggle}
          on=${menu.showHex()}
          label="Hex"
          cursor=${at === 'hex'}
          onPress=${menu.toggleHex}
          attrs=${{
            'data-cursor-id': 'hex',
            'data-cursor-area': AREA,
            onMouseEnter: () => menu.cursor.hover('hex'),
            onMouseLeave: () => menu.cursor.hover(null),
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

  function Known({ menu, species, copy, at }) {
    const info = infoOf(copy, species.dex);
    return html`<div class="tm-level">${copy ? 'Lv. ' + G.Candy.levelFor(species.dex, copy.candyXp) : ''}</div>
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
              disabled
              style=${{ left: px(LEVEL_UP.left), top: px(LEVEL_UP.top) }}
            />`
          : null
      }
      <${Stats} key=${'stats'} menu=${menu} species=${species} copy=${copy} at=${at} />
      <div class="tm-infos">
        <${InfoRow} label="Nature" value=${info.nature} />
        <${InfoRow} label="Ability" value=${info.ability} />
        <div class="tm-info-pair">
          <${InfoRow} label="Height" value=${info.height} />
          <${InfoRow} label="Weight" value=${info.weight} />
        </div>
        <${StartingMove} dex=${species.dex} />
      </div>
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
        style=${{ left: px(MOVES_BUTTON.left), top: px(MOVES_BUTTON.top) }}
      />`;
  }

  function Detail({ menu, at }) {
    const { dex, uid } = menu.selected();
    const place = { left: px(PANEL.left), top: px(PANEL.top), width: px(PANEL.width), height: px(PANEL.height) };
    if (dex == null)
      return html`<div class="panel-clean tm-detail" style=${place}>
        <div class="tm-empty">Slot ${menu.slot() + 1} is empty.</div>
      </div>`;
    const species = G.DEX_BY[dex],
      copy = uid ? G.Copies.get(G.DB.save, uid) : null,
      owned = !!copy || !!G.DB.save.owned[dex],
      rims = species.types.map(typeColours),
      top = owned ? rims[0].base : 'var(--color-grey-slate)',
      bottom = owned ? (rims[1] || rims[0]).base : 'var(--color-grey-slate)';
    const mark = (which, on, left) =>
      html`<${MarkToggle}
        menu=${menu}
        id=${'detail-' + which}
        uid=${uid}
        which=${which}
        on=${on}
        size=${28}
        area=${AREA}
        style=${{ left: px(left), top: px(38) }}
      />`;
    return html`<div class="panel-clean tm-detail" style=${place} data-dex=${dex} data-uid=${uid || ''}>
      <svg class="tm-detail-bars" width=${PANEL.width} height=${PANEL.height}>
        <polygon points=${TOP_BAR} fill=${top} />
        <polygon points=${BOTTOM_BAR} fill=${bottom} />
      </svg>
      <${Name} menu=${menu} copy=${copy} species=${species} owned=${owned} />
      ${copy ? [mark('favorite', copy.isFavorite, 464), mark('lock', copy.isLocked, 504)] : null}
      ${
        owned
          ? html`<div class="tm-detail-types">
                ${species.types.map((type) => html`<${lib.Chip.TypeChip} key=${type} type=${type} />`)}
              </div>
              <${Known} menu=${menu} species=${species} copy=${copy} at=${at} />`
          : html`<div class="tm-empty">You have not caught this Pokemon yet.</div>`
      }
    </div>`;
  }

  // ---------- the Moves popup: the learnset ----------
  const MOVE_ROW = 'move-';
  function MovesPopup({ menu, at }) {
    if (!menu.movesOpen()) return null;
    const species = G.DEX_BY[menu.selected().dex],
      start = G.startMoveOf(species.dex),
      width = MOVES.width - 2 * MOVES.pad,
      height = MOVES.height - MOVES.rowsTop - MOVES.close.height - 2 * MOVES.pad;
    return html`<div class="tm-dim" onClick=${menu.closeMoves}></div>
      <div
        class="panel-clean tm-moves"
        style=${{ left: px(MOVES.left), top: px(MOVES.top), width: px(MOVES.width), height: px(MOVES.height) }}
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

  return { ready: true, Detail, MovesPopup, movesItems };
})();
