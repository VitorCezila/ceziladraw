# Ceziladraw — Architecture

Ceziladraw is a browser-based hand-drawn whiteboard built on the Canvas 2D API and [roughjs](https://roughjs.com/). The core engine is framework-free: state, geometry, and rendering are pure TypeScript modules. The UI is plain HTML/CSS.

---

## Project Structure

```
src/
├── types/          Data contracts — elements, state, geometry
├── utils/          Pure helpers — math, color, id, text layout, theme
├── state/          App & UI state stores, history, clipboard, selectors
├── geometry/       Coordinate transforms, hit detection, handles, bounding boxes
├── canvas/         Canvas setup and raw event handling
├── renderer/       Two-layer canvas rendering pipeline
├── tools/          Tool implementations dispatched by ToolManager
├── storage/        Serialization and localStorage persistence
├── main.ts         App bootstrap — wires UI controls to state
└── style.css       CSS custom properties, dark/light themes, layout
```

Each folder has its own `ARCHITECTURE.md` with detailed documentation:

| Folder | Topics covered |
|--------|---------------|
| [`src/types/`](src/types/ARCHITECTURE.md) | Element schema, `StyleObject`, all type definitions |
| [`src/state/`](src/state/ARCHITECTURE.md) | `AppState`, `UIState`, history, clipboard, selectors |
| [`src/geometry/`](src/geometry/ARCHITECTURE.md) | Coordinate system, hit detection, resize handles, bounding boxes |
| [`src/renderer/`](src/renderer/ARCHITECTURE.md) | Dual-canvas pipeline, DPR, element renderers, selection overlay |
| [`src/tools/`](src/tools/ARCHITECTURE.md) | Tool interface, all tool implementations, double-click editing |
| [`src/canvas/`](src/canvas/ARCHITECTURE.md) | `CanvasManager`, `EventHandler`, full event flow |
| [`src/storage/`](src/storage/ARCHITECTURE.md) | JSON serialization, localStorage auto-save |
| [`src/utils/`](src/utils/ARCHITECTURE.md) | `textLayout`, `math`, `color`, `id`, `theme` |

---

## High-Level Data Flow

```
User Gesture (pointer / wheel / keyboard)
        │
        ▼
  EventHandler            converts screen → world coords
        │
        ▼
  ToolManager             dispatches to the active Tool
        │
        ▼
  Active Tool             mutates AppState / UIState
        │
        ├──▶ AppState      elements, selectedIds (persisted + history)
        │
        └──▶ UIState       provisionalElement, viewport, activeStyle (ephemeral)
                │
                ▼
          Renderer          SceneRenderer + InteractionRenderer
                │
                ▼
          <canvas>          two layers: scene (stable) + interaction (per-frame)
```

### Key Invariant

The **scene canvas** redraws only on `pointerup` or explicit state actions (keyboard, undo, paste…). The **interaction canvas** redraws on every `pointermove`. This avoids re-rendering the full scene on each mouse event.

---

## Coordinate System

Two independent spaces exist at all times.

**World-space** — where elements live. Coordinates are absolute; never change with zoom/pan. All element properties are stored in world-space.

**Screen-space** — CSS/canvas pixels. Determined by the `Viewport`:

```ts
viewport = { x: number, y: number, zoom: number }
```

Transformations:

```
// World → Screen
screenX = worldX * zoom + viewport.x

// Screen → World  (called on every pointer event before any logic)
worldX = (screenX - viewport.x) / zoom
```

Every pointer event handler calls `screenToWorld()` before any logic. Tools and hit detection are completely zoom-agnostic.

---

## State Architecture Summary

| Store | Module | Goes to undo/localStorage |
|-------|--------|--------------------------|
| `AppState` | `src/state/appState.ts` | Yes |
| `UIState` | `src/state/uiState.ts` | No |

History stores diffs, not full snapshots — only the changed portions of `AppState`. Stack capped at 100.

---

## UI Layout

```
┌────────────────────────────────────────┐
│          #toolbar (top, horizontal)    │
├──────────┬─────────────────────────────┤
│ #props   │                             │
│ -panel   │     <canvas> (scene)        │
│ (left    │     <canvas> (interaction)  │
│  sidebar)│                             │
└──────────┴─────────────────────────────┘
```

- **Toolbar**: tool buttons (select, rectangle, diamond, ellipse, arrow, line, text, pencil, hand), undo/redo, theme toggle, save/load.
- **Properties panel** (left sidebar): dynamically shows sections based on what is selected — stroke, fill, stroke width/style, sloppiness, corner style, font family/size/align, opacity, layers, actions (duplicate, delete, link).

---

## Running the App

```bash
npm install
npm run dev      # Vite dev server
npm run build    # Production build
npm run preview  # Serve production build locally
```
