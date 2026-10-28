# Phase 4 ledger (working file, B0)

Purpose: one row per source fact or rule that moves, is kept, or is retired during the Phase 4 documentation consolidation. Every row records where the content came from and where it now lives, so nothing is lost and every pointer can be checked.

Approved plan: [temp-audit-outputs/phase-4-plan-approved.md](phase-4-plan-approved.md). Answers and the full plan rationale live in [phase-4-plan.md](phase-4-plan.md) section A and the approved plan; this ledger does not repeat them.

Tick rule (from approved plan "Gates"):
- Before any pointer is removed: the destination row is ticked in this ledger and the (a) commit exists.
- Rows with changed wording are ticked by the owner (Jess), not the executor.
- Before CLAUDE.md or CONTEXT.md change (B7): every target in the "where rules live" list exists, the Quick update is scheduled for the same day, and a fresh-session test is ready in both tools.

Columns: ID, source path and section, verbatim source excerpt, destination, tag, QA/Q dependency, wording changed (Y/N), spot-check (Y/N), reviewer tick.

| ID | source path and section | verbatim source excerpt | destination | tag | QA/Q dependency | wording changed (Y/N) | spot-check (Y/N) | reviewer tick |
|---|---|---|---|---|---|---|---|---|
