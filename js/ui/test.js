/* ============ test.js — new-player starter pick ============
 * After the first login (no partner yet) the player picks a region and starts with its three starters:
 * the Grass one leads (slot 0 = partner), then Fire, then Water. The old personality test and its
 * result screen are no longer shown; their markup and data (starters.js) stay in place, unused.
 */
G.TestUI = (() => {
  const $ = G.UI.$;
  let picked = null; // index into G.STARTER_REGIONS, or null
  let busy = false;

  function init() {
    $('starter-back').onclick = () => {
      if (!busy) G.DB.logout().then(() => G.Flow.toLogin());
    };
    $('starter-ok').onclick = () => {
      if (picked != null && !busy) choose(G.STARTER_REGIONS[picked]);
    };
  }

  function start() {
    picked = null;
    busy = false;
    $('starter-ok').disabled = true;
    $('starter-ok').textContent = 'Choose';
    showInfo(null);
    const grid = $('starter-grid');
    grid.innerHTML = '';
    G.STARTER_REGIONS.forEach((r, i) => {
      const card = document.createElement('div');
      card.className = 'region-card';
      card.dataset.region = r.name;
      card.insertAdjacentHTML('beforeend', `<h3>${r.name}</h3>`);
      const mons = document.createElement('div');
      mons.className = 'region-mons';
      for (const dex of r.dex) {
        const m = document.createElement('div');
        m.className = 'region-mon';
        m.appendChild(G.UI.spriteCanvas(dex, 72, 64, { scale: 2 }));
        m.insertAdjacentHTML('beforeend', `<b>${G.DEX_BY[dex].name}</b>`);
        mons.appendChild(m);
      }
      card.appendChild(mons);
      card.onmouseenter = () => showInfo(r);
      card.onmouseleave = () => showInfo(picked == null ? null : G.STARTER_REGIONS[picked]);
      card.onclick = () => {
        picked = i;
        grid.querySelectorAll('.region-card').forEach((c) => c.classList.remove('on'));
        card.classList.add('on');
        $('starter-ok').disabled = false;
        $('starter-ok').textContent = 'Choose ' + r.name;
        showInfo(r);
      };
      grid.appendChild(card);
    });
    G.UI.chrome(false);
    G.UI.show('scr-starters');
  }

  /** The three names and starting moves of a region, or the prompt when none is picked or hovered. */
  function showInfo(r) {
    $('starter-info').innerHTML = r
      ? r.dex
          .map(
            (dex) =>
              `<span class="gold">${G.DEX_BY[dex].name}</span> ${G.Icons.html('move:' + G.startMoveOf(dex), 16)} ${G.MoveInfo.name(G.startMoveOf(dex))}`
          )
          .join(' &nbsp;·&nbsp; ')
      : 'Select a region';
  }

  /** Gives the region's three starters: three copies, a team of 3, the Grass one leading. */
  function choose(r) {
    busy = true;
    const save = G.DB.save;
    save.starter = r.dex[0];
    save.partner = r.dex[0];
    for (const dex of r.dex) G.DB.obtain(dex, false, 'starter'); // the Pokedex record and each starter's copy
    save.team = [0, 1, 2, 3, 4, 5].map((i) => (r.dex[i] ? { dex: r.dex[i], shiny: false } : null));
    G.DB.commit(); // normalizeTeam links each slot to its copy
    G.UI.toast(r.name + ' starters join you!');
    G.Flow.goMenu();
  }

  return { init, start };
})();
