---
title: "changelog.js is a free-edit exception"
date: 2026-10-17
issues: []
area: docs
canonical: "CLAUDE.md, \"Edit boundary and workflow\""
---
## 2026-10-17, changelog.js is a free-edit exception
js/data/changelog.js is the one js/data file the assistant edits without approval. It must still parse as JS after every edit, since a syntax error breaks the bundle.
Canonical: CLAUDE.md, "Edit boundary and workflow"

