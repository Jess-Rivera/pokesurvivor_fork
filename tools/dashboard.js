// tools/dashboard.js: builds the project dashboard (design map, code map, gap list) from the repo's own files.
// Usage: node tools/dashboard.js        writes out/dashboard.html and docs/ASCII Concept Maps/Dashboard.md
// tools/check.js calls build() and verifies it against dev.html and the raw tag counts.
// Nothing here is hand drawn: every node and edge is read from a doc, a decision file, dev.html or a js file.
const fs = require('fs'),
  path = require('path');
const root = path.resolve(__dirname, '..');
const rel = (p) => path.relative(root, p).replace(/\\/g, '/');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const SKIP_DIRS = new Set([
  'node_modules',
  'pokeapi-master',
  'assets',
  'cache',
  'out',
  '.git',
  '_delete_',
  'move_rework_holding',
]);
// History and logs are not specs: their tags and paths describe the past, so they stay out of the design map.
const HISTORY_DOC =
  /(^|\/)(DEVLOG|DECISIONS-archive|DEVLOG-archive|FULL-GAME-STRUCT)[^/]*\.md$|^docs\/decisions\/|^docs\/ASCII Concept Maps\//;
const TAGS = ['Approved', 'Legacy behavior', 'Proposed', 'Open'];
const TAG_PATTERN = /\[(Approved|Legacy behavior|Proposed|Open)\]/g;
const CODE_PATH_PATTERN = /\b(?:js|tools)\/[A-Za-z0-9_\-./]*[A-Za-z0-9_-]\.(?:js|html)\b/g;

// A doc whose first lines say HISTORY or NOT BUILT is a record or a plan, not a live spec: its tags and file names
// describe another time, so it stays out of the design map. (Same habit as the HISTORY notes already in the docs.)
const NOT_LIVE_MARKER = /\b(HISTORY|NOT BUILT)\b/;
// A line that says a file was removed is correct, not a broken reference.
const REMOVAL_WORDS = /\b(removed|deleted|dropped)\b/i;

function listFiles(dir, accept, found = []) {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const relPath = dir ? dir + '/' + entry.name : entry.name;
    if (entry.isDirectory()) listFiles(relPath, accept, found);
    else if (accept(relPath)) found.push(relPath);
  }
  return found;
}

function isLiveSpec(file) {
  if (HISTORY_DOC.test(file)) return false;
  return !read(file)
    .split(/\r?\n/, 8)
    .some((line) => NOT_LIVE_MARKER.test(line));
}
const listSpecFiles = () => listFiles('', (p) => p.endsWith('.md')).filter(isLiveSpec);

// ---- code side ----
function readLoadedScripts() {
  const html = read('dev.html');
  const scripts = [];
  for (const m of html.matchAll(/<script[^>]*\ssrc="(js\/[^"]+)"/g)) scripts.push(m[1]);
  return scripts;
}
const isVendor = (p) => p.startsWith('js/vendor/');
const areaOf = (p) => p.split('/').slice(0, 2).join('/'); // js/core, js/ui, js/systems ...

function buildCodeMap() {
  const scripts = readLoadedScripts();
  const modules = scripts
    .filter((p) => !isVendor(p))
    .map((p, order) => ({ path: p, area: areaOf(p), order, defines: [], uses: new Set() }));
  const definer = new Map(); // G.<name> -> module path that assigns it first
  for (const mod of modules) {
    const source = fs.existsSync(path.join(root, mod.path)) ? read(mod.path) : '';
    mod.missing = !source;
    for (const m of source.matchAll(/\bG\.([A-Za-z_]\w*)\s*=(?!=)/g)) {
      if (!mod.defines.includes(m[1])) mod.defines.push(m[1]);
      if (!definer.has(m[1])) definer.set(m[1], mod.path);
    }
    for (const m of source.matchAll(/\bG\.([A-Za-z_]\w*)/g)) mod.uses.add(m[1]);
  }
  const areaEdges = new Map(); // "from>to" -> count of distinct G names crossing
  for (const mod of modules) {
    const seen = new Set();
    for (const name of mod.uses) {
      const owner = definer.get(name);
      if (!owner || owner === mod.path) continue;
      const ownerArea = areaOf(owner);
      if (ownerArea === mod.area) continue;
      const key = mod.area + '>' + ownerArea + '>' + name;
      if (seen.has(key)) continue;
      seen.add(key);
      const edge = mod.area + '>' + ownerArea;
      areaEdges.set(edge, (areaEdges.get(edge) || 0) + 1);
    }
  }
  const areas = [...new Set(modules.map((m) => m.area))];
  return {
    scripts,
    modules,
    areas: areas.map((a) => ({ name: a, files: modules.filter((m) => m.area === a).length })),
    areaEdges: [...areaEdges].map(([k, n]) => ({ from: k.split('>')[0], to: k.split('>')[1], names: n })),
  };
}

