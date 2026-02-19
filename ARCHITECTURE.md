# Ceziladraw — Architecture Document

> Last updated: Wave 2 (Dark Mode · Pencil · Hand Tool)

## Overview

Ceziladraw is a browser-based, hand-drawn style whiteboard application built on the Canvas 2D API + roughjs. It is intentionally framework-free for the core engine — state, geometry, and rendering are pure TypeScript modules. The toolbar UI is plain HTML/CSS with CSS Custom Properties for theming.

---

## Project Structure

```
src/
├── types/
│   ├── elements.ts     BaseElement + all concrete element types
│   ├── state.ts        AppState, UIState, HistoryEntry, ToolType
│   └── geometry.ts     Point, Rect, BoundingBox, Viewport
├── utils/
│   ├── id.ts           UUID v4 + seed generator
│   ├── math.ts         clamp, lerp, distance, angleBetween
│   ├── color.ts        hexToRgba, isTransparent, PALETTE
│   └── theme.ts        getTheme, toggleTheme, getCanvasColors
├── state/
│   ├── appState.ts     Central persistent store (elements, selectedIds)
│   ├── uiState.ts      Ephemeral store (tool, pointer, viewport, provisional)
│   ├── history.ts      Undo/redo stack — patch-based, 100-entry cap
│   └── selectors.ts    getSortedElements, getSelectedElements, getMaxZIndex
├── geometry/
│   ├── transform.ts    screenToWorld, worldToScreen, zoomOnPoint, rotatePoint
│   ├── boundingBox.ts  getBoundingBox per element type
│   ├── hitDetection.ts hitTestElement — AABB, rotated, segment, polyline
│   └── selection.ts    marquee AABB + SAT for rotated elements
├── canvas/
│   ├── CanvasManager.ts  Two-layer canvas setup, DPR, ResizeObserver
│   └── EventHandler.ts   pointer/wheel/keyboard → UIState + ToolManager
├── renderer/
│   ├── Renderer.ts             Orchestrates scene + interaction layers
│   ├── SceneRenderer.ts        All elements sorted by zIndex + themed bg
│   ├── InteractionRenderer.ts  Provisional element + selection handles + marquee
│   ├── utils/dpr.ts            devicePixelRatio helpers
│   └── elements/
│       ├── renderRect.ts
│       ├── renderDiamond.ts
│       ├── renderEllipse.ts
│       ├── renderText.ts
│       ├── renderArrow.ts
│       └── renderPencil.ts     Free-draw path (Canvas 2D, no roughjs)
├── tools/
│   ├── ToolManager.ts    Dispatches pointer/key events to active tool
│   ├── SelectTool.ts     Click, shift-click, marquee, move, delete
│   ├── RectangleTool.ts  Draw rect; base class for Diamond/Ellipse
│   ├── DiamondTool.ts
│   ├── EllipseTool.ts
│   ├── ArrowTool.ts
│   ├── LineTool.ts
│   ├── TextTool.ts       Floating textarea overlay
│   ├── PencilTool.ts     Free-draw — append points on move
│   └── HandTool.ts       Pan-only — no AppState mutations
├── storage/
│   ├── serializer.ts     AppState ↔ JSON (v1 format)
│   └── localStorage.ts   Auto-save (debounced 500ms), export/import
├── main.ts               App bootstrap + UI wiring
└── style.css             CSS Custom Properties, dark/light themes
```

---

## 1. Element JSON Schema

Every drawable object is a **`BaseElement`** extended by a concrete type.

### BaseElement

```json
{
  "id": "a1b2c3d4-...",
  "type": "rectangle",
  "x": 120,
  "y": 80,
  "width": 200,
  "height": 140,
  "angle": 0.0,
  "zIndex": 3,
  "groupId": null,
  "style": {
    "strokeColor": "#1e1e2e",
    "strokeWidth": 2,
    "fillColor": "#cba6f7",
    "fillStyle": "hachure",
    "roughness": 1.2,
    "opacity": 1.0
  },
  "version": 7,
  "seed": 1849203
}
```

