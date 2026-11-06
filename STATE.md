# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-05, end of session (Claude Desktop). Branch: feature/gym-upgrade-authoring (from main after the onboarding merge); edits uncommitted.

## Where we are
- Onboarding (login PokeSwarm, Tab fix, region starter pick) merged to main. Not feel-tested by Jess yet.
- Host model (Jess, 2026-11-05): gym leaders are STRONG hosts (follow every player rule, default allow, authored restrictions, a team that swaps like the player's); elites are WEAK hosts (wild rules plus added rules); tells stay for now. Docs done (COMBAT-RULES "Host model", DECISIONS, GLOSSARY). Audit: docs/proposals/host-model-audit.md. Opus planning handoff: docs/proposals/host-model-handoff.md. No game code changed for it yet.
- Gym cards are the leader's, per loop, pooled (gyms.js `cards`, G.Gyms.cardsFor). Misty loop 1 authored (13 stacks, Recover hpBelow 35%). Leader self heals capped at the loop number per mon (boss-ai.js healsLeft). Sheet of gyms 2 to 8: docs/ASCII Concept Maps/Kanto Gyms 2-8 - Mons and Moves.txt.
- check.js green (42 of 42 harnesses). boss-owner-mutate: 5 stale patterns, already stale at HEAD.

## Next (in order)
1. Jess commits this branch (Misty data, cards model, heal cap, docs), then feel-tests Misty loop 1 (Recover once at 35%, 3 pulses at 40% confusion) and onboarding.
2. Open the Opus planning chat with docs/proposals/host-model-handoff.md; Jess answers its decisions. Then the host-model slices.
3. Misty's Sp. Def x3 (Zinc) lands with team cards on leaders. Gym cards for gyms 3 to 8 wait on the plan.
Also: delete merged branches feature/move-shop and fix/stale-mutations; Step 5 feel test; Codex menu with tooltips.

## Watch
- Old name still on the rotate prompt, noscript, legal panel, funding popup. Retired lang-en.js keys and the quiz markup and data are unused.
- Starting with 3 Pokemon changes early balance; Silver income unmeasured: judge by feel.
- Three Misty confusion pulses at 40% could keep the player confused near-permanently: Ailment Up is the first knob.
- "Host" also means the co-op host (GLOSSARY); say strong host and weak host in full.

## Open owner decisions
- Host model: architecture, leader HP model, Elite added rules, dodge, contact damage, swap AI (audit "Open decisions").
- Board cleanup: stale `blocked` on #5 (slice B, premise changes) and #11.
- Boss pool size; sprite scale; region unlock rule; Friends and Leaderboard grey-out; Korataki licence.
- Owed by Jess: tooltip confusions, move tuning list, animation mismatch details, bench recharge call.

Rules: CLAUDE.md. file://: mask-image is blocked (use clip-path); headless runs must click #tap-start first.
