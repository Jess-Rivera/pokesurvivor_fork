// Path to rule table for inject-rules.js. Each rule is injected once per session, the first time an edit touches a
// matching path. The tag at the start of each text shows in the transcript and the hook log, so a fire is easy to spot.
// `gate: true` means the first edit to a matching path is blocked until the coding-principles skill has been loaded.
// Rule text is a short reminder; CLAUDE.md and the named docs stay the real source.
const isGameCode = (rel) =>
  (/^js\/.*\.js$/.test(rel) && !/^js\/(vendor\/|app\.min\.js$)/.test(rel) && rel !== 'js/data/changelog.js') ||
  rel === 'dev.html' ||
  /^css\/.*\.css$/.test(rel);

const RULES = [
  {
    id: 'game-code',
    gate: true,
    matches: isGameCode,
    text:
      '[rule:game-code] Game-code edit boundary (CLAUDE.md "Edit boundary and workflow"): this changes what the game does, so ' +
      'a prose plan with NO code must already be approved by Jess for exactly this scope; if it was not, stop and give the plan. ' +
      'The plan and the code both follow the coding-principles skill. After editing: run the relevant harness, npm run format, ' +
      'then node tools/check.js. Jess feel-tests each change. Save loads must null-check and default every new field.',
  },
  {
    id: 'data',
    matches: (rel) => /^js\/data\/[^/]+\.js$/.test(rel) && rel !== 'js/data/changelog.js',
    text:
      '[rule:data] js/data/*.js is game data: a change needs the approved plan. Tuned values live in BALANCE.md. ' +
      'Only js/data/changelog.js is free-edit (verify it still parses).',
  },
  {
    id: 'ui',
    matches: (rel) => /^js\/ui\//.test(rel) || /^css\/.*\.css$/.test(rel),
    text:
      '[rule:ui] UI code: use G.UI.ask, never confirm, alert or prompt. Colours come only from Tokens, Colours, Unified ' +
      '(no invented shades). New user-facing strings are written in English directly; nicknames stay translate="no".',
  },
  {
    id: 'lang-en',
    matches: (rel) => rel === 'js/data/lang-en.js',
    text:
      '[rule:lang-en] lang-en.js is the Spanish-to-English dictionary for inherited text. Spanish literals are the keys: do not ' +
      'translate them in place. Do NOT add entries for our own new English strings; they render English-only on purpose.',
  },
  {
    id: 'moves',
    matches: (rel) => /^js\/data\/move[^/]*\.js$/.test(rel) || /^js\/systems\/move-[^/]+\.js$/.test(rel),
    text:
      '[rule:moves] Move work: per-move rulings are docs/MOVE-INTENT.md (beats COMBAT-RULES for that move); data shape is ' +
      'docs/MOVE-AXIS-SCHEMA.md; runtime is docs/current feature planning/combat-architecture.md. A move is reviewed when its ' +
      'data and code match its MOVE-INTENT entry; checks assert relations, not values copied from code output (docs/TEST-FIRST.md).',
  },
  {
    id: 'tools',
    gate: true,
    matches: (rel) => /^tools\/[^/]+\.js$/.test(rel),
    text:
      '[rule:tools] tools/ scripts never ship in the game, so edit directly with no proposal. Then run node tools/check.js, ' +
      'npm run format, and any smoke the change touches.',
  },
  {
    id: 'decisions',
    matches: (rel) => /^docs\/decisions\/[^/]+\.md$/.test(rel),
    text:
      '[rule:decisions] One file per decision, about 10 lines, cited by file name alone and never renamed. It carries a ' +
      '`Canonical:` line naming the spec that holds the rule, and DECISIONS.md gets an index line. The task it implies goes in an issue.',
  },
];

function matchRules(rel) {
  return RULES.filter((rule) => rule.matches(rel));
}

module.exports = { RULES, matchRules };
