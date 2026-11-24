/* ============ menu-team-slots.js: the Team menu's team column (G.MenuTeamSlots; #167) ============
 * The Team N header (drawn only: several teams are a later feature) and the six slots, each the run screen's pixel panel:
 * portrait, name, type chips, Upgrade, Level Up (disabled until #139 Part F), favorite and lock. js/ui/menu-team.js owns
 * the state and hands it in as `menu`.
 */
G.MenuTeamSlots = (() => {
  const overlay = G.HudOverlay,
    windowKit = G.MenuWindowKit,
    lib = G.Lib;
  if (!overlay || !overlay.ready || !windowKit.ready || !lib.Chip || !lib.Chip.ready) return { ready: false };
  const { html, IconCanvas, RoundPortrait, portraitSource, portraitFallback, typeColours, FAINTED_RIM } = overlay.kit;
  const { px, CursorButton } = windowKit;

  // ---------- sizes and places (stage pixels) ----------
  const COLUMN = { left: 29, top: 106, width: 357, height: 837 },
    HEADER = { left: 18, top: 24, width: 321, height: 60 },
    SLOT = { left: 16, top: 106, width: 324, height: 100, pitch: 119 },
    FACE = { left: 16, top: 18, size: 64, stroke: 2 },
    BUTTON = { top: 12, width: 84, height: 24, gap: 6, right: 16, fontSize: 9 },
    MARK = { size: 20, gap: 8, right: 18, bottom: 14 };

  /** A Pokemon's name (its nickname, else the species) and its gender. */
  function NameText({ copy, species }) {
    const symbol = { male: '♂', female: '♀' }[copy && copy.gender];
    return html`${
      copy && copy.nickname ? html`<span translate="no">${copy.nickname}</span>` : html`<span>${species.name}</span>`
    }${symbol ? html`<span class=${'tm-gender is-' + copy.gender}>${symbol}</span>` : null}`;
  }

  /** A favorite or lock toggle: dim when off. */
  function MarkToggle({ menu, id, uid, which, on, style, size = MARK.size, area }) {
    return html`<div
      class=${'tm-mark' + (on ? ' is-on' : '')}
      style=${{ ...style, width: px(size), height: px(size) }}
      data-cursor-id=${id}
      data-cursor-area=${area}
      data-mark=${which}
      onMouseEnter=${() => menu.cursor.hover(id)}
      onMouseLeave=${() => menu.cursor.hover(null)}
      onClick=${(event) => {
        event.stopPropagation();
        menu.toggleMark(uid, which);
      }}
      onDblClick=${(event) => event.stopPropagation()}
    >
      <${IconCanvas} icon=${which === 'lock' ? 'lock' : 'heart'} size=${size} />
      <${menu.Bar} id=${id} height=${size} />
    </div>`;
  }

  function SlotContents({ menu, slot, member }) {
    const species = G.DEX_BY[member.dex],
      copy = member.uid ? G.Copies.get(G.DB.save, member.uid) : null,
      levelUpLeft = SLOT.width - BUTTON.right - BUTTON.width,
      lockRight = MARK.right,
      favoriteRight = MARK.right + MARK.size + MARK.gap;
    const smallButton = (id, label, left, disabled, onPress) =>
      html`<${CursorButton}
        cursor=${menu.cursor}
        id=${id}
        label=${label}
        look="glitch"
        width=${BUTTON.width}
        height=${BUTTON.height}
        fontSize=${BUTTON.fontSize}
        disabled=${disabled}
        onPress=${onPress}
        style=${{ left: px(left), top: px(BUTTON.top) }}
      />`;
    return html`<${RoundPortrait}
        className="tm-slot-face"
        style=${{ left: px(FACE.left), top: px(FACE.top) }}
        size=${FACE.size}
        stroke=${FACE.stroke}
        src=${portraitSource(member.dex, member.shiny)}
        dex=${member.dex}
        onError=${portraitFallback}
        state=${menu.isSelected(member.uid, member.dex) ? 'selected' : null}
      />
      <div class="tm-silver tm-slot-name"><${NameText} copy=${copy} species=${species} /></div>
      <div class="tm-slot-types">
        ${species.types.map((type) => html`<${lib.Chip.TypeChip} key=${type} type=${type} />`)}
      </div>
      <div class="tm-slot-buttons" onClick=${(event) => event.stopPropagation()}>
        ${smallButton('upgrade-' + slot, 'Upgrade', levelUpLeft - BUTTON.gap - BUTTON.width, false, () =>
          menu.openUpgrades(member.dex)
        )}
        ${smallButton('levelup-' + slot, 'Level Up', levelUpLeft, true)}
      </div>
      ${
        copy
          ? html`<${MarkToggle}
                menu=${menu}
                id=${'favorite-' + slot}
                uid=${copy.pokemonUUID}
                which="favorite"
                on=${copy.isFavorite}
                style=${{ right: px(favoriteRight), bottom: px(MARK.bottom) }}
              />
              <${MarkToggle}
                menu=${menu}
                id=${'lock-' + slot}
                uid=${copy.pokemonUUID}
                which="lock"
                on=${copy.isLocked}
                style=${{ right: px(lockRight), bottom: px(MARK.bottom) }}
              />`
          : null
      }`;
  }

  function Slot({ menu, slot }) {
    const id = 'slot-' + slot,
      member = menu.draft().team[slot],
      species = member && G.DEX_BY[member.dex],
      rims = species ? species.types.map(typeColours) : [FAINTED_RIM];
    return html`<div
      class=${'tm-slot' + (menu.slot() === slot ? ' is-target' : '')}
      style=${{ left: px(SLOT.left), top: px(SLOT.top + slot * SLOT.pitch), width: px(SLOT.width), height: px(SLOT.height) }}
      data-cursor-id=${id}
      data-cursor-area="slots"
      data-slot=${slot}
      draggable=${!!(member && member.uid)}
      onMouseEnter=${() => menu.cursor.hover(id)}
      onMouseLeave=${() => menu.cursor.hover(null)}
      onClick=${() => menu.clickSlot(slot)}
      onContextMenu=${(event) => {
        event.preventDefault();
        menu.freeSlot(slot);
      }}
      onDragStart=${(event) => menu.startDrag(event, { uid: member.uid, fromSlot: slot })}
      onDragEnd=${menu.endDrag}
      ...${menu.dropHandlers({ kind: 'slot', slot })}
    >
      <${lib.Panel.PixelPanel}
        left=${0}
        top=${0}
        width=${SLOT.width}
        height=${SLOT.height}
        rim=${rims[0]}
        rimRight=${rims[1]}
      >
        ${
          species
            ? html`<${SlotContents} menu=${menu} slot=${slot} member=${member} />`
            : html`<div class="tm-silver tm-slot-empty">Empty</div>`
        }
      </${lib.Panel.PixelPanel}>
      <${menu.Bar} id=${id} height=${SLOT.height} />
    </div>`;
  }

  function Column({ menu }) {
    return html`<div
      class="panel-clean tm-column"
      style=${{ left: px(COLUMN.left), top: px(COLUMN.top), width: px(COLUMN.width), height: px(COLUMN.height) }}
    >
      <div
        class="panel-clean tm-team-name"
        style=${{ left: px(HEADER.left), top: px(HEADER.top), width: px(HEADER.width), height: px(HEADER.height) }}
      >
        <span>‹</span><span>Team 1</span><span>›</span>
      </div>
      ${menu.draft().team.map((member, slot) => html`<${Slot} key=${slot} menu=${menu} slot=${slot} />`)}
    </div>`;
  }

  return { ready: true, Column, MarkToggle, NameText };
})();
