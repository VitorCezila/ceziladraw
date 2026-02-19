# Ceziladraw — Test Plan

> This document maps every testable behaviour in the application.
> Each scenario maps to an automated test in `tests/unit/` or `tests/e2e/`.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| `[U]`  | Covered by a Vitest unit test |
| `[E]`  | Covered by a Playwright E2E test |
| `[ ]`  | Documented, not yet automated |

---

## Section 1 — Critical Flows

### F-01 · Draw a Rectangle `[E]`

**File:** `tests/e2e/drawing.spec.ts`

**Steps:**
1. Press `R` to activate Rectangle tool
2. Drag from `(200, 200)` to `(400, 350)` on the canvas

**Success Criteria:**
- `AppState.elements.size === 1`
- Element `type === 'rectangle'`
- `width > 0` and `height > 0`
- Tool resets to `'select'` after draw

---

### F-02 · Draw an Ellipse `[E]`

**File:** `tests/e2e/drawing.spec.ts`

**Steps:**
1. Press `O` to activate Ellipse tool
2. Drag from `(200, 200)` to `(400, 350)`

**Success Criteria:**
- `AppState.elements.size === 1`
- Element `type === 'ellipse'`

---

### F-03 · Draw an Arrow `[E]`

**File:** `tests/e2e/drawing.spec.ts`

**Steps:**
1. Press `A` to activate Arrow tool
2. Drag from `(200, 200)` to `(400, 350)`

**Success Criteria:**
- Element `type === 'arrow'`
- `points.length === 2`
- `endArrowhead === 'arrow'`

---

### F-04 · Draw with Pencil `[E]`

**File:** `tests/e2e/drawing.spec.ts`

**Steps:**
1. Press `P` to activate Pencil tool
2. Click and drag with multiple intermediate positions (`steps: 20`)

**Success Criteria:**
- Element `type === 'pencil'`
- `points.length >= 2`

---

### F-05 · Select Element by Click `[E]`

**File:** `tests/e2e/selection.spec.ts`

**Steps:**
1. Draw a rectangle at a known position
2. Press `V` (select tool)
3. Click inside the rectangle bounds

**Success Criteria:**
- `AppState.selectedIds.size === 1`
- Selected id matches drawn element

---

### F-06 · Multi-select with Shift+Click `[E]`

**File:** `tests/e2e/selection.spec.ts`

**Steps:**
1. Draw two rectangles at distinct positions
2. Click first rectangle
3. Shift+click second rectangle

**Success Criteria:**
- `AppState.selectedIds.size === 2`

---

### F-07 · Marquee Selection `[E]`

**File:** `tests/e2e/selection.spec.ts`

**Steps:**
1. Draw two rectangles at positions `(100,100)` and `(300,300)`
2. With Select tool, drag a marquee that covers both

**Success Criteria:**
- `AppState.selectedIds.size === 2`

---

### F-08 · Move Selected Element `[E]`

**File:** `tests/e2e/selection.spec.ts`

**Steps:**
1. Draw a rectangle, select it
2. Drag the element to a new position

**Success Criteria:**
- Element `x` and `y` values differ from original by the drag delta

---

### F-09 · Undo via Ctrl+Z `[E]`

**File:** `tests/e2e/undoRedo.spec.ts`

**Steps:**
1. Draw a rectangle
2. Press `Ctrl+Z`

**Success Criteria:**
- `AppState.elements.size === 0`

---

### F-10 · Undo via Button `[E]`

**File:** `tests/e2e/undoRedo.spec.ts`

**Steps:**
1. Draw a rectangle
2. Click the `#btn-undo` button in the UI

**Success Criteria:**
- `AppState.elements.size === 0`
- `#btn-undo` is `disabled` after (stack is empty)

---

### F-11 · Redo via Ctrl+Y `[E]`

**File:** `tests/e2e/undoRedo.spec.ts`

**Steps:**
1. Draw a rectangle
2. Press `Ctrl+Z` (undo)
3. Press `Ctrl+Y` (redo)

**Success Criteria:**
- `AppState.elements.size === 1` after redo

---

### F-12 · Pan with Hand Tool `[E]`

**File:** `tests/e2e/panZoom.spec.ts`

**Steps:**
1. Press `H` to activate Hand tool
2. Drag the canvas 100px right and 50px down

**Success Criteria:**
- `viewport.x` increased by ~100
- `viewport.y` increased by ~50
- `AppState.elements` unchanged (no mutations)

---

### F-13 · Space Key Temporary Pan `[E]`

**File:** `tests/e2e/panZoom.spec.ts`

**Steps:**
1. Activate Rectangle tool (`R`)
2. Hold `Space`
3. Drag to pan
4. Release `Space`

**Success Criteria:**
- While space held: `activeTool === 'hand'`
- After release: `activeTool === 'rectangle'`

---

### F-14 · Zoom via Ctrl+Scroll `[E]`

**File:** `tests/e2e/panZoom.spec.ts`

