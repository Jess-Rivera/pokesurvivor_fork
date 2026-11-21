# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-21 late afternoon, Quick (work machine). Branch: feature/138-146-lost-and-full-box (cut from
main after feature/128-acquisition merged, e5c94df). No branch rules file.

## START HERE (next session, either tool)
1. #138 S7 Lost Pokemon: built, feel tested, committed ce57625 (not pushed). Left: the #138 comment and close,
   the deferred co-op issue. Plan: docs/ASCII Concept Maps/138 - Lost Pokemon Build Plan.md.
2. Next on this branch: #146 keep-or-sell list. Then #139 S8 (open: candy CD1 to CD4, friendship minutes).
3. #145 small and ready. Feel test the Ancient Power line.

## Landed 2026-11-21 (Quick)
- #128 S6 Pokeballs tab and catch screen, feel tested, merged to main with feature/128-acquisition.
- #138: pool is Stage 1s that can evolve, any region, floaters in (324); nature on the toast; floaters hover and may
  sit on safe liquid; recruit 20 / 12 / 6% by star at delivery, held like a catch; five lines in English;
  G.onRescue removed; G.Debug.lost. Decision 2026-11-21-138-floater-escort-hover-and-water-spots (H1, H2, D1 to D9).
- Earlier: Unified tokens and library pieces, the Shop window and catch screen rebuilt (see DEVLOG).

## Game changes still owed at #126 (ruled)
- The run shops, the bond popup, the TMs tab, team items HUD, cursor.bar, the tooltip (#158), reveal-first in the
  menu windows, dropping the purchase asks. Build from the primitives: pause, Team, Pokedex, other main screens, the
  level-up draft. Box buying moves to Character Upgrades.

## Watch
- Canvas HUD holdouts in js/ui/hud.js: left on the canvas for now (Jess 2026-11-21), no issue.
- Board drift: #29 in Blocked with no label; #86, #110, #111, #120, #121 in Triage; #156 and #158 need triage;
  #151 #152 #153 closed but still needs-playtest; #155 closed but still ready.
- Co-op Lost Pokemon recruit for guests: deferred issue drafted, not filed.

## Open owner decisions
- Tooltip pin and close icons (Jess drawing). #156 close or keep. Silver italic font (offered).
- #97, #131, #49, #107, #86, #99, #93, #60, #139 candy amounts.

Rules: CLAUDE.md.
