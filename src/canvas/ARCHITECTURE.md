# `src/canvas/` — Canvas Setup & Event Handling

---

## Files

| File | Purpose |
|------|---------|
| `CanvasManager.ts` | Creates the two canvas elements, handles DPR and resize |
| `EventHandler.ts` | Translates browser events into world-space calls on `ToolManager` |

---

## `CanvasManager`

Creates two `<canvas>` elements stacked inside `#canvas-container` and exposes them to the rest of the app.

- **Scene canvas** (bottom layer): holds the committed scene — only redrawn on state changes.
- **Interaction canvas** (top layer): holds the provisional element and selection chrome — redrawn on every `pointermove`.

On construction and on every `ResizeObserver` callback:

```ts
canvas.width  = container.clientWidth  * devicePixelRatio;
canvas.height = container.clientHeight * devicePixelRatio;
```

The renderer's `ctx.setTransform` already multiplies by `dpr`, so all draw calls remain in logical (CSS) pixel space.

---

## `EventHandler`

Attaches all browser event listeners to the interaction canvas (`pointerdown`, `pointermove`, `pointerup`, `pointercancel`, `dblclick`, `wheel`) and to `window` (`keydown`, `keyup`).

All pointer positions are converted to world-space **before** any logic:

```ts
const worldPoint = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, viewport);
```

### Pointer Events

```
pointerdown
  → set _isPointerDown = true
  → store worldPoint in UIState (dragStartX/Y)
  → toolManager.onPointerDown(worldPoint, e)

pointermove
  → update UIState.pointerX/Y
  → if middle-button OR Alt+drag → pan viewport directly (no tool dispatch)
  → if _isPointerDown → toolManager.onPointerMove(worldPoint, e)
  → if not down → _updateHoverCursor(worldPoint)

pointerup / pointercancel
  → set _isPointerDown = false
  → toolManager.onPointerUp(worldPoint, e)

dblclick
  → toolManager.onDoubleClick(worldPoint, e)
```

### Hover Cursor (`_updateHoverCursor`)

Only active when `activeTool === 'select'` and the pointer is not pressed.

Runs `hitTestElementForHover` against all elements. If any element is hit, adds the CSS class `element-hovered` to `#canvas-container`; otherwise removes it.

The CSS rule applies the cursor:

```css
#canvas-container.tool-select.element-hovered { cursor: move; }
```

This cursor appears when hovering over:
- Any element with a fill — anywhere inside the element.
- Any element without a fill (transparent) — only near the border.
- Any text element — anywhere inside.
- Any polyline (arrow/line/pencil) — near the stroke.

### Wheel Events

```
Ctrl/Meta + scroll → zoom centered on cursor
  delta = -e.deltaY * 0.01
  newZoom = clamp(viewport.zoom * (1 + delta), 0.05, 20)
  setViewport(zoomOnPoint(viewport, mouseX, mouseY, newZoom))

plain scroll → pan
  setViewport({ x: vp.x - deltaX, y: vp.y - deltaY })
```

Both paths call `renderer.requestFullRender()`.

### Keyboard Events

Handled in `_onKeyDown`. Inputs inside `<textarea>` or `<input>` are ignored.

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `Ctrl+A` | Select all |
| `Ctrl+C` | Copy selected |
| `Ctrl+V` | Paste |
| `Space` (hold) | Temporary hand tool |
| `Space` (release) | Restore previous tool |
| `V` | Select tool |
| `R` | Rectangle tool |
| `D` | Diamond tool |
| `O` | Ellipse tool |
| `A` | Arrow tool |
| `L` | Line tool |
| `T` | Text tool |
| `P` | Pencil tool |
| `H` | Hand tool |
| `Delete` / `Backspace` | Delete selected (forwarded to `SelectTool.onKeyDown`) |
| `Escape` | Deselect / cancel (forwarded to `SelectTool.onKeyDown`) |

### Space Key — Temporary Hand Tool

```ts
keydown Space (not repeat, not already in hand mode):
  _toolBeforeSpace = activeTool
  toolManager.setTool('hand')

keyup Space:
  toolManager.setTool(_toolBeforeSpace)
  _toolBeforeSpace = null
```