**Steps:**
1. Ctrl+scroll wheel up on the canvas

**Success Criteria:**
- `viewport.zoom > 1.0`
- `viewport.zoom <= 20` (MAX_ZOOM)

---

### F-15 · Zoom Centered on Cursor `[U]`

**File:** `tests/unit/geometry/transform.test.ts`

**Steps (unit):**
1. Call `zoomOnPoint({ x:0, y:0, zoom:1 }, screenX=400, screenY=300, newZoom=2)`
2. Compute world point before and after

**Success Criteria:**
- World point under `(screenX, screenY)` is the same before and after zoom

---

### F-16 · Persist Elements After Refresh `[E]`

**File:** `tests/e2e/persistence.spec.ts`

**Steps:**
1. Draw a rectangle
2. Reload the page (`page.reload()`)

**Success Criteria:**
- `AppState.elements.size === 1` after reload
- Element `type`, `x`, `y`, `width`, `height` are identical

---

### F-17 · Dark Mode Toggle `[E]`

**File:** `tests/e2e/theme.spec.ts`

**Steps:**
1. Click `#btn-theme`

**Success Criteria:**
- `document.documentElement.dataset.theme === 'dark'`
- `localStorage.getItem('ceziladraw_theme') === 'dark'`

---

### F-18 · Dark Mode Persists After Refresh `[E]`

**File:** `tests/e2e/theme.spec.ts`

**Steps:**
1. Toggle to dark mode
2. Reload the page

**Success Criteria:**
- `document.documentElement.dataset.theme === 'dark'` after reload

---

### F-19 · Delete Selected Element `[E]`

**File:** `tests/e2e/selection.spec.ts`

**Steps:**
1. Draw a rectangle, select it
2. Press `Delete`

**Success Criteria:**
- `AppState.elements.size === 0`
- `AppState.selectedIds.size === 0`

---

## Section 2 — Edge Cases

### E-01 · Draw Right-to-Left (Negative Width) `[E]` `[U]`

**Why it matters:** User drags from right to left; raw delta is negative.

**Unit test** (`transform.test.ts`): Not applicable (handled in tool).

**E2E test** (`drawing.spec.ts`):
1. Activate Rectangle tool
2. Drag from `(400, 300)` to `(200, 200)` (right-to-left, bottom-to-top)

**Success Criteria:**
- Element `width > 0` and `height > 0` (RectangleTool uses `Math.abs`)
- Element `x === 200`, `y === 200`

---

### E-02 · Click Without Drag (Zero-Size Element) `[E]`

**Why it matters:** A mousedown+up without move should not add an element.

**E2E test** (`drawing.spec.ts`):
1. Activate Rectangle tool
2. Click without moving

**Success Criteria:**
- `AppState.elements.size === 0` (threshold: `width < 2` discards element)

---

### E-03 · Undo Does Not Undo Pan `[E]`

**Why it matters:** Pan mutates `UIState.viewport`, not `AppState`. Undo should skip it.

**E2E test** (`undoRedo.spec.ts`):
1. Draw a rectangle (creates history entry)
2. Pan the canvas (no history entry)
3. Press `Ctrl+Z`

**Success Criteria:**
- `AppState.elements.size === 0` (undo removed the rectangle, not the pan)
- `viewport.x` remains at panned value (pan is not reversed)

---

### E-04 · Undo Stack Cap at 100 `[U]`

**Why it matters:** Exceeding the cap must not throw; oldest entry must be evicted.

**Unit test** (`history.test.ts`):
1. Call `pushHistory(...)` 101 times
2. Check `_undoStack.length`

**Success Criteria:**
- Stack length === 100 (oldest entry evicted, not newest)
- `canUndo() === true`

---

### E-05 · Redo Stack Cleared on New Action `[U]`

**Unit test** (`history.test.ts`):
1. Push A, push B
2. Undo (redo stack has [B])
3. Push C (new action)
4. Attempt redo

**Success Criteria:**
- `canRedo() === false` after step 3
- State reflects C, not B

---

### E-06 · Zoom Clamped at MIN_ZOOM (0.1) `[U]`

**Unit test** (`transform.test.ts`):
1. Call `zoomOnPoint({ zoom: 0.15 }, 400, 300, 0.01)` (below minimum)

**Success Criteria:**
- Returned `zoom === 0.1` (clamped)

---

### E-07 · Zoom Clamped at MAX_ZOOM (20) `[U]`

**Unit test** (`transform.test.ts`):
1. Call `zoomOnPoint({ zoom: 19.9 }, 400, 300, 100)` (above maximum)

**Success Criteria:**
- Returned `zoom === 20` (clamped)

---

### E-08 · Pencil with Single Point Discarded `[E]`

**Why it matters:** Instant tap on pencil tool should not add an element.

**E2E test** (`drawing.spec.ts`):
1. Activate Pencil tool
2. Mousedown + immediate mouseup (no move)