| Field             | Type                | Purpose |
|-------------------|---------------------|---------|
| `id`              | `string` (UUID v4)  | Immutable unique key |
| `type`            | `ElementType`       | Discriminator for rendering and hit-detection |
| `x`, `y`          | `number`            | Top-left origin in **world-space** |
| `width`, `height` | `number`            | Bounding dimensions in world-space |
| `angle`           | `number` (radians)  | Rotation around the element's center |
| `zIndex`          | `number`            | Explicit render order — sorted before drawing |
| `groupId`         | `string \| null`    | Logical grouping key; no tree structure needed |
| `style`           | `StyleObject`       | Visual properties passed to roughjs |
| `version`         | `number`            | Incremented on mutation; used by undo diffing |
| `seed`            | `number`            | Fixed roughjs seed — stable hand-drawn appearance |

### Concrete Element Types

```ts
RectangleElement  extends BaseElement  { type: 'rectangle' }
DiamondElement    extends BaseElement  { type: 'diamond' }
EllipseElement    extends BaseElement  { type: 'ellipse' }

TextElement extends BaseElement {
  type: 'text'
  text: string
  fontSize: number
  fontFamily: string
  textAlign: 'left' | 'center' | 'right'
}

ArrowElement extends BaseElement {
  type: 'arrow'
  startId: string | null      // binding to another element
  endId: string | null
  points: Point[]             // absolute world-space points
  curve: 'linear' | 'bezier'
  startArrowhead: ArrowheadStyle
  endArrowhead: ArrowheadStyle
}

LineElement extends BaseElement {
  type: 'line'
  points: Point[]
}

// NEW — Wave 2
PencilElement extends BaseElement {
  type: 'pencil'
  points: Point[]     // dense array — one entry per pointerMove event
  smoothing: number   // 0–1 reserved for future path simplification
}
```

`DrawableElement = RectangleElement | DiamondElement | EllipseElement | TextElement | ArrowElement | LineElement | PencilElement`

---

## 2. Coordinate System — World vs Screen

Two independent spaces coexist at all times.

### World-Space
Where elements live. Coordinates are absolute, never change on zoom/pan. All element properties are stored in world-space.

### Screen-Space
CSS/canvas pixels. Determined by the **viewport**:

```ts
viewport = { x: number, y: number, zoom: number }
```

### Transformation Formulas

```
// World → Screen
screenX = worldX * zoom + viewport.x
screenY = worldY * zoom + viewport.y

// Screen → World  (used on EVERY mouse event, before any logic)
worldX = (screenX - viewport.x) / zoom
worldY = (screenY - viewport.y) / zoom
```

### Applying the Transform to Canvas

```ts
ctx.save();
ctx.setTransform(zoom * dpr, 0, 0, zoom * dpr, viewport.x * dpr, viewport.y * dpr);
// All draw calls use world-space coordinates directly
ctx.restore();
```

### Zoom Centered on the Cursor

```ts
const worldPoint = screenToWorld(mouseX, mouseY, viewport);
viewport.zoom = newZoom;
viewport.x = mouseX - worldPoint.x * newZoom;
viewport.y = mouseY - worldPoint.y * newZoom;
```

**Rule:** Every pointer event handler calls `screenToWorld()` before any logic. Hit-detection and drawing tools are completely zoom-agnostic.

---

## 3. Mouse Event Flow

```
PointerDown
  │
  ├── EventHandler.onPointerDown(e)
  │     converts e.clientX/Y → worldX/Y via screenToWorld()
  │     if Space held → HandTool handles (pan only)
  │     else → ToolManager.onPointerDown(worldX, worldY)
  │
PointerMove
  │
  ├── EventHandler.onPointerMove(e)
  │     converts → worldX/Y
  │     if middle-button or Alt+drag → pan viewport directly
  │     if Space held → HandTool.onPointerMove (pan)
  │     else → ToolManager.onPointerMove → ActiveTool
  │           → InteractionRenderer.render()  ← only interaction canvas
  │
PointerUp
  │
  └── EventHandler.onPointerUp(e)
        → ActiveTool.onPointerUp
              commits delta/element to AppState
              → History.push(before, after)
              → SceneRenderer.render()   ← full scene redraw
```

### Key Invariant
The **scene canvas** redraws only on `PointerUp` (or keyboard actions). The **interaction canvas** redraws on every `PointerMove`. This prevents re-rendering the full scene on each mouse event.

