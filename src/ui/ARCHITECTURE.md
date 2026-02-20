# `src/ui/` — Board Picker UI

Vanilla DOM component for switching between boards, creating new ones, and renaming/deleting. Works in local-only mode (single "Local Board") and cloud mode (workspace boards).

---

## Files

| File | Purpose |
|------|---------|
| `boardPicker.ts` | `initBoardPicker`, `saveCurrentBoard`; trigger button + panel |

---

## API

| Function | Description |
|----------|-------------|
| `initBoardPicker(user)` | Called after auth. In cloud mode: gets/creates workspace, lists boards, creates default if empty. In local mode: single "Local Board". Sets `currentBoardId` in UIState. Returns the active board ID. |
| `saveCurrentBoard()` | Saves the current canvas to the active board in Supabase. Called by the storage layer on debounced save. |

---

## Trigger Button

`_renderTrigger()` injects a button into the actions bar (before the theme toggle):

- Icon: board/canvas SVG
- Label: current board name (or "Board")
- Click: toggles the panel

---

## Panel

`_openPanel()` creates `#board-picker-panel`:

- **Header**: workspace name, "+ New board" button (cloud only)
- **List**: boards with name, rename (pencil), delete (trash) on hover
- **Active**: current board highlighted

Clicking a board name calls `_switchBoard(id)`:

1. Load board data from Supabase
2. `setAppState` with deserialized elements
3. `setUIState({ currentBoardId })`
4. Close panel

---

## Module State

- `_workspace`: current workspace (null in local mode)
- `_boards`: array of boards in the workspace
- `_panel`: reference to the open panel DOM node (for re-render on rename)

---

## Local-Only Mode

When `!SUPABASE_ENABLED` or `!user`, the panel shows a single "Local Board" with no New/Rename/Delete. `currentBoardId` stays `null`; storage uses localStorage only.
