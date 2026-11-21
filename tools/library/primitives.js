// tools/library/primitives.js: the primitive pages: each piece's states, props and places. A plain script sharing the board's globals; index.html
// loads the board's files in order, board.js first and start.js last.
'use strict';
// ---------- primitives: each piece's states drawn by the real piece, then its props, tokens, font, size and places ----
// A state is a condition the piece shows; a prop is how a screen sets it up (decision
// 2026-11-18-155-primitive-states-vs-props). States are tiles; props are a table.
const libHtml = htm.bind(preact.h);
const propsTable = (story) => `<table class="lib-props">
    <thead><tr><th>Prop</th><th>Values</th><th>What it does</th></tr></thead>
    <tbody>${(story.props || [])
      .map(
        (prop) => `<tr><td>${nameButton(prop.name)}</td><td class="lib-mono">${esc(prop.values)}</td>
      <td>${esc(prop.does)}</td></tr>`
      )
      .join('')}</tbody></table>`;
function storyBlock(story) {
  const states = story.states
    .map(
      (state) => `<figure class="lib-state">
      <div class="lib-stage ${esc(story.stageClass)}" data-state="${esc(story.name + ':' + state.id)}"></div>
      <figcaption>${nameButton(story.name + '.' + state.id)}<br>${esc(state.title)}</figcaption></figure>`
    )
    .join('');
  return `<section class="lib-story" data-story="${esc(story.name)}">
    <h3>${nameButton(story.name)} <span class="lib-dim lib-mono">${esc(story.component)}</span></h3>
    <p class="lib-note">${esc(story.job)}</p>
    <h4 class="lib-dim">States</h4>
    <div class="lib-states">${states}</div>
    <h4 class="lib-dim">Props (a screen sets these)</h4>
    ${propsTable(story)}
    <dl class="lib-facts">
      <dt>Tokens</dt><dd>${story.tokens.map(nameButton).join('')}</dd>
      ${story.font ? `<dt>Font</dt><dd>${nameButton(story.font.name)}<span>${esc(story.font.size)}</span></dd>` : ''}
      <dt>Size</dt><dd>${esc(story.size)}</dd>
      <dt>Files</dt><dd class="lib-mono">${esc(story.files)}</dd>
      <dt>Used at</dt><dd>${story.places.map(nameButton).join('')}</dd>
    </dl></section>`;
}
/** Draws every state of every story into its stage with the real component (G.Lib.Button.SlantedButton, ...). */
function mountStories(stories, pieces) {
  for (const story of stories)
    for (const state of story.states) {
      const stage = document.querySelector(`[data-state="${story.name}:${state.id}"]`);
      preact.render(libHtml`<${pieces[story.component]} ...${state.props} />`, stage);
    }
}
// each primitive page: its stories, the pieces that draw them, and a note
const PRIMITIVE_PAGES = {
  'primitives/buttons': {
    title: 'Buttons',
    stories: () => G.Lib.ButtonStories,
    pieces: () => G.Lib.Button,
    note: 'The pixel-art buttons (js/ui/lib/primitives/button/). Props only: the screen passes the label, size, rims and state, and handles the press. Placeholder labels.',
  },
  'primitives/panels': {
    title: 'Panels',
    stories: () => G.Lib.PanelStories,
    pieces: () => G.Lib.Panel,
    note: 'The frames and the cards (js/ui/lib/primitives/panel/). Props only: the screen passes the size, rims and contents (a card gets its picture and its button). Placeholder data.',
  },
  'primitives/bars': {
    title: 'Bars',
    stories: () => G.Lib.BarStories,
    pieces: () => G.Lib.Bar,
    note: 'The life bar and the timer strip (js/ui/lib/primitives/bar/). Props only: the screen passes the size, the fill and its band, the lost pieces, a timer\u2019s time left. Placeholder values.',
  },
  'primitives/modal': {
    title: 'Modal',
    stories: () => G.Lib.ModalStories,
    pieces: () => G.Lib.Modal,
    note: 'The dialog (js/ui/lib/primitives/modal/). Props only: the caller passes the text, the buttons and which one is green; G.UI.ask handles the keys and the answer. Placeholder text.',
  },
  'primitives/portraits': {
    title: 'Portraits',
    stories: () => G.Lib.PortraitStories,
    pieces: () => G.Lib.Portrait,
    note: 'The round portrait (js/ui/lib/primitives/portrait/). Props only: the screen passes the face\u2019s address, size, stroke and rim, a ring\u2019s fill, fainted. Real portraits from assets/pokemon.',
  },
  'primitives/squares': {
    title: 'Squares',
    stories: () => G.Lib.SquareStories,
    pieces: () => G.Lib.Square,
    note: 'The item squares and their grid (js/ui/lib/primitives/square/). Props only: the screen passes each square its picture and each slot its tooltip. Placeholder pictures.',
  },
};
/** A primitive page's note and stories (a tab of Buttons, or a whole page). */
const primitiveBody = (id) => {
  const page = PRIMITIVE_PAGES[id];
  return `<p class="lib-note">${esc(page.note)}</p>${page.stories().map(storyBlock).join('')}`;
};
const primitivePage = (id) => () => `<h2>${esc(PRIMITIVE_PAGES[id].title)}</h2>${primitiveBody(id)}`;
