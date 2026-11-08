---
name: triage
description: Move GitHub issues through a state machine (needs-triage, needs-info, ready, blocked, wontfix), categorise, verify, grill if needed, and write agent briefs when asked. Keeps labels and the PokeSwarm board in step.
disable-model-invocation: true
---

<!-- Adapted from mattpocock/skills (landing-skills/triage, the untouched original). Changes: labels and board mapped
to this repo, PR handling and the setup-skill dependency removed, domain-modeling step removed, out-of-scope moved to
docs/out-of-scope/, disclaimer dropped. Hook and permission rules: CLAUDE.md "Git and GitHub". -->

# Triage

Move issues on the GitHub tracker (Jess-Rivera/pokesurvivor_fork, board "PokeSwarm" = project 2) through a small state machine. Jess is the maintainer. Playtesters file issues through the templates in .github/ISSUE_TEMPLATE; those arrive labeled `needs-triage` in the board's Triage column. Label vocabulary and board columns: docs/PM-WORKFLOW.md and CONTRIBUTING.md.

Triage comments carry no AI disclaimer. Follow CLAUDE.md prose style (no em-dashes) in everything posted.

## Reference docs

- [AGENT-BRIEF.md](AGENT-BRIEF.md): how to write a brief, only when asked (see "Agent briefs")
- [OUT-OF-SCOPE.md](OUT-OF-SCOPE.md): how docs/out-of-scope/ works

## Roles in this repo

One **type** label: `bug`, `feature`, `balance`, `design`.
One **area** label: `area:moves`, `area:gyms`, `area:enemies`, `area:items`, `area:ui`, `area:engine`.
One **status** label, and the board Status it sets:

| Status label | Meaning | Board Status |
|---|---|---|
| `needs-triage` | Jess has not evaluated it | Triage |
| `needs-info` | Waiting on the reporter | Triage |
| `ready` | Specified, can be picked up (still needs a prose plan and Jess's OK before game code) | Accepted |
| `blocked` | Waiting on another issue or a decision | Blocked |
| `needs-playtest` | Built, awaiting an in-browser check | Needs Playtest |
| `deferred` | Real but not now (cloud and multiplayer phase) | Triage |
| `wontfix` | Rejected; the issue is closed | (leave the card) |

`priority:high` is optional and independent. In Progress and Shipped are set outside triage (Shipped only by Jess).
Every triaged issue carries exactly one type, one area and one status label; the board Status must agree with the status label. If status labels conflict, flag it and ask before doing anything else.

Transitions: an unlabeled issue goes to `needs-triage` first; from there to `needs-info`, `ready`, `blocked`, `deferred` or `wontfix`. `needs-info` returns to `needs-triage` once the reporter replies. Jess can override at any time; flag unusual transitions and ask.

`ready` never means approved to build. A change to game code still needs the prose plan and Jess's OK (CLAUDE.md "Edit boundary and workflow").

## Invocation

Jess invokes `/triage` and describes what they want in natural language, for example "what needs my attention", "let's look at #42", "move #42 to ready", "what's ready".

## Show what needs attention

Query the tracker (`gh issue list`) and present four buckets, oldest first, with counts and a one-line summary per item:

1. **Unlabeled**: never triaged.
2. **`needs-triage`**: evaluation pending.
3. **`needs-info` with a reply since the last triage note**: needs re-evaluation.
4. **`blocked` where every blocker is closed**: probably stale. Read the issue body and links for the blockers and check each one's state.

Let Jess pick. The "catch me up" briefing in CONTEXT.md runs these same four buckets read-only, so keep the two in step.

## Triage a specific issue

1. **Gather context.** Read the whole issue (body, comments, labels, author, dates). Parse any prior triage notes so resolved questions are not re-asked. Explore following CLAUDE.md "Efficient repository exploration", using GLOSSARY.md and the relevant spec (MOVE-INTENT, COMBAT-RULES, BOSS-REWORK, GYM-ROSTERS). Run two checks and report where you looked: (a) **redundancy**: search code and specs for an existing implementation or ruling by domain concept, not just the request's wording; if found, it is an already-implemented `wontfix`; (b) **prior rejection**: read docs/out-of-scope/*.md (if the folder exists) and surface any that resembles this request.

2. **Recommend.** Give the type, area and status recommendation with reasoning, plus a short summary of the relevant code and specs (including whether it already exists). Check scope: a cloud or multiplayer request is `deferred`, never `wontfix` (CLAUDE.md "Local-first"). Wait for Jess's direction.

3. **Verify the claim.** For a bug, try to reproduce it before any grilling: use the headless harnesses or dev.html where feasible (memory: test on file:// too; skip flaky smokes). Report confirmed (with the code path), failed, or insufficient detail (a strong `needs-info` signal). If it can only be confirmed by feel in the browser, say so and ask Jess; do not guess.

4. **Grill (if needed).** If the request needs fleshing out, invoke the `grilling` skill and work it into shape a round at a time. Decisions are recorded per grilling's wrap-up rules.

5. **Apply the outcome** (all label, comment and board changes use the `gh` commands allowed by the hook):
   - `ready`: apply the label and set the board Status. Post a brief only if asked (see "Agent briefs").
   - `needs-info`: post triage notes (template below), apply the label.
   - `blocked`: name the blocker issue or decision in a comment, apply the label.
   - `deferred`: apply the label with a one-line reason.
   - `wontfix`: only after Jess says so. Close the issue, with the comment depending on why:
     - **Already implemented**: point to where it lives; do not write to docs/out-of-scope/.
     - **Rejected (bug)**: a polite explanation, then close.
     - **Rejected (feature, balance or design)**: write to docs/out-of-scope/, link it in a comment, then close (OUT-OF-SCOPE.md).
   - `needs-triage`: apply the label. Optional comment if there is partial progress.

Board commands: `gh project item-list 2 --owner Jess-Rivera --format json --limit 200` finds a card's id (add it with `gh project item-add 2 --owner Jess-Rivera --url <issue url>` if missing); `gh project field-list 2 --owner Jess-Rivera --format json` gives the Status field id and option ids; then `gh project item-edit --id <item> --project-id <project> --field-id <status field> --single-select-option-id <option>`.

## Quick state override

If Jess says "move #42 to ready", trust them and apply it directly. Confirm what you are about to do (labels, board Status, comment, close), then act. Skip grilling. Only ask about a brief if Jess has not said whether they want one.

## Agent briefs

A brief is a comment that turns an issue into a hand-off contract. Write one only when Jess asks, or when the issue is going to a different tool or session (Quick versus Claude Desktop, or a background run). Format and rules: AGENT-BRIEF.md. The issue templates already cover most issues, so most `ready` issues need no brief.

## Needs-info template

```markdown
## Triage Notes

**What we've established so far:**

- point 1
- point 2

**What we still need from you (@reporter):**

- question 1
- question 2
```

Capture everything resolved during grilling under "established so far" so the work is not lost. Questions must be specific and actionable, not "please provide more info".

## Resuming a previous session

If prior triage notes exist on the issue, read them, check whether the reporter answered any outstanding question, and present an updated picture before continuing. Do not re-ask resolved questions.
