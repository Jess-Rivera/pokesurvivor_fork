/* ============ hud-overlay.js: the HTML HUD above the game canvas (#64 pilot) ============
 * The first HUD piece on the HTML overlay (docs/HUD-STYLE.md, decision 2026-11-10-hud-on-preact-and-pngs-as-design-basis):
 * the enemy name bar and the leader portrait circles of a gym fight. Built with Preact, htm and Preact Signals (js/vendor/),
 * styled by css/hud-overlay.css.
 *
 * Read only: G.HudOverlay.sync(inRun) runs once per frame from G.Game after the canvas is drawn. It copies what the fight
 * shows (names, level, HP, who is active, who fainted, the swap-in i-frames) into signals and never writes game state.
 * Unchanged values touch nothing on the page.
 *
 * If a library failed to load, ready stays false, a warning is logged, and the canvas HUD keeps drawing its old boss bar.
 */
G.HudOverlay = (() => {
  const preact = window.preact,
    preactHooks = window.preactHooks,
    htmFactory = window.htm,
    preactSignals = window.preactSignals;
  const ready = !!(preact && preactHooks && htmFactory && preactSignals);
  if (!ready) {
    console.warn('[HudOverlay] Preact, htm or Signals did not load; the canvas boss bar stays');
    return { ready: false, sync() {}, setHidden() {}, setNameSize() {} };
  }
  const html = htmFactory.bind(preact.h),
    { signal, batch } = preactSignals;

  // ---------- sizes (HUD-STYLE "Panel sizes at 1080p", fixed CSS pixels) ----------
  const ART_PIXEL = 3, // the bar is drawn at 3 px per B2 art pixel
    BAR_FULL_ART_WIDTH = 232, // 696 px
    WINDOW_MARGIN = 40, // a narrow window shrinks the bar to keep this much space each side
    NAME_LINE_TOP = 43,
    BAR_ART_ROWS = 12, // rip rows 9 to 20: the HP tab, the bar and its drop shadow
    PORTRAIT_PATH = 'assets/pokemon/';

  // ---------- colours (HUD-STYLE "Colour palette") ----------
  const OUTLINE = '#101010',
    BODY = '#181818',
    CHECKER = '#303030',
    TRACK_SHADE = '#464646',
    TRACK_LIGHT = '#7f7f7f';
  const HP_COLOURS = {
    high: { fill: '#00fb49', shade: '#008a28' },
    middle: { fill: '#f3b200', shade: '#9a6110' },
    low: { fill: '#fb3041', shade: '#922030' },
  };
  // Scarlet/Violet type colours (Base): the active ring is the gym's type.
  const TYPE_RING = {
    normal: '#9FA19F',
    fire: '#E62829',
    water: '#2980EF',
    grass: '#3FA129',
    electric: '#FAC000',
    ice: '#3DCEF3',
    fighting: '#FF8000',
    poison: '#9141CB',
    ground: '#915121',
    flying: '#81B9EF',
    psychic: '#EF4179',
    bug: '#91A119',
    rock: '#AFA981',
    ghost: '#704170',
    dragon: '#5060E1',
    dark: '#624D4E',
    steel: '#60A1B8',
    fairy: '#EF70EF',
  };

  const hpBand = (fraction) => (fraction > 0.5 ? 'high' : fraction >= 0.2 ? 'middle' : 'low');

  // ---------- the bar's shape, in art pixels (from b2-upper A1 to L3, HUD-STYLE "Enemy name bar") ----------
  // Each span: [rip row, left offset, right offset from the bar's right edge R]. R is the top row's last pixel.
  const SHADOW_SPANS = [
    [14, 4, 2],
    [15, 4, 3],
    [16, 4, 3],
    [17, 4, 2],
    [18, 4, 2],
    [19, 6, 1],
    [20, 7, 1],
  ];
  const OUTLINE_SPANS = [
    [10, 2, 0],
    [11, 1, 1],
    [12, 1, 2],
    [13, 0, 2],
    [14, 0, 1],
    [15, 1, 1],
    [16, 2, 0],
    [17, 3, 0],
    [18, 4, -1],
  ];
  const CHECKER_SPANS = [
    [11, 2, 0],
    [12, 2, 1],
    [13, 1, 1],
    [14, 1, 0],
    [15, 2, 0],
    [16, 3, -1],
  ];
  const SOLID_BODY_SPANS = [[17, 4, -1]];
  // The "HP" label is text (.hud-boss-hp): the HUD font at 20 px, slanted by the browser, white with its outline, moved
  // left to just past the left end's bottom curve (Jess, 2026-11-10). Its ink and outline span art columns 4 to 11, so the track's
  // left outline is column 12 and the fill starts at 13.
  const LABEL_LEFT = 4,
    LABEL_ART_WIDTH = 8, // 24 px: "HP" is 11 font pixels of ink (22 px at 20 px text) plus a 2 px outline, less one shared
    TRACK_LEFT = LABEL_LEFT + LABEL_ART_WIDTH + 1, // the fill starts right after the label and the track's left outline
    TRACK_RIGHT_INSET = 3; // the fill ends where the EXP track ends on the EXP version of the bar (b2-upper L6)

  const rightEdge = (barArtWidth) => barArtWidth - 4;
  const trackInnerArt = (barArtWidth) => rightEdge(barArtWidth) - TRACK_RIGHT_INSET - TRACK_LEFT;

  /** Every rectangle of the bar for a given width, in art pixels: { x, y, width, height, fill }. */
  function barRectangles(barArtWidth) {
    const right = rightEdge(barArtWidth),
      rectangles = [];
    const addSpans = (spans, fill) => {
      for (const [ripRow, leftOffset, rightOffset] of spans)
        rectangles.push({ x: leftOffset, y: ripRow - 9, width: right + rightOffset - leftOffset + 1, height: 1, fill });
    };
    addSpans(SHADOW_SPANS, CHECKER);
    addSpans(OUTLINE_SPANS, OUTLINE);
    addSpans(CHECKER_SPANS, 'url(#hud-checker)');
    addSpans(SOLID_BODY_SPANS, BODY);
    // the empty track: outline below and on both ends, shade, light, shade inside
    const trackRight = right - TRACK_RIGHT_INSET;
    rectangles.push({ x: TRACK_LEFT - 1, y: 14 - 9, width: trackRight - TRACK_LEFT + 2, height: 1, fill: OUTLINE });
    rectangles.push({ x: TRACK_LEFT - 1, y: 11 - 9, width: 1, height: 3, fill: OUTLINE });
    rectangles.push({ x: trackRight, y: 11 - 9, width: 1, height: 3, fill: OUTLINE });
    [TRACK_SHADE, TRACK_LIGHT, TRACK_SHADE].forEach((fill, row) =>
      rectangles.push({ x: TRACK_LEFT, y: 11 - 9 + row, width: trackRight - TRACK_LEFT, height: 1, fill })
    );
    return rectangles;
  }

  // ---------- state the page shows (signals) ----------
  const visible = signal(false),
    hiddenByDebug = signal(false),
    barArtWidth = signal(BAR_FULL_ART_WIDTH),
    barLeft = signal(0),
    nameText = signal(''),
    levelText = signal(''),
    fillPixels = signal(0),
    fillBand = signal('high'),
    fillGrowing = signal(false),
    pieces = signal([]), // { id, left, width, band }
    circles = signal([]), // { key, dex, shiny, active, fainted, pulsing }
    ringBase = signal(TYPE_RING.normal);

  function layout() {
    const widthArt = Math.min(BAR_FULL_ART_WIDTH, Math.floor((innerWidth - 2 * WINDOW_MARGIN) / ART_PIXEL));
    barArtWidth.value = Math.max(60, widthArt);
    barLeft.value = Math.round((innerWidth - barArtWidth.value * ART_PIXEL) / 2);
  }

  // ---------- components ----------
  function BarShape() {
    const widthArt = barArtWidth.value;
    const rectangles = barRectangles(widthArt).map(
      (rect) => html`<rect x=${rect.x} y=${rect.y} width=${rect.width} height=${rect.height} fill=${rect.fill} />`
    );
    return html`<svg
      width=${widthArt * ART_PIXEL}
      height=${BAR_ART_ROWS * ART_PIXEL}
      viewBox=${'0 0 ' + widthArt + ' ' + BAR_ART_ROWS}
    >
      <defs>
        <pattern id="hud-checker" width="2" height="2" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="2" height="2" fill=${CHECKER} />
          <rect x="0" y="0" width="1" height="1" fill=${BODY} />
          <rect x="1" y="1" width="1" height="1" fill=${BODY} />
        </pattern>
      </defs>
      ${rectangles}
    </svg>`;
  }

  const stripes = (band) => {
    const colours = HP_COLOURS[band];
    return `linear-gradient(${colours.shade} 0 3px, ${colours.fill} 3px 6px, ${colours.shade} 6px 9px)`;
  };

  function Fill() {
    const innerPixels = trackInnerArt(barArtWidth.value) * ART_PIXEL;
    const style = {
      left: TRACK_LEFT * ART_PIXEL + 'px',
      top: (11 - 9) * ART_PIXEL + 'px',
      width: innerPixels + 'px',
      background: stripes(fillBand.value),
      transform: `scaleX(${innerPixels ? fillPixels.value / innerPixels : 0})`,
    };
    return html`<div class=${'hud-boss-fill' + (fillGrowing.value ? ' is-growing' : '')} style=${style}></div>`;
  }

  function Pieces() {
    const removePiece = (id) => (pieces.value = pieces.value.filter((piece) => piece.id !== id));
    return pieces.value.map(
      (piece) =>
        html`<div
          key=${piece.id}
          class="hud-boss-piece"
          style=${{
            left: TRACK_LEFT * ART_PIXEL + piece.left + 'px',
            top: (11 - 9) * ART_PIXEL + 'px',
            width: piece.width + 'px',
            background: stripes(piece.band),
          }}
          onAnimationEnd=${() => removePiece(piece.id)}
        ></div>`
    );
  }

  function portraitSource(dex, shiny) {
    return PORTRAIT_PATH + dex + (shiny ? '/s/Portrait.png' : '/Portrait.png');
  }

  function Circles() {
    return html`<div class="hud-boss-circles">
      ${circles.value.map(
        (circle) =>
          html`<div
            key=${circle.key}
            class=${
              'hud-circle' +
              (circle.active ? ' is-active' : '') +
              (circle.pulsing ? ' is-pulsing' : '') +
              (circle.fainted ? ' is-fainted' : '')
            }
          >
            <img
              src=${portraitSource(circle.dex, circle.shiny)}
              alt=""
              onError=${(event) => {
                // a shiny with no portrait of its own (#958) falls back to the normal face
                const normal = portraitSource(circle.dex, false);
                if (!event.target.src.endsWith(normal)) event.target.src = normal;
              }}
            />
          </div>`
      )}
    </div>`;
  }

  function BossPanel() {
    if (!visible.value || hiddenByDebug.value) return null;
    const widthArt = barArtWidth.value;
    const style = {
      left: barLeft.value + 'px',
      top: NAME_LINE_TOP + 'px',
      width: widthArt * ART_PIXEL + 'px',
      '--ring-base': ringBase.value,
    };
    return html`<div class="hud-boss" style=${style}>
      <div class="hud-boss-line" style=${{ width: (rightEdge(widthArt) + 1) * ART_PIXEL + 'px' }}>
        <span>${nameText}</span><span>${levelText}</span>
      </div>
      <div class="hud-boss-bar">
        <${BarShape} /><span class="hud-boss-hp" style=${{ left: LABEL_LEFT * ART_PIXEL + 'px' }}>HP</span
        ><${Fill} /><${Pieces} />
      </div>
      <${Circles} />
    </div>`;
  }

  // ---------- mount ----------
  const root = document.createElement('div');
  root.className = 'hud-overlay';
  root.setAttribute('translate', 'no'); // English-only text, and keeps the i18n observer off per-frame changes
  root.setAttribute('aria-hidden', 'true');
  document.body.appendChild(root);
  preact.render(html`<${BossPanel} />`, root);
  layout();
  addEventListener('resize', layout);

  // ---------- the per-frame read (sim to present: read only) ----------
  let lastActive = null,
    lastFillPixels = 0,
    lastBand = 'high',
    lastBarWidth = 0,
    lastCirclesKey = '',
    nextPieceId = 1;

  /** The gym fight on screen, or null. A switched gym fields a team; gyms 3 to 8 are still one boss (slice 12). */
  function readFight() {
    const arena = G.GymArena && G.GymArena.arena,
      team = G.GymArena && G.GymArena.leaderTeam;
    if (team && team.members && team.members.length)
      return { arena, members: team.members, active: team.active, activeIndex: team.activeIdx };
    const boss = G.EnemyMgr.all().find((enemy) => enemy.boss && enemy.gym && !enemy.dead);
    return boss ? { arena, members: [boss], active: boss, activeIndex: 0 } : null;
  }

  function sync(inRun) {
    // hidden by G.Debug.hudOverlay: no reads and no renders, so the frame rate shows the overlay's whole cost
    batch(() => syncFight(inRun && !hiddenByDebug.value ? readFight() : null)); // one render per frame
  }

  function syncFight(fight) {
    visible.value = !!fight;
    if (!fight) {
      lastActive = null;
      return;
    }
    const active = fight.active,
      gym = active.gym || {};
    nameText.value = (gym.leader ? gym.leader + "'s " : '') + active.name;
    levelText.value = 'Lv. ' + (gym.level != null ? gym.level : active.level || '');

    const ring = TYPE_RING[fight.arena && fight.arena.type] || TYPE_RING.normal;
    ringBase.value = ring;

    // HP: whole art pixels, at least one while alive, as the B2 bar moves
    const widthArt = barArtWidth.value,
      innerArt = trackInnerArt(widthArt),
      fraction = active.maxHp > 0 ? Math.min(1, Math.max(0, active.hp / active.maxHp)) : 0,
      artUnits = active.hp > 0 && !active.dead ? Math.max(1, Math.round(fraction * innerArt)) : 0,
      pixels = artUnits * ART_PIXEL;
    if (active !== lastActive || widthArt !== lastBarWidth) {
      // a swap or a resize: start from here, with no piece
      lastActive = active;
      lastBarWidth = widthArt;
      fillGrowing.value = false;
    } else if (pixels < lastFillPixels) {
      // cut and fall: the lost segment, in the colour the fill had before the hit
      pieces.value = pieces.value.concat({
        id: nextPieceId++,
        left: pixels,
        width: lastFillPixels - pixels,
        band: lastBand,
      });
      fillGrowing.value = false;
    } else if (pixels > lastFillPixels) fillGrowing.value = true;
    fillPixels.value = pixels;
    fillBand.value = lastBand = hpBand(fraction);
    lastFillPixels = pixels;

    // circles: rebuilt only when something they show changes
    const states = fight.members.map((member, index) => {
      const isActive = index === fight.activeIndex;
      return {
        key: index + ':' + member.dex,
        dex: member.dex,
        shiny: !!member.shiny,
        active: isActive && !member.dead,
        fainted: !!member.dead,
        pulsing: isActive && !member.dead && (member.invuln || 0) > 0,
      };
    });
    const circlesKey = states
      .map((state) => [state.key, +state.shiny, +state.active, +state.fainted, +state.pulsing].join(':'))
      .join('|');
    if (circlesKey !== lastCirclesKey) {
      lastCirclesKey = circlesKey;
      circles.value = states;
    }
  }

  /** ?dev only (G.Debug.hudOverlay): hide the overlay to compare the frame rate with and without it. */
  function setHidden(hidden) {
    hiddenByDebug.value = !!hidden;
  }

  /** ?dev only (G.Debug.hudNameSize): the name line's text size, 20, 30 or 40 px (whole multiples of the font's 10 px grid). */
  function setNameSize(pixels) {
    root.style.setProperty('--name-size', pixels + 'px');
    root.style.setProperty('--font-pixel', pixels / 10 + 'px');
    return pixels;
  }

  return { ready: true, sync, setHidden, setNameSize };
})();
