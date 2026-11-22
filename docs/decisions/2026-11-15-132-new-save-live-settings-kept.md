---
title: "#132: the new save goes live with S1; settings are kept; no new harness (Jess)"
date: 2026-11-15
issues: [132]
area: engine
canonical: "docs/AI Outputs/Issue-128/Acquisition v2 - Spec.txt section 9."
---
# 2026-11-15, #132: the new save goes live with S1; settings are kept; no new harness (Jess)

- The save version is 4. Any local save below it (v3 saves and pre-Pokebox saves) is copied whole to ps.backup.preacq.<key>
  once, never overwritten, and replaced by a fresh save, with the "New save needed" notice once. A current save loads as normal.
- It is live as soon as S1 lands on feature/128-acquisition, not behind a switch.
- Settings (ps.settings: volume, language, layout) are a separate key and are kept. Accounts and the session are untouched.
- No new test file: pokebox-copies-harness.js section 7 already covers the reset and now seeds a v3 save with a Pokebox.

Canonical: docs/AI Outputs/Issue-128/Acquisition v2 - Spec.txt section 9.
