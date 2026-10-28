# Phase 3A: Canonical Documentation Consolidation Review

## Objective

Phase 3 established a proposed documentation authority model, document map, owner-decision list, and migration plan.

This phase refines that work to address a more fundamental goal:

**Consolidate the project's documentation into a coherent set of canonical sources of truth, eliminating competing active requirements and unnecessary chains of supersession.**

The desired end state is that a developer or AI agent can determine the current intended behavior of any subsystem by consulting its canonical specification and following a small number of explicit references, without having to reconstruct decisions from multiple historical documents.

For example, if decision Z superseded Y and Y superseded X, the current specification should contain the definitive rule from Z. Preserve Y or X only when their historical rationale or unique information remains useful. They must not continue to function as competing sources of current requirements.

This is not simply a file reorganization exercise. It is a content-reconciliation and consolidation exercise.

## Operating constraints

- Treat the completed Phase 3 deliverables as the starting proposal, not unquestionable truth.
- Inspect the actual project documents and evidence before recommending consolidation.
- Do not assume the newest, most detailed, most central, or implemented document is automatically authoritative.
- Distinguish intended design, implementation, verification, historical rationale, and unresolved proposals.
- Preserve valid requirements even when they appear only in older documents.
- Do not silently invent design intent or resolve consequential gameplay and architecture questions.
- Do not modify authoritative project documents, source code, agent instructions, or Git history during this phase.
- Store all new Phase 3A artifacts under `temp-audit-outputs/`.
- Optimize for a small, maintainable canonical documentation set, not maximum documentation coverage.
- Do not begin Phase 4.

## 1. Review the existing Phase 3 proposal

Locate and inspect:

- `phase-3-authority-map.md`
- `phase-3-document-map.json`
- `phase-3-owner-decisions.md`
- `phase-3-migration-plan.md`
- `phase-3-summary.md`

Discover actual filenames if they differ.

Consult Phase 2 evidence, the inventory, and original documents selectively where needed.

Identify whether the current plan primarily reorganizes documents or actually consolidates their content. Identify any proposed migration actions that would preserve multiple competing descriptions of the same current requirements.

Do not redo the entire audit. Reuse existing findings unless there is a material evidence gap or inconsistency.

## 2. Define the intended consolidation model

Recommend a practical model with these principles:

### A. One canonical source per subject

Each meaningful subsystem or decision domain should have one obvious authoritative specification.

Examples of candidate domains include move data and schema, combat and damage, progression, terrain and movement, architecture and module boundaries, and cross-system interfaces. These are examples, not mandatory separate files.

Choose document boundaries based on actual dependencies and maintenance needs.

### B. Requirements live in one place

A requirement should have one authoritative home.

Other documents may summarize it briefly or reference it, but should not independently restate detailed rules that can drift out of sync.

Where two systems genuinely need a shared contract, define that contract in one clearly designated location and reference it from both systems.

### C. Historical material is not current authority

Historical records may preserve:

- Important design rationale
- Rejected alternatives and why they were rejected
- Significant architectural transitions
- Context needed to understand current constraints

Historical material should not require agents to traverse a chain of old decisions to discover the current rule.

Where useful, historical records should identify the current canonical source. Avoid maintaining historical records that add no meaningful context.

### D. Statuses remain distinct

Keep these concepts separate:

- Proposed design
- Approved intended behavior
- Implemented behavior
- Verified behavior
- Historical or superseded decisions

A specification can describe approved intended behavior that is not yet implemented. Implementation does not automatically make a behavior an approved requirement, and the existence of a test does not by itself establish complete verification.

### E. Project context remains lightweight

Root-level context and agent instructions should direct agents to canonical sources and explain how to resolve discrepancies. They should not duplicate entire specifications.

## 3. Build a canonical consolidation map

Create `temp-audit-outputs/phase-3a-consolidation-map.md`.

Group documents by underlying subject, not merely by directory or filename.

For each subject, identify:

1. **Proposed canonical destination:** The existing document to retain and consolidate into, or a proposed new document if necessary.
2. **Source documents:** Every relevant document identified by the inventory or audit evidence.
3. **Unique requirements:** Valid requirements or constraints present in each source that may be absent from the proposed canonical destination.
4. **Conflicting requirements:** Incompatible claims that need reconciliation.
5. **Duplicated content:** Requirements repeated in other documents.
6. **Historical value:** Material worth retaining as historical context.
7. **Proposed disposition:** Consolidate, retain as a reference, archive, mark superseded, or request an owner decision.
8. **Evidence and confidence:** Source paths, relevant sections, related Phase 2 finding IDs, and uncertainty.
9. **Validation criteria:** How to verify the consolidated specification preserves all necessary requirements and does not introduce contradictions.

