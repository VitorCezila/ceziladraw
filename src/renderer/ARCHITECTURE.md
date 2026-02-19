# `src/renderer/` — Rendering Pipeline

The renderer uses two `<canvas>` layers stacked on top of each other. All drawing uses world-space coordinates via a viewport transform applied to the context.

---

## Files

| File | Purpose |
|------|---------|
| `Renderer.ts` | Orchestrator — exposes the public API used by tools and `main.ts` |
| `SceneRenderer.ts` | Draws all committed elements sorted by `zIndex`, plus background |
| `InteractionRenderer.ts` | Draws the provisional element, selection handles, and marquee rect |
| `utils/dpr.ts` | Device pixel ratio helpers |
| `elements/renderRect.ts` | Renders `RectangleElement` via roughjs |
| `elements/renderDiamond.ts` | Renders `DiamondElement` via roughjs |
| `elements/renderEllipse.ts` | Renders `EllipseElement` via roughjs |
| `elements/renderArrow.ts` | Renders `ArrowElement` via roughjs |
| `elements/renderPencil.ts` | Renders `PencilElement` via native Canvas 2D |
| `elements/renderText.ts` | Renders `TextElement` via native Canvas 2D |

---

## Two-Layer Architecture

```
z-order (bottom → top)
┌──────────────────────────────┐
│  scene canvas                │  ← redraws only on committed state changes
│  (SceneRenderer)             │
├──────────────────────────────┤
│  interaction canvas          │  ← redraws on every pointermove
│  (InteractionRenderer)       │
└──────────────────────────────┘
```

The scene canvas is expensive to redraw (all elements + background). The interaction canvas is cheap (one provisional element + lightweight chrome). Separating them avoids re-rendering the full scene during continuous pointer moves.

---

## `Renderer` (orchestrator)

Public API:

| Method | Description |
|--------|-------------|
| `renderScene()` | Clears and redraws the scene canvas |
| `renderInteraction(marquee\|null)` | Clears and redraws the interaction canvas |
| `requestFullRender()` | Queues both renders in a single `requestAnimationFrame` |

Both canvases apply the same viewport transform before drawing:

```ts
ctx.setTransform(zoom * dpr, 0, 0, zoom * dpr, viewport.x * dpr, viewport.y * dpr);
```

---

## `SceneRenderer`

1. **Background**: fills the canvas with the theme background color and draws a dot-grid pattern.
2. **Elements**: calls `getSortedElements()` (ascending `zIndex`), applies `element.style.opacity` to the context `globalAlpha`, then dispatches to the appropriate element renderer.

### Theme Colors

```ts
// src/utils/theme.ts
getCanvasColors() → { background: string, dot: string }
```

Called each frame (O(1) DOM attribute read) — no caching needed.

---

## `InteractionRenderer`

Draws the **interaction layer** on top of the scene:

1. **Provisional element**: if `UIState.provisionalElement` is set, renders it using the same per-type renderer. This is the "live preview" while the user is drawing.
2. **Selection handles**: for each selected element, calls `_drawSelectionOutline` and `_drawHandles`.
3. **Marquee**: if a `BoundingBox` argument is passed, calls `_drawMarquee`.

### Selection Visual System

All selection chrome uses a single purple constant:

```ts
const HANDLE_COLOR    = '#6965db';
const SELECTION_COLOR = '#6965db';
```

**Selection border** — drawn inside the element's rotated coordinate frame:

| Property | Value |
|---|---|
| Color | `#6965db` |
| Style | Solid |
| Width | `1.5 / zoom` px (visually constant at all zoom levels) |
| Padding | `4 / zoom` px gap from the element's bounding box |

**Resize handles** — 8 squares at corners and edge midpoints:

| Property | Value |
|---|---|
| Size | `8 / zoom` px |
| Fill | `#fff` |
| Border | `#6965db`, `1.5 / zoom` px |

**Rotation handle** — 1 circle above the top-center:

| Property | Value |
|---|---|
| Offset above TC | `20 / zoom` px |
| Radius | `4 / zoom` px |
| Fill | `#6965db` |

**Marquee**:

| Property | Value |
|---|---|
| Border | `#6965db`, dashed `[4, 3]`, 1 px |
| Fill | `rgba(105, 101, 219, 0.06)` |

---

## Device Pixel Ratio (`utils/dpr.ts`)

Canvas physical size is set to `clientWidth * devicePixelRatio` to render sharp on retina displays. The viewport transform already multiplies by `dpr`, so all draw calls remain in logical (CSS) pixel coordinates.

---

## Element Renderers

### `renderRect`

Uses roughjs `rc.rectangle()` for `cornerStyle: 'sharp'`. For `cornerStyle: 'round'`, constructs an SVG rounded-rect path and passes it to `rc.path()`.

```ts
function strokeLineDash(style: StrokeStyle): number[] {
  if (style === 'dashed') return [10, 6];
  if (style === 'dotted') return [2, 6];
  return [];
}
```

The `strokeLineDash` helper maps `StrokeStyle` to roughjs `strokeLineDash` option. All shape renderers use the same helper.

### `renderPencil`

Uses native Canvas 2D (no roughjs) for a smooth free-draw stroke:

```ts
ctx.beginPath();
ctx.moveTo(points[0].x, points[0].y);
for (const p of points.slice(1)) ctx.lineTo(p.x, p.y);
ctx.lineJoin = 'round';
ctx.lineCap  = 'round';
ctx.stroke();
```

### `renderText`

Uses `wrapTextLines()` from `src/utils/textLayout.ts` to split text at word boundaries respecting the element's `width`. Draws each line with `ctx.fillText` at `fontSize * 1.4` line height. Respects `textAlign`.

### `renderArrow`

Draws the path via roughjs, then draws arrowheads at the start/end points using the configured `ArrowheadStyle`.