// A Canonical: line is prose ("then docs/HUD-STYLE.md, ..."), so each ".md" mention is resolved by trying the words
// before it from longest to shortest, against the repo root, the doc folders, and finally any file with that name.
let markdownByName = null;
function resolveCanonicalTargets(canonicalText) {
  if (!markdownByName) {
    markdownByName = new Map();
    for (const p of listFiles('', (f) => f.endsWith('.md'))) markdownByName.set(p.split('/').pop(), p);
  }
  const folders = ['', 'docs/', 'docs/current feature planning/', 'docs/ASCII Concept Maps/', 'docs/proposals/'];
  const found = [];
  for (const m of canonicalText.matchAll(/([^;()]*?\.md)/g)) {
    const words = m[1].trim().split(/\s+/);
    let hit = null;
    for (let start = 0; start < words.length && !hit; start++) {
      const candidate = words.slice(start).join(' ');
      hit = folders.map((f) => f + candidate).find((p) => fs.existsSync(path.join(root, p)));
      if (!hit && markdownByName.has(candidate.split('/').pop())) hit = markdownByName.get(candidate.split('/').pop());
    }
    found.push({ mention: m[1].trim(), resolved: hit });
  }
  return found;
}

// ---- design side ----
function buildDesignMap() {
  const specFiles = listSpecFiles();
  const specs = [];
  for (const file of specFiles) {
    const lines = read(file).split(/\r?\n/);
    const counts = Object.fromEntries(TAGS.map((t) => [t, 0]));
    const items = []; // tagged lines worth listing as gaps
    lines.forEach((line, i) => {
      const found = [...line.matchAll(TAG_PATTERN)].map((m) => m[1]);
      for (const tag of found) counts[tag]++;
      if (!found.length) return;
      const codeDiffers = /code differs/i.test(line);
      if (found.includes('Legacy behavior') || found.includes('Open') || codeDiffers)
        items.push({
          file,
          line: i + 1,
          kind: codeDiffers ? 'code differs' : found.includes('Legacy behavior') ? 'legacy' : 'open',
          text: line.replace(TAG_PATTERN, '').replace(/\s+/g, ' ').trim().slice(0, 220),
        });
    });
    const cited = [...new Set(lines.join('\n').match(CODE_PATH_PATTERN) || [])].filter((p) => !/[*{}]/.test(p));
    const citedOnlyAsRemoved = new Set(
      cited.filter((p) => lines.filter((line) => line.includes(p)).every((line) => REMOVAL_WORDS.test(line)))
    );
    const total = TAGS.reduce((s, t) => s + counts[t], 0);
    if (total || cited.length) specs.push({ file, counts, total, items, cited, citedOnlyAsRemoved });
  }
  // decisions: one file each, with a Canonical: line naming the spec that holds the rule
  const decisions = listFiles('docs/decisions', (p) => p.endsWith('.md')).map((file) => {
    const text = read(file);
    const canonical = (text.match(/^Canonical:\s*(.+)$/m) || [])[1] || null;
    const targets = canonical ? resolveCanonicalTargets(canonical) : [];
    return { file, canonical, targets };
  });
  return { specs, decisions };
}

// ---- the gap list: where design and code disagree or one side is silent ----
function buildGaps(code, design) {
  const gaps = [];
  const exists = (p) => fs.existsSync(path.join(root, p));
  const citedAnywhere = new Set(design.specs.flatMap((s) => s.cited));
  for (const spec of design.specs) {
    for (const p of spec.cited)
      if (!exists(p) && !spec.citedOnlyAsRemoved.has(p))
        gaps.push({ type: 'broken reference', where: spec.file, detail: p + ' does not exist' });
    for (const item of spec.items)
      gaps.push({
        type:
          item.kind === 'code differs'
            ? 'approved, not built'
            : item.kind === 'legacy'
              ? 'legacy behavior'
              : 'open question',
        where: item.file + ':' + item.line,
        detail: item.text,
      });
  }
  for (const d of design.decisions) {
    if (!d.canonical) gaps.push({ type: 'decision without spec', where: d.file, detail: 'no Canonical: line' });
    else if (d.targets.some((t) => !t.resolved))
      gaps.push({
        type: 'broken reference',
        where: d.file,
        detail:
          'Canonical names ' +
          d.targets
            .filter((t) => !t.resolved)
            .map((t) => t.mention)
            .join(', ') +
          ', which does not exist',
      });
  }
  for (const mod of code.modules) {
    if (mod.missing)
      gaps.push({ type: 'broken reference', where: 'dev.html', detail: mod.path + ' is loaded but missing on disk' });
    else if (!citedAnywhere.has(mod.path))
      gaps.push({ type: 'code no doc names', where: mod.path, detail: 'no spec cites this file' });
  }
  return gaps;
}