---

## 4. State Architecture

### Persistent State (`AppState`)
Goes into undo/redo history and localStorage.

```ts
interface AppState {
  elements: Map<string, DrawableElement>;
  selectedIds: Set<string>;
}
```

### Ephemeral State (`UIState`)
Never enters history. Resets on page reload.

```ts
interface UIState {
  activeTool: ToolType;           // 'select'|'rectangle'|'diamond'|'ellipse'|
                                  // 'arrow'|'line'|'text'|'pencil'|'hand'
  isDragging: boolean;
  dragStartX: number;
  dragStartY: number;
  pointerX: number;
  pointerY: number;
  editingElementId: string | null;
  provisionalElement: DrawableElement | null;
  viewport: Viewport;
  theme: 'light' | 'dark';        // NEW — Wave 2
}
```

### History Entries (Patches)
Each action stores only the **diff**, not the full scene:

```ts
interface HistoryEntry {
  before: Partial<AppState>;
  after: Partial<AppState>;
}
```
Undo applies `entry.before`. Redo applies `entry.after`. Stack capped at 100.

---

## 5. Rendering Architecture

```
Renderer (orchestrator)
├── SceneRenderer     → draws all AppState.elements sorted by zIndex
│                       reads theme for background/grid colors
└── InteractionRenderer → provisional element + selection handles + marquee rect
```

Both share `ctx.setTransform(zoom, 0, 0, zoom, vx, vy)` — all draw calls use world-space.

### Device Pixel Ratio (Retina)

```ts
canvas.width  = clientWidth  * devicePixelRatio;
canvas.height = clientHeight * devicePixelRatio;
ctx.scale(dpr, dpr);
// OR via setTransform which already multiplies by dpr
```

### Dark Mode Canvas Colors

```ts
// src/utils/theme.ts
export function getCanvasColors() {
  const dark = document.documentElement.dataset.theme === 'dark';
  return {
    background: dark ? '#141414' : '#fafaf9',
    dot:        dark ? '#2e2e3a' : '#d4d4d4',
  };
}
```
Element `style.strokeColor` and `style.fillColor` are **per-element** and not overridden by the theme — same behaviour as Excalidraw. `DEFAULT_STYLE.strokeColor` is set based on current theme when a new element is created.

---

## 6. Marquee Selection

**Already implemented.** `SelectTool` tracks `_isMarquee` when the user drags on empty space. On `pointerMove` it computes a `BoundingBox` and:
1. Calls `elementIntersectsMarquee()` from `geometry/selection.ts` (SAT for rotated elements)
2. Updates `AppState.selectedIds`
3. Calls `renderer.renderInteraction(marquee)` — the `InteractionRenderer._drawMarquee` draws the translucent blue rectangle on the interaction canvas layer

---

## 7. Hit Detection Strategy

| Element Type | Algorithm |
|---|---|
| Rectangle / Diamond / Ellipse (no rotation) | AABB point-in-rect or diamond/ellipse formula |
| Any rotated element | Rotate click point by `-angle` around center, then AABB |
| Straight line / Arrow segment | Point-to-segment distance < `8 / zoom` px |
| Polyline (Arrow with multiple points) | Test each segment |
| Pencil | Reuses `hitTestPolyline` — dense point array |

Elements tested in **descending zIndex order** — first hit wins.

---

## 8. Dark Mode System

Theme is stored in `UIState.theme` and reflected as `data-theme="dark"` on `<html>`.

### CSS Token Override

```css
/* src/style.css */
[data-theme="dark"] {
  --bg: #141414;
  --surface: #1e1e2e;
  --border: #313244;
  --text: #cdd6f4;
  --text-muted: #6c7086;
  --shadow-sm: 0 1px 3px rgba(0,0,0,.3), ...;
  --shadow-md: 0 4px 12px rgba(0,0,0,.4), ...;
}
```

### Canvas Theme

`SceneRenderer._drawBackground` calls `getCanvasColors()` each frame — no caching needed as the function is O(1) DOM attribute read.

---

## 9. Pencil Tool

`PencilTool` appends a `Point` to `provisionalElement.points` on every `pointerMove`. On `pointerUp` the element is committed.

