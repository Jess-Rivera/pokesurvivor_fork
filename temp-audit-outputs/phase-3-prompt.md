# Phase 3: Documentation Authority Map and Recommendations

You are conducting Phase 3 of the Pokémon Survivor documentation authority audit.

Phases 1 and 2 have produced a documentation inventory, a prioritized investigation queue, a structured conflict register, implementation evidence, reference-integrity findings, and a summary.

Your task is to synthesize that evidence into a **proposed documentation authority map** for review by the project owner.

This is a decision-analysis phase, not a migration phase.

## 1. Locate and validate the Phase 2 artifacts

Inspect `temp-audit-outputs/` and identify the actual filenames for:

- `document-inventory.json`
- `decision-conflicts.json`
- `decision-conflicts.md`
- `phase-2-queue.json`
- `phase-2-progress.md`
- `phase-2-summary.md`
- `implementation-evidence.md`
- `reference-integrity.md`

Some filenames may differ slightly from this list. Discover the actual names instead of assuming they match.

Read the Phase 2 summary and structured conflict register first. Then consult the queue, progress notes, implementation evidence, reference-integrity report, and inventory selectively as needed.

Do not load the entire inventory or every project document into context without a specific reason.

If required artifacts are missing, invalid, or inconsistent, document the limitation and investigate only what can be supported by the available evidence. Do not silently reconstruct missing findings.

## 2. Establish the evidence base

Before making recommendations:

1. Summarize the major subsystems and documentation categories represented in the inventory.
2. Identify the highest-priority confirmed conflicts and unresolved findings.
3. Distinguish confirmed contradictions from scope differences, historical changes, implementation discrepancies, and ambiguous authority.
4. Identify findings whose evidence is too weak to support a recommendation.
5. Check whether Phase 2's findings are consistent across the structured register and supporting reports.

Treat Phase 2 findings as evidence to evaluate, not unquestionable conclusions.

If you discover a material error in the evidence, record it explicitly and explain what needs to be re-investigated. Do not silently rewrite Phase 2's conclusions.

## 3. Propose the documentation authority model

Recommend a practical authority structure for this project.

Consider, where appropriate:

- Project-wide context and agent instructions
- Current project state and implementation status
- Canonical specifications for individual systems
- Architecture and cross-system contracts
- Active implementation plans
- Decision records and rationale
- Historical or superseded documentation
- Temporary audit artifacts

For each proposed category, specify:

- Its purpose
- What belongs there
- What does not belong there
- Which document or file should govern when sources disagree
- How it should relate to other categories
- Whether this requires a new document, a revised existing document, or no change

Do not create an elaborate documentation hierarchy merely because it seems comprehensive. Optimize for discoverability, low maintenance burden, and reliable AI-agent use.

Prefer a small number of clearly defined authority rules over a large set of overlapping documents.

## 4. Map actual documents to proposed roles

Use the inventory and targeted source inspection to create a proposed mapping of existing documents.

For each significant document or tightly related group, record:

- Current path
- Current apparent purpose
- Proposed role
- Proposed authority level
- Status: active, canonical candidate, historical, superseded candidate, duplicate candidate, reference-only, or unresolved
- Evidence supporting the recommendation
- Confidence
- Proposed action: retain, clarify, consolidate, split, relocate, archive, or owner decision required

These are recommendations, not approved changes.

Do not designate a document as canonical solely because it is newer, more detailed, at the repository root, or consistent with current implementation. Consider explicit approval evidence, decision history, scope, and relevant tests.

If authority cannot be established, mark it unresolved instead of inventing certainty.

## 5. Resolve conflicts analytically, not unilaterally

For each significant finding in `decision-conflicts.json`, recommend one of the following:

- One source appears authoritative; explain why.
- Sources govern different scopes and should be clarified.
- One source appears superseded; identify the evidence and remaining uncertainty.
- Documentation and implementation disagree; owner must decide whether design or implementation should change.
- Evidence is insufficient; specify what additional information is needed.
- The conflict is low-impact and can be deferred.

For each recommendation, include the finding ID and the supporting evidence.

**Do not decide gameplay behavior, architecture, or project requirements on the owner's behalf.**

Do not assume that the implementation reflects intended design, that a commit proves approval, or that an AI-generated recommendation was accepted.

## 6. Design the minimum viable documentation structure

Propose a concrete target structure using actual paths and filenames where possible.

Show:

- Which existing documents remain authoritative
- Which documents should point to another source instead of duplicating its rules
- Which documents should be marked historical or superseded
- Which new documents are genuinely necessary
- Where implementation status and verification evidence should live
- How agents should determine which source wins when documents disagree

Keep the structure proportional to the project. Avoid creating new documents that merely summarize information already maintained elsewhere.

Do not move, rename, rewrite, delete, or create authoritative project documents during this phase.

## 7. Define authority and status rules

Recommend explicit rules that future contributors and AI agents can apply consistently.

Address at least:

- What establishes an approved decision
- How a decision becomes canonical
- How supersession is recorded
- How proposed, implemented, and verified states differ
- What happens when code and specification disagree
- How historical rationale is preserved without competing with current requirements
- How cross-system requirements are referenced without duplication
- How changes to canonical specifications should be reflected in project state and agent context

Do not invent a historical approval process that the project did not actually use. Where past approval cannot be reconstructed, recommend a prospective rule and flag the historical uncertainty.

## 8. Create Phase 3 deliverables

Save all deliverables exclusively under `temp-audit-outputs/`.

### A. `phase-3-authority-map.md`

The primary human-readable proposal, including the proposed hierarchy, document-role mapping, authority rules, and supporting rationale.

### B. `phase-3-document-map.json`

A machine-readable mapping of document paths to proposed roles, statuses, confidence, evidence, and recommended actions.

### C. `phase-3-owner-decisions.md`

A concise list of decisions that require the project owner's judgment. For each decision, include:

- Decision ID
- Question to answer
- Relevant competing claims
- Evidence and implications
- Recommended option, if justified
- Alternatives and trade-offs
- Consequences of deferring the decision

Present genuine decisions clearly. Do not turn every minor editorial choice into an owner question.

### D. `phase-3-migration-plan.md`

A proposed Phase 4 migration plan, grouped into safe batches. Include dependencies, high-risk changes, validation requirements, and rollback considerations.

This is a plan only. Do not execute it.

### E. `phase-3-summary.md`

A concise summary of the proposed structure, major recommendations, unresolved questions, and readiness for owner review.

## 9. Validate the proposal

Before finishing:

- Ensure every major recommendation traces to evidence or is explicitly labeled as a new proposal.
- Verify cited paths and conflict IDs.
- Check that proposed roles do not create circular or competing authority.
- Identify documents whose purpose remains unclear.
- Check for unnecessary duplication in the proposed target structure.
- Validate JSON syntax and consistency between the mapping and written reports.
- Confirm that no authoritative project files, source code, agent instructions, or Git history were changed.

## 10. Stop for owner review

Your final response must summarize:

1. The proposed documentation hierarchy.
2. The most consequential authority recommendations.
3. The owner decisions that block or materially affect migration.
4. Any weak or missing evidence.
5. The artifact paths.
6. Whether the proposal is ready for review, or what additional investigation is required.
