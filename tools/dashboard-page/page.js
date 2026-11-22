// Browser script for the project dashboard (inlined into out/dashboard.html by tools/dashboard.js).
// Data arrives as window.__DASH__ (see buildGraphData). Graphs use the Cytoscape library inlined before this file.
(function () {
  'use strict';
  const D = window.__DASH__;
  const app = document.getElementById('app');
  const TABS = [
    ['overview', 'Overview'],
    ['code', 'Code map'],
    ['design', 'Design map'],
    ['gaps', 'Gap map'],
    ['board', 'Board'],
    ['list', 'Gap list'],
  ];
  const GRAPH_TABS = ['code', 'design', 'gaps'];
  const state = { tab: 'overview', search: '', gapKind: '', pendingSelect: null, showMentions: false };
  let cy = null;
  let addedEdges = null;

  // ---- lookups ----
  const fileById = {};
  D.files.forEach((f) => (fileById[f.id] = f));
  const specById = {};
  D.specs.forEach((s) => (specById[s.id] = s));
  const issueByNumber = {};
  if (D.board) D.board.rows.forEach((r) => (issueByNumber[r.number] = r));
  const areaIndex = {};
  D.areas.forEach((a, i) => (areaIndex[a.name] = i));

  // ---- small helpers ----
  const esc = (s) =>
    String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const base = (p) => p.split('/').pop();
  const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const areaColor = (area) => 'hsl(' + (((areaIndex[area] || 0) * 47) % 360) + ',55%,52%)';
  // Opens the file in VS Code at the line (the vscode: link scheme), so every file name is one click from its text.
  const fileLink = (p, line, label) =>
    '<a href="vscode://file/' +
    encodeURI(D.root + '/' + p) +
    (line ? ':' + line : '') +
    '" title="Open in VS Code">' +
    esc(label || p) +
    '</a>';
  const issueLink = (n) => {
    const r = issueByNumber[n];
    return r ? '<a href="' + esc(r.url) + '" target="_blank" rel="noopener">#' + n + '</a>' : '#' + n;
  };
  const goLink = (id, label) => '<a href="#" data-goto="' + esc(id) + '">' + esc(label || id) + '</a>';
  const whereLink = (where) => {
    if (where.charAt(0) === '#') return issueLink(Number(where.slice(1)));
    const m = where.match(/^(.*):(\d+)$/);
    return m ? fileLink(m[1], m[2], where) : fileLink(where);
  };
  const list = (items, render, cap) => {
    if (!items.length) return '<p class="hint">none</p>';
    const shown = items.slice(0, cap || 60);
    return (
      '<ul>' +
      shown.map((i) => '<li>' + render(i) + '</li>').join('') +
      '</ul>' +
      (items.length > shown.length ? '<p class="hint">and ' + (items.length - shown.length) + ' more</p>' : '')
    );
  };

  // ---- shell ----
  function renderShell() {
    app.innerHTML =
      '<header><h1>Project dashboard</h1><nav>' +
      TABS.map(
        (t) => '<button data-tab="' + t[0] + '"' + (t[0] === state.tab ? ' aria-current="true"' : '') + '>' + t[1] + '</button>'
      ).join('') +
      '</nav><span class="stamp">built ' +
      esc(D.builtOn) +
      (D.board ? ' · issues ' + esc(D.board.fetchedAt.slice(0, 10)) : '') +
      '</span><input type="search" id="q" placeholder="Search files, specs, issues" value="' +
      esc(state.search) +
      '"></header><main id="main"></main>';
    app.querySelector('nav').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-tab]');
      if (b) show(b.dataset.tab);
    });
    app.querySelector('#q').addEventListener('input', (e) => {
      state.search = e.target.value;
      applySearch(false);
    });
    app.querySelector('#q').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') applySearch(true);
    });
  }

  function show(tab) {
    state.tab = tab;
    if (cy) {
      cy.destroy();
      cy = null;
    }
    addedEdges = null;
    renderShell();
    const main = document.getElementById('main');
    if (GRAPH_TABS.indexOf(tab) >= 0) startGraph(main, tab);
    else {
      main.innerHTML = '<div class="scrollpage" id="page"></div>';
      const page = document.getElementById('page');
      if (tab === 'overview') page.innerHTML = overviewHtml();
      if (tab === 'board') page.innerHTML = boardHtml();
      if (tab === 'list') page.innerHTML = gapListHtml();
      wirePage(page);
    }
  }

  function wirePage(page) {
    page.addEventListener('click', (e) => {
      const g = e.target.closest('[data-goto]');
      if (g) {
        e.preventDefault();
        goto(g.dataset.goto);
      }
      const t = e.target.closest('[data-tab-jump]');
      if (t) {
        e.preventDefault();
        if (t.dataset.kind) state.gapKind = t.dataset.kind;
        show(t.dataset.tabJump);
      }
    });
    const kind = page.querySelector('#gapkind');
    if (kind)
      kind.addEventListener('change', (e) => {
        state.gapKind = e.target.value;
        applySearch(false);
      });
    applySearch(false);
  }

  // ---- overview ----
  function overviewHtml() {
    const tile = (n, label) => '<div class="tile"><b>' + n + '</b><span>' + esc(label) + '</span></div>';
    const open = D.board ? D.board.rows.filter((r) => r.state === 'OPEN') : [];
    const kinds = {};
    D.gaps.forEach((g) => (kinds[g.type] = (kinds[g.type] || 0) + 1));
    const worstSpecs = D.specs
      .filter((s) => s.gaps.length)
      .sort((a, b) => b.gaps.length - a.gaps.length)
      .slice(0, 8);
    return (
      '<div class="tiles">' +
      tile(D.tags.Approved, 'approved rules') +
      tile(D.tags.Proposed, 'proposed') +
      tile(D.tags.Open, 'open questions') +
      tile(D.files.length, 'code files') +
      tile(D.specs.length, 'live specs') +
      (D.board
        ? tile(open.length, 'open issues') +
          tile(open.filter((r) => r.labels.indexOf('needs-playtest') >= 0).length, 'need your playtest')
        : '') +
      tile(D.gaps.length, 'gap items') +
      '</div><h2>Gaps by kind</h2>' +
      '<table><tr><th>Kind</th><th class="num">Count</th></tr>' +
      Object.keys(kinds)
        .sort((a, b) => kinds[b] - kinds[a])
        .map(
          (k) =>
            '<tr><td><a href="#" data-tab-jump="list" data-kind="' + esc(k) + '">' + esc(k) + '</a></td><td class="num">' + kinds[k] + '</td></tr>'
        )
        .join('') +
      '</table><h2>Specs with the most gap items</h2>' +
      list(worstSpecs, (s) => goLink(s.id) + ' (' + s.gaps.length + ')') +
      '<h2>How to read this</h2><p>Design map: the specs and the code they name. Code map: how the areas of the game depend on each other. ' +
      'Gap map: where the design and the code disagree or one side is silent. Scroll to zoom, drag to pan, click a node for its details; ' +
      'every file name opens in VS Code.</p>'
    );
  }

  // ---- board ----
  function boardHtml() {
    if (!D.board)
      return '<p>No issue snapshot yet. Run <code>node tools/dashboard.js --refresh</code> (needs <code>gh</code> signed in).</p>';
    const row = (r) =>
      '<tr><td class="num">' + issueLink(r.number) + '</td><td>' + esc(r.title) + '</td><td>' + esc(r.labels.join(', ')) +
      '</td><td class="num">' + (r.citedIn.length ? r.citedIn.length : '') + '</td></tr>';
    return (
      '<p>Issues as of ' + esc(D.board.fetchedAt.slice(0, 16).replace('T', ' ')) + ' UTC. Specs and decisions cite ' +
      D.board.cited.open + ' open and ' + D.board.cited.closed + ' closed issues. Refresh with <code>node tools/dashboard.js --refresh</code>.</p>' +
      D.board.columns
        .filter((c) => c.open)
        .map((c) => {
          const rows = D.board.rows.filter((r) => r.state === 'OPEN' && (r.column || 'Not on the board') === c.name);
          return (
            '<details' + (/playtest|triage/i.test(c.name) ? ' open' : '') + '><summary><b>' + esc(c.name) + '</b> (' + c.open + ' open, ' + c.closed + ' closed)</summary>' +
            '<table data-filter-rows><tr><th class="num">#</th><th>Title</th><th>Labels</th><th class="num">Docs citing it</th></tr>' + rows.map(row).join('') + '</table></details>'
          );
        })
        .join('')
    );
  }

  // ---- gap list ----
  function gapListHtml() {
    const kinds = [...new Set(D.gaps.map((g) => g.type))].sort();
    return (
      '<p><label>Show <select id="gapkind"><option value="">all kinds</option>' +
      kinds.map((k) => '<option' + (k === state.gapKind ? ' selected' : '') + '>' + esc(k) + '</option>').join('') +
      '</select></label></p><table data-filter-rows><tr><th>Kind</th><th>Where</th><th>Detail</th></tr>' +
      D.gaps
        .map(
          (g) =>
            '<tr data-kind="' + esc(g.type) + '"><td>' + esc(g.type) + '</td><td>' + whereLink(g.where) + '</td><td>' + esc(g.detail) + '</td></tr>'
        )
        .join('') +
      '</table>'
    );
  }

  // ---- search: filters tables, or marks nodes in a graph ----
  function applySearch(centerOnFirst) {
    const q = state.search.trim().toLowerCase();
    document.querySelectorAll('[data-filter-rows] tr').forEach((tr, i) => {
      if (!i) return; // header row
      const kindOk = !state.gapKind || tr.dataset.kind === state.gapKind;
      const textOk = !q || tr.textContent.toLowerCase().indexOf(q) >= 0;
      tr.style.display = kindOk && textOk ? '' : 'none';
    });
    if (!cy) return;
    cy.nodes().removeClass('match');
    if (!q) return;
    const matched = cy.nodes().filter((n) => (n.data('id') + ' ' + n.data('label')).toLowerCase().indexOf(q) >= 0);
    matched.addClass('match');
    if (centerOnFirst && matched.length) {
      cy.animate({ fit: { eles: matched, padding: 80 }, duration: 250 });
      if (matched.length === 1) selectNode(matched[0]);
    }
  }

  // ---- graph building ----
  // Lays groups of nodes out as labelled boxes, each box a tidy grid, boxes packed in rows. Used by the code map and the
  // gap map, where the automatic layout cannot handle boxes with nodes inside them.
  // groups: [{ id, label, nodes: [{ data }] }]. Returns box nodes plus the member nodes with positions set.
  function packGroups(groups) {
    const cellWidth = 74;
    const cellHeight = 56;
    const gap = 70;
    const maxRowWidth = 1700;
    const sized = groups
      .filter((g) => g.nodes.length)
      .map((g) => {
        const columns = Math.max(1, Math.ceil(Math.sqrt(g.nodes.length * 1.5)));
        return { group: g, columns: columns, width: columns * cellWidth, height: Math.ceil(g.nodes.length / columns) * cellHeight + 24 };
      })
      .sort((a, b) => b.height - a.height);
    const els = [];
    let x = 0;
    let y = 0;
    let rowHeight = 0;
    sized.forEach((s) => {
      if (x > 0 && x + s.width > maxRowWidth) {
        x = 0;
        y += rowHeight + gap;
        rowHeight = 0;
      }
      els.push({ data: { id: s.group.id, label: s.group.label, kind: s.group.kind || 'area' } });
      s.group.nodes.forEach((n, i) => {
        n.data.parent = s.group.id;
        n.classes = 'grid';
        n.position = { x: x + (i % s.columns) * cellWidth + cellWidth / 2, y: y + 24 + Math.floor(i / s.columns) * cellHeight + cellHeight / 2 };
        els.push(n);
      });
      x += s.width + gap;
      rowHeight = Math.max(rowHeight, s.height);
    });
    return els;
  }

  function codeElements() {
    const groups = D.areas.map((a) => ({
      id: 'area:' + a.name,
      label: a.name + ' (' + a.files + ' files)',
      nodes: D.files
        .filter((f) => f.area === a.name)
        .sort((p, q) => p.id.localeCompare(q.id))
        .map((f) => ({
          data: {
            id: f.id,
            label: base(f.id),
            kind: 'file',
            color: f.gaps.length ? cssVar('--bad') : areaColor(f.area),
            size: 10 + Math.min(16, Math.sqrt(f.usedBy.length) * 3),
          },
        })),
    }));
    const els = packGroups(groups);
    D.areaEdges.forEach((e) =>
      els.push({
        data: { id: 'ae:' + e.from + '>' + e.to, source: 'area:' + e.from, target: 'area:' + e.to, w: 1 + Math.log(1 + e.names), kind: 'areaedge' },
      })
    );
    return els;
  }

  function designElements() {
    const els = [];
    const drawnFiles = {};
    D.specs.forEach((s) => {
      els.push({
        data: {
          id: s.id,
          label: base(s.id),
          kind: 'spec',
          color: s.gaps.length ? cssVar('--warn') : cssVar('--acc'),
          size: 16 + Math.sqrt(s.total) * 2.4,
        },
      });
      s.cited.forEach((p) => (drawnFiles[p] = true));
    });
    Object.keys(drawnFiles).forEach((p) =>
      els.push({
        data: { id: p, label: base(p), kind: 'file', color: areaColor(fileById[p].area), size: 10, shape: 'ellipse' },
      })
    );
    D.specs.forEach((s) => {
      s.cited.forEach((p) => els.push({ data: { id: 'c:' + s.id + '>' + p, source: s.id, target: p, w: 1, kind: 'cites' } }));
      s.mentions.forEach((m) =>
        els.push({ data: { id: 'm:' + s.id + '>' + m, source: s.id, target: m, w: 1, kind: 'mentions' }, classes: 'mention' })
      );
    });
    return els;
  }

  function gapElements() {
    const bad = cssVar('--bad');
    const warn = cssVar('--warn');
    const groups = [];
    groups.push({
      id: 'group:specs',
      kind: 'area',
      label: 'Specs with gap items (' + D.specs.filter((s) => s.gaps.length).length + ')',
      nodes: D.specs
        .filter((s) => s.gaps.length)
        .sort((a, b) => b.gaps.length - a.gaps.length)
        .map((s) => ({ data: { id: s.id, label: base(s.id) + ' (' + s.gaps.length + ')', kind: 'spec', color: warn, size: 14 + Math.min(20, Math.sqrt(s.gaps.length) * 5) } })),
    });
    if (D.board)
      groups.push({
        id: 'group:issues',
        kind: 'area',
        label: 'Open issues no doc names',
        nodes: D.board.rows
          .filter((r) => r.state === 'OPEN' && !r.citedIn.length)
          .map((r) => ({ data: { id: 'issue:' + r.number, label: '#' + r.number, kind: 'issue', color: cssVar('--mut'), size: 16, shape: 'diamond' } })),
      });
    D.areas.forEach((a) =>
      groups.push({
        id: 'area:' + a.name,
        label: a.name + ': files no spec names',
        nodes: D.files
          .filter((f) => f.area === a.name && !f.citedBy.length)
          .sort((p, q) => p.id.localeCompare(q.id))
          .map((f) => ({ data: { id: f.id, label: base(f.id), kind: 'file', color: bad, size: 12 } })),
      })
    );
    return packGroups(groups);
  }

  function styleSheet() {
    const fg = cssVar('--fg');
    const bg = cssVar('--bg');
    const line = cssVar('--line');
    const acc = cssVar('--acc');
    return [
      {
        selector: 'node[size]',
        style: {
          label: 'data(label)',
          'font-size': 9,
          color: fg,
          'text-valign': 'bottom',
          'text-margin-y': 3,
          'background-color': 'data(color)',
          width: 'data(size)',
          height: 'data(size)',
          'min-zoomed-font-size': 7,
          'text-outline-color': bg,
          'text-outline-width': 2,
        },
      },
      { selector: 'node[shape]', style: { shape: 'data(shape)' } },
      { selector: 'node.grid', style: { 'text-max-width': 70, 'text-wrap': 'ellipsis' } },
      { selector: 'edge.hide', style: { display: 'none' } },
      { selector: 'node[kind = "spec"]', style: { shape: 'round-rectangle' } },
      {
        selector: ':parent',
        style: {
          label: 'data(label)',
          'font-size': 12,
          color: fg,
          'text-valign': 'top',
          'background-opacity': 0.07,
          'background-color': acc,
          'border-width': 1,
          'border-color': line,
          shape: 'round-rectangle',
          padding: 14,
          'min-zoomed-font-size': 6,
        },
      },
      {
        selector: 'node[kind = "area"]',
        style: { label: 'data(label)', 'font-size': 12, color: fg, 'text-valign': 'top', 'background-opacity': 0.07, 'background-color': acc, 'border-width': 1, 'border-color': line, shape: 'round-rectangle' },
      },
      {
        selector: 'edge',
        style: { width: 'data(w)', 'line-color': line, 'target-arrow-color': line, 'target-arrow-shape': 'triangle', 'arrow-scale': 0.7, 'curve-style': 'bezier', opacity: 0.55 },
      },
      { selector: 'edge.mention', style: { 'line-style': 'dashed', opacity: 0.35 } },
      { selector: 'edge.dep', style: { 'line-color': cssVar('--good'), 'target-arrow-color': cssVar('--good'), opacity: 1, width: 1.5 } },
      { selector: 'edge.by', style: { 'line-color': cssVar('--warn'), 'target-arrow-color': cssVar('--warn'), opacity: 1, width: 1.5 } },
      { selector: 'edge.hl', style: { 'line-color': acc, 'target-arrow-color': acc, opacity: 1, width: 2 } },
      { selector: '.faded', style: { opacity: 0.08 } },
      { selector: 'node:selected', style: { 'border-width': 3, 'border-color': acc } },
      { selector: 'node.match', style: { 'border-width': 3, 'border-color': cssVar('--warn') } },
    ];
  }

  function startGraph(main, tab) {
    main.innerHTML =
      '<div class="graph"><div id="cy"></div><div class="toolbar"><button data-z="in" title="Zoom in">+</button><button data-z="out" title="Zoom out">&minus;</button><button data-z="fit" title="Fit everything">Fit</button>' +
      (tab === 'design' ? '<button data-z="mentions" title="Show or hide the lines where one doc names another">Doc links</button>' : '') +
      '</div>' +
      '<div class="legend">' + legendFor(tab) + '</div><aside id="panel"><p class="hint">Click a node for details. Scroll to zoom, drag to pan.</p></aside></div>';
    const elements = tab === 'code' ? codeElements() : tab === 'design' ? designElements() : gapElements();
    cy = cytoscape({
      container: document.getElementById('cy'),
      elements: elements,
      style: styleSheet(),
      wheelSensitivity: 0.3,
      minZoom: 0.05,
      maxZoom: 2.5,
      layout:
        tab === 'design'
          ? { name: 'cose', animate: false, randomize: true, nodeRepulsion: 9000, idealEdgeLength: 70, gravity: 0.6, numIter: 1500, fit: true, padding: 30 }
          : { name: 'preset', fit: true, padding: 30 },
    });
    cy.on('tap', 'node', (e) => selectNode(e.target));
    cy.on('tap', (e) => {
      if (e.target === cy) clearSelection();
    });
    document.querySelector('.toolbar').addEventListener('click', (e) => {
      const z = e.target.dataset.z;
      if (z === 'fit') cy.fit(undefined, 30);
      if (z === 'mentions') {
        state.showMentions = !state.showMentions;
        refreshMentions();
      }
      if (z === 'in') cy.zoom({ level: cy.zoom() * 1.3, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
      if (z === 'out') cy.zoom({ level: cy.zoom() / 1.3, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
    });
    document.getElementById('panel').addEventListener('click', (e) => {
      const g = e.target.closest('[data-goto]');
      if (g) {
        e.preventDefault();
        goto(g.dataset.goto);
      }
    });
    refreshMentions();
    applySearch(false);
    if (state.pendingSelect) {
      const n = cy.getElementById(state.pendingSelect);
      state.pendingSelect = null;
      if (n.length) {
        selectNode(n);
        cy.animate({ fit: { eles: n.closedNeighborhood(), padding: 90 }, duration: 250 });
      }
    }
  }

  // Doc-to-doc lines are what make the design map a hairball, so they are hidden until asked for (or until a spec is selected).
  function refreshMentions() {
    if (cy) cy.edges('.mention').toggleClass('hide', !state.showMentions);
  }

  function legendFor(tab) {
    if (tab === 'code')
      return 'Boxes are code areas, dots are files (bigger = more files use them). Lines between boxes: shared <code>G</code> names. Red dots: no spec names that file. Click a file: green lines = what it uses, orange = what uses it.';
    if (tab === 'design')
      return 'Rounded boxes are specs (bigger = more tagged rules; amber = has gap items). Dots are the code files they name. Dashed lines (button: Doc links): one spec naming another.';
    return 'Amber: specs with gap items (bigger = more). Red dots: code files no spec names. Grey diamonds: open issues no doc names.';
  }

  // ---- selection and the side panel ----
  function clearSelection() {
    if (!cy) return;
    if (addedEdges) addedEdges.remove();
    addedEdges = null;
    refreshMentions();
    cy.elements().removeClass('faded hl');
    cy.nodes().unselect();
    document.getElementById('panel').innerHTML = '<p class="hint">Click a node for details.</p>';
  }

  function selectNode(node) {
    if (addedEdges) addedEdges.remove();
    addedEdges = null;
    const d = node.data();
    if (state.tab === 'code' && d.kind === 'file') {
      const f = fileById[d.id];
      const edges = [];
      f.dependsOn.forEach((t) => edges.push({ data: { id: 'dep:' + d.id + '>' + t, source: d.id, target: t, w: 1.5 }, classes: 'dep' }));
      f.usedBy.forEach((s) => edges.push({ data: { id: 'by:' + s + '>' + d.id, source: s, target: d.id, w: 1.5 }, classes: 'by' }));
      addedEdges = cy.add(edges);
    }
    refreshMentions();
    cy.elements().removeClass('faded hl');
    cy.nodes().unselect();
    node.select();
    let near = node.closedNeighborhood();
    near = near.union(near.ancestors());
    cy.elements().not(near).addClass('faded');
    node.connectedEdges('.mention').removeClass('hide');
    node.connectedEdges().addClass('hl');
    document.getElementById('panel').innerHTML = panelFor(d);
  }

  function gapItems(gaps) {
    return list(gaps, (g) => '<b>' + esc(g.type) + '</b>: ' + whereLink(g.where) + '<br>' + esc(g.detail.slice(0, 160)), 25);
  }

  function panelFor(d) {
    if (d.kind === 'file') {
      const f = fileById[d.id];
      return (
        '<h3>' + fileLink(f.id) + '</h3><p class="hint">area ' + esc(f.area) + '</p>' +
        '<h4>Defines (G names)</h4>' + (f.defines.length ? '<p>' + f.defines.map((n) => '<code>' + esc(n) + '</code>').join(' ') + '</p>' : '<p class="hint">none</p>') +
        '<h4>Uses code from (' + f.dependsOn.length + ')</h4>' + list(f.dependsOn, (p) => goLink(p, base(p))) +
        '<h4>Used by (' + f.usedBy.length + ')</h4>' + list(f.usedBy, (p) => goLink(p, base(p))) +
        '<h4>Named by specs (' + f.citedBy.length + ')</h4>' + list(f.citedBy, (p) => goLink(p, base(p))) +
        (f.gaps.length ? '<h4>Gaps</h4>' + gapItems(f.gaps) : '')
      );
    }
    if (d.kind === 'spec') {
      const s = specById[d.id];
      const tagLine = ['Approved', 'Legacy behavior', 'Proposed', 'Open'].filter((t) => s.counts[t]).map((t) => s.counts[t] + ' ' + t.toLowerCase()).join(', ');
      return (
        '<h3>' + fileLink(s.id) + '</h3><p class="hint">' + esc(tagLine || 'no tagged rules') + (s.decisions ? ' · ' + s.decisions + ' decision(s) point here' : '') + '</p>' +
        '<h4>Names code files (' + s.cited.length + ')</h4>' + list(s.cited, (p) => goLink(p, base(p))) +
        (s.citedOther.length ? '<h4>Also cites (not loaded by the game)</h4>' + list(s.citedOther, (p) => fileLink(p)) : '') +
        '<h4>Names other docs (' + s.mentions.length + ')</h4>' + list(s.mentions, (p) => goLink(p, base(p))) +
        '<h4>Issues it cites (' + s.issues.length + ')</h4>' +
        list(s.issues, (i) => (i.url ? issueLink(i.number) + ' ' + esc(i.title) + ' <span class="pill ' + (i.state === 'OPEN' ? 'open' : 'closed') + '">' + (i.state === 'OPEN' ? 'open' : 'closed') + '</span>' : '#' + i.number + ' (not an issue)')) +
        (s.gaps.length ? '<h4>Gap items (' + s.gaps.length + ')</h4>' + gapItems(s.gaps) : '')
      );
    }
    if (d.kind === 'issue') {
      const r = issueByNumber[Number(d.id.slice(6))];
      return '<h3>' + issueLink(r.number) + ' ' + esc(r.title) + '</h3><p class="hint">' + esc(r.column || 'not on the board') + ' · ' + esc(r.labels.join(', ')) + '</p><p>No spec or decision cites this issue.</p>';
    }
    if (d.kind === 'area') {
      const name = d.id.slice(5);
      const files = D.files.filter((f) => f.area === name);
      return '<h3>' + esc(name) + '</h3><h4>Files (' + files.length + ')</h4>' + list(files, (f) => goLink(f.id, base(f.id)), 200);
    }
    return '';
  }

  // Jump to a file or spec: select it here if this graph has it, otherwise switch to the graph that does.
  function goto(id) {
    if (cy && cy.getElementById(id).length) {
      const n = cy.getElementById(id);
      selectNode(n);
      cy.animate({ fit: { eles: n.closedNeighborhood(), padding: 90 }, duration: 250 });
      return;
    }
    state.pendingSelect = id;
    show(fileById[id] ? 'code' : 'design');
  }

  show('overview');
})();
