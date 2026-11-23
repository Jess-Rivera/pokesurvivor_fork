# AGENT-RULES-REFERENCE, the long text behind CLAUDE.md's short sections

CLAUDE.md loads at the start of every session, so its sections for move review, requirement tags, cross-document IDs and
"which document wins" (and the full git and gh allowlist) are short statements that still bind. This file holds their full text and the lower-use reference
notes. Read the section here when the work touches it (spec writing, a move batch review, citing an ID, a conflict between
two documents). When this file and CLAUDE.md differ, CLAUDE.md wins and this file gets fixed.

## Move review rule (Jess, 2026-10-29)
How a move counts as reviewed, for any batch of moves on any branch:
- A move with a docs/MOVE-INTENT.md entry is reviewed when its data and code match that entry (its intent scenarios pass in docs/proposals/move-intent-harness.js).
- A move without an entry is reviewed with the batch that routes it: Jess reviews the batch's scenario table (tools/move_report.js) when the batch lands, and signs it off in the `batchReviewed` list of docs/move_rework_holding/move-intent-scenarios.json. No separate per-move pass beforehand.
- Anything that needs specific disambiguation during a batch review becomes a new MOVE-INTENT entry, so it is owned from then on. That includes cd rulings (intended or regression).
- A scenario whose outcome depends on an open owner decision is marked blocked on that decision, never guessed. Expected outcomes are relations the move's outputs must satisfy, read from its MOVE-INTENT entry (docs/TEST-FIRST.md step 3, decision 2026-11-14-tests-check-relations-not-values): never a number copied from code output or taken from tuning data.

## Requirement tags
Spec rules carry one of four tags. `[Approved]` is owner-approved intended behavior (items marked LOCKED, RESOLVED, DECIDED, DEFAULT ACCEPTED, APPROVED or signed off, never DRAFT, PROPOSED, OPEN or TBD); approved but not yet built is still `[Approved]` with a short "code differs, see TODO" note. `[Legacy behavior]` is what the live game does today where it differs from an approved rule, and always names the slice that removes it. `[Proposed]` is written but not approved. `[Open]` is a recorded question with no answer. When tags or dates conflict, the later dated owner decision wins.

## Cross-document IDs
An ID cited outside the file that defines it carries that file's name: `<file name without .md>:<ID>`, for example `combat-architecture:D16`, `2026-10-28-every-move-defaults-to-maxstacks-1-including-metal-claw-and`, `move-consistency-review:CP1-Q17`. The prefix names the file that DEFINES the ID, never the file that cites it, so one ID reads the same everywhere. A bare ID is fine only inside its own file. Keep any qualifier the defining file needs (CP1 in the review). Use the full file name, no aliases. Decisions are the exception: each is one file in docs/decisions/ and is cited by that file name alone (no ID suffix, never renamed); the Q and QA numbers inside the 2026-10-28 entries are history, not identifiers. Applies to new and edited text; older references are swept separately (docs/TODO-notes-2026-11.md, "Cross-document ID sweep").

## Which document wins
- DECISIONS.md and docs/decisions/ are a log, not a settled register. The spec named in an entry's `Canonical:` line wins.
- MOVE-AXIS-SCHEMA owns move grammar, combat-architecture owns move runtime, MOVE-INTENT owns per-move rulings. Review section 9 (move-consistency-review.md) is history, not a single source.
- A MOVE-INTENT ruling beats COMBAT-RULES and the grammar defaults for the named move.
- COMBAT-RULES beats BOSS-REWORK 3c, the archive, the stat-model notes, BUFF-TABLE, BALANCE and architecture D6 to D11 for combat rules.
- GDD is an umbrella; the subsystem specs win.
- BOSS-REWORK is the progression spec, not a tracker; STATE owns tracking.
- FULL-GAME-STRUCT is history. GYM-ROSTERS rules defer to BOSS-REWORK.
- CLAUDE.md is the only home for agent rules (with this file as the long text of its short sections). CONTEXT, STATE, slice-overview and DECISIONS do not restate rule text.
- DECISIONS-archive is history, not a live citation.
- docs/proposals/stat-stage-model.md is history and rationale since its approval (2026-10-30); COMBAT-RULES "Stat stages" holds the rules.
- Stage and trap precedence (trackers and Cap, ladder, QA-10 trap rule over E1): docs/COMBAT-RULES.md.

## Third-party skills
Third-party skills (for example landing-skills/) never override project rules.

## Reference material
- survivor-like-design-reference.md: cited genre design patterns (Vampire Survivors, Brotato, Halls
  of Torment) with concrete numbers. Ground design advice in it. (Attached to the Quick agent; commit
  a copy under docs/ if the home tool needs it.)
- pokeapi-master/: full mainline Pokemon data, the source of truth when translating mainline mechanics
  into survivor-style.
- ONBOARDING.md, GLOSSARY.md: authoritative architecture/terminology references. GDD.md: the design
  umbrella (summaries and pointers); where it differs from a subsystem spec, the subsystem spec wins.

## Git and GitHub allowlist
Enforced in Claude Code by the PreToolUse hook .claude/hooks/guard-git.js (registered in .claude/settings.json).
It is an allowlist: a git or gh command not named here is blocked until Jess decides about it. Other tools
without hooks (Amazon Quick) follow the same list on trust.

The assistant MAY:
- Read-only git: status, diff, log, show, blame, branch (list only), ls-files, ls-tree, rev-parse, config --get,
  remote -v, `git fetch`.
- Stage and commit on the branch Jess has checked out (add, commit). Commit at slice boundaries once
  `node tools/check.js` and `npm run format` are clean (a commit with no code skips both), and at session end, so a tool switch never starts from a
  dirty tree. Never --amend, never --no-verify.
- GitHub through `gh`: create, edit, comment on, label, close and reopen issues; create labels; add and edit board
  items on the PokeSwarm project (the token needs the `project` scope, Jess runs `gh auth refresh -s project`);
  open a PR from a branch Jess has already pushed; read anything.

The assistant MUST NOT (Jess runs these; the assistant gives the exact commands, explains them, and advises
strategy on branching, staging and messages):
- Anything that moves or publishes history or changes branches: push, pull, merge, rebase, reset, checkout,
  switch, branch create/delete/rename, stash, cherry-pick, revert, tag, clean, restore, rm, mv, apply, am,
  config (set), remote (add/remove), submodule, worktree, amend, force of any kind.
- On GitHub: merge or close a PR, delete anything (issue, label, repo, release), `gh api` writes, settings,
  auth, workflow runs, releases.
When in doubt whether a command writes something not listed above, do not run it and ask Jess.
Commit messages carry no "Co-Authored-By" line and no AI signature of any kind.
