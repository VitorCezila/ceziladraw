# `src/types/` — Data Contracts

All shared TypeScript interfaces and type aliases live here. Nothing in this folder imports from the rest of `src/` — it is a pure definition layer.

---

## Files

| File | Purpose |
|------|---------|
| `elements.ts` | Every drawable element type + `StyleObject` + `DEFAULT_STYLE` |
| `state.ts` | `AppState`, `UIState`, `HistoryEntry`, `ToolType` |
| `geometry.ts` | `Point`, `Rect`, `BoundingBox`, `Viewport` |

---

## Element Schema

### `BaseElement`

Every drawable object extends `BaseElement`:

```ts
interface BaseElement {
  id: string;           // UUID v4 — immutable unique key
  type: ElementType;    // discriminator for rendering and hit-detection
  x: number;           // top-left origin in world-space
  y: number;
  width: number;       // bounding dimensions in world-space
  height: number;
  angle: number;       // rotation in radians around element center
  zIndex: number;      // explicit render order (sorted before drawing)
  groupId: string | null;
  style: StyleObject;
  version: number;     // incremented on each mutation; used by undo diffing
  seed: number;        // fixed roughjs seed — stable hand-drawn appearance
}
```

### `StyleObject`

Visual properties shared by all element types:

```ts
interface StyleObject {
  strokeColor: string;           // CSS color
  strokeWidth: number;           // world-space px
  fillColor: string;             // CSS color or 'transparent'
  fillStyle: FillStyle;          // 'solid' | 'hachure' | 'cross-hatch' | 'none'
  roughness: number;             // 0–2+; controls roughjs jitter
  opacity: number;               // 0–1
  strokeStyle: StrokeStyle;      // 'solid' | 'dashed' | 'dotted'
  cornerStyle: CornerStyle;      // 'sharp' | 'round' (rectangles only)
}
```

**Fill semantics**: `fillColor: 'transparent'` means _no fill_. A shape with transparent fill is hollow — clicking inside it (in the select tool) does nothing; only its border is interactive.

**`DEFAULT_STYLE`** provides the initial values:

```ts
export const DEFAULT_STYLE: StyleObject = {
  strokeColor: '#1e1e2e',
  strokeWidth: 2,
  fillColor: 'transparent',
  fillStyle: 'solid',
  roughness: 1.2,
  opacity: 1.0,
  strokeStyle: 'solid',
  cornerStyle: 'sharp',
};
```

Note: actual new elements use `UIState.activeStyle` (not `DEFAULT_STYLE` directly) so that the user's current style selections carry over.

---

## Concrete Element Types

```ts
type DrawableElement =
  | RectangleElement
  | DiamondElement
  | EllipseElement
  | TextElement
  | ArrowElement
  | LineElement
  | PencilElement;
```

### Shape elements

```ts
interface RectangleElement extends BaseElement { type: 'rectangle' }
interface DiamondElement    extends BaseElement { type: 'diamond' }
interface EllipseElement    extends BaseElement { type: 'ellipse' }
```

Shape rendering respects `style.cornerStyle` (rectangles only) and `style.strokeStyle`.

### `TextElement`

```ts
interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontSize: number;       // world-space px; scales proportionally on resize
  fontFamily: string;
  textAlign: TextAlign;   // 'left' | 'center' | 'right'
}
```

Text elements are always full-body interactive (no border-only restriction).
Double-clicking a text element in the select tool opens an inline textarea editor.

### `ArrowElement`

```ts
interface ArrowElement extends BaseElement {
  type: 'arrow';
  startId: string | null;       // future: bind to another element
  endId: string | null;
  points: Point[];              // absolute world-space points
  curve: CurveType;             // 'linear' | 'bezier'
  startArrowhead: ArrowheadStyle;  // 'arrow' | 'dot' | 'bar' | 'none'
  endArrowhead: ArrowheadStyle;
}
```

### `LineElement`

```ts
interface LineElement extends BaseElement {
  type: 'line';
  points: Point[];
}
```

### `PencilElement`

```ts
interface PencilElement extends BaseElement {
  type: 'pencil';
  points: Point[];   // dense array — one entry per pointerMove event
  smoothing: number; // 0–1, reserved for future path simplification
}
```

Arrow, line, and pencil are collectively called **polyline elements** — they share `points[]`-based rendering and hit detection, and do not have resize/rotation handles.

---

## State Types (`state.ts`)

```ts
type ToolType =
  'select' | 'rectangle' | 'diamond' | 'ellipse' |
  'arrow' | 'line' | 'text' | 'pencil' | 'hand';

interface AppState {
  elements: Map<string, DrawableElement>;
  selectedIds: Set<string>;
}

interface UIState {
  activeTool: ToolType;
  isDragging: boolean;
  dragStartX: number;
  dragStartY: number;
  pointerX: number;
  pointerY: number;
  editingElementId: string | null;
  provisionalElement: DrawableElement | null;
  viewport: Viewport;
  activeStyle: StyleObject;   // style applied to all newly created elements
}

interface HistoryEntry {
  before: PartialAppState;
  after: PartialAppState;
}

type PartialAppState = {
  elements?: Map<string, DrawableElement>;
  selectedIds?: Set<string>;
};
```

---

## Geometry Types (`geometry.ts`)

```ts
interface Point    { x: number; y: number }
interface Rect     { x: number; y: number; width: number; height: number }
interface BoundingBox { minX: number; minY: number; maxX: number; maxY: number }
interface Viewport { x: number; y: number; zoom: number }
```
