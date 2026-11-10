/* ============ hud-dps-panel.js: the DPS-Upgrades panel (top left) (#66, on the HTML HUD) ============
 * A panel of js/ui/hud-overlay.js (the core and its kit). Layout: the wireframe's top left
 * (assets/excalidraw/run_screen_mockup.png). Look and numbers: docs/HUD-STYLE.md "DPS-Upgrades panel".
 *
 * Header: the active Pokemon's name, and the team's damage per second over the last 5 s (G.DpsHistory.averageDps).
 * Sparkline: one continuous team line, one point per second, the last 30 s, newest at the right edge. Each point is
 * drawn in the first type's Base colour of the Pokemon on the field when that second ended, and a faint tick marks each
 * swap, so two Pokemon of the same type back to back still read (Jess, 2026-11-10). The scale fits the highest point shown.
 * Then a divider and the run's team upgrade cards (G.TeamCards.summary, the team sheet's "Run Cards" rows and order); the divider
 * and list hide while no card is picked.
 *
 * Font: Michroma for everything in the panel, not the pixel HUD font: the panel is a "module", not part of the game
 * world (Jess, 2026-11-10). Hidden by the Settings toggle showDpsPanel (default on); the whole panel takes the
 * dpsPanelOpacity slider (default 60%).
 *
 * Read only: the record and the cards are read once per frame and the page only changes when a second finishes, the
 * active Pokemon changes or a card is picked. The timed buff and status chips are not here (#76).
 */
