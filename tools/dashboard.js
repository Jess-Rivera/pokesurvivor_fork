// tools/dashboard.js: builds the project dashboard (design map, code map, gap list) from the repo's own files.
// Usage: node tools/dashboard.js [--refresh]   (--refresh reads issues and board columns through gh first)
//        writes out/dashboard.html and docs/ASCII Concept Maps/Dashboard.md
// tools/check.js calls build() and verifies it against dev.html and the raw tag counts.
// Nothing here is hand drawn: every node and edge is read from a doc, a decision file, dev.html or a js file.
const fs = require('fs'),
  path = require('path');
const root = path.resolve(__dirname, '..');
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

// ---- issues and the board (read-only, from a local snapshot of `gh issue list`) ----
const ISSUES_CACHE = 'out/issues.json';
// "#155" in prose. Not "&#123;", not a URL fragment, and only 1 to 4 digits so colours like #ffd23f never match.
const ISSUE_PATTERN = /(?:^|[^&\w/])#(\d{1,4})\b/g;
const issueNumbers = (text) =>
  [...new Set([...text.matchAll(ISSUE_PATTERN)].map((m) => Number(m[1])))].filter((n) => n > 0);
// Decision files carry their issue number right after the date: 2026-11-15-124-economy-... or ...-137c-sell-...
const decisionFileIssue = (file) => {
  const m = path.basename(file).match(/^\d{4}-\d{2}-\d{2}-(\d{1,3})[a-z]?-/);
  return m ? [Number(m[1])] : [];
};

function refreshIssues() {
  const cp = require('child_process');
  const json = cp.execFileSync(
    'gh',
    [
      'issue',
      'list',
      '--state',
      'all',
      '--limit',
      '1000',
      '--json',
      'number,title,state,labels,projectItems,url,closedAt,updatedAt',
    ],
    { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
  );
  fs.mkdirSync(path.join(root, 'out'), { recursive: true });
  fs.writeFileSync(
    path.join(root, ISSUES_CACHE),
    JSON.stringify({ fetchedAt: new Date().toISOString(), issues: JSON.parse(json) })
  );
}

function loadIssueSnapshot() {
  try {
    return JSON.parse(read(ISSUES_CACHE));
  } catch (e) {
    return null;
  }
}

function buildBoard(design) {
  const snapshot = loadIssueSnapshot();
  if (!snapshot) return { available: false };
  const citedBy = new Map(); // issue number -> files that cite it
  const noteCitation = (n, file) => citedBy.set(n, [...new Set([...(citedBy.get(n) || []), file])]);
  for (const spec of design.specs) for (const n of spec.issueRefs) noteCitation(n, spec.file);
  for (const d of design.decisions) for (const n of d.issues) noteCitation(n, d.file);
  const rows = snapshot.issues.map((i) => ({
    number: i.number,
    title: i.title,
    state: i.state,
    url: i.url,
    labels: i.labels.map((l) => l.name),
    column: (i.projectItems[0] && i.projectItems[0].status && i.projectItems[0].status.name) || null,
    onBoard: i.projectItems.length > 0,
    citedIn: citedBy.get(i.number) || [],
  }));
  const byNumber = new Map(rows.map((r) => [r.number, r]));
  const columnNames = [...new Set(rows.map((r) => r.column || 'Not on the board'))];
  const columns = columnNames.map((name) => ({
    name,
    open: rows.filter((r) => r.state === 'OPEN' && (r.column || 'Not on the board') === name).length,
    closed: rows.filter((r) => r.state !== 'OPEN' && (r.column || 'Not on the board') === name).length,
  }));
  const cited = { open: 0, closed: 0, notAnIssue: 0 }; // notAnIssue: a PR number, or a number that is not an issue
  for (const n of citedBy.keys()) {
    const r = byNumber.get(n);
    if (!r) cited.notAnIssue++;
    else if (r.state === 'OPEN') cited.open++;
    else cited.closed++;
  }
  const open = rows.filter((r) => r.state === 'OPEN').length;
  return {
    available: true,
    fetchedAt: snapshot.fetchedAt,
    rows,
    columns,
    cited,
    totals: { all: rows.length, open, closed: rows.length - open },
  };
}

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
    .map((p, order) => ({
      path: p,
      area: areaOf(p),
      order,
      defines: [],
      uses: new Set(),
      dependsOn: new Set(),
      usedBy: new Set(),
    }));
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
  const moduleByPath = new Map(modules.map((m) => [m.path, m]));
  const areaEdges = new Map(); // "from>to" -> count of distinct G names crossing
  for (const mod of modules) {
    const seen = new Set();
    for (const name of mod.uses) {
      const owner = definer.get(name);
      if (!owner || owner === mod.path) continue;
      mod.dependsOn.add(owner);
      moduleByPath.get(owner).usedBy.add(mod.path);
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
          issues: issueNumbers(line),
          kind: codeDiffers ? 'code differs' : found.includes('Legacy behavior') ? 'legacy' : 'open',
          text: line.replace(TAG_PATTERN, '').replace(/\s+/g, ' ').trim().slice(0, 220),
        });
    });
    const cited = [...new Set(lines.join('\n').match(CODE_PATH_PATTERN) || [])].filter((p) => !/[*{}]/.test(p));
    const citedOnlyAsRemoved = new Set(
      cited.filter((p) => lines.filter((line) => line.includes(p)).every((line) => REMOVAL_WORDS.test(line)))
    );
    const total = TAGS.reduce((s, t) => s + counts[t], 0);
    const issueRefs = issueNumbers(lines.join('\n'));
    if (total || cited.length)
      specs.push({ file, counts, total, items, cited, citedOnlyAsRemoved, issueRefs, text: lines.join('\n') });
  }
  // Which other specs does each spec name? (the doc-to-doc web: who points at whom)
  const escapeForRegex = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, (ch) => '\\' + ch);
  for (const spec of specs) {
    spec.mentions = specs
      .filter((other) => other !== spec)
      .filter((other) => new RegExp('(^|[^A-Za-z0-9_-])' + escapeForRegex(path.basename(other.file))).test(spec.text))
      .map((other) => other.file);
  }
  for (const spec of specs) delete spec.text;
  // decisions: one file each, with a Canonical: line naming the spec that holds the rule
  const decisions = listFiles('docs/decisions', (p) => p.endsWith('.md')).map((file) => {
    const text = read(file);
    const canonical = (text.match(/^Canonical:\s*(.+)$/m) || [])[1] || null;
    const targets = canonical ? resolveCanonicalTargets(canonical) : [];
    return { file, canonical, targets, issues: [...new Set([...decisionFileIssue(file), ...issueNumbers(text)])] };
  });
  return { specs, decisions };
}

