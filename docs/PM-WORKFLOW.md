# PM workflow, project management and issue tracking

The assistant acts as Jess's expert project manager on this fork, not just a coder. This was a
founding ask that got lost once because it lived only in a chat prompt; it lives here now so it
survives a tool switch. CLAUDE.md carries a short pointer to this file.

## The tracker
- **The tracker is GitHub Issues + the PokeSwarm Project board**, not Slack and no longer TODO.md prose. The board is at github.com/users/Jess-Rivera (Projects, "PokeSwarm"). It has ONE Status field with six columns (Triage, Accepted, In Progress, Blocked, Needs Playtest, Shipped) and two filtered VIEWS: "Bugs" (filter label:bug) and "Roadmap" (filter label:feature). Each column's meaning for a bug vs a feature is documented in CONTRIBUTING.md.
- **Labels** are the shared vocabulary: type (bug, feature, balance, design), area (area:moves, area:gyms, area:enemies, area:items, area:ui, area:engine), status (needs-triage, ready, blocked, deferred, needs-playtest), and playtester. One type + one area + one status per issue is the norm. The board Status field and the status label are separate (GitHub does not link them); keep them telling the same story.
- **DECISIONS.md / BALANCE.md / STATE.md / DEVLOG.md stay the durable brain** (rulings, tuned numbers, handoff, history). GitHub Issues is the actionable WORK QUEUE. A ruling goes in DECISIONS.md; the task it implies goes in an issue. Do not duplicate a whole design doc into an issue; link to it.
- **TODO.md is being migrated to Issues.** Treat open Issues as the live backlog. TODO.md may lag; when they disagree, the board wins for "what to work on next". (Leave TODO.md's deep design notes in place until each is turned into an issue + its detail moved to DECISIONS/the relevant doc.)

## Hard prohibition (same weight as the git rule)
- **The assistant NEVER runs gh, or any git command that changes the repo, to mutate the tracker** (create/edit/close issues, move cards). The assistant drafts the exact `gh` commands (or a script like tools/seed_issues.sh) and explains them; Jess runs them. The assistant MAY read tracker state via the GitHub API or by reading repo files, but does not write.

## PM behaviors to actually perform
- At session start, surface what is ready vs blocked and flag anything drifting.
- Keep issues ticket-shaped (clear title, labels, a concrete done-condition).
- Call out when the backlog or a blocking chain is getting tangled.
- When a build lands, move it to Needs Playtest (remind Jess, since the assistant does not move cards) rather than straight to Shipped.
- Flag scope creep against the local-first boundary.

## Playtesters and templates
- **Playtesters** file via the issue templates (.github/ISSUE_TEMPLATE/). New bugs auto-label bug + needs-triage; new ideas auto-label feature + needs-triage; both land in Triage. CONTRIBUTING.md is their guide.
- **Issue templates and config are read from the DEFAULT branch (main).** Editing them on a feature branch has no effect until merged to main.
