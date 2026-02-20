# `src/state/` — State Management

All runtime state lives here. The store design is intentionally minimal: plain module-level variables + a listener/observer pattern. No external state library is used.

---

## Files

| File | Purpose |
|------|---------|
| `appState.ts` | Persistent state — elements and selection |
| `uiState.ts` | Ephemeral state — active tool, viewport, provisional element, active style |
| `history.ts` | Undo/redo stacks (patch-based, 100-entry cap) |
| `clipboard.ts` | In-memory copy/paste |
| `selectors.ts` | Derived read-only queries over `AppState` |

---

## AppState (`appState.ts`)

Holds everything that must survive undo/redo and be persisted to localStorage.

```ts
interface AppState {
  elements: Map<string, DrawableElement>;  // id → element
  selectedIds: Set<string>;
}
```

### API

| Function | Description |
|----------|-------------|
| `getAppState()` | Returns the current state (readonly) |
| `setAppState(patch)` | Shallow-merges a partial AppState and notifies listeners |
| `addElement(el)` | Inserts a new element into the map |
| `updateElement(id, patch)` | Merges a patch and increments `version` |
| `removeElements(ids[])` | Deletes elements and removes them from selection |
| `setSelectedIds(ids)` | Replaces the selection set |
| `subscribeToAppState(fn)` | Registers a listener; returns an unsubscribe function |

### Listener Pattern

All UI code (properties panel, toolbar state, storage auto-save) subscribes via `subscribeToAppState`. Listeners are called synchronously after every `setAppState`. No batching.

---

## UIState (`uiState.ts`)

Ephemeral state that is never pushed to history or localStorage. Resets to defaults on page reload.

```ts
interface UIState {
  activeTool: ToolType;
  isDragging: boolean;
  dragStartX: number;
  dragStartY: number;
  pointerX: number;
  pointerY: number;
  editingElementId: string | null;
  provisionalElement: DrawableElement | null;  // element being drawn, not yet committed
  viewport: { x: number; y: number; zoom: number };
  activeStyle: StyleObject;  // applied to all newly created elements
  currentBoardId: string | null;  // active board when Supabase configured; null in local-only mode
}
```

### `activeStyle`

Initialized from `DEFAULT_STYLE` with the stroke color adjusted for the current theme (light vs dark). When the user changes any style control in the properties panel, `setActiveStyle(patch)` is called to update it. Every new element is created with `{ style: { ...getUIState().activeStyle } }`.

### API

| Function | Description |
|----------|-------------|
| `getUIState()` | Returns current state (readonly) |
| `setUIState(patch)` | Shallow-merges and notifies listeners |
| `setActiveTool(tool)` | Sets `activeTool` and clears `provisionalElement` |
| `setProvisionalElement(el\|null)` | Updates the in-progress element |
| `setViewport(patch)` | Merges a partial viewport |
| `setActiveStyle(patch)` | Merges a partial `StyleObject` into `activeStyle` |
| `subscribeToUIState(fn)` | Registers a listener; returns unsubscribe function |

---

## History (`history.ts`)

Patch-based undo/redo — only the changed portions of `AppState` are stored per entry.

```ts
interface HistoryEntry {
  before: PartialAppState;  // state before the action
  after: PartialAppState;   // state after the action
}
```

- Stack cap: **100 entries**. Oldest entries are discarded when the cap is exceeded.
- Pushing to the undo stack always **clears the redo stack**.
- `undo()` pops from undo, pushes to redo, applies `entry.before`.
- `redo()` pops from redo, pushes to undo, applies `entry.after`.

### Snapshot Helper

```ts
snapshotElements(): Map<string, DrawableElement>
```

Returns a shallow copy of the current elements map. Tools call this before and after mutations to construct the `before`/`after` pair for `pushHistory`.

### Usage Pattern in Tools

```ts
const before = snapshotElements();
// ... mutate AppState ...
pushHistory({ elements: before }, { elements: snapshotElements() });
```

---

## Clipboard (`clipboard.ts`)

In-memory only — no system clipboard API. Survives until the page is reloaded.

| Function | Description |
|----------|-------------|
| `copySelected()` | Deep-clones currently selected elements into the internal clipboard |
| `pasteClipboard()` | Adds clones with `+20 / +20` world-px offset; pushes history |
| `hasClipboard()` | Returns `true` if the clipboard is non-empty |

Pasting repeatedly cascades the offset so each successive paste is visually distinct.

Wired in `EventHandler`: `Ctrl+C` → `copySelected()`, `Ctrl+V` → `pasteClipboard()` + full render.

---

## Selectors (`selectors.ts`)

Pure derived queries — no side effects.

| Function | Description |
|----------|-------------|
| `getSortedElements()` | Returns all elements as an array sorted by `zIndex` ascending |
| `getSelectedElements()` | Filters elements to only those in `selectedIds` |
| `getMaxZIndex()` | Returns the highest `zIndex` currently in use (used to place new elements on top) |
