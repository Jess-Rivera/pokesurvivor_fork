/* ============ confetti.js: the level-up confetti over the card screen (#62) ============
 * When the level-up cards pop up, confetti bursts up and out of the popup's two top corners and showers down the whole
 * screen (Jess, 2026-11-10). It is drawn on its own canvas above the screens and runs on its own animation frames, so it
 * keeps playing while the game is paused under the cards. Once the screen closes (a card picked), whatever is still
 * falling fades out over 1 s.
 *
 * Pixel art: pieces are 2 px blocks on a 2 px grid, flat palette colours, no smoothing. Purely visual; it reads nothing
 * from the game but the graphics quality (G.Settings.fx) for the piece count.
 */
G.Confetti = (() => {
  // HUD-STYLE palette: Lv yellow, EXP blue, HP green, bond pink, white
  const COLOURS = ['#f3b200', '#00baf3', '#00fb49', '#ff8ad8', '#ffffff'];
  const PIECES_PER_CORNER = 45,
    QUALITY_SHARE = [0.35, 0.65, 1], // low, medium, high, as the game's particles (js/entities/fx.js)
    GRID = 2, // px: the HUD's art pixel
    LAUNCH_SPEED = [420, 820], // px/s
    LAUNCH_ANGLE = [10, 65], // degrees out from straight up, away from the popup
    GRAVITY = 900, // px/s/s
    AIR_DRAG = 2.2, // per second: quickly slows the launch
    FALL_SPEED = [150, 260], // px/s: the flutter-down speed each piece settles to
    FLUTTER = [8, 22], // px: the side-to-side sway while falling
    FADE_TIME = 1; // s: after the screen closes

  let canvas = null,
    context = null,
    pieces = [],
    running = false,
    lastFrame = 0,
    watchedScreen = null,
    fadeLeft = 0; // > 0 while fading out

  const random = (range) => range[0] + Math.random() * (range[1] - range[0]);
  const snap = (value) => Math.round(value / GRID) * GRID;

  function ensureCanvas() {
    if (canvas) return;
    canvas = document.createElement('canvas');
    canvas.className = 'confetti-layer';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    context = canvas.getContext('2d');
  }

  function resize() {
    if (canvas.width !== innerWidth || canvas.height !== innerHeight) {
      canvas.width = innerWidth;
      canvas.height = innerHeight;
    }
  }

  /** One corner's burst: side -1 throws up and to the left, +1 up and to the right. */
  function launch(x, y, side, count) {
    for (let i = 0; i < count; i++) {
      const angle = (random(LAUNCH_ANGLE) * Math.PI) / 180,
        speed = random(LAUNCH_SPEED);
      pieces.push({
        x,
        y,
        vx: side * Math.sin(angle) * speed,
        vy: -Math.cos(angle) * speed,
        fall: random(FALL_SPEED),
        sway: random(FLUTTER),
        swayRate: random([2.5, 5]),
        phase: Math.random() * Math.PI * 2,
        spin: random([6, 14]) * (Math.random() < 0.5 ? -1 : 1), // the tumble: the piece's width flips as it turns
        width: Math.random() < 0.5 ? 2 : 3, // in grid blocks
        height: Math.random() < 0.5 ? 3 : 4,
        colour: COLOURS[Math.floor(Math.random() * COLOURS.length)],
        age: 0,
      });
    }
  }

  /**
   * Burst from the top corners of a screen's popup box (its layout box, so the box's pop-in scale does not move the
   * corners). screenId: the screen whose closing starts the fade.
   */
  function burstFrom(screenId) {
    const screen = document.getElementById(screenId),
      box = screen && screen.querySelector('.box');
    if (!box) return;
    ensureCanvas();
    resize();
    const quality = G.Settings && G.Settings.fx != null ? G.Settings.fx : 2,
      count = Math.max(4, Math.round(PIECES_PER_CORNER * (QUALITY_SHARE[quality] || 1)));
    // the box is laid out inside the fixed, full-screen .scr, so its offsets are screen coordinates
    const left = box.offsetLeft,
      top = box.offsetTop,
      right = left + box.offsetWidth;
    launch(left, top, -1, count);
    launch(right, top, 1, count);
    watchedScreen = screen;
    fadeLeft = 0;
    if (!running) {
      running = true;
      lastFrame = performance.now();
      requestAnimationFrame(frame);
    }
  }

  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;
    resize();
    // the screen closed: fade out what is left over FADE_TIME
    if (watchedScreen && watchedScreen.classList.contains('hidden') && fadeLeft === 0) fadeLeft = FADE_TIME;
    if (fadeLeft > 0) {
      fadeLeft = Math.max(0, fadeLeft - dt);
      if (fadeLeft === 0) pieces = [];
    }
    const drag = Math.exp(-AIR_DRAG * dt);
    for (const piece of pieces) {
      piece.age += dt;
      piece.vx *= drag;
      piece.vy = Math.min(piece.fall, piece.vy * drag + GRAVITY * dt); // falls no faster than its flutter speed
      piece.x += piece.vx * dt;
      piece.y += piece.vy * dt;
    }
    pieces = pieces.filter((piece) => piece.y < canvas.height + 16);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.globalAlpha = fadeLeft > 0 ? fadeLeft / FADE_TIME : 1;
    for (const piece of pieces) {
      // sway only once it falls, so the launch reads as a clean burst
      const falling = Math.min(1, piece.age / 0.6),
        x = piece.x + Math.sin(piece.phase + piece.age * piece.swayRate) * piece.sway * falling,
        turn = Math.abs(Math.cos(piece.phase + piece.age * piece.spin)),
        width = Math.max(1, Math.round(piece.width * turn)) * GRID;
      context.fillStyle = piece.colour;
      context.fillRect(snap(x) - width / 2, snap(piece.y), width, piece.height * GRID);
    }
    context.globalAlpha = 1;
    if (pieces.length) requestAnimationFrame(frame);
    else {
      running = false;
      watchedScreen = null;
      fadeLeft = 0;
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  /** For the smoke test: how many pieces are in the air, and whether they are fading. */
  const state = () => ({ pieces: pieces.length, fading: fadeLeft > 0 });

  return { burstFrom, state };
})();
