/* ============ mosaic.js: the animated mosaic background (G.Lib.Mosaic; #168) ============
 *   background.mosaic  a grid of tiles lit by two slowly drifting lights, each tile flickering on its own. Nothing the
 *                      player does moves it; only burst(type), one level up, does: a starburst in the type's colour cuts
 *                      the light and pushes a water surface, whose waves then show in the light.
 * Look, values and rules: decision 2026-11-23-168-mosaic-background-look-and-settings; tuned on the board (tools/library,
 * Backgrounds), which runs this file. First mounted by the Team menu (#167). WebGL; without it the base colour shows.
 * The page's clock, canvas and media query come in by `page`, so docs/proposals/mosaic-harness.js runs it in Node.
 */
G.Lib = G.Lib || {};
G.Lib.Mosaic = (() => {
  const MAX_FPS = 30;
  const FRAME_SLACK_MS = 4; // a frame this early still draws, so a 60 Hz screen gives a steady 30
  const LONGEST_STEP_SECONDS = 0.1; // after a pause (a hidden tab) the pattern goes on from where it was
  const STILL_SECONDS = 12; // the moment a still frame shows, and where the clocks start
  const MOSAIC_MAX_BURSTS = 4; // quick level ups overlap; past this the oldest burst makes way
  const BURST_ORIGIN = { x: 0.848, y: 0.14 }; // under the detail panel's top: share of the screen from the top left
  const COLOURS = ['base', 'cool', 'warm', 'accent'];
  const MOSAIC_DEFAULTS = Object.freeze({
    base: 'color.grey.ink',
    cool: 'color.blue.dark',
    warm: 'color.teal.dark',
    accent: 'color.teal.base',
    driftSpeed: 1.5,
    flickerSpeed: 0.85,
    flickerAmount: 0.2,
    brightness: 0.5,
    accentAmount: 1,
    tileSize: 6,
    tileGap: 3,
    tileRounding: 0.2,
    steps: 12,
    burstSeconds: 4,
    burstSpeed: 0.45,
    burstWidth: 0.07,
    burstRays: 12,
    burstRayReach: 0.35,
    burstBrightness: 1,
    burstCut: 0.85,
    wavePush: 2,
    waveRings: 2,
    waveSpeed: 0.45,
    waveSettle: 0.2,
    waveLight: 2,
    waveBend: 0.3,
  });
  const NUMBERS = Object.keys(MOSAIC_DEFAULTS).filter((name) => !COLOURS.includes(name));
  const IN_PIXELS = ['tileSize', 'tileGap']; // never scaled with the screen, only with its pixel density

  const MOSAIC_VERTEX = `attribute vec2 corner;
void main() { gl_Position = vec4(corner, 0.0, 1.0); }`;
  const MOSAIC_FRAGMENT = `precision highp float;
#define MAX_BURSTS ${MOSAIC_MAX_BURSTS}
uniform vec2 screenSize;
uniform float driftTime, flickerTime;
uniform float flickerAmount, brightness, accentAmount, tileSize, tileGap, tileRounding, steps;
uniform float burstSeconds, burstSpeed, burstWidth, burstRays, burstRayReach, burstBrightness, burstCut;
uniform float waveLight, waveBend;
uniform sampler2D water; // red the height, green and blue the slope; a half is level
uniform vec3 base, cool, warm, accent;
uniform vec2 burstOrigin;
uniform float burstAge[MAX_BURSTS]; // below 0: not running
uniform vec3 burstColour[MAX_BURSTS], burstTip[MAX_BURSTS];

float tileRandom(vec2 tile) { return fract(sin(dot(mod(tile, 512.0), vec2(41.3, 289.1))) * 9173.7); }
float smoothNoise(vec2 point) {
  vec2 corner = floor(point);
  vec2 blend = smoothstep(0.0, 1.0, fract(point));
  float lower = mix(tileRandom(corner), tileRandom(corner + vec2(1.0, 0.0)), blend.x);
  float upper = mix(tileRandom(corner + vec2(0.0, 1.0)), tileRandom(corner + vec2(1.0, 1.0)), blend.x);
  return mix(lower, upper, blend.y);
}
float lightAt(vec2 point, vec2 centre, float reach) {
  float away = distance(point, centre) / reach;
  return 1.0 / (1.0 + away * away * 4.0);
}
/** One burst at a point: x the glow of its front and rays, y how much light it cuts. */
vec2 burstAt(vec2 point, float age) {
  vec2 away = point - burstOrigin;
  float distanceOut = max(length(away), 0.001);
  float fade = 1.0 - clamp(age / burstSeconds, 0.0, 1.0);
  float ray = pow(0.5 + 0.5 * cos(atan(away.y, away.x) * burstRays), 3.0);
  float fromFront = distanceOut - age * burstSpeed * (1.0 + burstRayReach * ray);
  float ring = exp(-fromFront * fromFront / (burstWidth * burstWidth));
  float behind = smoothstep(burstWidth, -burstWidth, fromFront);
  float streak = behind * ray * exp(fromFront * 2.5) * 0.7;
  return vec2(max(ring, streak), ring) * fade;
}
void main() {
  vec2 tile = floor(gl_FragCoord.xy / tileSize);
  vec2 point = (tile + 0.5) * tileSize / screenSize.y;
  vec2 middle = vec2(screenSize.x / screenSize.y, 1.0) * 0.5;

  float burstCutHere = 0.0;
  float burstGlow = 0.0;
  vec3 burstLit = vec3(0.0);
  for (int index = 0; index < MAX_BURSTS; index++) {
    if (burstAge[index] < 0.0) continue;
    vec2 burst = burstAt(point, burstAge[index]);
    burstCutHere = max(burstCutHere, burst.y);
    if (burst.x > burstGlow) {
      burstGlow = burst.x;
      burstLit = mix(burstColour[index], burstTip[index], smoothstep(0.6, 1.0, burst.x));
    }
  }
  vec3 surface = texture2D(water, point * vec2(screenSize.y / screenSize.x, 1.0)).rgb * 2.0 - 1.0;
  point += surface.gb * waveBend;

  vec2 first = middle + vec2(middle.x * 0.8 * sin(driftTime * 0.11), 0.32 * cos(driftTime * 0.17));
  vec2 second = middle + vec2(middle.x * 0.9 * cos(driftTime * 0.07 + 1.3), 0.38 * sin(driftTime * 0.13 + 2.1));
  float clouds = smoothNoise(point * 3.5 + vec2(driftTime * 0.09, -driftTime * 0.06)) * 0.65
    + smoothNoise(point * 8.0 - vec2(driftTime * 0.05, driftTime * 0.08)) * 0.35;
  float light = (lightAt(point, first, 0.75) + lightAt(point, second, 0.55) * 0.8) * (0.35 + clouds);
  light = light * (1.0 + surface.r * waveLight) + max(surface.r, 0.0) * waveLight * 0.6;
  light *= 1.0 - burstCut * burstCutHere;

  float own = tileRandom(tile);
  light *= 1.0 - flickerAmount * (0.5 + 0.5 * sin(flickerTime * (0.6 + own * 1.8) + own * 63.0));
  light = floor(clamp(light, 0.0, 1.0) * steps + 0.5) / steps;

  vec3 lit = mix(mix(cool, warm, smoothstep(0.3, 0.7, clouds)), accent, accentAmount * light);
  vec3 tileColour = mix(base, lit, clamp(light * brightness, 0.0, 1.0));
  burstGlow = floor(clamp(burstGlow, 0.0, 1.0) * steps + 0.5) / steps;
  tileColour = mix(tileColour, burstLit, clamp(burstGlow * burstBrightness, 0.0, 1.0));

  vec2 fromMiddle = abs(mod(gl_FragCoord.xy, tileSize) - tileSize * 0.5);
  float halfTile = max(tileSize - tileGap, 1.0) * 0.5;
  float radius = halfTile * 2.0 * tileRounding;
  vec2 outside = fromMiddle - (halfTile - radius);
  float edge = length(max(outside, 0.0)) + min(max(outside.x, outside.y), 0.0) - radius;
  gl_FragColor = vec4(mix(base, tileColour, clamp(0.5 - edge, 0.0, 1.0)), 1.0);
}`;

  /** The compiled mosaic program, or null (with the reason in the console) when a shader does not build. */
  function mosaicProgram(gl) {
    const program = gl.createProgram();
    for (const [kind, source] of [
      [gl.VERTEX_SHADER, MOSAIC_VERTEX],
      [gl.FRAGMENT_SHADER, MOSAIC_FRAGMENT],
    ]) {
      const shader = gl.createShader(kind);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) console.error('[mosaic]', gl.getShaderInfoLog(shader));
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
  }

  // ---------- the water: a height per cell, stepped by the wave equation; the screen's edges reflect ----------
  const WATER_ROWS = 72;
  const WATER_STEP_SECONDS = 1 / 120;
  const WATER_PUSH = 45; // how hard a front at push 1 presses the surface down, in heights per second squared
  const WATER_BOB = 4; // how much harder the bobbing centre presses than the front
  const WATER_BOB_WIDTH = 0.6; // the centre's size, as a share of the front's width
  const WATER_CALM = 0.002; // below this everywhere, with no burst running, the surface is level and rests
  const WATER_SLOPE_SCALE = 4; // a slope of this many steps between cells fills its byte
  const WATER_LEVEL_BYTE = 128;
  const waterByte = (value) => WATER_LEVEL_BYTE + Math.round(Math.max(-1, Math.min(1, value)) * 127);

  /** A level water surface of WATER_ROWS rows and as many columns as the screen's shape needs. */
  function makeWater(aspect) {
    const columns = Math.max(2, Math.round(WATER_ROWS * aspect)),
      cells = columns * WATER_ROWS;
    return {
      columns,
      heights: new Float32Array(cells),
      speeds: new Float32Array(cells),
      pixels: new Uint8Array(cells * 4).fill(WATER_LEVEL_BYTE),
      moving: false,
      owedSeconds: 0,
      star: null,
    };
  }
  /** Every cell's distance from the burst's origin and its share of a ray: the star shape, worked out once per surface. */
  function starOf(water, rays) {
    if (water.star && water.star.rays === rays) return water.star;
    const cells = water.columns * WATER_ROWS,
      star = { rays, distances: new Float32Array(cells), rayShares: new Float32Array(cells) };
    const originX = (BURST_ORIGIN.x * water.columns) / WATER_ROWS,
      originY = 1 - BURST_ORIGIN.y;
    for (let row = 0; row < WATER_ROWS; row++)
      for (let column = 0; column < water.columns; column++) {
        const cell = row * water.columns + column,
          awayX = (column + 0.5) / WATER_ROWS - originX,
          awayY = (row + 0.5) / WATER_ROWS - originY;
        star.distances[cell] = Math.hypot(awayX, awayY);
        star.rayShares[cell] = Math.pow(0.5 + 0.5 * Math.cos(Math.atan2(awayY, awayX) * rays), 3);
      }
    water.star = star;
    return star;
  }
  /** Presses the surface down at a burst's front and lifts it on both sides (a bow wave), rays included; its centre
   * bobs, which sends rings out after it (the shader's burstAt draws the same front). */
  function pressWater(water, burst, settings) {
    const { burstSeconds, burstSpeed, burstRays, burstRayReach, burstWidth, wavePush, waveRings } = settings;
    const { distances, rayShares } = starOf(water, burstRays);
    const fade = Math.max(0, 1 - burst.age / burstSeconds),
      bob = Math.cos(burst.age * waveRings * 2 * Math.PI),
      press = WATER_PUSH * wavePush * fade * WATER_STEP_SECONDS;
    for (let cell = 0; cell < distances.length; cell++) {
      const front = burst.age * burstSpeed * (1 + burstRayReach * rayShares[cell]),
        fromFront = (distances[cell] - front) / burstWidth,
        fromCentre = distances[cell] / (burstWidth * WATER_BOB_WIDTH);
      let pressed = 0;
      if (Math.abs(fromFront) < 3) pressed += (1 - 2 * fromFront * fromFront) * Math.exp(-fromFront * fromFront);
      if (waveRings && fromCentre < 3) pressed += WATER_BOB * bob * Math.exp(-fromCentre * fromCentre);
      if (pressed) water.speeds[cell] -= press * pressed;
    }
  }
  /** One step of the wave equation, with the waves settling. Returns the tallest height. */
  function stepWater({ columns, heights, speeds }, settings) {
    const pull = Math.pow(settings.waveSpeed * WATER_ROWS, 2) * WATER_STEP_SECONDS,
      kept = Math.exp(-settings.waveSettle * WATER_STEP_SECONDS);
    for (let row = 0; row < WATER_ROWS; row++)
      for (let column = 0; column < columns; column++) {
        const cell = row * columns + column,
          height = heights[cell];
        const left = column > 0 ? heights[cell - 1] : height,
          right = column < columns - 1 ? heights[cell + 1] : height,
          below = row > 0 ? heights[cell - columns] : height,
          above = row < WATER_ROWS - 1 ? heights[cell + columns] : height;
        speeds[cell] = (speeds[cell] + (left + right + below + above - 4 * height) * pull) * kept;
      }
    // water is neither made nor lost: the average stays level, so a burst never leaves the light dimmer
    let heightSum = 0,
      speedSum = 0;
    for (let cell = 0; cell < heights.length; cell++) {
      heightSum += heights[cell];
      speedSum += speeds[cell];
    }
    const extraHeight = heightSum / heights.length,
      extraSpeed = speedSum / heights.length;
    let tallest = 0;
    for (let cell = 0; cell < heights.length; cell++) {
      speeds[cell] -= extraSpeed;
      heights[cell] = (heights[cell] - extraHeight + speeds[cell] * WATER_STEP_SECONDS) * kept;
      tallest = Math.max(tallest, Math.abs(heights[cell]));
    }
    return tallest;
  }
  /** Writes the surface as bytes for the shader: the height, then its slope across and up. */
  function paintWater({ columns, heights, pixels }) {
    for (let row = 0; row < WATER_ROWS; row++)
      for (let column = 0; column < columns; column++) {
        const cell = row * columns + column;
        const left = heights[column > 0 ? cell - 1 : cell],
          right = heights[column < columns - 1 ? cell + 1 : cell],
          below = heights[row > 0 ? cell - columns : cell],
          above = heights[row < WATER_ROWS - 1 ? cell + columns : cell];
        pixels[cell * 4] = waterByte(heights[cell]);
        pixels[cell * 4 + 1] = waterByte((right - left) * WATER_SLOPE_SCALE);
        pixels[cell * 4 + 2] = waterByte((above - below) * WATER_SLOPE_SCALE);
      }
  }
  /** Moves the water on by `seconds`. Returns whether the surface changed (a level surface costs nothing). */
  function moveWater(water, seconds, bursts, settings) {
    if (!bursts.length && !water.moving) return false;
    let tallest = 0;
    water.owedSeconds += seconds;
    while (water.owedSeconds >= WATER_STEP_SECONDS) {
      water.owedSeconds -= WATER_STEP_SECONDS;
      for (const burst of bursts) pressWater(water, burst, settings);
      tallest = stepWater(water, settings);
      water.moving = true;
    }
    if (!bursts.length && tallest < WATER_CALM) {
      water.heights.fill(0);
      water.speeds.fill(0);
      water.moving = false;
    }
    paintWater(water);
    return true;
  }

  // ---------- the graphics ----------
  const PLACES = ['screenSize', 'driftTime', 'flickerTime', 'burstOrigin', 'burstAge', 'burstColour', 'burstTip'];
  /** The canvas's graphics, ready to draw: { gl, places }, or null with no WebGL. */
  function openGraphics(canvas) {
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false });
    const program = gl && mosaicProgram(gl);
    if (!program) return null;
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); // one triangle over it all
    const corner = gl.getAttribLocation(program, 'corner');
    gl.enableVertexAttribArray(corner);
    gl.vertexAttribPointer(corner, 2, gl.FLOAT, false, 0, 0);
    gl.useProgram(program);
    const places = {};
    for (const name of [...Object.keys(MOSAIC_DEFAULTS), ...PLACES])
      places[name] = gl.getUniformLocation(program, name);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture()); // unit 0, where the water sampler looks by default
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return { gl, places };
  }
  const rgbOf = (hex) => [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);

  /**
   * Starts the mosaic inside `host` (an element filling the area it covers) and returns { burst(type), stop(), running(),
   * bursts() }. Only one start may be live per host: stop the last one first.
   *   settings   MOSAIC_DEFAULTS' keys, read on every frame (the tuning page changes them live)
   *   still      one frame and no loop (the static setting, or the computer asks for reduced motion)
   *   starburst  false: burst() does nothing
   *   isWanted   () => whether to go on; false stops it by itself (the screen was closed some other way)
   *   colourOf   a colour's hex from its name; onFrame(now, canvas): after each drawn frame
   */
  function start(host, options = {}, page = window) {
    const settings = options.settings || MOSAIC_DEFAULTS,
      colourOf = options.colourOf || G.Tokens.color,
      isWanted = options.isWanted || (() => true),
      still = !!options.still || page.matchMedia('(prefers-reduced-motion: reduce)').matches,
      starburst = options.starburst !== false && !still;
    const canvas = page.document.createElement('canvas');
    canvas.className = 'mosaic-canvas';
    host.style.background = colourOf(settings.base); // what shows without WebGL
    host.appendChild(canvas);
    const graphics = openGraphics(canvas);
    let live = !!graphics,
      frameRequest = 0,
      bursts = [], // the running bursts, oldest first: { age (seconds), type }
      water = null,
      driftTime = STILL_SECONDS,
      flickerTime = STILL_SECONDS,
      lastDraw = page.performance.now();

    function fit() {
      const pixelScale = page.devicePixelRatio || 1,
        width = Math.max(1, Math.round(canvas.clientWidth * pixelScale)),
        height = Math.max(1, Math.round(canvas.clientHeight * pixelScale));
      if (water && canvas.width === width && canvas.height === height) return;
      canvas.width = width;
      canvas.height = height;
      water = makeWater(width / height); // a new shape starts level
      sendWater();
    }
    function sendWater() {
      const { gl } = graphics;
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, water.columns, WATER_ROWS, 0, gl.RGBA, gl.UNSIGNED_BYTE, water.pixels);
    }
    function sendBursts() {
      const { gl, places } = graphics,
        ages = new Array(MOSAIC_MAX_BURSTS).fill(-1),
        colours = new Array(MOSAIC_MAX_BURSTS * 3).fill(0),
        tips = [...colours];
      bursts.forEach((burst, index) => {
        ages[index] = burst.age;
        colours.splice(index * 3, 3, ...rgbOf(colourOf(`color.type.${burst.type}.base`)));
        tips.splice(index * 3, 3, ...rgbOf(colourOf(`color.type.${burst.type}.light`)));
      });
      gl.uniform2f(places.burstOrigin, (BURST_ORIGIN.x * canvas.width) / canvas.height, 1 - BURST_ORIGIN.y);
      gl.uniform1fv(places.burstAge, ages);
      gl.uniform3fv(places.burstColour, colours);
      gl.uniform3fv(places.burstTip, tips);
    }
    function draw() {
      const { gl, places } = graphics,
        pixelScale = page.devicePixelRatio || 1;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(places.screenSize, canvas.width, canvas.height);
      gl.uniform1f(places.driftTime, driftTime);
      gl.uniform1f(places.flickerTime, flickerTime);
      for (const name of COLOURS) gl.uniform3fv(places[name], rgbOf(colourOf(settings[name])));
      for (const name of NUMBERS)
        gl.uniform1f(places[name], settings[name] * (IN_PIXELS.includes(name) ? pixelScale : 1));
      sendBursts();
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    function drawStill() {
      if (!live) return;
      fit();
      draw();
    }
    function frame(now) {
      if (!live) return;
      if (!isWanted() || !canvas.isConnected) return stop();
      frameRequest = page.requestAnimationFrame(frame);
      if (now - lastDraw < 1000 / MAX_FPS - FRAME_SLACK_MS) return;
      const seconds = Math.min((now - lastDraw) / 1000, LONGEST_STEP_SECONDS);
      lastDraw = now;
      for (const burst of bursts) burst.age += seconds;
      bursts = bursts.filter((burst) => burst.age < settings.burstSeconds);
      // the clocks advance by speed, so changing a speed never makes the pattern jump
      driftTime += seconds * settings.driftSpeed;
      flickerTime += seconds * settings.flickerSpeed;
      fit();
      if (moveWater(water, seconds, bursts, settings)) sendWater();
      draw();
      if (options.onFrame) options.onFrame(now, canvas);
    }
    /** Stops it, frees the graphics context and takes the canvas away. */
    function stop() {
      page.removeEventListener('resize', drawStill);
      if (live) {
        live = false;
        page.cancelAnimationFrame(frameRequest);
        const contextLoser = graphics.gl.getExtension('WEBGL_lose_context');
        if (contextLoser) contextLoser.loseContext();
      }
      canvas.remove();
    }
    /** One level up: one starburst in the type's colours. */
    function burst(type) {
      if (live && starburst) bursts = [...bursts, { age: 0, type }].slice(-MOSAIC_MAX_BURSTS);
    }

    if (!live) canvas.hidden = true;
    else if (still) {
      drawStill();
      page.addEventListener('resize', drawStill);
    } else frameRequest = page.requestAnimationFrame(frame);
    return {
      burst,
      stop,
      running: () => live,
      bursts: () => bursts.length,
      waterMoving: () => !!water && water.moving,
    };
  }

  return { ready: true, DEFAULTS: MOSAIC_DEFAULTS, start };
})();