`renderPencil` uses native Canvas 2D (no roughjs) for a smooth stroke:

```ts
ctx.beginPath();
ctx.moveTo(points[0].x, points[0].y);
for (const p of points.slice(1)) ctx.lineTo(p.x, p.y);
ctx.strokeStyle = el.style.strokeColor;
ctx.lineWidth   = el.style.strokeWidth;
ctx.lineJoin    = 'round';
ctx.lineCap     = 'round';
ctx.stroke();
```

BoundingBox is derived from `min/max` of all points (same as `ArrowElement`).

---

## 10. Hand Tool (Pan)

`HandTool` is the simplest tool — it never touches `AppState`:

```ts
onPointerMove(point, e):
  if pointerDown:
    setViewport({ x: vp.x + e.movementX, y: vp.y + e.movementY })
    renderer.requestFullRender()
```

**Space key** in `EventHandler` provides a *temporary* hand mode: on `keydown Space` the previous tool is saved and `hand` is activated; on `keyup Space` the previous tool is restored.

---

## 11. Test Architecture

> Last updated: QA Wave (Vitest + Playwright)

### Strategy

Two complementary layers ensure correctness at different granularities:

| Layer | Tool | Scope | What it tests |
|-------|------|-------|---------------|
| Unit | **Vitest + jsdom** | Pure TypeScript functions | Math invariants, hit detection, bounding boxes, state mutations, serialization round-trips |
| E2E | **Playwright (Chromium)** | Full browser against `vite preview` build | Real user flows, canvas interaction, localStorage, keyboard shortcuts |

### Why Vitest

- Zero config: shares the same `vite.config.ts` plugin chain.
- TypeScript native — no transpile overhead.
- `vi.resetModules()` + dynamic imports isolate singleton state modules (`appState`, `uiState`, `history`) between test cases without modifying production code.

### Why Playwright

- Runs against the production-built bundle (`npm run build && npm run preview`) — deterministic, no hot-module surprises.
- `page.evaluate()` lets tests read internal state via the `window.__ceziladraw` hook.
- Pointer events on the canvas (`mouse.down / move / up`) closely mirror real user gestures.
- Ctrl+scroll zoom and Shift+click tested with explicit `keyboard.down / up` calls.

### The `window.__ceziladraw` Hook

Added to `src/main.ts` in both `DEV` and `production` modes so that the built preview also exposes it:

```ts
(window as any).__ceziladraw = { getAppState, getUIState };
```

Playwright tests use it to assert on internal state without pixel-diffing the canvas:

```ts
const count = await page.evaluate(
  () => (window as any).__ceziladraw.getAppState().elements.size
);
```

### Singleton Isolation Pattern

`appState.ts`, `uiState.ts`, and `history.ts` use module-level mutable variables (singleton pattern). Vitest tests reset them before each test case via:

```ts
beforeEach(async () => {
  vi.resetModules();
  const mod = await import('../../../src/state/history');
  // re-bind exports to fresh module instance
});
```

### File Layout

```
tests/
├── unit/
│   ├── geometry/         transform, hitDetection, selection, boundingBox
│   ├── state/            history, appState
│   ├── storage/          serializer
│   └── utils/            math
└── e2e/
    ├── drawing.spec.ts
    ├── selection.spec.ts
    ├── undoRedo.spec.ts
    ├── panZoom.spec.ts
    ├── persistence.spec.ts
    ├── theme.spec.ts
    └── helpers.ts
```

### Running Tests

```bash
# Unit tests (93 tests, ~3 s)
npm run test:unit

# E2E tests — builds first then runs Playwright (40 tests, ~30 s)
npm run test:e2e

# Both in sequence
npm run test
```

### Current Coverage

| Suite | Files | Tests | Status |
|-------|-------|-------|--------|
| Unit | 8 | 93 | ✅ all pass |
| E2E | 6 | 40 | ✅ all pass |
| Unit Wave 3 | +2 | TBD | 🔄 added in Wave 3 |
| E2E Wave 3 | +5 | TBD | 🔄 added in Wave 3 |

Canvas state integrity is guaranteed because:

