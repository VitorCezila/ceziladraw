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
