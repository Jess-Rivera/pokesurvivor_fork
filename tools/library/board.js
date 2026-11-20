// tools/library/board.js: shared helpers, the sidebar, copy a name, tabbed pages, the Layers page and the later-page stub. A plain script sharing the board's globals; index.html
// loads the board's files in order, board.js first and start.js last.
'use strict';
const ROOT = '../../'; // the repo root, from tools/library/
const $ = (id) => document.getElementById(id);
const esc = (text) =>
  String(text).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const nameButton = (name) => `<button type="button" class="lib-name" data-copy="${esc(name)}">${esc(name)}</button>`;

// ---------- the sidebar (Jess's mockup) ----------
// later: the step or slice that builds the page; a later page shows that instead of content.
const NAV = [
  {
    title: 'Tokens',
    items: [
      { id: 'tokens/colours', title: 'Colours' },
      { id: 'tokens/fonts', title: 'Fonts' },
      { id: 'tokens/layers', title: 'z-index layers' },
    ],
  },
  {
    title: 'Primitives',
    items: [
      { id: 'primitives/buttons', title: 'Buttons' },
      { id: 'primitives/toggles', title: 'Toggles' },
      { id: 'primitives/cursor', title: 'Cursor' },
      { id: 'primitives/panels', title: 'Panels' },
      { id: 'primitives/squares', title: 'Squares' },
      { id: 'primitives/bars', title: 'Bars' },
      { id: 'primitives/modal', title: 'Modal' },
      { id: 'primitives/portraits', title: 'Portraits' },
      { id: 'primitives/chips', title: 'Chips' },
    ],
  },
  {
    title: 'Composites',
    groups: [
      {
        title: 'HUD',
        items: [
          // the active Pokemon's sets are named run.hud.playerActive.* (Jess 2026-11-19); HP and EXP are one bar
          { id: 'run.hud.playerActive.bar', title: 'run.hud.playerActive.bar' },
          { id: 'run.hud.playerActive.area', title: 'run.hud.playerActive.area' },
          { id: 'run.hud.portrait', title: 'run.hud.portrait', later: 'a later slice under #126' },
          { id: 'run.hud.teamSlot', title: 'run.hud.teamSlot', later: 'a later slice under #126' },
        ],
      },
      {
        title: 'Menus',
        items: [
          { id: 'main.shop.pokeball', title: 'main.shop.pokeball', later: '#155 step 155d' },
          { id: 'main.shop.character', title: 'main.shop.character', later: 'a later slice under #126' },
        ],
      },
      {
        title: 'Pause',
        items: [
          { id: 'pause.pokemonDetail', title: 'pause.pokemonDetail', later: 'a later slice under #126' },
          { id: 'pause.runInfo', title: 'pause.runInfo', later: 'a later slice under #126' },
          { id: 'pause.inventory', title: 'pause.inventory', later: 'a later slice under #126' },
        ],
      },
    ],
  },
];
const EDITOR = { id: 'editor', title: 'Basic Editor', later: 'its own slice, after #155' };
const pages = new Map();
const addPages = (items) => items.forEach((item) => pages.set(item.id, item));
NAV.forEach((group) => {
  if (group.items) addPages(group.items);
  (group.groups || []).forEach((sub) => addPages(sub.items));
});
pages.set(EDITOR.id, EDITOR);

const navItem = (item, extra = '') =>
  `<button type="button" class="nav-item${item.later ? ' is-later' : ''}${extra}" data-page="${esc(item.id)}">${esc(item.title)}</button>`;
const navGroup = (group) => `<details class="nav-group" open><summary>${esc(group.title)}</summary>
  ${(group.items || []).map((item) => navItem(item)).join('')}
  ${(group.groups || []).map(navGroup).join('')}</details>`;
$('sidebar').innerHTML = NAV.map(navGroup).join('') + navItem(EDITOR, ' is-top');

// ---------- copy a name ----------
function copyName(name) {
  const done = () => {
    const note = $('copied');
    note.textContent = 'Copied ' + name;
    note.classList.add('shown');
    clearTimeout(copyName.timer);
    copyName.timer = setTimeout(() => note.classList.remove('shown'), 1200);
  };
  const fallback = () => {
    const field = document.createElement('textarea');
    field.value = name;
    document.body.appendChild(field);
    field.select();
    try {
      document.execCommand('copy');
    } catch (error) {
      /* the toast still names it */
    }
    field.remove();
    done();
  };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(name).then(done, fallback);
  else fallback();
}

// ---------- pages ----------
/** A page with tabs along the top: the tab asked for (or the first), its note if it has one, then what it draws. */
function tabbedPage(title, tabs, tab) {
  const shown = tabs.find((entry) => entry.id === tab) || tabs[0];
  return `<h2>${esc(title)}</h2>
    <div class="lib-tabs" role="tablist">${tabs
      .map(
        (entry) =>
          `<button type="button" role="tab" data-tab="${entry.id}" aria-selected="${entry === shown}">${esc(entry.title)}</button>`
      )
      .join('')}</div>
    ${shown.note ? `<p class="lib-note">${esc(shown.note)}</p>` : ''}${shown.draw()}`;
}

function layersPage() {
  return `<h2>z-index layers</h2>
    <p class="lib-note">The page-level stack, top of the list on top. Pieces inside one panel stack with small local numbers (0 to 5) and are not layers.
      Today the CSS writes these numbers; it switches to the names in a later slice. Nothing but the tooltip layer may reach 1000.</p>
    <div class="lib-layers">${G.Tokens.layers
      .map(
        (layer) => `
      <div class="lib-layer" data-token="${esc(layer.name)}"><b>${layer.value}</b>${nameButton(layer.name)}
        <span>${esc(layer.job)} <span class="lib-dim lib-mono">${esc(layer.usedBy)}</span></span></div>`
      )
      .join('')}</div>`;
}

function laterPage(item) {
  return `<h2>${esc(item.title)}</h2><div class="lib-later">Not on the board yet: built in ${esc(item.later)}.</div>`;
}
