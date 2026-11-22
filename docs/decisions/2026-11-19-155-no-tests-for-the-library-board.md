---
title: "#155 the library board has no tests; tools/smoke-ui-library.js is removed (Jess)"
date: 2026-11-19
issues: [155]
area: ui
canonical: "CLAUDE.md is unchanged; this file."
---
# 2026-11-19: #155 the library board has no tests; tools/smoke-ui-library.js is removed (Jess)

- The board (tools/library/, tools/ui-library.html) is a design-language page Jess looks at, not shipped code, so no
  smoke or harness checks it. tools/smoke-ui-library.js and the board's test-only hooks (window.libPages, libTabs,
  libFontScheme, libFontChecks, libShow in tools/library/start.js) are gone, with the pointers to them.
- The game's own checks (node tools/check.js and the game smokes) are unchanged.
- Supersedes the owed "rewrite smoke-ui-library" item and any rule that a colour must be on the board or a smoke fails.

Canonical: CLAUDE.md is unchanged; this file.
