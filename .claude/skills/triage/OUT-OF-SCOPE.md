# Out-of-Scope Records

<!-- Adapted from mattpocock/skills (landing-skills/triage/OUT-OF-SCOPE.md). Folder moved to docs/out-of-scope/. -->

The docs/out-of-scope/ folder stores persistent records of rejected requests. It serves two purposes:

1. **Institutional memory**: why a request was rejected, so the reasoning survives the closed issue.
2. **Deduplication**: when a new issue matches a prior rejection, surface the earlier decision instead of re-litigating it.

The folder is created the first time a request is rejected. One file per **concept**, not per issue; several issues asking for the same thing share a file.

## What belongs here

Only a `feature`, `balance` or `design` request that is *rejected* as `wontfix`. Do not write here for:
- **Bugs.** Close with an explanation instead.
- **Already-implemented requests.** That is a built feature, not a rejection. The closing comment points to where it lives.
- **Deferred work** (cloud, multiplayer, anything for a later phase). Those get the `deferred` label; a deferral is not a rejection.
- **Rulings that already have a DECISIONS.md entry.** Link the entry from the closing comment instead.

## File format

A short readable design note, not a database row. Name the file with a kebab-case concept (`undo-last-move.md`).

```markdown
# Concept Name

One line stating the decision.

## Why this is out of scope

The reason, in a few paragraphs. Reference scope, a technical constraint, or a strategic decision. Prefer
durable reasons over temporary ones ("we are busy" is a deferral, not a rejection). Link the spec that holds the
rule if there is one.

## Prior requests

- #42: "Issue title"
- #87: "Another issue asking for the same thing"
```

## When to check

During triage step 1, read every file in docs/out-of-scope/ (if the folder exists) and match the new issue by concept, not keyword. If it matches, tell Jess: "This is similar to docs/out-of-scope/<file>. We rejected it because <reason>. Do you still feel the same way?" Jess may:
- **Confirm**: append the new issue to "Prior requests", then close it.
- **Reconsider**: delete or update the file, and triage the issue normally.
- **Disagree**: the issues are related but distinct; triage normally.

## Writing a record

1. Jess decides a request is out of scope.
2. If a matching file exists, append the issue to its "Prior requests" list. Otherwise create a new file.
3. Comment on the issue explaining the decision and linking the file.
4. Close the issue with the `wontfix` label (only after Jess says so).

Changing a decision means deleting or editing the file. Old issues stay closed as history.
