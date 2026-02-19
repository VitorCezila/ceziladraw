# Ceziladraw — Development Checklist

Track the implementation status of every feature. Update this file as each item is completed.

Legend: `[ ]` pending · `[~]` in progress · `[x]` complete

---

## Foundation

- [x] Project scaffolding (Vite + TypeScript)
- [x] roughjs installed
- [x] ARCHITECTURE.md written
- [x] CHECKLIST.md written
- [ ] `src/types/elements.ts` — BaseElement, all concrete types
- [ ] `src/types/state.ts` — AppState, UIState, HistoryEntry, Viewport
- [ ] `src/types/geometry.ts` — Point, Rect, BoundingBox
- [ ] `src/utils/id.ts` — UUID v4 generator
- [ ] `src/utils/math.ts` — clamp, lerp, angleBetween, degToRad
- [ ] `src/utils/color.ts` — color helpers

---

## State Management

- [ ] `src/state/appState.ts` — central persistent store
- [ ] `src/state/uiState.ts` — ephemeral store (pointer, tool, viewport)
- [ ] `src/state/history.ts` — undo/redo with patch diffing (max 100 entries)
- [ ] `src/state/selectors.ts` — getSortedElements, getElementsByGroup

---

## Coordinate System & Geometry

- [ ] `src/geometry/transform.ts` — screenToWorld, worldToScreen, zoom-on-cursor
- [ ] `src/geometry/boundingBox.ts` — getBoundingBox per element type
- [ ] `src/geometry/hitDetection.ts` — AABB, rotated, segment, bézier
- [ ] `src/geometry/selection.ts` — marquee AABB, SAT for rotated elements

---

## Canvas & Rendering

- [ ] `src/canvas/CanvasManager.ts` — two-layer canvas setup, DPR, resize
- [ ] `src/canvas/EventHandler.ts` — pointer/keyboard → UIState + ToolManager
- [ ] `src/renderer/Renderer.ts` — orchestrates scene + interaction layers
- [ ] `src/renderer/SceneRenderer.ts` — renders all elements sorted by zIndex
- [ ] `src/renderer/InteractionRenderer.ts` — provisional element + handles
- [ ] `src/renderer/utils/dpr.ts` — DPR helpers
- [ ] `src/renderer/elements/renderRect.ts`
- [ ] `src/renderer/elements/renderDiamond.ts`
- [ ] `src/renderer/elements/renderEllipse.ts`
- [ ] `src/renderer/elements/renderText.ts`
- [ ] `src/renderer/elements/renderArrow.ts`

---

## Tools

- [ ] `src/tools/ToolManager.ts` — dispatches events to the active tool
- [ ] **Select Tool** — click to select, drag to move, marquee selection
  - [ ] Single element selection
  - [ ] Multi-selection (Shift+click)
  - [ ] Marquee (drag on empty space)
  - [ ] Move selected elements
  - [ ] Resize handles (8-point)
  - [ ] Rotation handle
  - [ ] Delete selected (Delete / Backspace)
- [ ] **Rectangle Tool**
  - [ ] Draw by dragging
  - [ ] Shift to constrain to square
- [ ] **Diamond Tool**
  - [ ] Draw by dragging
  - [ ] Shift to constrain proportions
- [ ] **Ellipse Tool**
  - [ ] Draw by dragging
  - [ ] Shift to constrain to circle
- [ ] **Arrow Tool**
  - [ ] Draw straight arrow
  - [ ] Bind start/end to elements
  - [ ] Curved bézier mode
- [ ] **Line Tool**
  - [ ] Draw straight line segment
- [ ] **Text Tool**
  - [ ] Click to place floating textarea
  - [ ] Confirm on Enter / blur
  - [ ] Double-click existing text to edit

---

## Keyboard Shortcuts

- [ ] `V` — Select tool
- [ ] `R` — Rectangle tool
- [ ] `D` — Diamond tool
- [ ] `O` — Ellipse tool
- [ ] `A` — Arrow tool
- [ ] `L` — Line tool
- [ ] `T` — Text tool
- [ ] `Ctrl+Z` — Undo
- [ ] `Ctrl+Shift+Z` / `Ctrl+Y` — Redo
- [ ] `Ctrl+A` — Select all
- [ ] `Delete` / `Backspace` — Delete selected
- [ ] `Escape` — Cancel / deselect
- [ ] `Ctrl+C` / `Ctrl+V` — Copy / Paste
- [ ] `[` / `]` — Send backward / bring forward (zIndex)

---

## Storage

- [ ] `src/storage/serializer.ts` — AppState ↔ JSON
- [ ] `src/storage/localStorage.ts` — auto-save on change, load on init
- [ ] Export to JSON (download)
- [ ] Import from JSON (file picker)

---

## UI (Toolbar & Panels)

- [ ] Floating toolbar (left side) with tool buttons
- [ ] Active tool highlight
- [ ] Style panel (stroke color, fill color, roughness, stroke width)
- [ ] Zoom controls (bottom-right)
- [ ] Canvas background (off-white grid dots)
- [ ] Touch/mobile pointer events support

---

## Polish & Performance

- [ ] DPR-aware canvas for retina displays
- [ ] Dirty region rendering (only redraw changed bounding boxes)
- [ ] Off-screen canvas for complex elements
- [ ] Smooth zoom animation
- [ ] Dark mode support