1. Every geometry function has unit tests covering edge cases (negative dimensions, rotation, zoom clamping).
2. Every user-facing flow has an E2E test that inspects `AppState` directly — not pixels.
3. The history module is tested with >100 entries to verify the 100-entry cap.
4. `deserializeState` is tested with corrupted inputs to ensure the app never crashes on load.

---

## 12. Wave 3 — Handle System, Style State & Clipboard

_Last updated: Wave 3 (Rotation & Resize, Color Panel, Text Format, Clipboard)_

### 12.1 Handle Detection Algorithm (`src/geometry/handles.ts`)

Eight resize handles + one rotation handle are computed in the element's **local space** (the same frame `InteractionRenderer` draws them in):

```
Handle index layout:
  0(TL)  1(TC)  2(TR)
  7(ML)          3(MR)
  6(BL)  5(BC)  4(BR)
  ●  ← rotation handle (20 / zoom px above TC)
```

Detection in `getHandleAtPoint(el, worldPoint, zoom)`:
1. Convert `worldPoint` to element local space: `local = toElementLocalSpace(world, cx, cy, el.angle)`
2. Compute all 9 handle positions in local space with `pad = 4/zoom`, `HANDLE_SIZE = 8/zoom`
3. Check `distance(local, handlePos) ≤ HANDLE_SIZE * 1.5` — generous area for usability
4. Rotation handle takes priority (checked first)
5. Returns `{ type: 'resize', index: 0–7 }`, `{ type: 'rotate' }`, or `null`

Polyline elements (arrow, line, pencil) return `null` — handles don't apply.

### 12.2 Rotation-Aware Resize Math

**Corner handles** (indices 0, 2, 4, 6) — fixed corner stays at same world position:

```
fixedWorld  = rotatePoint(oppositeCorner, startCenter, angle)
newCenter   = midpoint(fixedWorld, dragPoint)
lFixed      = toElementLocalSpace(fixedWorld, newCenter, angle)
lDrag       = toElementLocalSpace(dragPoint,  newCenter, angle)
newX = min(lFixed.x, lDrag.x)
newY = min(lFixed.y, lDrag.y)
newW = |lDrag.x - lFixed.x|  (clamped to ≥ 2)
newH = |lDrag.y - lFixed.y|  (clamped to ≥ 2)
```

**Edge handles** (indices 1, 3, 5, 7) — one axis fixed; work in original-center local space:

```
dragLocal = toElementLocalSpace(dragPoint, startCenter, angle)
TC(1): newH = max(2, (sy+sh) - dragLocal.y); newY = (sy+sh) - newH
MR(3): newW = max(2, dragLocal.x - sx)
BC(5): newH = max(2, dragLocal.y - sy)
ML(7): newW = max(2, (sx+sw) - dragLocal.x); newX = (sx+sw) - newW
```

### 12.3 Rotation Handle Drag

```
onPointerDown  → _rotateStartPointerAngle = atan2(point.y - cy, point.x - cx)
               → _rotateStartElAngle = el.angle
onPointerMove  → currentAngle = atan2(point.y - cy, point.x - cx)
               → el.angle = _rotateStartElAngle + (currentAngle - _rotateStartPointerAngle)
```

Center `(cx, cy) = (el.x + el.width/2, el.y + el.height/2)` stays fixed throughout rotation.

### 12.4 Style State (`activeStyle` in UIState)

`UIState.activeStyle: StyleObject` holds the style applied to all **newly created** elements. Tools no longer use `DEFAULT_STYLE` directly:

```ts
// Before: style: { ...DEFAULT_STYLE }
// After:  style: { ...getUIState().activeStyle }
```

`activeStyle` is initialised from `getDefaultStrokeColor()` so the stroke is always readable on the current theme. On `themechange`, `main.ts` updates `activeStyle.strokeColor` to match.

The style panel UI (bottom-center floating bar) exposes:
- **Stroke swatches**: 8 presets + custom `<input type="color">`
- **Fill swatches**: "none" + 6 presets + custom `<input type="color">`
- **Stroke width**: 1 / 2 / 3 / 4 px

### 12.5 Text Format Panel

When exactly one `TextElement` is selected, a floating panel appears above the selection:
- Font size buttons: S (14px) · M (20px) · L (28px)
- Alignment buttons: Left / Center / Right