**Success Criteria:**
- `AppState.elements.size === 0`

---

### E-09 · Corrupted localStorage `[U]`

**Unit test** (`serializer.test.ts`):
1. Call `deserializeState('not-json')`
2. Call `deserializeState('{"version":1}')` (missing `elements` array)
3. Call `deserializeState('{"version":1,"elements":"bad"}')` (elements not array)

**Success Criteria:**
- All three return `null`
- No exception thrown

---

### E-10 · Ctrl+A with Zero Elements `[E]`

**E2E test** (`selection.spec.ts`):
1. Start with empty canvas
2. Press `Ctrl+A`

**Success Criteria:**
- `AppState.selectedIds.size === 0`
- No crash

---

### E-11 · Delete Key with No Selection `[E]`

**E2E test** (`selection.spec.ts`):
1. Draw a rectangle (do not select it)
2. Press `Delete`

**Success Criteria:**
- `AppState.elements.size === 1` (nothing deleted)
- No crash

---

### E-12 · Hit-Test Respects Rotation `[U]`

**Unit test** (`hitDetection.test.ts`):
1. Create a rectangle at `(100, 100)` with `width=100, height=20`, rotated 90°
2. Click at `(110, 150)` — inside the rotated bounding box

**Success Criteria:**
- `hitTestElement(element, {x:110, y:150}, 1) === true`

---

### E-13 · Serialization Roundtrip Preserves All Fields `[U]`

**Unit test** (`serializer.test.ts`):
1. Create `AppState` with a rectangle, an arrow, a pencil element
2. `serializeState` → JSON string
3. `deserializeState` → new `AppState`

**Success Criteria:**
- All element fields identical (id, type, x, y, width, height, angle, style, seed, version)
- Arrow `points` array preserved
- Pencil `points` array preserved

---

## Section 3 — Unit Test Matrix

| Module | Function | Tests |
|--------|----------|-------|
| `geometry/transform` | `screenToWorld` | inverse of worldToScreen |
| | `worldToScreen` | inverse of screenToWorld |
| | `zoomOnPoint` | zoom clamping, cursor anchor |
| | `rotatePoint` | 0°, 90°, 180°, identity |
| | `toElementLocalSpace` | angle=0 identity, round-trip |
| `geometry/hitDetection` | `hitTestElement` (rect) | inside, outside, edge |
| | `hitTestElement` (ellipse) | inside, outside |
| | `hitTestElement` (diamond) | inside, outside |
| | `hitTestElement` (rotated) | click in local space |
| | `hitTestElement` (polyline) | near segment, far from segment |
| | `distanceToSegment` | degenerate segment (a===b) |
| `geometry/selection` | `elementIntersectsMarquee` | fully inside, partial overlap, no overlap |
| | SAT (rotated) | 45° element, partial overlap |
| `geometry/boundingBox` | `getBoundingBox` | rect, polyline, rotated |
| | `boundingBoxesIntersect` | touching, overlapping, separate |
| `state/history` | `pushHistory` | stack grows, cap at 100 |
| | `undo` | applies before patch |
| | `redo` | applies after patch |
| | `canUndo` / `canRedo` | correct boolean |
| | new action clears redo | redo stack purged |
| `state/appState` | `addElement` | element appears in map |
| | `updateElement` | version incremented |
| | `removeElements` | removed from map and selectedIds |
| | `subscribeToAppState` | listener called on change |
| `storage/serializer` | `serializeState` | produces valid JSON |
| | `deserializeState` | roundtrip fidelity |
| | corrupted input | returns null, no throw |
| `utils/math` | `clamp` | above max, below min, in range |
| | `distance` | zero distance, known triangle |
| | `lerp` | t=0, t=1, t=0.5 |

---

## Section 4 — E2E Test Matrix

| Spec file | Scenarios covered |
|-----------|-------------------|
| `drawing.spec.ts` | F-01, F-02, F-03, F-04, E-01, E-02, E-08 |
| `selection.spec.ts` | F-05, F-06, F-07, F-08, F-19, E-10, E-11 |
| `undoRedo.spec.ts` | F-09, F-10, F-11, E-03 |
| `panZoom.spec.ts` | F-12, F-13, F-14 |
| `persistence.spec.ts` | F-16, E-09 |
| `theme.spec.ts` | F-17, F-18 |

---

## Section 5 — Running Tests

```bash
# Unit tests (fast, no browser)
npm run test:unit

# Unit tests in watch mode
npm run test:unit -- --watch

# E2E tests (requires vite preview to build first)
npm run test:e2e

# All tests
npm run test
```

---

## Section 6 — Known Limitations

- Canvas pixel content is **not** pixel-compared. Tests assert on `AppState` via `window.__ceziladraw`.
- Resize handles (8-point) are not yet implemented — resize interaction tests are deferred.
- Rotation handle not yet implemented — E-12 is tested at the unit level only.
- Touch/mobile events are not yet covered.
