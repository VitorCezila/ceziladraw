# `src/geometry/` — Coordinate System & Spatial Logic

All spatial computations — coordinate transforms, hit detection, resize math, marquee intersection, and bounding boxes — live here. Every function is pure: no imports from `state/` or `tools/`.

---

## Files

| File | Purpose |
|------|---------|
| `transform.ts` | World ↔ screen transforms, rotation, element local-space |
| `hitDetection.ts` | Point-in-element tests for click and hover |
| `handles.ts` | Resize/rotation handle positions and drag math |
| `boundingBox.ts` | Axis-aligned bounding box per element type |
| `selection.ts` | Marquee intersection (AABB + SAT for rotated elements) |

---

## Coordinate System (`transform.ts`)

### Two Spaces

**World-space** — where elements live. All element properties (`x`, `y`, `width`, `height`, `points[]`) are stored in world coordinates. Never change with zoom or pan.

**Screen-space** — CSS/canvas pixels on the physical screen.

### Viewport

```ts
viewport = { x: number, y: number, zoom: number }
```

### Transformation Formulas

```
// World → Screen
screenX = worldX * zoom + viewport.x
screenY = worldY * zoom + viewport.y

// Screen → World
worldX = (screenX - viewport.x) / zoom
worldY = (screenY - viewport.y) / zoom
```

### Applying to the Canvas Context

```ts
ctx.setTransform(zoom * dpr, 0, 0, zoom * dpr, viewport.x * dpr, viewport.y * dpr);
// All draw calls after this use world-space coordinates directly
```

### Zoom Centered on the Cursor

```ts
// zoomOnPoint in transform.ts
const worldPoint = screenToWorld(mouseX, mouseY, viewport);
return {
  zoom: newZoom,
  x: mouseX - worldPoint.x * newZoom,
  y: mouseY - worldPoint.y * newZoom,
};
```

The world point that was under the cursor before the wheel event remains under it after.

### Element Local Space

For rotated elements, hit detection and handle placement operate in **element local space** — the element's own coordinate frame with rotation removed:

```ts
toElementLocalSpace(worldPoint, cx, cy, angle):
  // Translates so center is at origin, rotates by -angle, translates back
```

---

## Hit Detection (`hitDetection.ts`)

Two exported functions with different purposes:

### `hitTestElement` — used for marquee intersection and polyline editing

Full-body test for all element types. Used internally by `selection.ts`.

### `hitTestElementForHover` — used by `SelectTool` (click) and `EventHandler` (hover cursor)

Same as `hitTestElement` for polylines and text, but implements **border-only** logic for shapes with `fillColor === 'transparent'`:

| Element type | Fill present | Fill absent (transparent) |
|---|---|---|
| Rectangle | Full AABB | Border band only |
| Diamond | Full diamond area | Border band only |
| Ellipse | Full ellipse area | Annular band only |
| Text | Full AABB always | — |
| Arrow / Line / Pencil | Segment proximity always | — |

**Threshold:** `8 / zoom` world-px. Stays visually constant at ~8 screen-px regardless of zoom level.

### Border-Only Helpers

Each shape has a corresponding `*Border` private helper that returns `true` only when the point is within the outer boundary **and** outside the inner boundary (inset by threshold):

- `hitTestRectBorder` — inside outer rect, not inside inset rect
- `hitTestEllipseBorder` — inside outer ellipse, not inside inset ellipse
- `hitTestDiamondBorder` — inside outer diamond, not inside inset diamond

### Hit Priority

Elements are tested in **descending `zIndex` order** — the topmost element wins. `getSortedElements().reverse()` is called before any hit test loop.

---

## Handles (`handles.ts`)

### Handle Layout

Eight resize handles + one rotation handle, indexed:

```
  0(TL)  1(TC)  2(TR)
  7(ML)          3(MR)
  6(BL)  5(BC)  4(BR)
  ●  ← rotation handle (ROTATE_OFFSET/zoom px above TC)
```

Constants (shared with `InteractionRenderer`):

```ts
HANDLE_SIZE   = 8   // px (in screen space)
HANDLE_PAD    = 4   // px gap between element border and handle border
ROTATE_OFFSET = 20  // px above TC
```

Polyline elements (arrow, line, pencil) never have handles — `isPolylineElement(el)` guards them.

### `getHandleAtPoint(el, worldPoint, zoom)`

1. Converts `worldPoint` to element local space.
2. Computes all handle positions in local space (padded by `HANDLE_PAD / zoom`).
3. Checks `distance(local, handlePos) ≤ HANDLE_SIZE / zoom * 1.5`.
4. Rotation handle is checked **first** (takes priority over corner overlap).
5. Returns `{ type: 'resize', index: 0–7 }`, `{ type: 'rotate' }`, or `null`.

### `applyResize(startEl, handleIndex, worldPoint)`

Returns the new `{ x, y, width, height }` given a handle drag.

**Corner handles (0, 2, 4, 6)** — the diagonally opposite corner stays fixed in world space:

```
fixedWorld  = rotatePoint(oppositeCorner, startCenter, angle)
newCenter   = midpoint(fixedWorld, dragPoint)
lFixed      = toElementLocalSpace(fixedWorld, newCenter, angle)
lDrag       = toElementLocalSpace(dragPoint,  newCenter, angle)
newW = |lDrag.x - lFixed.x|, newH = |lDrag.y - lFixed.y|
```

**Edge handles (1, 3, 5, 7)** — one axis is free, the other is fixed. Work in original-center local space:

```
TC(1): newH = fixedBottom - dragLocal.y  (top moves, bottom fixed)
MR(3): newW = dragLocal.x - sx           (right moves, left fixed)
BC(5): newH = dragLocal.y - sy           (bottom moves, top fixed)
ML(7): newW = fixedRight - dragLocal.x   (left moves, right fixed)
```

All dimensions are clamped to a minimum of 2 world-px.

---

## Bounding Box (`boundingBox.ts`)

`getBoundingBox(el)` returns an axis-aligned `BoundingBox` in world-space:

- **Rectangle / Diamond / Ellipse / Text**: `{ minX: x, minY: y, maxX: x+w, maxY: y+h }`
- **Arrow / Line / Pencil**: `min/max` of all `points[]`

Used by `InteractionRenderer` to position selection handles and by `selection.ts` for marquee pre-filtering.

---

## Marquee Selection (`selection.ts`)

`elementIntersectsMarquee(el, marquee)`:

1. **Fast AABB rejection**: if the element's bounding box doesn't overlap the marquee at all → `false`.
2. **Rotated elements**: uses SAT (Separating Axis Theorem) to check if the rotated element overlaps the marquee rectangle.
3. **Polylines**: checks each segment against the marquee rectangle.
