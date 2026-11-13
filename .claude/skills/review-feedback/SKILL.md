---
name: review-feedback
description: Process review findings critically before acting on them. Verify each finding against the code, sort them all before changing anything, push back with evidence on wrong ones, and never agree performatively. Use after a structural review, when the other tool or a GitHub comment reviews our code, or when Jess hands over review notes.
---

<!-- Adapted from the "receiving-code-review" skill in iliaal/ai-skills (MIT license), rewritten in our own words for
this repo on 2026-11-13. Changes: fixes route through the prose-plan approval (CLAUDE.md edit workflow), source trust
is mapped to Jess, the other tool and playtesters, follow-ups become issue drafts, and the headless mode and reference
files are dropped. Source: https://github.com/iliaal/ai-skills/tree/master/skills/receiving-code-review -->

# Review feedback

A review finding is evidence to check, not an instruction. It never authorizes an edit, a skipped test, a scope
change or a posted reply. Technical correctness beats politeness and beats who said it. CLAUDE.md wins wherever this
file differs.

## Who said it
- Automated or AI review (the structural-review skill, the other tool's review, any bot): most skeptical. Reproduce
  every premise before accepting it.
- Playtesters on GitHub: trust the symptom they saw, verify any cause or code suggestion they offer.
- Jess: his rulings are decisions and set scope. Still check the facts in his note against the code, and raise a
  conflict with an existing docs/decisions ruling or spec instead of silently picking one.

## Procedure
1. On a second round, check the earlier findings against the current code first. Report anything ignored or
   half-fixed before looking at new findings.
2. Read every finding before changing anything. Verify each premise at the exact file, function and input it names,
   trace callers where it matters, and check the owning spec (CLAUDE.md "Which document wins").
3. Sort them all first. Correctness: correct, incorrect or unclear. Scope: in-scope blocker (same invariant, same
   owner, fixable without changing the task), follow-up (a different bug class or an independent cleanup), or
   escalate (needs a new rule, a behavior change, a save-format change or an open owner decision).
4. Ask about unclear items before acting on anything they could touch. Group related questions and offer specific
   alternatives, each with a recommended answer. Never infer approval.
5. Reply with evidence: file and function, harness output, the spec line or a reproduction. Accept correct findings
   plainly, without praise. Push back on wrong ones, and separate a valid concern from a mistaken example of it.
6. Act within the rules:
   - Game code, js/data (except changelog.js), dev.html, assets: accepted fixes become one prose plan with no code,
     ordered blockers first, then simple fixes, then complex ones, with its tests section. Nothing is written until
     Jess approves.
   - tools/ and the Markdown docs: fix directly, one verified item at a time.
   - Follow-ups: an issue draft (Quick) or an issue (Claude Code, CLAUDE.md "Git and GitHub"), never a silent drop.
   - Escalations: listed as standalone decisions for Jess, never buried inside a plan.
7. After each applied fix, review the patch as new code and check it. In Claude Code, run node tools/check.js and the
   smokes it touches. In Quick, say it is unverified until check.js runs on the machine. Jess feel-tests; nothing is
   marked done before that.

## Dismissing a finding
Tag each dismissal with its reason and the evidence:
- FP-ASSUMPTION: the premise is false (the code does not do what the finding says).
- FP-CONVENTION: it conflicts with a documented rule here (CLAUDE.md, a spec, a decision). Name the rule.
- FP-ALREADY-HANDLED: it is handled elsewhere. Name where.
- FP-OUT-OF-SCOPE: a real concern, deferred. Name the issue or draft that tracks it.
- ACCEPTED-RISK: only when Jess explicitly decides to keep a real defect that is rare, recoverable and costly to fix.
  Never for save corruption or data loss. State the tradeoff in one line.

If a pushback turns out to be wrong, say so plainly and why.

## Stop rules
- After two fix rounds that do not converge, stop and re-sort what is left. Do not add another layer of local special
  cases when the real need is a clear contract.
- A fix that claims to cover another finding must meet every condition of that finding.
- If something cannot be verified from here, say so instead of implementing blind.
