## 2026-11-01, ESLint + Prettier setup choices (Jess: defaults)
ESLint 9 flat config: eslint:recommended plus a short Airbnb-derived set (eqeqeq, no-var, prefer-const, no-shadow, no-unused-vars), not the full Airbnb config (it assumes ES modules and bans patterns this script-global code uses). Warn-only: tools/check.js prints the count and never fails on it. Prettier: single quotes, semicolons, 2-space, width 120, trailing commas es5, LF; .gitattributes and .editorconfig pin LF. One big-bang format commit comes next, its hash in .git-blame-ignore-revs.
Canonical: issue #17 (closed), docs/TODO-notes-2026-11.md "Lint and format tooling"; eslint.config.js; .prettierrc.json

