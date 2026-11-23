// tools/library/background-draft.js: the Backgrounds page, the tuning page of background.mosaic (#168). A plain script sharing the
// board's globals; index.html loads the board's files in order, board.js first and start.js last.
'use strict';
// ---------- background.mosaic (Jess 2026-11-23): the Team menu's lowest layer, board only ----------
// A grid of rounded tiles lit by two slowly drifting lights, broken up by noise; each tile also flickers on its own. The
// player's input never touches it; only a level up does (Jess 2026-11-23): a starburst in the Pokemon's primary type
// colour runs out from under the top of the detail panel, cutting through the light like an object through
// water: the surface it pushes carries waves on after it, and they show in the mosaic's own light. Colours come from
// named colours only.
const MOSAIC_MAX_FPS = 30;
const MOSAIC_FRAME_SLACK_MS = 4; // a frame this early still draws, so a 60 Hz screen gives a steady 30
const MOSAIC_LONGEST_STEP_SECONDS = 0.1; // after a pause (a hidden tab) the pattern goes on from where it was
const MOSAIC_STILL_SECONDS = 12; // the moment a still frame shows (reduced motion), and where the clocks start
const MOSAIC_FPS_SAMPLE_MS = 1000;
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
  waveRings: 0,
  waveSpeed: 0.45,
  waveSettle: 0.2,
  waveLight: 2,
  waveBend: 0.3,
});
const MOSAIC_COLOUR_LABELS = { base: 'Base', cool: 'Cool light', warm: 'Warm light', accent: 'Accent' };
const MOSAIC_TYPES = Object.keys(G.Tokens.typeTable('base'));
const MOSAIC_MAX_BURSTS = 4; // quick level ups overlap; past this the oldest burst makes way
const MOSAIC_BURST_ORIGIN = { x: 0.848, y: 0.14 }; // under the detail panel's top: share of the screen from the top left
// [setting, label, lowest, highest, step]
const MOSAIC_SLIDERS = [
  ['driftSpeed', 'Light drift speed', 0, 5, 0.05],
  ['flickerSpeed', 'Tile flicker speed', 0, 5, 0.05],
  ['flickerAmount', 'Tile flicker amount', 0, 1, 0.01],
  ['brightness', 'Brightness', 0, 1.5, 0.01],
  ['accentAmount', 'Accent amount', 0, 1, 0.01],
  ['tileSize', 'Tile size, px', 6, 80, 1],
  ['tileGap', 'Tile gap, px', 0, 12, 0.5],
  ['tileRounding', 'Tile rounding', 0, 0.5, 0.01],
  ['steps', 'Brightness steps', 2, 24, 1],
  ['burstSeconds', 'Burst: seconds', 0.3, 4, 0.1],
  ['burstSpeed', 'Burst: speed', 0.2, 4, 0.05],
  ['burstWidth', 'Burst: width', 0.02, 0.4, 0.01],
  ['burstRays', 'Burst: rays', 3, 32, 1],
  ['burstRayReach', 'Burst: ray reach', 0, 1, 0.01],
  ['burstBrightness', 'Burst: brightness', 0, 1.5, 0.01],
  ['burstCut', 'Burst: cut through light', 0, 1, 0.01],
  ['wavePush', 'Waves: push', 0, 4, 0.05],
  ['waveRings', 'Waves: rings a second', 0, 8, 0.1],
  ['waveSpeed', 'Waves: speed', 0.1, 0.8, 0.01],
  ['waveSettle', 'Waves: settle', 0.2, 5, 0.1],
  ['waveLight', 'Waves: light', 0, 6, 0.05],
  ['waveBend', 'Waves: bend the light', 0, 0.3, 0.005],
];
const mosaicSettings = { ...MOSAIC_DEFAULTS };
let mosaicBursts = []; // the running bursts, oldest first: { age (seconds), type }