Do not assume every existing document must survive. Also do not assume every subject needs a new document.

Prefer consolidating into a well-suited existing document over creating a new one without a clear need.

## 4. Identify semantic gaps before consolidation

For every proposed canonical specification, assess whether it contains the full set of still-valid requirements from relevant sources.

Explicitly flag cases where:

- An older document contains a requirement missing from the proposed canonical source.
- A later document changes a rule but does not clearly establish whether other older rules remain valid.
- Two documents describe different scopes that need explicit boundaries.
- An apparent conflict is actually a distinction between intended and implemented behavior.
- A requirement is referenced but has no authoritative definition.
- A decision's rationale is important, but the old document should no longer govern current behavior.
- Existing documentation is too ambiguous to consolidate safely.

Do not resolve semantic gaps by mechanically choosing one document. Recommend a resolution when evidence is strong; otherwise prepare a focused owner decision.

## 5. Minimize the owner's decision burden

Create `temp-audit-outputs/phase-3a-owner-questionnaire.md`.

Group decisions by subsystem or underlying design question.

For each question include:

- A stable ID
- The precise decision required
- The competing requirements, with source references
- Why the choice matters
- A recommended answer when evidence supports one
- Viable alternatives and their consequences
- What remains unresolved if deferred

Classify each action as:

- `OWNER_DECISION_REQUIRED`: Genuine design intent or consequential trade-off is unknown.
- `OWNER_CONFIRMATION_RECOMMENDED`: A well-supported consolidation recommendation needs approval.
- `ROUTINE_CONSOLIDATION`: The change is supported by evidence and does not alter intended behavior.
- `DEFERRED`: The issue is low priority or evidence is insufficient.

Merge multiple questions about the same underlying decision. Do not ask the owner to adjudicate each document separately when one answer resolves the group.

Prioritize questions that affect gameplay, architecture, data contracts, or the meaning of current requirements.

Do not require the owner to make every editorial, organizational, or mechanical cleanup choice.

## 6. Revise the proposed migration strategy

Create `temp-audit-outputs/phase-3a-migration-plan.md`.

The plan must address content consolidation, not merely file moves.

Organize proposed work into dependency-aware batches, such as:

1. Resolve high-impact owner decisions.
2. Establish canonical specification destinations and boundaries.
3. Reconcile unique requirements and consolidate content.
4. Remove duplicated active requirements and replace them with references.
5. Preserve useful historical rationale and clearly mark superseded sources.
6. Update indexes, project context, and agent instructions.
7. Validate links, requirements, references, and consistency with implementation.
8. Perform a final review for competing active sources of truth.

Adapt the sequence to the actual project.

For each batch specify:

- Scope and affected paths
- Prerequisites
- Expected result
- Main risks
- Validation steps
- Rollback approach

Do not plan to delete unique information before confirming it has been preserved or is intentionally obsolete.

## 7. Define measurable completion criteria

Propose objective checks for determining whether consolidation is complete.

At minimum:

- Each important subject has one identifiable canonical specification or an explicitly documented unresolved authority decision.
- Every still-valid requirement identified during the audit is retained in its canonical home.
- No unresolved duplicate requirement silently competes with the canonical specification.
- Historical documents are clearly distinguishable from active requirements.
- References lead agents to the canonical source without requiring a chain of supersession.
- Intended, implemented, and verified states are not conflated.
- Project context and agent instructions identify where current rules live.
- Consolidation introduces no undocumented changes to gameplay or architecture.
- Remaining unresolved questions and known documentation gaps are explicit.

Where practical, recommend lightweight automated checks for links, duplicate authority declarations, and required document metadata. Do not claim automated checks can reliably determine semantic equivalence without review.

## 8. Deliverables

Save all deliverables under `temp-audit-outputs/`:

- `phase-3a-consolidation-map.md`
- `phase-3a-owner-questionnaire.md`
- `phase-3a-migration-plan.md`
- `phase-3a-summary.md`

Validate paths and references. Clearly distinguish evidence-based findings, recommendations, and owner decisions.

## 9. Stop for owner review

Do not change authoritative project files, code, agent instructions, or Git history.

Do not execute the migration.

The final response should explain:

- How the proposed canonical documentation set differs from the original Phase 3 plan
- The biggest opportunities to eliminate competing sources of truth
- Which older documents contain potentially unique requirements
- Which decisions genuinely need the owner's input
- The proposed migration batches and validation criteria
- Any limitations or unresolved evidence gaps
