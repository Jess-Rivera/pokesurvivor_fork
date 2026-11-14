// tools/smoke-status-fx.js: headless browser check for the on-sprite status animations and the minor status chips (#78,
// docs/HUD-STYLE.md "On-sprite status icons (#71)" and "Status chips"). A check, not a harness: check.js syntax-checks it.
// Playwright is NOT a repo dependency (PLAYWRIGHT_DIR, default C:\Users\boric\tools\playwright), as in tools/smoke-gym.js.
// Usage from the repo root: node tools/smoke-status-fx.js [--shots <folder>]   (dev.html over file://, how Jess plays)
// Expected places are hand-derived from the spec and each sheet's size (pivot: bottom centre at the feet and above the head,
// the frame centre on the body), never read back from js/ui/status-fx.js.
const path = require('path'),
  fs = require('fs'),
  url = require('url');
const root = path.resolve(__dirname, '..');
const PW_DIRS = [
  process.env.PLAYWRIGHT_DIR,
  path.join(require('os').homedir(), 'tools', 'playwright'),
  'C:\\Users\\boric\\tools\\playwright',
]
  .filter(Boolean)
  .map((dir) => path.join(dir, 'node_modules', 'playwright'));
const { chromium } = require(PW_DIRS.find((dir) => fs.existsSync(dir)) || PW_DIRS[0]);
const shotsAt = process.argv.indexOf('--shots'),
  SHOTS = shotsAt > 0 ? process.argv[shotsAt + 1] : null;

let failures = 0;
const ok = (condition, message) => {
  console.log((condition ? 'ok    ' : 'FAIL  ') + message);
  if (!condition) failures++;
};

// From the spec and the sheets (art pixels): frame size and the pivot that lands on the spot.
const SHEETS = {
  burn: { size: [16, 16], pivot: [8, 16], spot: 'feet' },
  freeze: { size: [32, 31], pivot: [16, 15.5], spot: 'body' },
  confusion: { size: [32, 16], pivot: [16, 16], spot: 'head' },
  trap: { size: [27, 33], pivot: [13.5, 16.5], spot: 'body' },
  'stat-up-ring': { size: [35, 48], pivot: [18, 40], spot: 'feet' },
  'stat-up': { size: [35, 48], pivot: [17.5, 24], spot: 'body' },
};
const ART_PX = 2; // world units per art pixel (G.Sprites.PX)
const STAT_SPREAD = 3; // art pixels from the body centre when several stat changes play

