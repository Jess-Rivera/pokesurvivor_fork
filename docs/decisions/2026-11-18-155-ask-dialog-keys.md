# 2026-11-18: #155 the ask dialog's keys follow the menu windows (Jess)

- Every confirm (G.UI.ask) has one green button, Confirm when it opens. Left and Right move it; the mouse over a button
  makes it green. Enter or Space presses the green button; Esc cancels.
- This replaces "Enter always confirms": Right then Enter now cancels.
- The dialog is the UI library's modal.dialog (panel.flat, button.rounded) on the 1920 x 1080 menu stage; the page
  behind keeps its dim. A red Confirm for destructive asks is not built (the colour pass).

Canonical: js/ui/ui.js ask() header. Plan: docs/ASCII Concept Maps/155c-4 - Modal Plan.md.