// ---- the gap list: where design and code disagree or one side is silent ----
function buildGaps(code, design, board) {
  const gaps = [];
  const exists = (p) => fs.existsSync(path.join(root, p));
  const citedAnywhere = new Set(design.specs.flatMap((s) => s.cited));
  const issueByNumber = board.available ? new Map(board.rows.map((r) => [r.number, r])) : new Map();
  // Without a board snapshot every unbuilt item is just "approved, not built". With one, it is tracked, untracked,
  // or contradicted by a closed issue.
  const unbuiltKind = (item) => {
    if (!board.available) return 'approved, not built';
    const known = item.issues.map((n) => issueByNumber.get(n)).filter(Boolean);
    if (!known.length) return 'approved, not built, no issue';
    return known.every((r) => r.state !== 'OPEN') ? 'approved, not built, issue closed' : 'approved, not built';
  };
  for (const spec of design.specs) {
    for (const p of spec.cited)
      if (!exists(p) && !spec.citedOnlyAsRemoved.has(p))
        gaps.push({ type: 'broken reference', where: spec.file, detail: p + ' does not exist' });
    for (const item of spec.items)
      gaps.push({
        type:
          item.kind === 'code differs'
            ? unbuiltKind(item)
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
  if (board.available) {
    for (const r of board.rows.filter((row) => row.state === 'OPEN')) {
      if (!r.onBoard) gaps.push({ type: 'issue not on the board', where: '#' + r.number, detail: r.title });
      if (!r.citedIn.length) gaps.push({ type: 'open issue, no doc names it', where: '#' + r.number, detail: r.title });
    }
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
  const board = buildBoard(design);
  const gaps = buildGaps(code, design, board);
  const tagTotals = Object.fromEntries(TAGS.map((t) => [t, design.specs.reduce((s, sp) => s + sp.counts[t], 0)]));
  return { code, design, board, gaps, tagTotals, builtOn: new Date().toISOString().slice(0, 10) };
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
  if (data.board.available) {
    const b = data.board;
    out.push(
      '## Board (issues as of ' + b.fetchedAt.slice(0, 10) + ')',
      '',
      b.totals.open +
        ' open, ' +
        b.totals.closed +
        ' closed. Specs and decisions cite ' +
        b.cited.open +
        ' open and ' +
        b.cited.closed +
        ' closed issues.',
      '',
      '| Column | Open | Closed |',
      '|---|---|---|'
    );
    for (const c of b.columns) out.push('| ' + c.name + ' | ' + c.open + ' | ' + c.closed + ' |');
    out.push('');
  } else out.push('## Board', '', 'No issue snapshot. Run `node tools/dashboard.js --refresh`.', '');
  const byType = {};
  for (const g of data.gaps) (byType[g.type] = byType[g.type] || []).push(g);
  out.push('## Gap summary', '', '| Kind | Count |', '|---|---|');
  for (const [type, list] of Object.entries(byType).sort((a, b) => b[1].length - a[1].length))
    out.push('| ' + type + ' | ' + list.length + ' |');
  out.push('');
  return out.join('\n');
}

// ---- HTML output: one self-contained page (library, data, styles and script inlined), opens from disk ----
function buildGraphData(data) {
  const { code, design, board, gaps } = data;
  const moduleByPath = new Map(code.modules.map((m) => [m.path, m]));
  const gapsByNode = new Map(); // a file path (spec or code) -> gaps that name it
  for (const g of gaps) {
    const id = g.where.startsWith('#') ? null : g.where.replace(/:\d+$/, '');
    if (id) gapsByNode.set(id, [...(gapsByNode.get(id) || []), g]);
  }
  const decisionsBySpec = new Map();
  for (const d of design.decisions)
    for (const t of d.targets)
      if (t.resolved) decisionsBySpec.set(t.resolved, (decisionsBySpec.get(t.resolved) || 0) + 1);
  const issueByNumber = board.available ? new Map(board.rows.map((r) => [r.number, r])) : new Map();
  const citedBy = new Map();
  for (const spec of design.specs) for (const p of spec.cited) citedBy.set(p, [...(citedBy.get(p) || []), spec.file]);
  return {
    root: root.replace(/\\/g, '/'),
    builtOn: data.builtOn,
    tags: data.tagTotals,
    areas: code.areas,
    areaEdges: code.areaEdges,
    files: code.modules.map((m) => ({
      id: m.path,
      area: m.area,
      defines: m.defines,
      dependsOn: [...m.dependsOn],
      usedBy: [...m.usedBy],
      citedBy: citedBy.get(m.path) || [],
      gaps: gapsByNode.get(m.path) || [],
    })),
    specs: design.specs.map((s) => ({
      id: s.file,
      counts: s.counts,
      total: s.total,
      cited: s.cited.filter((p) => moduleByPath.has(p)),
      citedOther: s.cited.filter((p) => !moduleByPath.has(p)),
      mentions: s.mentions,
      decisions: decisionsBySpec.get(s.file) || 0,
      issues: s.issueRefs.map((n) => issueByNumber.get(n) || { number: n }),
      gaps: gapsByNode.get(s.file) || [],
    })),
    board: board.available
      ? {
          fetchedAt: board.fetchedAt,
          totals: board.totals,
          columns: board.columns,
          cited: board.cited,
          rows: board.rows,
        }
      : null,
    gaps,
  };
}

function toHtml(data) {
  const pageDir = path.join(__dirname, 'dashboard-page');
  const inScript = (text) => text.replace(/<\/(script)/gi, '<\\/$1');
  const embedded = inScript(JSON.stringify(buildGraphData(data)));
  const library = inScript(fs.readFileSync(path.join(__dirname, 'vendor/cytoscape.min.js'), 'utf8'));
  const pageScript = inScript(fs.readFileSync(path.join(pageDir, 'page.js'), 'utf8'));
  const pageStyle = fs.readFileSync(path.join(pageDir, 'page.css'), 'utf8');
  return (
    '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1"><title>Project dashboard</title><style>' +
    pageStyle +
    '</style></head><body><div id="app"></div><script>window.__DASH__=' +
    embedded +
    ';</script><script>' +
    library +
    '</script><script>' +
    pageScript +
    '</script></body></html>'
  );
}

module.exports = { build, toMarkdown, toHtml, TAGS, TAG_PATTERN, readLoadedScripts, listSpecFiles };

if (require.main === module) {
  if (process.argv.includes('--refresh')) refreshIssues();
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
