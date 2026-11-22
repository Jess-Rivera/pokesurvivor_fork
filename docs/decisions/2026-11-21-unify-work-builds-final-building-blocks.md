---
title: "during the UI unify, what a slice touches is built or renamed into its final library piece (Jess)"
date: 2026-11-21
issues: []
area: ui
canonical: "this file (a scope rule for the unify work; ends when #126 closes)."
---
# 2026-11-21: during the UI unify, what a slice touches is built or renamed into its final library piece (Jess)

- While the UI is being unified (#126 and any slice pulled forward from it, starting with #128's Pokeballs tab), a
  piece a slice draws is built as its final library primitive, under its board name, even with one caller today. A
  local patch (a one-off CSS class, a look bolted onto an old piece) is not acceptable when it would be redone later.
- A piece is built whole, every state the board approved, not only the states the first caller uses.
- Renames that make an existing piece a building block are in scope (calling a piece by its library name, an old
  token becoming an alias of its Unified token).
- The line: pieces the slice draws are built; pieces it does not draw wait for the slice that draws them.
- Overrides the "one caller" and "extract on the third repeat" readings of YAGNI and DRY in
  .claude/skills/coding-principles/SKILL.md for this work only; the rest of that file still applies.

Canonical: this file (a scope rule for the unify work; ends when #126 closes).
