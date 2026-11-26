/* ============ menu-upgrades.js: the Team menu's Upgrade popup (G.MenuUpgrades; #97 slice C) ============
 * One team copy's per-copy upgrades: six base stat cards on the left, Critical Hit, Cooldown, Regeneration and the two
 * starting move cards on the right, the portrait and a summary between them. A card shows its pips and a buy button
 * (positive with the price; refused when you cannot afford it; disabled "Needs Lv N" above the OOR band). A fully bought
 * card has no button and keeps its normal edge (Jess dropped the sketch's shine, 2026-11-26). Hovering a card's button
 * shows, in green, what buying it gives. With two or more caught team members, arrows beside the portrait (Q and E,
 * wrapping) and the keys 1 to 6 switch the popup to another member (Jess, 2026-11-26).
 * Sketch: assets/excalidraw/poke-upgrade.excalidraw (its names win over the design's Reflexes; Regeneration++ is Jess's,
 * 2026-11-26). The rules are G.Upgrades'; js/ui/menu-team.js owns the open copy and hands its state in as `menu`.
 * Not built: Sidegrades (#164, the button is disabled), the starting move picks (#150: the levels are bought and saved).
 */
G.MenuUpgrades = (() => {
  const overlay = G.HudOverlay,
    windowKit = G.MenuWindowKit;
  if (!overlay || !overlay.ready || !windowKit || !windowKit.ready || !G.MenuTeamSell) return { ready: false };
  const { html, RoundPortrait, portraitSource, portraitFallback } = overlay.kit;
  const { px, CursorButton } = windowKit;
  const { coinText } = G.MenuTeamSell;

  // ---------- sizes and places (panel pixels) ----------
  const PANEL = { width: 1240, height: 860, pad: 30 },
    CARD = { width: 400, height: 96, top: 110, gap: 14, pipSize: 12, pipGap: 5, pad: 12 },
    BUY = { width: 120, height: 32, fontSize: 12 },
    CENTRE = { left: 460, width: 320, portrait: 150 },
    SUMMARY = { top: 330, height: 330 },
    ARROW = { width: 56, height: 32, gap: 12, fontSize: 12 }, // the team switch arrows beside the portrait
    FOOT = { height: 40, sidegradesWidth: 180, closeWidth: 150, fontSize: 14 };
  const LEFT_IDS = ['baseHp', 'baseAtk', 'baseDef', 'baseSpa', 'baseSpd', 'baseSpe'];
  // the right column: [card key, upgrade id, the starting move level the card buys (starting moves only)]
  const RIGHT_CARDS = [
    ['crit', 'crit'],
    ['reflexes', 'reflexes'],
    ['regeneration', 'regeneration'],
    ['startingMoves:1', 'startingMoves', 1],
    ['startingMoves:2', 'startingMoves', 2],
  ];
  const STAT_KEYS = ['hp', 'attack', 'defense', 'specialAttack', 'specialDefense', 'speed'];
  const STAT_SHORT = ['HP', 'Atk', 'Def', 'Sp.A', 'Sp.Def', 'Spe'], // the summary's rows
    STAT_NAMES = ['HP', 'Atk', 'Def', 'Sp.Atk', 'Sp.Def', 'Speed']; // the cards' text
  const EDGES = {
    crit: G.Tokens.color('color.type.psychic.base'),
    reflexes: G.Tokens.color('color.blue.base'),
    regeneration: G.Tokens.color('color.type.poison.base'),
  };
  const CARD_TEXT = {
    'startingMoves:1': ['Starting Move Choice', 'Allows changing the starting move'],
    'startingMoves:2': ['Second Starting Move', 'Allows a second starting move to be selected'],
    crit: [null, 'Increases Critical Hit chance by 2% per level'],
    reflexes: [null, 'Reduces move cooldowns by 2% per level'],
    regeneration: [null, 'Heals 0.1% max HP a second per level, benched too'],
  };
  LEFT_IDS.forEach((id, index) => {
    CARD_TEXT[id] = [null, `Increases ${STAT_NAMES[index]} Base Stat by 1.5% per level`];
  });
  const REFUSALS = {
    poor: 'Not enough PokeCoins',
    band: 'Level this Pokemon up to open more',
    max: 'Already fully upgraded',
    none: 'Only a caught Pokemon can be upgraded',
    upgrade: 'That cannot be bought',
    first: 'Buy Starting Move Choice first',
  };

  const BUY_ID = 'upgrade-buy-',
    CLOSE_ID = 'upgrade-close',
    PREVIOUS_ID = 'upgrade-previous',
    NEXT_ID = 'upgrade-next';
  const cardKeyOf = (cursorId) => (cursorId && cursorId.startsWith(BUY_ID) ? cursorId.slice(BUY_ID.length) : null);
  const upgradeIdOf = (cardKey) => cardKey.split(':')[0];

  // ---------- what a card offers ----------
  const oorLevelOf = (copy) => G.Candy.levelFor(copy.speciesID, copy.candyXp);
  /** The OOR level that opens the next level of upgrade `id` after `level`, or null when no band does. */
  function bandLevelFor(id, level) {
    const opening = G.Upgrades.BAND_LEVELS.find((bandLevel) => G.Upgrades.capOf(id, bandLevel) > level);
    return opening == null ? null : opening;
  }
  /**
   * A card's state for `copy`: its pips ('on', 'open' or 'locked'), its button ({ label, disabled, refusal } or null
   * when fully bought) and whether a buy would raise it now (the hover preview).
   */
  function offerOf(copy, cardKey) {
    const id = upgradeIdOf(cardKey),
      upgrade = G.Upgrades.BY[id],
      level = copy.upgrades[id] || 0,
      startingLevel = +cardKey.split(':')[1] || 0;
    if (startingLevel) return startingMoveOffer(copy, id, level, startingLevel);
    const cap = G.Upgrades.capOf(id, oorLevelOf(copy));
    const pips = Array.from({ length: upgrade.levels }, (_, index) =>
      index < level ? 'on' : index < cap ? 'open' : 'locked'
    );
    if (level >= upgrade.levels) return { pips, button: null, buyable: false };
    if (level >= cap)
      return { pips, button: { label: 'Needs Lv ' + bandLevelFor(id, level), disabled: true }, buyable: false };
    return { pips, button: priceButton(id, level, copy), buyable: true };
  }
  function startingMoveOffer(copy, id, level, startingLevel) {
    const pips = [level >= startingLevel ? 'on' : 'open'];
    if (level >= startingLevel) return { pips, button: null, buyable: false };
    if (level < startingLevel - 1) return { pips, button: { label: 'Locked', disabled: true }, buyable: false };
    return { pips, button: priceButton(id, level, copy), buyable: true };
  }
  function priceButton(id, level, copy) {
    const price = G.Upgrades.priceOf(id, level, copy.speciesID);
    return { label: coinText(price), refusal: (G.DB.save.coins || 0) >= price ? null : REFUSALS.poor };
  }

  const CARD_ORDER = [...LEFT_IDS, ...RIGHT_CARDS.map(([key]) => key)];
  /** The cursor stops for `copy`: every card button that is not disabled, the two arrows when `canSwitch` (two or more
   *  caught team members), then Close. */
  function items(copy, canSwitch) {
    const arrows = canSwitch ? [PREVIOUS_ID, NEXT_ID] : [];
    if (!copy) return [...arrows, CLOSE_ID];
    const live = CARD_ORDER.filter((key) => {
      const { button } = offerOf(copy, key);
      return button && !button.disabled;
    });
    return [...live.map((key) => BUY_ID + key), ...arrows, CLOSE_ID];
  }
  /** Where the cursor goes after card `cardKey` was bought for `copy`: null while the card still has a live button,
   *  else the next live card in card order (wrapping), else Close. Keeps the keys' cursor inside the popup. */
  function stopAfterBuy(copy, cardKey) {
    const stops = items(copy, false),
      start = CARD_ORDER.indexOf(cardKey);
    if (stops.includes(BUY_ID + cardKey)) return null;
    for (let step = 1; step < CARD_ORDER.length; step++) {
      const stop = BUY_ID + CARD_ORDER[(start + step) % CARD_ORDER.length];
      if (stops.includes(stop)) return stop;
    }
    return CLOSE_ID;
  }

  /** Buys the card's next level for copy `uid` (Enter, Space or a click). Saves on a buy; a refusal is told. */
  function buy(uid, cardKey) {
    const copy = G.Copies.get(G.DB.save, uid),
      id = upgradeIdOf(cardKey),
      startingLevel = +cardKey.split(':')[1] || 0;
    if (copy && startingLevel && (copy.upgrades[id] || 0) < startingLevel - 1) return refuse('first');
    const result = G.Upgrades.buy(G.DB.save, uid, id);
    if (!result.ok) return refuse(result.error);
    G.Audio.sfx('confirm');
    G.DB.commit(true);
    return true;
  }
  function refuse(why) {
    G.Audio.sfx('error');
    G.UI.toast(REFUSALS[why] || REFUSALS.upgrade);
    return false;
  }

  // ---------- the summary's numbers ----------
  const trimmed = (value, places) => String(+value.toFixed(places));
  const percent = (fraction, places = 1) => trimmed(fraction * 100, places) + '%';
  const signed = (fraction, places = 1) => (fraction < 0 ? '-' : '+') + percent(Math.abs(fraction), places);
  /** The summary rows for upgrade levels `levels`: [label, base, change, new] each, the six stats then the three. */
  function summaryRows(species, levels) {
    const sum = G.Upgrades.summary(levels);
    const stats = species.stats.map((base, index) => [
      STAT_SHORT[index],
      String(base),
      signed(sum.baseStatMul[index] - 1),
      trimmed(base * sum.baseStatMul[index], 1),
    ]);
    return [
      ...stats,
      ['Crit', '0%', signed(sum.critChance), percent(sum.critChance)],
      ['CD', '100%', signed(sum.cooldownMul - 1), percent(sum.cooldownMul)],
      ['Regen', '0%/s', signed(sum.regenPerSecond, 2), percent(sum.regenPerSecond, 2) + '/s'],
    ];
  }
  /** The summary row a card's upgrade changes: 0 to 5 for the base stats, 6 to 8 for the three; none for moves. */
  function rowOf(id) {
    const stat = LEFT_IDS.indexOf(id);
    if (stat >= 0) return stat;
    const other = ['crit', 'reflexes', 'regeneration'].indexOf(id);
    return other >= 0 ? 6 + other : -1;
  }

  // ---------- drawing ----------
  function Pips({ pips, edge }) {
    return html`<div class="upg-pips" style=${{ left: px(CARD.pad), bottom: px(CARD.pad), gap: px(CARD.pipGap) }}>
      ${pips.map(
        (pip, index) =>
          html`<i
            key=${index}
            class=${'upg-pip is-' + pip}
            style=${{ width: px(CARD.pipSize), height: px(CARD.pipSize), '--upg-edge': edge }}
          ></i>`
      )}
    </div>`;
  }

  function Card({ menu, copy, cardKey, edge, left, top }) {
    const id = upgradeIdOf(cardKey),
      [title, description] = CARD_TEXT[cardKey],
      offer = offerOf(copy, cardKey),
      button = offer.button,
      name = title || G.Upgrades.BY[id].name;
    return html`<div
      class=${'upg-card' + (button ? '' : ' is-maxed')}
      data-upgrade=${cardKey}
      style=${{ left: px(left), top: px(top), width: px(CARD.width), height: px(CARD.height), '--upg-edge': edge }}
    >
      <div class="upg-card-title" style=${{ left: px(CARD.pad), top: px(CARD.pad - 2) }}>${name}</div>
      <div
        class="upg-card-text"
        style=${{ left: px(CARD.pad), top: px(CARD.pad + 22), width: px(CARD.width - 2 * CARD.pad) }}
      >
        ${description}
      </div>
      <${Pips} pips=${offer.pips} edge=${edge} />
      ${
        button
          ? html`<${CursorButton}
              cursor=${menu.cursor}
              id=${BUY_ID + cardKey}
              label=${button.label}
              look="glitch"
              intent="positive"
              disabled=${!!button.disabled}
              refusal=${button.refusal || null}
              width=${BUY.width}
              height=${BUY.height}
              fontSize=${BUY.fontSize}
              onPress=${() => menu.buyUpgrade(cardKey)}
              style=${{ right: px(CARD.pad), bottom: px(CARD.pad - 4) }}
            />`
          : null
      }
    </div>`;
  }

  function Summary({ copy, species, preview }) {
    const now = summaryRows(species, copy.upgrades),
      after = preview ? summaryRows(species, { ...copy.upgrades, [preview]: (copy.upgrades[preview] || 0) + 1 }) : null,
      changed = preview ? rowOf(preview) : -1;
    const row = (cells, index) =>
      html`<div key=${index} class=${'upg-row' + (index === changed ? ' is-preview' : '')} data-row=${cells[0]}>
        <span class="upg-row-name">${cells[0]}</span>
        <span class="upg-row-base">${cells[1]}</span>
        <span class="upg-row-change">${(index === changed ? after[index] : cells)[2]}</span>
        <span class="upg-row-arrow">→</span>
        <span class="upg-row-new">${(index === changed ? after[index] : cells)[3]}</span>
      </div>`;
    return html`<div
      class="panel-clean upg-summary"
      style=${{ left: px(CENTRE.left), top: px(SUMMARY.top), width: px(CENTRE.width), height: px(SUMMARY.height) }}
    >
      ${now.slice(0, 6).map(row)}
      <div class="upg-divider"></div>
      ${now.slice(6).map((cells, index) => row(cells, index + 6))}
    </div>`;
  }

  /** The arrows either side of the portrait: the previous (Q) and next (E) caught team member, wrapping. */
  function SwitchArrows({ menu }) {
    const portraitLeft = CENTRE.left + (CENTRE.width - CENTRE.portrait) / 2,
      top = CARD.top + (CENTRE.portrait - ARROW.height) / 2;
    // E's button is mirrored so both point outward from the portrait (Jess 2026-11-26); the label reads normally
    const arrow = (id, label, step, left) =>
      html`<${CursorButton}
        cursor=${menu.cursor}
        id=${id}
        label=${label}
        look="glitch"
        mirrored=${step > 0}
        width=${ARROW.width}
        height=${ARROW.height}
        fontSize=${ARROW.fontSize}
        onPress=${() => menu.stepUpgrade(step)}
        style=${{ left: px(left), top: px(top) }}
      />`;
    return html`${arrow(PREVIOUS_ID, '‹ Q', -1, portraitLeft - ARROW.gap - ARROW.width)}
    ${arrow(NEXT_ID, 'E ›', 1, portraitLeft + CENTRE.portrait + ARROW.gap)}`;
  }

  /** The stronger attacking side of a species, for the starting move cards' edge. */
  const strongerSide = (species) => (species.stats[3] > species.stats[1] ? 'special' : 'physical');

  function Popup({ menu }) {
    const uid = menu.upgradeUid();
    if (!uid) return null;
    const copy = G.Copies.get(G.DB.save, uid);
    if (!copy) return null;
    const species = G.DEX_BY[copy.speciesID],
      stage = menu.layout(),
      left = (stage.width - PANEL.width) / 2,
      top = (stage.height - PANEL.height) / 2,
      rightLeft = PANEL.width - PANEL.pad - CARD.width,
      columnHeight = LEFT_IDS.length * CARD.height + (LEFT_IDS.length - 1) * CARD.gap,
      rightGap = (columnHeight - RIGHT_CARDS.length * CARD.height) / (RIGHT_CARDS.length - 1);
    const hoveredKey = cardKeyOf(menu.cursor.cursorOn()),
      preview = hoveredKey && offerOf(copy, hoveredKey).buyable ? upgradeIdOf(hoveredKey) : null;
    const edgeOf = (key) =>
      LEFT_IDS.includes(key)
        ? G.Tokens.color('color.stat.' + STAT_KEYS[LEFT_IDS.indexOf(key)] + '.base')
        : EDGES[key] || G.Tokens.color('color.attack.' + strongerSide(species) + '.base');
    return html`<div class="tm-dim" onClick=${menu.closeUpgrades}></div>
      <div
        class="panel-clean upg-popup"
        style=${{ left: px(left), top: px(top), width: px(PANEL.width), height: px(PANEL.height) }}
      >
        <div class="upg-title" style=${{ left: px(PANEL.pad), top: px(22) }}>Upgrades</div>
        <div class="upg-subtitle" style=${{ left: px(PANEL.pad), top: px(64) }}>Make each run a little easier.</div>
        <div class="upg-coins" style=${{ right: px(PANEL.pad), top: px(28) }}>
          <span class="coin"></span> ${coinText(G.DB.save.coins || 0)}
        </div>
        ${LEFT_IDS.map(
          (key, index) =>
            html`<${Card}
              key=${key}
              menu=${menu}
              copy=${copy}
              cardKey=${key}
              edge=${edgeOf(key)}
              left=${PANEL.pad}
              top=${CARD.top + index * (CARD.height + CARD.gap)}
            />`
        )}
        ${RIGHT_CARDS.map(
          ([key], index) =>
            html`<${Card}
              key=${key}
              menu=${menu}
              copy=${copy}
              cardKey=${key}
              edge=${edgeOf(key)}
              left=${rightLeft}
              top=${CARD.top + index * (CARD.height + rightGap)}
            />`
        )}
        <div
          class="upg-portrait"
          style=${{ left: px(CENTRE.left + (CENTRE.width - CENTRE.portrait) / 2), top: px(CARD.top) }}
        >
          <${RoundPortrait}
            size=${CENTRE.portrait}
            stroke=${4}
            src=${portraitSource(copy.speciesID, copy.isShiny)}
            dex=${copy.speciesID}
            onError=${portraitFallback}
          />
        </div>
        ${menu.canSwitchUpgrade() ? html`<${SwitchArrows} menu=${menu} />` : null}
        <div
          class="upg-name"
          translate="no"
          style=${{ left: px(CENTRE.left), top: px(CARD.top + CENTRE.portrait + 16), width: px(CENTRE.width) }}
        >
          ${copy.nickname || species.name}
        </div>
        <${Summary} copy=${copy} species=${species} preview=${preview} />
        <${CursorButton}
          cursor=${menu.cursor}
          id="upgrade-sidegrades"
          label="Sidegrades"
          look="glitch"
          disabled=${true}
          width=${FOOT.sidegradesWidth}
          height=${FOOT.height}
          fontSize=${FOOT.fontSize}
          onPress=${() => {}}
          style=${{ left: px(PANEL.pad), bottom: px(PANEL.pad) }}
        />
        <${CursorButton}
          cursor=${menu.cursor}
          id=${CLOSE_ID}
          label="Close"
          look="glitch"
          width=${FOOT.closeWidth}
          height=${FOOT.height}
          fontSize=${FOOT.fontSize}
          onPress=${menu.closeUpgrades}
          style=${{ right: px(PANEL.pad), bottom: px(PANEL.pad) }}
        />
      </div>`;
  }

  return { ready: true, Popup, items, buy, cardKeyOf, stopAfterBuy, CLOSE_ID, PREVIOUS_ID, NEXT_ID, REFUSALS };
})();
