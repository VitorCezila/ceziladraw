# Ceziladraw — Development Checklist

Track the implementation status of every feature.

Legend: `[ ]` pending · `[~]` in progress · `[x]` complete

---

## Foundation

- [x] Project scaffolding (Vite + TypeScript)
- [x] roughjs installed
- [x] ARCHITECTURE.md written and up-to-date
- [x] CHECKLIST.md written
- [x] `src/types/elements.ts` — BaseElement, all concrete types
- [x] `src/types/state.ts` — AppState, UIState, HistoryEntry, Viewport
- [x] `src/types/geometry.ts` — Point, Rect, BoundingBox
- [x] `src/utils/id.ts` — UUID v4 generator
- [x] `src/utils/math.ts` — clamp, lerp, distance, angleBetween
- [x] `src/utils/color.ts` — color helpers + PALETTE

---

## State Management

- [x] `src/state/appState.ts` — central persistent store
- [x] `src/state/uiState.ts` — ephemeral store (pointer, tool, viewport)
- [x] `src/state/history.ts` — undo/redo with patch diffing (max 100 entries)
- [x] `src/state/selectors.ts` — getSortedElements, getElementsByGroup
- [x] **Undo/Redo keyboard shortcuts** (`Ctrl+Z`, `Ctrl+Y`)
- [x] **Undo/Redo UI buttons** (disabled state synced) — click handlers fixed Wave 2

---

## Coordinate System & Geometry

- [x] `src/geometry/transform.ts` — screenToWorld, worldToScreen, zoom-on-cursor
- [x] `src/geometry/boundingBox.ts` — getBoundingBox per element type
- [x] `src/geometry/hitDetection.ts` — AABB, rotated, segment, polyline
- [x] `src/geometry/selection.ts` — marquee AABB, SAT for rotated elements

---

## Canvas & Rendering

- [x] `src/canvas/CanvasManager.ts` — two-layer canvas setup, DPR, resize
- [x] `src/canvas/EventHandler.ts` — pointer/keyboard → UIState + ToolManager
- [x] `src/renderer/Renderer.ts` — orchestrates scene + interaction layers
- [x] `src/renderer/SceneRenderer.ts` — renders all elements sorted by zIndex
- [x] `src/renderer/InteractionRenderer.ts` — provisional element + handles + marquee
- [x] `src/renderer/utils/dpr.ts` — DPR helpers
- [x] `src/renderer/elements/renderRect.ts`
- [x] `src/renderer/elements/renderDiamond.ts`
- [x] `src/renderer/elements/renderEllipse.ts`
- [x] `src/renderer/elements/renderText.ts`
- [x] `src/renderer/elements/renderArrow.ts`
- [x] `src/renderer/elements/renderPencil.ts` — free-draw (Wave 2)
- [x] **Dark Mode canvas** — themed background + dot grid (Wave 2)

---

## Tools

- [x] `src/tools/ToolManager.ts` — dispatches events to the active tool
- [x] **Select Tool**
  - [x] Single element selection
  - [x] Multi-selection (Shift+click)
  - [x] Marquee selection (drag on empty space) ← already implemented
  - [x] Move selected elements
  - [ ] Resize handles (8-point)
  - [ ] Rotation handle
  - [x] Delete selected (Delete / Backspace)
- [x] **Rectangle Tool** — draw by dragging; Shift to constrain to square
- [x] **Diamond Tool** — draw by dragging
- [x] **Ellipse Tool** — draw by dragging; Shift to constrain to circle
- [x] **Arrow Tool** — draw straight arrow
- [x] **Line Tool** — draw straight line segment
- [x] **Text Tool** — click to place, Enter to confirm, Escape to discard
- [x] **Pencil Tool** — free-draw path (Wave 2)
- [x] **Hand Tool** — pan navigation (Wave 2)

---

## Keyboard Shortcuts

- [x] `V` — Select tool
- [x] `R` — Rectangle tool
- [x] `D` — Diamond tool
- [x] `O` — Ellipse tool
- [x] `A` — Arrow tool
- [x] `L` — Line tool
- [x] `T` — Text tool
- [x] `P` — Pencil tool (Wave 2)
- [x] `H` — Hand tool (Wave 2)
- [x] `Space` — Temporary hand tool while held (Wave 2)
- [x] `Ctrl+Z` — Undo
- [x] `Ctrl+Shift+Z` / `Ctrl+Y` — Redo
- [x] `Ctrl+A` — Select all
- [x] `Delete` / `Backspace` — Delete selected
- [x] `Escape` — Cancel / deselect
- [ ] `Ctrl+C` / `Ctrl+V` — Copy / Paste
- [ ] `[` / `]` — Send backward / bring forward (zIndex)

---

## Dark Mode (Wave 2)

- [x] `src/utils/theme.ts` — getTheme, toggleTheme, getCanvasColors
- [x] CSS `[data-theme="dark"]` token block in `style.css`
- [x] SceneRenderer reads theme for background/grid colors
- [x] Toggle button (sun/moon) in actions panel
- [x] Persist theme preference in localStorage

---

## Storage

- [x] `src/storage/serializer.ts` — AppState ↔ JSON (v1)
- [x] `src/storage/localStorage.ts` — auto-save on change (debounced 500ms)
- [x] Export to JSON (download)
- [x] Import from JSON (file picker)

