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
├── storage/        Serialization, localStorage + Supabase cloud persistence
├── auth/           Auth gate, Google OAuth sign-in overlay
├── lib/            Supabase client, typed DB helpers (workspaces, boards)
├── ui/             Board picker — switch/create/rename/delete boards
├── main.ts         App wiring — properties panel, toolbar, shortcuts
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
| [`src/storage/`](src/storage/ARCHITECTURE.md) | JSON serialization, cloud + localStorage persistence |
| [`src/auth/`](src/auth/ARCHITECTURE.md) | Auth gate, Google OAuth, sign-in overlay |
| [`src/lib/`](src/lib/ARCHITECTURE.md) | Supabase client, workspace/board DB helpers |
| [`src/ui/`](src/ui/ARCHITECTURE.md) | Board picker UI |
| [`src/utils/`](src/utils/ARCHITECTURE.md) | `textLayout`, `math`, `color`, `id`, `theme` |

---

## Bootstrap Flow

On load, `bootstrap()` runs before the main canvas UI:

```
bootstrap()
    │
    ├── initTheme()
    ├── _showLoading()
    │
    ▼
initAuth(onAuth)
    │
    ├── Supabase not configured? → onAuth(null) immediately
    ├── getSession() → has session? → onAuth(user)
    └── no session? → onAuth(null) (guest mode; no overlay; board loads)
    │
    ▼
initBoardPicker(user)
    │
    ├── Local mode? → currentBoardId = null
    └── Cloud mode? → getOrCreatePersonalWorkspace, listBoards, currentBoardId
    │
    ▼
initStorage(boardId)
    │
    ├── Load from cloud (if boardId) or localStorage
    └── Subscribe to AppState (debounced save)
    │
    ▼
_hideLoading() → main()
    │
    └── If guest + Supabase enabled: add "Sign in" button (calls showSignIn()).
        If authenticated: add "Sign out" button.
```

Sign-in overlay is **not** shown on load when unauthenticated. It appears only when the user clicks "Sign in" in the UI. After OAuth redirect (or sign-out), the page reloads and bootstrap runs again with the new auth state.

Error boundary: any uncaught exception in this chain shows a user-facing error card with a Reload button.

---

## Cloud vs Local Mode

When `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set, the app runs in **cloud mode**:

- Root always shows a working board. If no session (guest), the board loads from localStorage and a "Sign in" button is shown; the auth overlay appears only when the user clicks it. After OAuth redirect, the page reloads and cloud boards load.
- Board picker shows workspaces and boards; data syncs to Supabase.
- `localStorage` is still written (optimistic) and used as offline fallback.

When these env vars are missing, **local-only mode**:

- No auth overlay; `onAuth(null)` immediately.
- Single "Local Board"; no cloud sync.
- `localStorage` only (`ceziladraw_state` key).

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
        └──▶ UIState       provisionalElement, viewport, activeStyle, currentBoardId (ephemeral)
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
npm run dev      # Vite dev server (bootstrap → auth/board → main)
npm run build    # Production build
npm run preview  # Serve production build locally
```

For cloud mode, create a `.env` file with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (see `.env.example`).