G.HudDpsPanel = (() => {
  const overlay = G.HudOverlay;
  if (!overlay.ready) return { ready: false };
  const { html, signal, hooks, typeColours } = overlay.kit;

  const SPARK_SECONDS = 30,
    SPARK_WIDTH = 292, // the canvas inside the strip's 2 px outline
    SPARK_HEIGHT = 40,
    LINE_WIDTH = 2,
    SWAP_TICK = 'rgba(255, 255, 255, 0.35)',
    DEFAULT_OPACITY = 0.6, // Settings > DPS Panel Opacity (Jess, 2026-11-10): the whole panel, 20% to 100%
    MIN_OPACITY = 0.2;

  // ---------- state the page shows (signals) ----------
  const visible = signal(false),
    activeName = signal(''),
    dpsText = signal('0'),
    panelOpacity = signal(DEFAULT_OPACITY),
    spark = signal({ teamDamage: [], outSlot: [], slotColours: [] }),
    cards = signal([]);

  // ---------- components ----------
  function Sparkline() {
    const canvasRef = hooks.useRef(null),
      data = spark.value;
    hooks.useEffect(() => {
      const canvas = canvasRef.current;
      if (canvas) drawSparkline(canvas.getContext('2d'), data);
    }, [data]);
    return html`<div class="hud-dps-spark">
      <canvas width=${SPARK_WIDTH} height=${SPARK_HEIGHT} ref=${canvasRef}></canvas>
    </div>`;
  }

  /** A card total, with a trailing % drawn smaller: in Michroma it is as big as a digit (Jess, 2026-11-10). */
  function CardTotal(total) {
    const text = String(total);
    if (!text.endsWith('%')) return text;
    return html`${text.slice(0, -1)}<span class="hud-dps-percent">%</span>`;
  }

  function DpsPanel() {
    if (!visible.value) return null;
    const list = cards.value;
    return html`<div class="hud-dps" style=${{ opacity: panelOpacity.value }}>
      <div class="hud-dps-header">
        <div class="hud-dps-name">${activeName.value}</div>
        <div class="hud-dps-rate">
          <span class="hud-dps-number">${dpsText.value}</span><span class="hud-dps-unit"> DPS</span>
        </div>
      </div>
      <${Sparkline} />
      ${
        list.length
          ? html`<div class="hud-dps-divider"></div>
              <div class="hud-dps-cards">
                ${list.map(
                  (card) =>
                    html`<div class="hud-dps-card" key=${card.id}>
                      <span class="hud-dps-card-name">${card.label}</span>
                      <span class="hud-dps-card-total">${CardTotal(card.total)}</span>
                    </div>`
                )}
              </div>`
          : null
      }
    </div>`;
  }

  /** The line, newest second at the right edge; each half segment takes the colour of the slot out at its nearer point. */
  function drawSparkline(context, data) {
    const { teamDamage, outSlot, slotColours } = data,
      count = teamDamage.length;
    context.clearRect(0, 0, SPARK_WIDTH, SPARK_HEIGHT);
    if (!count) return;
    const highest = Math.max(...teamDamage),
      step = (SPARK_WIDTH - LINE_WIDTH) / (SPARK_SECONDS - 1),
      xAt = (index) => SPARK_WIDTH - LINE_WIDTH / 2 - (count - 1 - index) * step,
      yAt = (index) => {
        const top = LINE_WIDTH / 2,
          bottom = SPARK_HEIGHT - LINE_WIDTH / 2;
        return highest > 0 ? bottom - (teamDamage[index] / highest) * (bottom - top) : bottom;
      },
      colourAt = (index) => slotColours[outSlot[index]] || slotColours[0] || '#ffffff';
    // swap ticks under the line
    context.fillStyle = SWAP_TICK;
    for (let index = 1; index < count; index++)
      if (outSlot[index] !== outSlot[index - 1]) context.fillRect(Math.round(xAt(index - 0.5)) - 1, 0, 2, SPARK_HEIGHT);
    context.lineWidth = LINE_WIDTH;
    context.lineJoin = 'round';
    context.lineCap = 'round';
    if (count === 1) {
      context.fillStyle = colourAt(0);
      context.fillRect(xAt(0) - LINE_WIDTH / 2, yAt(0) - LINE_WIDTH / 2, LINE_WIDTH, LINE_WIDTH);
      return;
    }
    // each segment changes colour at its midpoint (where a swap tick sits), so even a one-second stretch shows its colour
    for (let index = 1; index < count; index++) {
      const middleX = (xAt(index - 1) + xAt(index)) / 2,
        middleY = (yAt(index - 1) + yAt(index)) / 2;
      context.strokeStyle = colourAt(index - 1);
      context.beginPath();
      context.moveTo(xAt(index - 1), yAt(index - 1));
      context.lineTo(middleX, middleY);
      context.stroke();
      context.strokeStyle = colourAt(index);
      context.beginPath();
      context.moveTo(middleX, middleY);
      context.lineTo(xAt(index), yAt(index));
      context.stroke();
    }
  }

  // ---------- the per-frame read ----------
  let lastSecond = -1,
    lastActive = null,
    lastCardCount = -1,
    lastHistory = null;

  function readSpark(history, roster) {
    const slotColours = [];
    for (const member of roster) {
      const type = (member.mon && member.mon.types && member.mon.types[0]) || 'normal';
      slotColours[member.teamSlot] = typeColours(type).base;
    }
    spark.value = { ...G.DpsHistory.recent(history, SPARK_SECONDS), slotColours };
    dpsText.value = String(Math.round(G.DpsHistory.averageDps(history)));
  }

  function readCards(store) {
    const count = store ? store.n : 0;
    if (count === lastCardCount) return;
    lastCardCount = count;
    cards.value = G.TeamCards.summary(store);
  }

  function sync(showing) {
    // the Settings toggle (default on) hides only the panel; the record keeps running for later screens
    const player = showing && G.Settings.get('showDpsPanel') !== false && G.Game.player;
    visible.value = !!player;
    if (!player) return;
    const opacitySetting = +G.Settings.get('dpsPanelOpacity');
    panelOpacity.value = opacitySetting > 0 ? Math.min(1, Math.max(MIN_OPACITY, opacitySetting)) : DEFAULT_OPACITY;
    const history = player.team && player.team.dpsHistory;
    if (history !== lastHistory) {
      // a new run: read everything fresh
      lastHistory = history;
      lastSecond = -1;
      lastActive = null;
      lastCardCount = -1;
    }
    if (player !== lastActive) {
      lastActive = player;
      activeName.value = (player.mon && player.mon.name) || '';
    }
    const second = G.DpsHistory.finishedSeconds(history);
    if (second !== lastSecond) {
      lastSecond = second;
      readSpark(history, G.Game.roster || [player]);
    }
    readCards(player.teamCards);
  }

  overlay.addPanel({ id: 'dps', View: DpsPanel, sync });
  return { ready: true, SPARK_SECONDS };
})();