(async () => {
  // The GPU on, as in Jess's browser: headless software drawing makes every big sprite cost several times what it does there.
  const browser = await chromium.launch({
    args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--enable-gpu-rasterization'],
  });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push('pageerror: ' + error.message));
  page.on('requestfailed', (request) => {
    if (/assets\/status\//.test(request.url())) errors.push('requestfailed: ' + request.url());
  });
  await page.goto(url.pathToFileURL(path.join(root, 'dev.html')).href + '?dev', { waitUntil: 'load' });
  await page.waitForFunction(() => window.G && G.Game && G.DB && G.StatusFx && G.HudOverlay, null, { timeout: 30000 });
  await page.evaluate(async () => {
    await G.DB.ready();
    if (!G.DB.save) G.DB.playAsGuest();
    const tapStart = document.getElementById('tap-start');
    if (tapStart && !tapStart.classList.contains('hidden')) tapStart.click();
    const save = G.DB.save;
    save.team = [{ dex: 7, shiny: false }, null, null, null, null, null];
    save.partner = 7;
    save.partnerShiny = false;
    G.Game.startRun();
  });
  await page.waitForFunction(() => G.Game.player && G.Game.state === 'playing', null, { timeout: 15000 });

  // Three still enemies beside you, each with a known set of statuses, and you with a major and every minor.
  await page.evaluate(() => {
    G.Spawner.update = () => {}; // test page only: no wild spawns
    G.EnemyMgr.clear();
    const player = G.Game.player,
      def = G.Enemies.bagAt(0).find((candidate) => !candidate.flying) || G.Enemies.bagAt(0)[0];
    const LONG = 999;
    const make = (dx) => {
      const enemy = new G.Enemy(def, player.x + dx, player.y, G.Enemies.scale(0));
      enemy.maxHp = enemy.hp = 1e9;
      G.EnemyMgr.add(enemy);
      return enemy;
    };
    const feetAndHead = make(-140),
      body = make(140),
      stats = make(0);
    stats.y -= 120;
    feetAndHead.burn = 1; // the enemy's own burn state (WildEntity.applyBurn), lasting the whole test
    feetAndHead.burnLeft = LONG;
    feetAndHead.burnTick = LONG;
    feetAndHead.stCnf = { t: LONG, wa: 0, wt: 1 };
    body.stMajor = { k: 'freeze', t: LONG };
    body.stTrap = { t: LONG };
    G.Stages.add(stats, 'atk', 1, LONG, 6, null, 0, true);
    G.Stages.add(stats, 'def', 1, LONG, 6, null, 0, true);
    G.Stages.add(stats, 'spe', 1, LONG, 6, null, 0, true);
    window.__test = { feetAndHead, body, stats };
    for (const enemy of [feetAndHead, body, stats]) {
      enemy.spd = 0;
      enemy.home = [enemy.x, enemy.y];
    }
    player.stMajor = { k: 'paralysis', t: LONG };
    player.stCnf = { t: LONG, wa: 0, wt: 1 };
    player.stDaze = { t: LONG, a: 0, ta: 0, wt: 1 };
    player.stTrap = { t: LONG };
    player.stDrow = { t: LONG };
    window.__keep = setInterval(() => {
      player.maxHp = player.hp = 1e9;
      for (const enemy of [feetAndHead, body, stats]) [enemy.x, enemy.y] = enemy.home;
      const card = G.UI.isOpen('scr-levelup') && document.querySelector('#cards .card');
      if (card) card.click();
    }, 20);
    // Record every status sheet drawn and every canvas text, frame by frame.
    window.__calls = [];
    const drawImage = CanvasRenderingContext2D.prototype.drawImage,
      fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.drawImage = function (image, ...args) {
      const source = (image && image.src) || '';
      if (window.__recording && /assets\/(status|pokemon)\//.test(source) && args.length === 8)
        window.__calls.push({ source: source.replace(/^.*assets\//, ''), dest: args.slice(4) });
      return drawImage.call(this, image, ...args);
    };
    CanvasRenderingContext2D.prototype.fillText = function (text, ...args) {
      if (window.__recording) window.__calls.push({ text: String(text) });
      return fillText.call(this, text, ...args);
    };
  });
  await page.waitForTimeout(600); // sheets load, statuses settle

  const recordFrames = async (ms) => {
    await page.evaluate(() => ((window.__calls = []), (window.__recording = true)));
    await page.waitForTimeout(ms);
    return page.evaluate(() => ((window.__recording = false), window.__calls));
  };
  const entityOf = (name) =>
    page.evaluate((key) => {
      const entity = key === 'player' ? G.Game.player : window.__test[key];
      return { x: entity.x, y: entity.y, bodyH: entity.bodyH, scale: entity.anim.scale, dex: entity.dex };
    }, name);
  /** Is there a draw of `sheet` whose pivot lands on the entity's spot (plus an art-pixel offset), within 1 unit? */
  const placedAt = (calls, sheet, entity, offsetArt = [0, 0]) => {
    const spec = SHEETS[sheet.replace(/^stats\//, '').replace(/-(atk|def|spa|spd|spe)$/, '')],
      scale = ART_PX * entity.scale,
      spotY = { feet: entity.y, body: entity.y - entity.bodyH / 2, head: entity.y - entity.bodyH }[spec.spot],
      wantX = entity.x + offsetArt[0] * scale - spec.pivot[0] * scale,
      wantY = spotY + offsetArt[1] * scale - spec.pivot[1] * scale;
    return calls.some(
      (call) =>
        call.source &&
        call.source.endsWith('/' + sheet + '.png') &&
        Math.abs(call.dest[0] - wantX) <= 1 &&
        Math.abs(call.dest[1] - wantY) <= 1 &&
        Math.abs(call.dest[2] - spec.size[0] * scale) < 0.01
    );
  };

  let calls = await recordFrames(300);
  const feetAndHead = await entityOf('feetAndHead'),
    body = await entityOf('body'),
    stats = await entityOf('stats');
  ok(placedAt(calls, 'burn', feetAndHead), 'burn sits on the feet (bottom centre of the flame on the ground point)');
  ok(placedAt(calls, 'confusion', feetAndHead), 'confusion floats above the head');
  ok(placedAt(calls, 'freeze', body), 'freeze is centred on the body (halfway between feet and head)');
  ok(placedAt(calls, 'trap', body), 'trap is centred on the body');
  // Layering on the body: the minor (trap) is drawn before the major (freeze) in each frame.
  const bodyOrder = calls
    .filter((call) => /status\/(trap|freeze)\.png/.test(call.source || '') && Math.abs(call.dest[0] - body.x) < 60)
    .map((call) => call.source);
  ok(
    bodyOrder.length >= 2 && bodyOrder.every((source, index) => (index % 2 ? /freeze/ : /trap/).test(source)),
    'on a shared spot the major draws on top of the minor (trap then freeze, every frame)'
  );
  // Three raised stats: each on the 3 art-pixel circle round the body centre, one per stat colour.
  const threeOffsets = [0, 1, 2].map((index) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * index) / 3;
    return [STAT_SPREAD * Math.cos(angle), STAT_SPREAD * Math.sin(angle)];
  });
  ok(
    ['atk', 'def', 'spe'].every((stat, index) => placedAt(calls, 'stats/stat-up-' + stat, stats, threeOffsets[index])),
    'three raised stats: Attack, Defense and Speed streaks, evenly round a 3 px circle on the body'
  );
  ok(
    !calls.some((call) => call.source && /stat-up-ring/.test(call.source)),
    'no ring for stages a Pokemon already had'
  );

  // A new stage gained: the ring plays once, under the sprite (drawn before the Pokemon itself).
  await page.evaluate(() => G.Stages.add(window.__test.stats, 'spa', 1, 999, 6, null, 0, true));
  calls = await recordFrames(400);
  const ringIndex = calls.findIndex((call) => call.source && /stat-up-ring/.test(call.source)),
    spriteIndex = calls.findIndex(
      (call, index) => index > ringIndex && call.source && call.source.startsWith('pokemon/' + stats.dex + '/')
    );
  ok(ringIndex >= 0 && placedAt(calls, 'stat-up-ring', stats), 'a gained stage plays the blue ring at the feet');
  ok(ringIndex >= 0 && spriteIndex > ringIndex, 'the ring is drawn before (under) the sprite');
  await page.waitForTimeout(1300); // past the ring's 1.5 s
  calls = await recordFrames(400);
  ok(
    !calls.some((call) => call.source && /stat-up-ring/.test(call.source)),
    'the ring plays once (gone after its 1.5 s)'
  );

  // You: paralysis plus every minor. No pills on the canvas any more; the chips carry the labels.
  const player = await entityOf('player');
  ok(placedAt(calls, 'confusion', player), 'your confusion floats above your head');
  const headOrder = [];
  for (const call of calls) {
    const match = call.source && /status\/(drowsy|daze|confusion)\.png/.exec(call.source);
    if (match && Math.abs(call.dest[0] + call.dest[2] / 2 - player.x) < 2 && !headOrder.includes(match[1]))
      headOrder.push(match[1]);
  }
  ok(headOrder.join(',') === 'drowsy,daze,confusion', 'above the head, bottom to top: drowsy, daze, confusion');
  ok(
    !calls.some((call) => call.text && /^(PAR|CNF|DZE|TRP|SLW|BRN|PSN|TOX|FRZ|SLP)$/.test(call.text)),
    'no 3-letter status pills drawn on the canvas'
  );
  const chips = await page.evaluate(() =>
    [...document.querySelectorAll('.hud-chips .hud-chip')].map((chip) => {
      const label = chip.querySelector('.hud-text');
      return { label: label.textContent, colour: getComputedStyle(label).color };
    })
  );
  ok(
    chips.map((chip) => chip.label).join(',') === 'PAR,CNF,DZE,TRP,DRW',
    'character panel chips: the major first, then the minors (' + chips.map((chip) => chip.label).join(',') + ')'
  );
  ok(chips[1] && chips[1].colour === 'rgb(216, 176, 0)', 'a minor chip is hollow: its text takes the rim colour');
  ok(chips[0] && chips[0].colour === 'rgb(255, 255, 255)', 'the major chip keeps its white text');

  if (SHOTS) {
    fs.mkdirSync(SHOTS, { recursive: true });
    await page.screenshot({ path: path.join(SHOTS, 'status-fx.png') });
    await page
      .locator('.hud-chips')
      .screenshot({ path: path.join(SHOTS, 'status-chips.png') })
      .catch(() => {});
  }

  // Frame rate in a dense wave: 300 enemies, every one with a status and a stat change, against the same wave bare.
  const frameMs = (withStatuses) =>
    page.evaluate(async (on) => {
      G.EnemyMgr.clear();
      const you = G.Game.player,
        bag = G.Enemies.bagAt(0);
      for (let index = 0; index < 300; index++) {
        const angle = index * 2.4,
          reach = 60 + (index % 30) * 14;
        const enemy = new G.Enemy(
          bag[index % bag.length],
          you.x + Math.cos(angle) * reach,
          you.y + Math.sin(angle) * reach * 0.6,
          G.Enemies.scale(0)
        );
        enemy.maxHp = enemy.hp = 1e9;
        enemy.spd = 0;
        if (on) {
          if (index % 3 === 0) [enemy.burn, enemy.burnLeft, enemy.burnTick] = [1, 999, 999];
          else if (index % 3 === 1) enemy.stCnf = { t: 999, wa: 0, wt: 1 };
          else enemy.stMajor = { k: 'paralysis', t: 999 };
          G.Stages.add(enemy, index % 2 ? 'atk' : 'spe', index % 2 ? 1 : -1, 999, 6, null, 0, true);
        }
        G.EnemyMgr.add(enemy);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      const stamps = [];
      await new Promise((resolve) => {
        const tick = (now) => {
          stamps.push(now);
          if (stamps.length < 180) requestAnimationFrame(tick);
          else resolve();
        };
        requestAnimationFrame(tick);
      });
      return (stamps[stamps.length - 1] - stamps[0]) / (stamps.length - 1);
    }, withStatuses);
  const bare = await frameMs(false),
    busy = await frameMs(true);
  console.log(
    'info  300 enemies: ' +
      bare.toFixed(1) +
      ' ms a frame bare, ' +
      busy.toFixed(1) +
      ' ms with statuses and stat changes'
  );
  ok(busy < bare * 1.25 + 2, 'statuses on a dense wave cost no visible frame rate');

  ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close();
  console.log(failures ? 'smoke-status-fx: ' + failures + ' FAILED' : 'smoke-status-fx: all passed');
  process.exit(failures ? 1 : 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