function build() {
  const code = buildCodeMap();
  const design = buildDesignMap();
  const gaps = buildGaps(code, design);
  const tagTotals = Object.fromEntries(TAGS.map((t) => [t, design.specs.reduce((s, sp) => s + sp.counts[t], 0)]));
  return { code, design, gaps, tagTotals, builtOn: new Date().toISOString().slice(0, 10) };
}

// ---- Mermaid output (the repo's standard format for maps) ----
const mermaidId = (s) => s.replace(/[^A-Za-z0-9]/g, '_');
function toMarkdown(data) {
  const out = [];
  out.push(
    '# Project dashboard',
    '',
    'Generated by `node tools/dashboard.js` on ' + data.builtOn + '. Do not edit by hand.',
    ''
  );
  out.push('## Requirement tags across the specs', '', '| Tag | Count |', '|---|---|');
  for (const t of TAGS) out.push('| ' + t + ' | ' + data.tagTotals[t] + ' |');
  out.push('', '## Code map: which areas lean on which (count of shared `G` names)', '', '```mermaid', 'flowchart LR');
  for (const a of data.code.areas) out.push('  ' + mermaidId(a.name) + '["' + a.name + ' (' + a.files + ' files)"]');
  for (const e of data.code.areaEdges) out.push('  ' + mermaidId(e.from) + ' -->|' + e.names + '| ' + mermaidId(e.to));
  out.push('```', '');
  out.push('## Design map: specs and the code files they name', '', '```mermaid', 'flowchart LR');
  const ranked = [...data.design.specs].sort((a, b) => b.total - a.total).slice(0, 14);
  const drawnCode = new Set();
  for (const s of ranked) {
    out.push(
      '  ' +
        mermaidId(s.file) +
        '["' +
        s.file +
        '<br/>Approved ' +
        s.counts.Approved +
        ', open ' +
        s.counts.Open +
        ', proposed ' +
        s.counts.Proposed +
        '"]'
    );
    for (const p of s.cited.filter((c) => c.startsWith('js/')).slice(0, 6)) {
      drawnCode.add(p);
      out.push('  ' + mermaidId(s.file) + ' --> ' + mermaidId(p));
    }
  }
  for (const p of drawnCode) out.push('  ' + mermaidId(p) + '("' + p + '")');
  out.push(
    '```',
    '',
    '(Top 14 specs by tag count, up to 6 code files each. The HTML dashboard has the full list.)',
    ''
  );
  const byType = {};
  for (const g of data.gaps) (byType[g.type] = byType[g.type] || []).push(g);
  out.push('## Gap summary', '', '| Kind | Count |', '|---|---|');
  for (const [type, list] of Object.entries(byType).sort((a, b) => b[1].length - a[1].length))
    out.push('| ' + type + ' | ' + list.length + ' |');
  out.push('');
  return out.join('\n');
}

