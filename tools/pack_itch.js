/* Packs an itch.io-ready HTML5 bundle: dist/pokesurvivor-alpha.zip
 *   node tools/pack_itch.js
 *
 * The zip has index.html at its ROOT (itch requires a root-level index.html)
 * and contains ONLY the files the browser build needs at runtime. Everything
 * else (dev.html, js/ source, docs, tools, configs, raw art, service worker)
 * is excluded.
 *
 * Flags:
 *   --no-build   Skip running tools/build.js (use the current index.html / app.min.js as-is).
 *   --with-sw    Include sw.js in the zip. OFF by default: on itch the service worker's
 *                cache-first asset handling causes testers to see stale builds after a push.
 *   --keep-seo   Build WITHOUT --sin-seo, leaving the pokesurvivor.com canonical/social tags in.
 *                Default strips them (passes --sin-seo to build.js), since the alpha is not on that domain.
 *
 * After it runs, push to itch with butler:
 *   butler push dist/pokesurvivor-alpha.zip <user>/<project>:html-alpha
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const archiver = require('archiver');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const OUT_ZIP = path.join(DIST, 'pokesurvivor-alpha.zip');

const NO_BUILD = process.argv.includes('--no-build');
const WITH_SW = process.argv.includes('--with-sw');
const KEEP_SEO = process.argv.includes('--keep-seo');

// --- 1. Build (unless skipped) -------------------------------------------
if (!NO_BUILD) {
  const buildArgs = [path.join('tools', 'build.js')];
  if (!KEEP_SEO) buildArgs.push('--sin-seo');
  console.log(`> node ${buildArgs.join(' ')}`);
  execFileSync(process.execPath, buildArgs, { cwd: ROOT, stdio: 'inherit' });
} else {
  console.log('> skipping build (--no-build)');
}

// --- 2. The runtime bundle -----------------------------------------------
// Individual files that must be in the zip (relative to ROOT).
const INCLUDE_FILES = [
  'index.html',
  'js/app.min.js',
  'version.json',
  'manifest.webmanifest',
  'favicon.ico',
];
// Whole directories shipped as-is.
const INCLUDE_DIRS = [
  'css',
  'assets/fonts',
  'assets/icons',
  'assets/items',
  'assets/pokemon',
  'assets/projectiles',
  'assets/tileset',
];
if (WITH_SW) INCLUDE_FILES.push('sw.js');

// --- 3. Preflight: every listed path must exist --------------------------
const missing = [];
for (const f of INCLUDE_FILES) if (!fs.existsSync(path.join(ROOT, f))) missing.push(f);
for (const d of INCLUDE_DIRS) if (!fs.existsSync(path.join(ROOT, d))) missing.push(d + '/');
if (missing.length) {
  console.error('ERROR: expected build outputs are missing:\n  ' + missing.join('\n  '));
  console.error('Did tools/build.js run? (omit --no-build to build first.)');
  process.exit(1);
}

// --- 4. Zip it -----------------------------------------------------------
fs.mkdirSync(DIST, { recursive: true });
if (fs.existsSync(OUT_ZIP)) fs.unlinkSync(OUT_ZIP);

const output = fs.createWriteStream(OUT_ZIP);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  const kb = (archive.pointer() / 1024).toFixed(0);
  const mb = (archive.pointer() / 1048576).toFixed(2);
  console.log('');
  console.log(`ok: dist/pokesurvivor-alpha.zip  (${kb} KB / ${mb} MB, ${fileCount} files)`);
  console.log(`    service worker: ${WITH_SW ? 'INCLUDED' : 'excluded'} \u00b7 SEO tags: ${KEEP_SEO ? 'kept' : 'stripped'}`);
  console.log('');
  console.log('Push to itch (set <user>/<project> to your real slug):');
  console.log('    butler push dist/pokesurvivor-alpha.zip <user>/<project>:html-alpha');
});
archive.on('warning', err => { if (err.code === 'ENOENT') console.warn(err); else throw err; });
archive.on('error', err => { throw err; });

let fileCount = 0;
archive.on('entry', () => { fileCount++; });

archive.pipe(output);
for (const f of INCLUDE_FILES) archive.file(path.join(ROOT, f), { name: f });
for (const d of INCLUDE_DIRS) archive.directory(path.join(ROOT, d), d);
archive.finalize();
