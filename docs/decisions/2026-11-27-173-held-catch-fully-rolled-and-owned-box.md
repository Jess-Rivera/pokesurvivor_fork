---
title: "#173 a held catch is a fully rolled copy; the keep-or-sell list shows the owned copies of the selected catch (Jess)"
date: 2026-11-27
issues: [173]
area: ui
canonical: "docs/AI Outputs/Issue-173/173 - Held Catch Compare Slice Opening.md"
---
# 2026-11-27, #173 held catch compare (Jess)

- [Approved] A held catch is a fully rolled Pokemon from the moment it is held: UUID, nature, ability, IVs, gender,
  height and weight. Placing it keeps every one of those; nothing rerolls at the run end.
- [Approved] The comparison lives in the keep-or-sell list, like the catch screen's Pokemon owned panel: a small box
  of the copies you own of the selected row's species. Hovering a copy in that box shows its stats, nature and ability.
- [Approved] The roll is made when the catch window opens (keeping the rescue's nature, #136); one that flees or is
  let go takes its roll with it. A Lost Pokemon recruit (no window) rolls when it is held.
- [Approved] The full copy is rolled before you throw, so the catch screen AND the keep-or-sell list both show its
  rolls; Jess mocks up the display on both screens.
- [Approved] The owned box shows every copy of the species you own, team copies included.
- Shiny catches and Lost Pokemon are out of scope: #174.
- [Approved] The selection cursor moves into the owned box, as on the catch screen.
- [Approved] The look is sketched on the UI library board first (Jess may draft an Excalidraw mockup); how the held
  catch shows its own rolls and what the tooltips hold are decided on that sketch.
- Replaces the 2026-11-26-146 line "a held catch's own stars roll only when placed".

Canonical: docs/AI Outputs/Issue-173/173 - Held Catch Compare Slice Opening.md.
