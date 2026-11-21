# 2026-11-20: #155 the tooltip primitive: panel.clean with a yellow frame, three states (Jess)

- `tooltip` is its own primitive (Primitives, Tooltip), built on panel.clean: grey.panel body, the 1 px edge passed in
  as yellow.base, the name in yellow.base, the text in grey.white. Keeps 2026-11-11's yellow frame and name; today's
  2 px #f3b200 frame, ink ring and #ffd23f name fold onto the one Unified yellow.
- Font: decision 2026-11-20-155-every-tooltip-is-michroma (name 20, text 12).
- Places are today's item tooltip: padding 8 px top, 12 px sides, the text 300 px wide, 6 px under the name.
- Three states: hover (the pin icon quiet, grey.mid), pinning (the pin yellow, a 2 px yellow bar filling along the top
  inside the edge while the anchor is held), pinned (the close X replaces the pin). The behaviour is the pinnable and
  nested tooltip issue, not built; the board shows the pictures only.
- Open: the pin and close icons (Jess is still working on them; the board's are placeholders).
- Applied at #126 (the look) and the pinnable tooltip issue (the states). Board: tools/library/tooltip-draft.js.

Canonical: this file until #126 applies it; then docs/HUD-STYLE.md "Fonts" (tooltips).