// ---- HTML output (self contained, opens from disk) ----
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function toHtml(data) {
  const { code, design, gaps, tagTotals } = data;
  const areaNames = code.areas.map((a) => a.name);
  const cell = (from, to) => {
    const e = code.areaEdges.find((x) => x.from === from && x.to === to);
    return e
      ? '<td class="n" style="--v:' +
          Math.min(1, e.names / 40) +
          '" title="' +
          esc(from + ' uses ' + e.names + ' names from ' + to) +
          '">' +
          e.names +
          '</td>'
      : '<td></td>';
  };
  const matrix =
    '<table class="matrix"><tr><th>uses &rarr;</th>' +
    areaNames.map((a) => '<th class="rot">' + esc(a) + '</th>').join('') +
    '</tr>' +
    areaNames
      .map(
        (from) =>
          '<tr><th>' +
          esc(from) +
          '</th>' +
          areaNames.map((to) => (from === to ? '<td class="self"></td>' : cell(from, to))).join('') +
          '</tr>'
      )
      .join('') +
    '</table>';
  const specRows = [...design.specs]
    .sort((a, b) => b.total - a.total)
    .map(
      (s) =>
        '<tr><td>' +
        esc(s.file) +
        '</td>' +
        TAGS.map((t) => '<td class="num">' + (s.counts[t] || '') + '</td>').join('') +
        '<td class="num">' +
        s.cited.length +
        '</td></tr>'
    )
    .join('');
  const types = [...new Set(gaps.map((g) => g.type))].sort();
  const gapRows = gaps
    .map(
      (g) =>
        '<tr data-type="' +
        esc(g.type) +
        '"><td>' +
        esc(g.type) +
        '</td><td>' +
        esc(g.where) +
        '</td><td>' +
        esc(g.detail) +
        '</td></tr>'
    )
    .join('');
  const tiles =
    TAGS.map((t) => '<div class="tile"><b>' + tagTotals[t] + '</b><span>' + t + '</span></div>').join('') +
    '<div class="tile"><b>' +
    code.modules.length +
    '</b><span>code files loaded</span></div><div class="tile"><b>' +
    gaps.length +
    '</b><span>gap items</span></div>';
  return (
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Project dashboard</title><style>' +
    ':root{--bg:#fff;--fg:#1d2330;--mut:#667;--line:#d8dce6;--acc:#2f6fed}@media(prefers-color-scheme:dark){:root{--bg:#14171f;--fg:#e6e9f2;--mut:#9aa3b8;--line:#2c3242;--acc:#6b9bff}}' +
    'body{margin:0;padding:16px;background:var(--bg);color:var(--fg);font:14px/1.45 system-ui,sans-serif;max-width:1100px;margin-inline:auto}h1{font-size:20px}h2{font-size:16px;margin-top:28px}' +
    '.tiles{display:flex;flex-wrap:wrap;gap:8px}.tile{border:1px solid var(--line);border-radius:8px;padding:8px 14px;min-width:90px}.tile b{display:block;font-size:22px}.tile span{color:var(--mut);font-size:12px}' +
    'table{border-collapse:collapse;width:100%}th,td{border-bottom:1px solid var(--line);padding:4px 8px;text-align:left;vertical-align:top}.num{text-align:right;font-variant-numeric:tabular-nums}' +
    '.matrix{width:auto}.matrix td{text-align:center;min-width:34px}.matrix .n{background:color-mix(in srgb,var(--acc) calc(var(--v)*80% + 12%),transparent)}.matrix .self{background:var(--line)}.rot{writing-mode:vertical-rl;transform:rotate(180deg)}' +
    '.scroll{overflow-x:auto}select{font:inherit;padding:2px 6px}</style></head><body><h1>Project dashboard</h1><p style="color:var(--mut)">Generated ' +
    data.builtOn +
    ' by tools/dashboard.js from the docs, decisions, dev.html and js files.</p>' +
    '<div class="tiles">' +
    tiles +
    '</div>' +
    '<h2>Code map: area uses names defined in another area</h2><p style="color:var(--mut)">Row uses the column. Darker means more shared names. Read it as "who depends on whom".</p><div class="scroll">' +
    matrix +
    '</div>' +
    '<h2>Design map: specs by requirement tag, and how many code files each names</h2><div class="scroll"><table><tr><th>Spec</th>' +
    TAGS.map((t) => '<th class="num">' + t + '</th>').join('') +
    '<th class="num">Code files named</th></tr>' +
    specRows +
    '</table></div>' +
    '<h2>Gaps</h2><p><label>Show <select id="f"><option value="">all kinds</option>' +
    types.map((t) => '<option>' + esc(t) + '</option>').join('') +
    '</select></label></p><div class="scroll"><table id="g"><tr><th>Kind</th><th>Where</th><th>Detail</th></tr>' +
    gapRows +
    '</table></div>' +
    '<script>document.getElementById("f").onchange=function(e){var v=e.target.value;document.querySelectorAll("#g tr[data-type]").forEach(function(r){r.style.display=!v||r.dataset.type===v?"":"none"})}</script></body></html>'
  );
}

module.exports = { build, toMarkdown, toHtml, TAGS, TAG_PATTERN, readLoadedScripts, listSpecFiles };

if (require.main === module) {
  const data = build();
  fs.mkdirSync(path.join(root, 'out'), { recursive: true });
  fs.writeFileSync(path.join(root, 'out/dashboard.html'), toHtml(data));
  fs.writeFileSync(path.join(root, 'docs/ASCII Concept Maps/Dashboard.md'), toMarkdown(data));
  console.log(
    'dashboard: ' +
      data.code.modules.length +
      ' code files, ' +
      data.design.specs.length +
      ' specs, ' +
      data.gaps.length +
      ' gap items'
  );
  console.log('wrote out/dashboard.html and docs/ASCII Concept Maps/Dashboard.md');
}