Clicking calls `updateElement(id, { fontSize })` or `updateElement(id, { textAlign })` and pushes a history entry.

### 12.6 Clipboard (`src/state/clipboard.ts`)

```ts
copySelected()    // deep-clones selected elements into in-memory clipboard
pasteClipboard()  // adds clones with +20/+20 px offset; pushes history
hasClipboard()    // guard for empty clipboard
```

Wired in `EventHandler._onKeyDown`:
- `Ctrl+C` → `copySelected()`
- `Ctrl+V` → `pasteClipboard()` + full render

Pasting repeatedly cascades the offset so each paste is visually distinct.

---

## 13. Selection Overlay Visual System

_Last updated: Wave 5 (Purple Selection, Zoom Simplification)_

### 13.1 Color Palette

All selection chrome uses a single purple constant defined at the top of `src/renderer/InteractionRenderer.ts`:

```ts
const HANDLE_COLOR   = '#6965db';  // Excalidraw purple
const SELECTION_COLOR = '#6965db';
```

The toolbar and button UI uses `--accent: #3b82f6` (blue) — these are intentionally separate. The canvas selection overlay is independent of CSS custom properties.

### 13.2 Selection Border

Drawn in `_drawSelectionOutline` inside the element's rotated coordinate frame:

| Property | Value |
|---|---|
| Color | `#6965db` |
| Line style | **Solid** (no dash pattern) |
| Line width | `1.5 / zoom` px (stays visually constant regardless of zoom level) |
| Padding | `4 / zoom` px gap between element bounding box and selection border |

The transform applied before drawing:
```ts
ctx.translate(cx, cy);
ctx.rotate(el.angle);
ctx.translate(-cx, -cy);
// all drawing is in rotated space → border follows element rotation
```

### 13.3 Resize Handles

Eight square handles at corners (TL/TR/BR/BL) and edge midpoints (TC/MR/BC/ML):

| Property | Value |
|---|---|
| Shape | Square (`fillRect` / `strokeRect`) |
| Size | `8 / zoom` px |
| Fill | White (`#fff`) |
| Border | `#6965db`, 1.5 / zoom px |

Handles are positioned at the corners/midpoints of the padded selection rect (same local-space frame as the border).

### 13.4 Rotation Handle

One circular handle centered `20 / zoom` px above the TC midpoint:

| Property | Value |
|---|---|
| Shape | Circle (`arc`, full fill) |
| Radius | `4 / zoom` px |
| Fill | `#6965db` (solid purple) |

### 13.5 Marquee Selection

Drawn in screen space (outside the viewport transform) in `_drawMarquee`:

| Property | Value |
|---|---|
| Border | `#6965db`, dashed `[4, 3]`, 1 px |
| Fill | `rgba(105, 101, 219, 0.06)` — very translucent purple tint |

---

## 14. Zoom System

### 14.1 Cursor-Centered Zoom (Direct)

Zoom is applied immediately on each `WheelEvent` — no animation or interpolation:

```ts
// In EventHandler._onWheel (Ctrl+scroll):
const delta   = -e.deltaY * 0.01;               // softer than raw deltaY
const newZoom = clamp(viewport.zoom * (1 + delta), 0.05, 20);
setViewport(zoomOnPoint(viewport, mouseX, mouseY, newZoom));
```

`zoomOnPoint` in `src/geometry/transform.ts` preserves the world point under the cursor:

```ts
const worldPoint = screenToWorld(mouseX, mouseY, viewport);
return {
  zoom: newZoom,
  x: mouseX - worldPoint.x * newZoom,
  y: mouseY - worldPoint.y * newZoom,
};
```

**Invariant:** the world coordinate that was under the cursor before the wheel event remains under the cursor after it.

### 14.2 Pan via Scroll

Plain (non-Ctrl) scroll moves the viewport directly:

```ts
setViewport({ x: viewport.x - e.deltaX, y: viewport.y - e.deltaY });
```

No animation; one frame of `requestFullRender()` is triggered immediately.

### 14.3 Zoom Bounds

| Limit | Value |
|---|---|
| Minimum zoom | `0.05` (5%) |
| Maximum zoom | `20` (2000%) |

Enforced via `Math.max(0.05, Math.min(20, newZoom))` in the wheel handler.
