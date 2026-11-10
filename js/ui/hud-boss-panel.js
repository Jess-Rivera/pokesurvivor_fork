/* ============ hud-boss-panel.js: the enemy name bar and leader portrait circles (#64, on the HTML HUD) ============
 * A panel of js/ui/hud-overlay.js (the core and its kit). Look and numbers: docs/HUD-STYLE.md "Enemy name bar" and
 * "Leader portrait circles". Shows during a gym fight; reads the fight, never writes it.
 */
G.HudBossPanel = (() => {
  const overlay = G.HudOverlay;
  if (!overlay.ready) return { ready: false };
  const { html, signal, createLifeBar, typeColours, portraitSource, portraitFallback } = overlay.kit;

  // ---------- sizes (HUD-STYLE "Panel sizes at 1080p", fixed CSS pixels) ----------
  const ART_PIXEL = 3, // the bar is drawn at 3 px per B2 art pixel
    BAR_FULL_ART_WIDTH = 232, // 696 px
    WINDOW_MARGIN = 40, // a narrow window shrinks the bar to keep this much space each side
    NAME_LINE_TOP = 43,
    HP_LABEL_TOP = -4; // the label's outline top one bar row above the bar, as B2's tab

  // ---------- state the page shows (signals) ----------
  const visible = signal(false),
    barArtWidth = signal(BAR_FULL_ART_WIDTH),
    barLeft = signal(0),
    nameText = signal(''),
    levelText = signal(''),
    circles = signal([]), // { key, dex, shiny, active, fainted, pulsing }
    ringBase = signal(typeColours('normal').base);
  const lifeBar = createLifeBar({ artPixel: ART_PIXEL, artWidth: barArtWidth, labelTop: HP_LABEL_TOP });

  function layout() {
    const widthArt = Math.min(BAR_FULL_ART_WIDTH, Math.floor((innerWidth - 2 * WINDOW_MARGIN) / ART_PIXEL));
    barArtWidth.value = Math.max(60, widthArt);
    barLeft.value = Math.round((innerWidth - barArtWidth.value * ART_PIXEL) / 2);
  }

  // ---------- components ----------
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
              data-dex=${circle.dex}
              alt=""
              onError=${portraitFallback}
            />
          </div>`
      )}
    </div>`;
  }

  function BossPanel() {
    if (!visible.value) return null;
    const widthArt = barArtWidth.value;
    const style = {
      left: barLeft.value + 'px',
      top: NAME_LINE_TOP + 'px',
      width: widthArt * ART_PIXEL + 'px',
      '--ring-base': ringBase.value,
    };
    return html`<div class="hud-boss" style=${style}>
      <div class="hud-boss-line" style=${{ width: (lifeBar.rightEdge() + 1) * ART_PIXEL + 'px' }}>
        <span>${nameText}</span><span>${levelText}</span>
      </div>
      <div class="hud-boss-bar"><${lifeBar.View} /></div>
      <${Circles} />
    </div>`;
  }

  // ---------- the per-frame read ----------
  let lastCirclesKey = '';

  /** The gym fight on screen, or null. A switched gym fields a team; gyms 3 to 8 are still one boss (slice 12). */
  function readFight() {
    const arena = G.GymArena && G.GymArena.arena,
      team = G.GymArena && G.GymArena.leaderTeam;
    if (team && team.members && team.members.length)
      return { arena, members: team.members, active: team.active, activeIndex: team.activeIdx };
    const boss = G.EnemyMgr.all().find((enemy) => enemy.boss && enemy.gym && !enemy.dead);
    return boss ? { arena, members: [boss], active: boss, activeIndex: 0 } : null;
  }

  function sync(showing) {
    const fight = showing ? readFight() : null;
    visible.value = !!fight;
    if (!fight) {
      lifeBar.reset();
      return;
    }
    const active = fight.active,
      gym = active.gym || {};
    nameText.value = (gym.leader ? gym.leader + "'s " : '') + active.name;
    levelText.value = 'Lv. ' + (gym.level != null ? gym.level : active.level || '');
    ringBase.value = typeColours(fight.arena && fight.arena.type).base;
    lifeBar.update(active.hp, active.maxHp, active.dead, active);

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

  layout();
  addEventListener('resize', layout);
  overlay.addPanel({ id: 'boss', View: BossPanel, sync });
  return { ready: true };
})();
