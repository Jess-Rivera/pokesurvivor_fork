# Writing Agent Briefs

<!-- Adapted from mattpocock/skills (landing-skills/triage/AGENT-BRIEF.md). Examples dropped; links, checks and
the feel-test criterion added. -->

An agent brief is a structured comment posted on a GitHub issue when Jess asks for one, or when the issue is going to a different tool or session. It is the contract the next session works from. The issue body and discussion are context; the brief is the contract.

A brief says **what to do**. It does not authorize building game code: the prose plan and Jess's OK in CLAUDE.md "Edit boundary and workflow" still come first. The brief makes that plan easy to write.

## Principles

### Durability over precision

The issue may sit for days or weeks and the code will change. Make the brief survive file moves and refactors.

- **Do** link the spec that owns the rule: a docs/MOVE-INTENT.md entry, a docs/COMBAT-RULES.md section, a BOSS-REWORK.md section, a docs/GYM-ROSTERS.md row, or a DECISIONS.md entry by its `<file>:<ID>`.
- **Do** describe behavior and name the data shapes or modules involved (`G.Stats`, `G.GymLeader`, a move's axis fields), not their locations.
- **Don't** reference file paths, line numbers, or code. CLAUDE.md bans code in plans; a brief is a plan.
- **Don't** assume the current structure will remain.

### Behavioral, not procedural

Say what the game should do, not how to build it. The next session explores the code and makes its own implementation choices.

### Complete acceptance criteria

Concrete, independently verifiable criteria. Always include these two:
- `node tools/check.js` ends with every harness passing, and `npm run format` leaves the tree clean.
- Jess feel-tests the change in the browser (dev.html). A feel test is the final criterion, never skipped.

For anything that touches saves, add: old saves still load, new fields null-checked and defaulted.

### Explicit scope boundaries

State what is out of scope so the next session does not gold-plate. Cloud and multiplayer work is always out of scope (local-first).

## Template

```markdown
## Agent Brief

**Type:** bug / feature / balance / design
**Summary:** one-line description of what needs to happen

**Current behavior:**
What happens now. For a bug, the broken behavior; otherwise the status quo this builds on.

**Desired behavior:**
What should happen when the work is done. Edge cases and error conditions.

**Spec and context:**
- The spec entries that own the rule (link by file and ID or section)

**Acceptance criteria:**
- [ ] Specific, testable criterion
- [ ] Specific, testable criterion
- [ ] node tools/check.js passes; npm run format leaves the tree clean
- [ ] Jess feel-tests the change in the browser

**Out of scope:**
- Thing that should NOT be changed
- Adjacent work that is separate
```

## A bad brief

"Fix the gym thing. The function around line 150 in the gym file has the issue." It has no type, no current/desired behavior, a stale line reference, no criteria and no scope. It will go stale and the next session cannot tell when it is done.
