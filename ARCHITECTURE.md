# Ceziladraw — Architecture Document

## Overview

Ceziladraw is a browser-based, hand-drawn style whiteboard application built on the Canvas 2D API. It is intentionally framework-free for the core engine — state, geometry, and rendering are pure TypeScript modules. The toolbar UI is plain HTML/CSS.

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

| Field       | Type              | Purpose |
|-------------|-------------------|---------|
| `id`        | `string` (UUID v4)| Immutable unique key |
| `type`      | `ElementType`     | Discriminator for rendering and hit-detection |
| `x`, `y`   | `number`          | Top-left origin in **world-space** |
| `width`, `height` | `number`  | Bounding dimensions in world-space |
| `angle`     | `number` (radians)| Rotation around the element's center `(cx, cy)` |
| `zIndex`    | `number`          | Explicit render order; elements are sorted before drawing |
| `groupId`   | `string \| null`  | Logical grouping key; no tree structure needed |
| `style`     | `StyleObject`     | Visual properties passed to roughjs |
| `version`   | `number`          | Incremented on every mutation; used by undo/redo diffing |
| `seed`      | `number`          | Fixed roughjs seed — guarantees stable hand-drawn appearance |

### Concrete Element Types

**`TextElement`** — adds:
```json
{ "text": "Hello", "fontSize": 16, "fontFamily": "Virgil", "textAlign": "left" }
```

**`ArrowElement`** — adds:
```json
{
  "startId": "elem-uuid-or-null",
  "endId": "elem-uuid-or-null",
  "points": [{"x": 120, "y": 80}, {"x": 300, "y": 200}],
  "curve": "bezier"
}
```

**`DiamondElement`** — `BaseElement` with `type: "diamond"`. The four vertices are derived from `x, y, width, height` at render time.

---

## 2. Coordinate System — World vs Screen

Two independent spaces coexist at all times.

### World-Space
Where elements live. Coordinates are absolute, never change when the user zooms or pans. All element properties (`x`, `y`, `width`, `height`, `points`) are stored in world-space.

### Screen-Space
The actual CSS/canvas pixels visible to the user. Determined by the **viewport**:

```
viewport = { x: number, y: number, zoom: number }
```

### Transformation Formulas

```
// World → Screen
screenX = worldX * zoom + viewport.x
screenY = worldY * zoom + viewport.y

// Screen → World  (used on every mouse event)
worldX = (screenX - viewport.x) / zoom
worldY = (screenY - viewport.y) / zoom
```

### Applying the Transform to Canvas

```typescript
ctx.save();
ctx.setTransform(zoom, 0, 0, zoom, viewport.x, viewport.y);
// All draw calls here use world-space coordinates directly
ctx.restore();
```

### Zoom Centered on the Cursor

When the user scrolls, the world point under the cursor must remain stationary:

```typescript
const worldPoint = screenToWorld(mouseX, mouseY, viewport);
viewport.zoom = newZoom;
viewport.x = mouseX - worldPoint.x * newZoom;
viewport.y = mouseY - worldPoint.y * newZoom;
```

### Rule: Mouse Events Are Always Converted First

Every pointer event handler calls `screenToWorld()` **before** any logic. This means hit-detection and drawing tools are completely zoom-agnostic.

---

## 3. Mouse Event Flow

```
PointerDown
  │
  ├── EventHandler.onPointerDown(e)
  │     converts e.clientX/Y → worldX/Y
  │     updates UIState { isDragging: false, dragStartX, dragStartY }
  │     → ToolManager.onPointerDown(worldX, worldY)
  │           → ActiveTool.onPointerDown(worldX, worldY)
  │                 SelectTool: hit-test elements, set selectedIds
  │                 DrawTool:   create provisional element in UIState
  │
PointerMove
  │
  ├── EventHandler.onPointerMove(e)
  │     converts → worldX/Y
  │     updates UIState { pointerX, pointerY }
  │     if isDragging → ToolManager.onPointerMove(worldX, worldY)
  │           → ActiveTool.onPointerMove(worldX, worldY)
  │                 SelectTool:  update element position delta (world-space)
  │                 DrawTool:    update provisional element dimensions
  │           → InteractionRenderer.render()   ← ONLY interaction canvas redraws
  │
PointerUp
  │
  └── EventHandler.onPointerUp(e)
        → ActiveTool.onPointerUp(worldX, worldY)
              commits delta to AppState (immutable patch)
              → History.push(before, after)
              → SceneRenderer.render()   ← full scene redraw
              clears UIState drag fields
```

### Key Invariant

The **scene canvas** only redraws on `PointerUp` (or keyboard actions). The **interaction canvas** redraws on every `PointerMove`. This prevents re-rendering the full scene on each mouse event.

---

## 4. State Architecture

### Persistent State (`AppState`)
Goes into undo/redo history and localStorage.

```typescript
interface AppState {
  elements: Map<string, BaseElement>;
  selectedIds: Set<string>;
}
```

### Ephemeral State (`UIState`)
Never enters history. Resets on page reload.

```typescript
interface UIState {
  activeTool: ToolType;
  isDragging: boolean;
  dragStartX: number;
  dragStartY: number;
  pointerX: number;
  pointerY: number;
  editingElementId: string | null;
  provisionalElement: BaseElement | null;
  viewport: Viewport;
}
```

### History Entries (Patches)
Each action stores only the **diff**, not the full scene:

```typescript
interface HistoryEntry {
  before: Partial<AppState>;
  after: Partial<AppState>;
}
```

Undo: apply `entry.before`. Redo: apply `entry.after`. Stack capped at 100 entries.

---

## 5. Rendering Architecture

```
Renderer (orchestrator)
├── SceneRenderer     → draws all AppState.elements sorted by zIndex
└── InteractionRenderer → draws UIState.provisionalElement + selection handles
```

Both renderers share a `ctx.setTransform(zoom, 0, 0, zoom, vx, vy)` call so all draw calls use world-space directly.

### Device Pixel Ratio

```typescript
const dpr = window.devicePixelRatio || 1;
canvas.width = canvas.clientWidth * dpr;
canvas.height = canvas.clientHeight * dpr;
ctx.scale(dpr, dpr);
```

---

## 6. Hit Detection Strategy

| Element Type | Algorithm |
|---|---|
| Rectangle / Ellipse (no rotation) | AABB point-in-rect |
| Any rotated element | Rotate click point by `-angle` around element center, then AABB |
| Straight line / Arrow segment | Point-to-segment distance < `5 / zoom` px |
| Bézier curve | Subdivide into 50 linear segments, test each segment |
| Marquee selection | AABB intersection; rotated elements use SAT |

Elements are tested in **descending zIndex order** — first hit wins (top-most element).
