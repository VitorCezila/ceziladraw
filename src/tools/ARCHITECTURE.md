# `src/tools/` — Tool System

Tools implement the drawing and interaction logic. `EventHandler` converts raw browser events into world-space coordinates, then dispatches to the active tool via `ToolManager`.

---

## Files

| File | Purpose |
|------|---------|
| `ToolManager.ts` | Instantiates all tools; dispatches pointer/key/double-click events |
| `SelectTool.ts` | Click, shift-click, marquee, drag, resize, rotate, delete, double-click |
| `RectangleTool.ts` | Draw rectangles |
| `DiamondTool.ts` | Draw diamonds |
| `EllipseTool.ts` | Draw ellipses |
| `ArrowTool.ts` | Draw arrows |
| `LineTool.ts` | Draw straight lines |
| `TextTool.ts` | Floating textarea overlay for creating and editing text |
| `PencilTool.ts` | Free-draw — appends points on every `pointermove` |
| `HandTool.ts` | Pan-only — never touches `AppState` |

---

## `Tool` Interface

```ts
interface Tool {
  onPointerDown(point: Point, e: PointerEvent): void;
  onPointerMove(point: Point, e: PointerEvent): void;
  onPointerUp(point: Point, e: PointerEvent): void;
  onDoubleClick?(point: Point, e: PointerEvent): void;  // optional
  onKeyDown?(e: KeyboardEvent): void;                   // optional
  cancel(): void;
}
```

All `point` arguments are already in **world-space**.

---

## `ToolManager`

Instantiates every tool once at startup and holds them in a `Record<ToolType, Tool>`.

```ts
constructor(renderer, textContainer, canvasContainer)
```

Public methods:

| Method | Description |
|--------|-------------|
| `setTool(type)` | Cancels the current tool, sets `activeTool` in UIState |
| `onPointerDown / Move / Up` | Forwards to the active tool |
| `onDoubleClick(point, e)` | Forwards to the active tool's optional `onDoubleClick` |
| `onKeyDown(e)` | Forwards to the active tool's optional `onKeyDown` |
| `beginEditText(el)` | Switches to `TextTool` and calls `textTool.beginEdit(el)` |

`beginEditText` is called from `SelectTool` via a callback injected at construction time — no circular dependency.

---

## `SelectTool`

The most complex tool. Constructor signature:

```ts
constructor(renderer: Renderer, onEditText: (el: TextElement) => void)
```

### Interaction Phases (in `onPointerDown`)

1. **Handle test**: check if the pointer hits a resize or rotation handle on any selected element → start resize or rotation.
2. **Body hit test**: find the topmost element under the pointer using `hitTestElementForHover` → select it and start drag. Unfilled shapes are only selectable by their border.
3. **Miss**: start a marquee selection.

### Drag

Moves all selected elements simultaneously. Saves `_elementStartPositions` at `pointerDown` so that each `pointerMove` computes the delta from the original position (not accumulated deltas). Arrow/line/pencil points are translated the same way.

### Resize

`_activeHandle` stores the handle type and index. `applyResize(startEl, handleIndex, worldPoint)` computes the new geometry each frame.

**Text element special case**: behavior depends on the handle:

- **Corner handles (0, 2, 4, 6)**: both `width` and `height` change. `fontSize` is scaled proportionally to the width change so the text grows/shrinks with the box:
  ```ts
  const widthRatio = newGeom.width / startTextEl.width;
  const newFontSize = Math.max(8, Math.round(startTextEl.fontSize * widthRatio));
  ```
- **Edge handles (MR=3, ML=7)**: only `width` changes. `fontSize` is unchanged — the user adjusts the wrap width only, not the font size. This allows widening a narrow text box without the font exploding.

Height-only handles (TC=1, BC=5) produce `widthRatio = 1` → font size is unchanged.

`_resizeStartEl` is the stable baseline throughout the drag.

### Rotation

Tracks `_rotateStartPointerAngle` and `_rotateStartElAngle`. Each `pointermove` computes the current pointer angle and adds the delta to the start angle.

### Double-Click to Edit Text

`onDoubleClick` hit-tests for a text element at the clicked point using `hitTestElement` (full-body). If found, calls `this._onEditText(el)` which triggers `ToolManager.beginEditText(el)` → switches to `TextTool` and opens an editor for the existing element.

### History

Every gesture (drag, resize, rotate) captures a `snapshotElements()` in `_beforeSnapshot` at `pointerDown`. On `pointerUp`, if any element was actually mutated, `pushHistory(before, after)` is called.

---

## `TextTool`

Manages a floating `<textarea>` overlay for text input.

### Creating New Text

`onPointerDown` → spawns a new `TextElement` (with a new `id`) and a `<textarea>` at the clicked position. On commit (`Enter` or blur), the element is added to `AppState`.

### Editing Existing Text (`beginEdit(el)`)

Called from `ToolManager.beginEditText`. Opens a `<textarea>` pre-filled with the element's current text at its canvas position.

**Real-time canvas update**: The textarea is made invisible (`color: transparent`, `caretColor` set to the element's stroke color) so the user sees only the canvas-rendered text. On every `input` event, `_onInput` calls `setAppState` and `renderScene` — the canvas updates in real time. There is no separate "preview"; the user edits the live canvas text.

On commit:

- If text is non-empty → updates the existing element in `AppState` (same `id`).
- If text is empty → removes the element from `AppState`.

Both paths push a history entry. `_editStartSnapshot` is captured at `beginEdit` for correct undo history.

### Textarea Positioning

```ts
screenX = el.x * viewport.zoom + viewport.x
screenY = el.y * viewport.zoom + viewport.y
ta.style.fontSize = `${el.fontSize * viewport.zoom}px`
ta.style.width = `${el.width * viewport.zoom}px`  // for existing text
```

The textarea is appended to `textContainer` (the `#canvas-container`), positioned absolutely over the canvas at the correct screen position.

### Commit / Discard

| Action | Behavior |
|--------|----------|
| `Enter` (without Shift) | Commit |
| `Blur` (click elsewhere) | Commit |
| `Escape` | Discard (no change to AppState) |
| `Shift+Enter` | Inserts a newline in the textarea |

After committing, `setActiveTool('select')` is called.

---

## Drawing Tools (Rectangle, Diamond, Ellipse, Arrow, Line, Pencil)

All drawing tools follow the same pattern:

```
onPointerDown:
  create a provisional element with x=worldPoint, width=0, height=0
  set UIState.provisionalElement
  renderer.renderInteraction(null)

onPointerMove:
  update provisional element dimensions (width = dx, height = dy)
  set UIState.provisionalElement
  renderer.renderInteraction(null)  ← cheap: only the interaction layer

onPointerUp:
  commit provisional element to AppState via addElement()
  pushHistory(before, after)
  clear UIState.provisionalElement
  renderer.renderScene()            ← full redraw after commit
```

---

## `HandTool`

The simplest tool — never touches `AppState`:

```ts
onPointerMove(point, e):
  if pointer is down:
    setViewport({ x: vp.x + e.movementX, y: vp.y + e.movementY })
    renderer.requestFullRender()
```

**Temporary hand mode**: `EventHandler` saves the current tool when `Space` is pressed, activates `HandTool`, and restores the previous tool on `Space` release. Middle-mouse-button drag and `Alt+drag` also pan without switching tools.