---

## UI (Toolbar & Panels)

- [x] Floating toolbar (left side) with tool buttons
- [x] Active tool highlight
- [ ] Style panel (stroke color, fill color, roughness, stroke width)
- [x] Zoom controls (bottom-right): zoom in/out/reset + label
- [x] Canvas background (off-white dot grid)
- [ ] Touch/mobile pointer events support
  - [x] Dark Mode toggle button (Wave 2)

---

## Polish & Performance

- [x] DPR-aware canvas for retina displays
- [ ] Dirty region rendering (only redraw changed bounding boxes)
- [ ] Off-screen canvas for complex elements
- [ ] Smooth zoom animation
  - [x] Dark mode support (Wave 2)

---

## QA Wave — Test Infrastructure

- [x] `TEST_PLAN.md` — 19 critical flows + 13 edge cases documented
- [x] `vitest.config.ts` — unit test config (jsdom env)
- [x] `playwright.config.ts` — E2E config (chromium, vite preview)
- [x] `window.__ceziladraw` hook in `main.ts` (dev + production builds)
- [x] Unit tests — 8 files, **93 tests**, all passing
  - [x] `tests/unit/utils/math.test.ts`
  - [x] `tests/unit/geometry/transform.test.ts`
  - [x] `tests/unit/geometry/hitDetection.test.ts`
  - [x] `tests/unit/geometry/selection.test.ts`
  - [x] `tests/unit/geometry/boundingBox.test.ts`
  - [x] `tests/unit/state/history.test.ts`
  - [x] `tests/unit/state/appState.test.ts`
  - [x] `tests/unit/storage/serializer.test.ts`
- [x] E2E tests — 6 spec files, **40 tests**, all passing
  - [x] `tests/e2e/drawing.spec.ts`
  - [x] `tests/e2e/selection.spec.ts`
  - [x] `tests/e2e/undoRedo.spec.ts`
  - [x] `tests/e2e/panZoom.spec.ts`
  - [x] `tests/e2e/persistence.spec.ts`
  - [x] `tests/e2e/theme.spec.ts`
- [x] `ARCHITECTURE.md` updated with Section 11 — Test Architecture

---

## Wave 3 — Rotation & Resize, Color Panel, Text Format, Clipboard

### Bug Fixes
- [x] `SelectTool`: add `getHandleAtPoint()` — route `onPointerDown` to handle vs body hit
- [x] `src/geometry/handles.ts` — new module: handle positions, hit detection, resize math
- [x] Resize math: rotation-aware for all 8 handles (corner + edge)
- [x] Rotation handle drag: `atan2` angle tracking in `SelectTool`

### Style State
- [x] `UIState.activeStyle: StyleObject` — persists chosen style for new elements
- [x] `setActiveStyle()` helper in `uiState.ts`
- [x] All 5 drawing tools (Rectangle, Diamond, Ellipse, Arrow, Line, Text, Pencil) use `activeStyle`
- [x] `activeStyle.strokeColor` initialised from `getDefaultStrokeColor()` on load
- [x] `themechange` listener updates `activeStyle.strokeColor` + stroke swatch UI

### Color Panel
- [x] `<aside id="style-panel">` in `index.html` (bottom-center floating)
  - [x] Stroke color: 8 swatches + custom `<input type="color">`
  - [x] Fill color: "none" + 6 swatches + custom `<input type="color">`
  - [x] Stroke width: 1 / 2 / 3 / 4 px buttons
- [x] Wired in `main.ts`: click handlers update `activeStyle` via `setActiveStyle()`

### Text Format Panel
- [x] `<div id="text-format-panel">` in `index.html`
  - [x] Font size: S (14px) · M (20px) · L (28px)
  - [x] Text align: Left · Center · Right
- [x] Wired in `main.ts`: auto-shows/hides when single `TextElement` selected
- [x] Calls `updateElement()` + `pushHistory()`

### Clipboard
- [x] `src/state/clipboard.ts` — `copySelected()`, `pasteClipboard()`, `hasClipboard()`
- [x] `Ctrl+C` / `Ctrl+V` wired in `EventHandler._onKeyDown`
- [x] Paste adds clone with +20/+20px offset; cascades on repeated paste

### Documentation
- [x] `TEST_PLAN.md` — Section 7 added (F-20–F-28, E-13–E-14)
- [x] `ARCHITECTURE.md` — Section 12 added (handles, activeStyle, clipboard)

### Tests (Wave 3) — **all passing**
- [x] `tests/unit/geometry/handles.test.ts` — 13 tests covering F-20, F-21, E-13 ✅
- [x] `tests/e2e/resize.spec.ts` — F-20, E-14 ✅
- [x] `tests/e2e/rotation.spec.ts` — F-22 ✅
- [x] `tests/e2e/stylePanel.spec.ts` — F-23, F-24 ✅
- [x] `tests/e2e/textFormat.spec.ts` — F-25, F-26 ✅
- [x] `tests/e2e/clipboard.spec.ts` — F-27, F-28 ✅
- [x] Bug fix: `SelectTool` no longer pushes useless history entries for click-to-select

### Final Test Coverage
| Suite | Files | Tests | Status |
|-------|-------|-------|--------|
| Unit | 9 | **106** | ✅ all pass |
| E2E | 11 | **55** | ✅ all pass |
