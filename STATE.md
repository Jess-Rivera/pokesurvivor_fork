# STATE, current handoff (read this right after CONTEXT.md)

Keep under 3 KB. Rewrite each session (not append). History goes to DEVLOG.md.
Last updated: 2026-11-20 morning, Quick (work machine). Branch: feature/128-acquisition. No branch rules file.

## START HERE (next session, either tool)
0. `git status`; this session's two commits should be pushed (`git push origin feature/128-acquisition`).
1. #155 main.shop.character: redo it on the board with Jess, one piece at a time. The rough drafts of all four
   tabs (tools/library/shop-draft.js) are NOT APPROVED; use them only as a starting point.
2. Then the other shop tabs, one at a time; then Fonts feel test, Colours names, the Pause composites. #156 likely moot.
3. Then #128: #138, then #146. #145 small and ready.

## Landed 2026-11-20 morning (Quick, board and docs only)
- run.hud.teamSlot: a two-type slot's rim is the first type left, the second right, the middle 25% dithered; the
  active portrait stroke stays the first type.
- Primitives, Tooltip (new): panel.clean, 1 px yellow frame and name, hover / pinning / pinned. Every tooltip is
  Michroma, name 20, text 12. Pinnable tooltips filed as #158.
- run.hud.playerActive.area: the inactive move slots dim to 50% (no cursor on the slots), 32 px wells clear the
  slot's bands, the family badge sits inside the well, cast flash; the bond count above Silver; the Shake Off prompt
  in Michroma 20, centred; the run timer.
- Primitives, Inputs (new, not reviewed): field.text, field.dropdown, scroll.bar.
- main.shop.pokeball, .character, .items, .tms: rough drafts, NOT APPROVED.
- Decisions: 2026-11-20-155-two-type-team-slot-rim-dithered-middle-band, -every-tooltip-is-michroma,
  -tooltip-is-panel-clean-yellow-frame-three-states, -move-slots-dim-the-inactive-and-wells-clear-the-bands.

## Watch
- The game is unchanged: nothing in js/ or css/ edited. check.js was NOT run in this session (Quick cannot run node);
  run it and `npm run format` before committing (shop-draft.js and inputs-draft.js have lines over 120 columns).
- Nothing on today's board was seen rendered by the assistant; Jess saw the team slot, tooltip and area pages.
- Tried and dropped today (in the decision files): split, gradient and stepped two-type strokes; a full-width rim
  dither; the cursor bar on move slots; a dark-fill active slot.
- Board drift: #29 in Blocked with no label; #155, #86, #110, #111, #120, #121 in Triage; #156 and #158 need triage.

## Open owner decisions
- Tooltip pin and close icons (Jess drawing). Shop: Sell Pokeball width, card edge colour.
- #126: reveal-first and fewer dialogs; cursor.bar with the mouse. Silver italic font (offered).
- #97, #131, #49, #107, #86, #99, #93, #60, #139 candy amounts.

Rules: CLAUDE.md.
