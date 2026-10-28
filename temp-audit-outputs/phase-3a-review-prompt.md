You are planning Phase 4 of a documentation consolidation. Planning only. Do not
edit any files, run any git command that changes anything, or begin executing
batches.

Context: repo is the PokeSurvivor fork, branch chore/documentation-authority-audit
(cut from feature-test/new-move-schema at e2acd82). Phase 3A produced a
questionnaire, my corrected answers, and a draft migration plan (batches B0 to
B9). The draft plan was written BEFORE my answers and by another model, so do not
assume it still fits. Phase 4 is the execution of the consolidation. I want your
independent reasoning, opinion and a plan I can hand to an executor.

Files (all in temp-audit-outputs/):

- phase-3a-owner-questionnaire-answers.md   (my final answers; read FIRST)
- phase-3a-owner-questionnaire.md           (questions, recommendations, section E routine items R-01 to R-16, deferred D-01 to D-07)
- phase-3a-migration-plan.md                (draft B0 to B9, ground rules, completion criteria, automated checks)
- phase-3a-consolidation-map.md             (subject, gap and evidence IDs: S, SG, NE, C, F, EC). Search by ID, do not read whole.
- phase-3a-summary.md

Scope your reading. Read the answers and migration plan in full. For everything
else, search for the specific ID, file or term you need and read only that
section. Repo files outside temp-audit-outputs (CLAUDE.md, CONTEXT.md, STATE.md,
DECISIONS.md, js/ comment references) may be read only to verify a specific claim.
If you cannot verify a claim without a full read, mark it unverified and move on.

Hard project rules the plan must respect (CLAUDE.md):

- The assistant never runs repo-changing git or gh; the plan gives me exact
  commands and commit messages, I run them. No Co-Authored-By or AI signature.
- Markdown project docs are free-edit. Anything in js/, js/data/*.js (except
  changelog.js), dev.html, build config or assets needs a prose plan with no code
  and my OK first.
- No em-dashes in repo prose.
- The prose plan itself contains no code.

Method:

1. Read my answers first. Before reading the draft plan, form your own view of
   how Phase 4 should be sequenced and what could go wrong, given only the
   answers and the questionnaire.
2. Then read the draft migration plan and compare. Say where it still holds,
   where my answers break it, and where it was wrong anyway. Check in particular
   whether my answers change its ground rules (renames or moves of files, number
   of new files, git handling, agent-facing changes), its dependency order, and
   its time-sensitivity assumptions (it assumed 4c coding continues in parallel;
   my QA-00 answer pauses coding until the audit merges).
3. Verify, do not trust. For any claim in my answers or the plan that can be
   checked cheaply (file names, citation counts, line references, whether a rule
   exists in a source), check it. Mark the rest unverified.
4. Treat prior reviews, including any review of my answers you may infer from
   them, as claims to test, not facts.

Deliver:

A. Your opinion on the answers as a whole

- The three or four answers that most shape Phase 4 risk, and whether you
     would execute them as written. If an answer is a design decision that
     belongs in a spec rather than a doc-consolidation step (e.g. a new
     gameplay rule or a code change), say so and say where it should be
     recorded instead.
- Anything still unanswered or ambiguous that an executor would have to guess.
     List each as a question I can answer in one line.

B. Revised Phase 4 plan

- A batch list replacing B0 to B9 where needed: scope, prerequisites (by QA,
     R, SG ID), files touched, expected result, risks, validation, rollback.
- A recommended order and why. Call out what must be done before any rename,
     before any pointer is removed, and before CLAUDE.md or CONTEXT.md changes.
- Commit strategy: how many commits per batch, suggested commit messages
     (no AI trailer), and the exact read-only checks I should run between batches.
- Checkpoints where the executor must stop and get my explicit OK.
- Every file created, renamed, moved or deleted, each with the citations that
     must be updated and whether any of them are in gated code.
- Precedence changes: list each place the answers change which document wins.

C. Executor guardrails

- What the executor must not do (scope creep, silently resolving open
     decisions, rewriting rules while "consolidating", tagging unratified rules
     as approved).
- How `[Open]`, `[Approved]`, `[Proposed]` and `[Legacy behavior]` tags are to
     be assigned given my QA-07 answer.
- How to handle the consolidation ledger and temp-audit-outputs/ at the end.

D. Risks and alternatives

- Your top five risks ranked, each with a mitigation.
- Where you would deviate from my answers, with the strongest argument for the
     alternative and the cost of my way. Be direct. I prefer frank assessment to
     diplomatic hedging.

E. Out of scope / follow-ups

- Game code or data changes my answers imply, which need their own prose plan
     (list them, do not plan them).

Be specific and cite filename.IDs (e.g phase-3a-owner-questiionnaire.QA-xx). Do not pad with praise. Do not restate the questionnaire. If two of my answers conflict, say which and propose
which should win.
