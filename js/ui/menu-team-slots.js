/* ============ menu-team-slots.js: the Team menu's team column (G.MenuTeamSlots; #167) ============
 * The Team N header (drawn only: several teams are a later feature) and the six slots, each the run screen's pixel panel:
 * portrait, name, type chips, Upgrade, Level Up, favorite and lock. js/ui/menu-team.js owns
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
  const COLUMN = { left: 29, width: 357 }, // its top and height come from the layout
    HEADER = { left: 18, top: 14, width: 321, height: 60 },
    SLOT = { left: 16, top: 88, width: 324, height: 100, pitch: 119, padBottom: 14 }, // a short window closes the pitch up
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

  /** Flips a copy's favorite or lock mark and saves at once (the Team menu, the catch screen, keep-or-sell; #173).
   *  False when the save has no such copy. */
  function toggleCopyMark(uid, which) {
    const save = G.DB.save,
      copy = uid && G.Copies.get(save, uid);
    if (!copy) return false;
    if (which === 'lock') G.Copies.setLocked(save, uid, !copy.isLocked);
    else G.Copies.setFavorite(save, uid, !copy.isFavorite);
    G.Audio.sfx('click');
    G.DB.commit(true);
    return true;
  }

  /** A favorite or lock toggle: dim when off. */
  function MarkToggle({ menu, id, uid, which, on, style, size = MARK.size, area, cursorRight }) {
    return html`<div
      class=${'tm-mark' + (on ? ' is-on' : '')}
      style=${{ ...style, width: px(size), height: px(size) }}
      data-cursor-id=${id}
      data-cursor-area=${area}
      data-cursor-right=${cursorRight}
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
    const smallButton = (id, label, left, refusal, onPress, cursorRight) =>
      html`<${CursorButton}
        cursor=${menu.cursor}
        id=${id}
        label=${label}
        look="glitch"
        width=${BUTTON.width}
        height=${BUTTON.height}
        fontSize=${BUTTON.fontSize}
        refusal=${refusal}
        onPress=${onPress}
        cursorRight=${cursorRight}
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
        ${smallButton('upgrade-' + slot, 'Upgrade', levelUpLeft - BUTTON.gap - BUTTON.width, null, () =>
          menu.openUpgrades(slot)
        )}
        ${smallButton(
          'levelup-' + slot,
          'Level Up',
          levelUpLeft,
          menu.bag.refusal(member.uid),
          () => menu.bag.levelUp(member.uid),
          'slot-' + slot // the right-most button of its row: Right goes to the slot (Jess 2026-11-26)
        )}
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
                cursorRight=${'slot-' + slot}
                style=${{ right: px(lockRight), bottom: px(MARK.bottom) }}
              />`
          : null
      }`;
  }

  function Slot({ menu, slot, pitch }) {
    const id = 'slot-' + slot,
      member = menu.draft().team[slot],
      species = member && G.DEX_BY[member.dex],
      rims = species ? species.types.map(typeColours) : [FAINTED_RIM];
    return html`<div
      class=${'tm-slot' + (!member && menu.slot() === slot ? ' is-empty-target' : '')}
      style=${{ left: px(SLOT.left), top: px(SLOT.top + slot * pitch), width: px(SLOT.width), height: px(SLOT.height) }}
      data-cursor-id=${id}
      data-cursor-area="slots"
      data-cursor-anchor="right"
      data-cursor-left=${member ? 'levelup-' + slot : undefined}
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
    const { column } = menu.layout(),
      { team } = menu.draft(),
      room = column.height - SLOT.top - SLOT.height - SLOT.padBottom,
      pitch = Math.min(SLOT.pitch, room / (team.length - 1));
    return html`<div
      class="panel-clean tm-column"
      style=${{ left: px(COLUMN.left), top: px(column.top), width: px(COLUMN.width), height: px(column.height) }}
    >
      <div
        class="panel-clean tm-team-name"
        style=${{ left: px(HEADER.left), top: px(HEADER.top), width: px(HEADER.width), height: px(HEADER.height) }}
      >
        <span>‹</span><span>Team 1</span><span>›</span>
      </div>
      ${team.map((member, slot) => html`<${Slot} key=${slot} menu=${menu} slot=${slot} pitch=${pitch} />`)}
    </div>`;
  }

  return { ready: true, Column, MarkToggle, NameText, toggleCopyMark };
})();