// the colours a picker offers: the tokens (Unified first), then the canon sets
const mosaicColourGroups = [
  ...G.Tokens.palettes.map((palette) => ({
    title: palette.title,
    colours: palette.colours.map((token) => [token.name, token.hex]),
  })),
  {
    title: 'Canon sets',
    colours: [...ATTACK_SWATCHES, ...POCKET_SWATCHES, ...STAT_CANON_SWATCHES, ...TIME_SWATCHES].flatMap((swatch) =>
      swatch.colours.map(([tone, , hex]) => [swatch.label + '.' + tone, hex])
    ),
  },
].map((group) => ({ ...group, colours: group.colours.filter(([, hex]) => /^#[0-9a-f]{6}$/i.test(hex)) }));
const mosaicColours = new Map();
for (const group of mosaicColourGroups) for (const [name, hex] of group.colours) mosaicColours.set(name, hex);
const mosaicRgb = (name) => {
  const hex = mosaicColours.get(name);
  return [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
};

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

const MOSAIC_BURST_UNIFORMS = ['burstOrigin', 'burstAge', 'burstColour', 'burstTip'];
/** Ages the bursts and drops the finished ones. */
function ageMosaicBursts(seconds) {
  for (const burst of mosaicBursts) burst.age += seconds;
  mosaicBursts = mosaicBursts.filter((burst) => burst.age < mosaicSettings.burstSeconds);
}
/** One burst in a type's colours, as one level up plays it. */
function startMosaicBurst(type) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  mosaicBursts = [...mosaicBursts, { age: 0, type }].slice(-MOSAIC_MAX_BURSTS);
}
/** The bursts as the shader's arrays: ages (below 0 when unused), then each one's colour and its brighter tip. */
function mosaicBurstArrays() {
  const ages = new Array(MOSAIC_MAX_BURSTS).fill(-1),
    colours = new Array(MOSAIC_MAX_BURSTS * 3).fill(0),
    tips = [...colours];
  mosaicBursts.forEach((burst, index) => {
    ages[index] = burst.age;
    colours.splice(index * 3, 3, ...mosaicRgb(`color.type.${burst.type}.base`));
    tips.splice(index * 3, 3, ...mosaicRgb(`color.type.${burst.type}.light`));
  });
  return { ages, colours, tips };
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
  };
}
/** Presses the surface down at a burst's front and lifts it on both sides (a bow wave), rays included; its centre
 * bobs, which sends rings out after it (the shader's burstAt draws the same front). */
function pressWater(water, burst) {
  const { burstSeconds, burstSpeed, burstRays, burstRayReach, burstWidth, wavePush, waveRings } = mosaicSettings;
  const originX = (MOSAIC_BURST_ORIGIN.x * water.columns) / WATER_ROWS,
    originY = 1 - MOSAIC_BURST_ORIGIN.y,
    fade = Math.max(0, 1 - burst.age / burstSeconds),
    bob = Math.cos(burst.age * waveRings * 2 * Math.PI),
    press = WATER_PUSH * wavePush * fade * WATER_STEP_SECONDS;
  for (let row = 0; row < WATER_ROWS; row++)
    for (let column = 0; column < water.columns; column++) {
      const awayX = (column + 0.5) / WATER_ROWS - originX,
        awayY = (row + 0.5) / WATER_ROWS - originY;
      const distanceOut = Math.hypot(awayX, awayY),
        ray = Math.pow(0.5 + 0.5 * Math.cos(Math.atan2(awayY, awayX) * burstRays), 3);
      const front = burst.age * burstSpeed * (1 + burstRayReach * ray);
      const fromFront = (distanceOut - front) / burstWidth,
        fromCentre = distanceOut / (burstWidth * WATER_BOB_WIDTH);
      let pressed = 0;
      if (Math.abs(fromFront) < 3) pressed += (1 - 2 * fromFront * fromFront) * Math.exp(-fromFront * fromFront);
      if (waveRings && fromCentre < 3) pressed += WATER_BOB * bob * Math.exp(-fromCentre * fromCentre);
      water.speeds[row * water.columns + column] -= press * pressed;
    }
}
/** One step of the wave equation, with the waves settling. Returns the tallest height. */
function stepWater({ columns, heights, speeds }) {
  const pull = Math.pow(mosaicSettings.waveSpeed * WATER_ROWS, 2) * WATER_STEP_SECONDS,
    kept = Math.exp(-mosaicSettings.waveSettle * WATER_STEP_SECONDS);
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
function moveWater(water, seconds) {
  if (!mosaicBursts.length && !water.moving) return false;
  let tallest = 0;
  water.owedSeconds += seconds;
  while (water.owedSeconds >= WATER_STEP_SECONDS) {
    water.owedSeconds -= WATER_STEP_SECONDS;
    for (const burst of mosaicBursts) pressWater(water, burst);
    tallest = stepWater(water);
    water.moving = true;
  }
  if (!mosaicBursts.length && tallest < WATER_CALM) {
    water.heights.fill(0);
    water.speeds.fill(0);
    water.moving = false;
  }
  paintWater(water);
  return true;
}

/** Runs the mosaic on a canvas until the canvas leaves the page, then frees its graphics context. */
function runMosaic(canvas, showStatus) {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false });
  const program = gl && mosaicProgram(gl);
  if (!program) {
    showStatus('no WebGL: base colour only');
    canvas.hidden = true;
    return;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); // one triangle over it all
  const corner = gl.getAttribLocation(program, 'corner');
  gl.enableVertexAttribArray(corner);
  gl.vertexAttribPointer(corner, 2, gl.FLOAT, false, 0, 0);
  gl.useProgram(program);
  const places = {};
  for (const name of [
    ...Object.keys(MOSAIC_DEFAULTS),
    'screenSize',
    'driftTime',
    'flickerTime',
    ...MOSAIC_BURST_UNIFORMS,
  ])
    places[name] = gl.getUniformLocation(program, name);
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture()); // unit 0, where the water sampler looks by default
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  let water = null;
  function sendWater() {
    const { columns, pixels } = water;
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, columns, WATER_ROWS, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  }
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let driftTime = MOSAIC_STILL_SECONDS,
    flickerTime = MOSAIC_STILL_SECONDS,
    lastDraw = performance.now(),
    sampleStart = lastDraw,
    sampleFrames = 0;

  function draw(pixelScale) {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(places.screenSize, canvas.width, canvas.height);
    gl.uniform1f(places.driftTime, driftTime);
    gl.uniform1f(places.flickerTime, flickerTime);
    for (const name of Object.keys(MOSAIC_COLOUR_LABELS)) gl.uniform3fv(places[name], mosaicRgb(mosaicSettings[name]));
    for (const [name] of MOSAIC_SLIDERS) {
      const inPixels = name === 'tileSize' || name === 'tileGap';
      gl.uniform1f(places[name], mosaicSettings[name] * (inPixels ? pixelScale : 1));
    }
    const { ages, colours, tips } = mosaicBurstArrays();
    const originX = (MOSAIC_BURST_ORIGIN.x * canvas.width) / canvas.height;
    gl.uniform2f(places.burstOrigin, originX, 1 - MOSAIC_BURST_ORIGIN.y);
    gl.uniform1fv(places.burstAge, ages);
    gl.uniform3fv(places.burstColour, colours);
    gl.uniform3fv(places.burstTip, tips);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function frame(now) {
    if (!canvas.isConnected) {
      const contextLoser = gl.getExtension('WEBGL_lose_context');
      if (contextLoser) contextLoser.loseContext();
      return;
    }
    requestAnimationFrame(frame);
    if (now - lastDraw < 1000 / MOSAIC_MAX_FPS - MOSAIC_FRAME_SLACK_MS) return;
    const seconds = Math.min((now - lastDraw) / 1000, MOSAIC_LONGEST_STEP_SECONDS);
    lastDraw = now;
    ageMosaicBursts(seconds);
    // the clocks advance by speed, so moving a speed slider never makes the pattern jump
    if (!reducedMotion.matches) {
      driftTime += seconds * mosaicSettings.driftSpeed;
      flickerTime += seconds * mosaicSettings.flickerSpeed;
    }
    const pixelScale = devicePixelRatio || 1;
    const width = Math.max(1, Math.round(canvas.clientWidth * pixelScale)),
      height = Math.max(1, Math.round(canvas.clientHeight * pixelScale));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      water = null; // a new shape starts level
    }
    if (!water) {
      water = makeWater(width / height);
      sendWater();
    }
    if (moveWater(water, seconds)) sendWater();
    draw(pixelScale);
    sampleFrames++;
    if (now - sampleStart < MOSAIC_FPS_SAMPLE_MS) return;
    const fps = Math.round((sampleFrames * 1000) / (now - sampleStart));
    const still = reducedMotion.matches ? ', still (this computer asks for reduced motion)' : '';
    showStatus(`${fps} fps (capped at ${MOSAIC_MAX_FPS}), ${width} x ${height}${still}`);
    sampleStart = now;
    sampleFrames = 0;
  }
  requestAnimationFrame(frame);
}

// ---------- the Team menu stand-in ----------
// [name, left, top, width, height] in percent of the screen (the sketch, with the box tabs as ruled)
const MOSAIC_MENU_BOXES = [
  ['Team', 1.6, 10, 18.6, 77.2],
  ['Search', 21.2, 7.2, 18.2, 5.6],
  ['Filter', 40, 7.2, 14.4, 5.6],
  ['Sort', 55, 7.2, 14.6, 5.6],
  ['Box', 21.2, 14.2, 48.4, 73],
  ['Detail', 70.8, 7.4, 28, 85.2],
  ['Pokedex', 21.2, 88.4, 6, 4.2],
  ['Box 1', 27.6, 88.4, 4.6, 4.2],
  ['Box 2', 32.6, 88.4, 4.6, 4.2],
  ['Box 3', 37.6, 88.4, 4.6, 4.2],
  ['Sell Pokemon', 51, 88.4, 9.4, 4.2],
  ['EXP Bag', 61, 88.4, 8.6, 4.2],
];
const mosaicMenuBox = ([label, left, top, width, height]) =>
  `<div class="mosaic-box" style="left:${left}%;top:${top}%;width:${width}%;height:${height}%">${esc(label)}</div>`;
const mosaicOptions = mosaicColourGroups
  .map((group) => {
    const options = group.colours.map(
      ([name, hex]) => `<option value="${esc(name)}">${esc(name)} ${esc(hex)}</option>`
    );
    return `<optgroup label="${esc(group.title)}">${options.join('')}</optgroup>`;
  })
  .join('');
const mosaicColourRow = ([name, label]) => `<label class="mosaic-control"><span>${esc(label)}</span>
  <i class="mosaic-chip" data-mosaic-chip="${name}"></i>
  <select data-mosaic-setting="${name}">${mosaicOptions}</select></label>`;
const mosaicSliderRow = ([name, label, lowest, highest, step]) => `<label class="mosaic-control">
  <span>${esc(label)}</span><input type="range" data-mosaic-setting="${name}" min="${lowest}" max="${highest}"
  step="${step}"><output data-mosaic-value="${name}"></output></label>`;

function backgroundsPage() {
  return `<h2>Backgrounds</h2>
    <p class="lib-note">background.mosaic (#168), draft, board only. The Team menu's lowest layer: between the teal lines,
      under every panel and button. Only a level up changes it: Level Up plays one burst in the chosen primary type. Changes here last until the page is reloaded; Copy settings
      puts them on the clipboard.</p>
    <div class="mosaic-stage" id="mosaic-stage">
      <canvas class="mosaic-canvas"></canvas>
      <div class="mosaic-bar top"></div><div class="mosaic-bar bottom"></div>
      <div class="mosaic-menu">${MOSAIC_MENU_BOXES.map(mosaicMenuBox).join('')}</div>
    </div>
    <p class="mosaic-tools">
      <select id="mosaic-type">${MOSAIC_TYPES.map((type) => `<option>${esc(type)}</option>`).join('')}</select>
      <button type="button" data-mosaic-do="levelUp">Level Up</button>
      <button type="button" data-mosaic-do="menu">Hide or show the menu</button>
      <button type="button" data-mosaic-do="full">Full screen</button>
      <button type="button" data-mosaic-do="reset">Reset</button>
      <button type="button" data-mosaic-do="copy">Copy settings</button>
      <span class="lib-mono lib-dim" id="mosaic-status"></span></p>
    <div class="mosaic-controls">
      <div>${Object.entries(MOSAIC_COLOUR_LABELS).map(mosaicColourRow).join('')}</div>
      <div>${MOSAIC_SLIDERS.map(mosaicSliderRow).join('')}</div>
    </div>`;
}

/** Shows the settings in the controls, and the base colour behind the canvas (what shows without WebGL). */
function refreshMosaicControls() {
  for (const control of document.querySelectorAll('[data-mosaic-setting]'))
    control.value = mosaicSettings[control.dataset.mosaicSetting];
  for (const output of document.querySelectorAll('[data-mosaic-value]'))
    output.textContent = mosaicSettings[output.dataset.mosaicValue];
  for (const chip of document.querySelectorAll('[data-mosaic-chip]'))
    chip.style.background = mosaicColours.get(mosaicSettings[chip.dataset.mosaicChip]);
  $('mosaic-stage').style.background = mosaicColours.get(mosaicSettings.base);
}
/** Called by start.js once the page's markup is in place. */
function mountBackgrounds() {
  refreshMosaicControls();
  const status = $('mosaic-status');
  runMosaic($('mosaic-stage').querySelector('canvas'), (text) => {
    status.textContent = text;
  });
}
const MOSAIC_ACTIONS = {
  levelUp: () => startMosaicBurst($('mosaic-type').value),
  menu: () => $('mosaic-stage').classList.toggle('menu-hidden'),
  full: () => $('mosaic-stage').requestFullscreen(),
  reset: () => {
    Object.assign(mosaicSettings, MOSAIC_DEFAULTS);
    refreshMosaicControls();
  },
  copy: () => copyName(JSON.stringify(mosaicSettings, null, 2)),
};
document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-mosaic-do]');
  if (button) MOSAIC_ACTIONS[button.dataset.mosaicDo]();
});
document.addEventListener('input', (event) => {
  const name = event.target.dataset.mosaicSetting;
  if (!name) return;
  mosaicSettings[name] = event.target.type === 'range' ? Number(event.target.value) : event.target.value;
  refreshMosaicControls();
});
