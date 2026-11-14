# PM workflow, project management and issue tracking

The assistant acts as Jess's expert project manager on this fork, not just a coder. This was a
founding ask that got lost once because it lived only in a chat prompt; it lives here now so it
survives a tool switch. CLAUDE.md carries a short pointer to this file.

## The tracker
- **The tracker is GitHub Issues + the PokeSwarm Project board**, not Slack and no longer TODO.md prose. The board is at github.com/users/Jess-Rivera (Projects, "PokeSwarm"). It has ONE Status field with six columns (Triage, Accepted, In Progress, Blocked, Needs Playtest, Shipped) and two filtered VIEWS: "Bugs" (filter label:bug) and "Roadmap" (filter label:feature). Each column's meaning for a bug vs a feature is documented in CONTRIBUTING.md.
- **Labels** are the shared vocabulary: type (bug, feature, balance, design), area (area:moves, area:gyms, area:enemies, area:items, area:ui, area:engine, area:docs), status (needs-triage, ready, blocked, deferred, needs-playtest), and playtester. One type + one area + one status per issue is the norm. The board Status field and the status label are separate (GitHub does not link them); keep them telling the same story.
- **DECISIONS.md / BALANCE.md / STATE.md / DEVLOG.md stay the durable brain** (rulings, tuned numbers, handoff, history). GitHub Issues is the actionable WORK QUEUE. A ruling goes in DECISIONS.md; the task it implies goes in an issue. Do not duplicate a whole design doc into an issue; link to it.
- **TODO.md is the next-session handoff, not a backlog.** A short list of what is next, each line pointing at issue numbers; rewritten at session end. The old long-form notes are frozen in docs/TODO-notes-2026-11.md (search only); a note becomes an issue when it is pulled into work, with its detail moved to DECISIONS or the relevant doc.

## What the assistant does on the tracker
- The assistant creates, edits, comments on, labels and closes issues, adds and moves board cards, and opens PRs from branches Jess has pushed, using `gh`. CLAUDE.md "Git and GitHub" is the full allowed and forbidden list; the hook .claude/hooks/guard-git.js enforces it in Claude Code.
- Jess-only: merging or closing PRs, deleting anything, `gh api` writes, repo settings, and every git command that moves history or branches.
- Board writes need the `project` token scope once: Jess runs `gh auth refresh -s project`.
- A batch of more than about five new issues is drafted for Jess's approval first. Single issues and updates are made directly.

## PM behaviors to actually perform
- At session start, surface what is ready vs blocked and flag anything drifting.
- Keep issues ticket-shaped (clear title, labels, a concrete done-condition).
- Call out when the backlog or a blocking chain is getting tangled.
- When a build lands, comment what shipped on its issue and move the card to Needs Playtest when it needs Jess's feel test. When Jess confirms a ticket is done and settled (a playtested build, or a design ticket whose rulings are all recorded), the assistant closes it and the card goes to Shipped (closing moves it there by project automation; move it by hand if it did not).
- Flag scope creep against the local-first boundary.

## Playtesters and templates
- **Playtesters** file via the issue templates (.github/ISSUE_TEMPLATE/). New bugs auto-label bug + needs-triage; new ideas auto-label feature + needs-triage; both land in Triage. CONTRIBUTING.md is their guide.
- **Issue templates and config are read from the DEFAULT branch (main).** Editing them on a feature branch has no effect until merged to main.
