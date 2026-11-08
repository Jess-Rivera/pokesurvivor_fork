## 2026-10-31, ESLint and Prettier wait for the move-schema merge (Jess)
Both tools are adopted, but neither lands until feature-test/new-move-schema merges into main (after 7b), so the branch never has to reconcile a whole-repo reformat. Then one chore branch off main: ESLint (script sourceType, browser globals plus G, ecma 2020, generated and vendored folders ignored, warn-only in check.js at first), and Prettier as one big-bang format commit, listed in .git-blame-ignore-revs. Prettier options are settled at that time, matching the house style (2-space, single quotes, semicolons).
Canonical: issue #17 (closed), docs/TODO-notes-2026-11.md "Lint and format tooling"

