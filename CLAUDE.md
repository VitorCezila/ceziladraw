# Ceziladraw — Claude Context

Browser-based hand-drawn whiteboard. Vanilla TypeScript + Canvas 2D API + Rough.js. Optional cloud sync via Supabase.

## Tech Stack

- **Language**: TypeScript ~5.9.3 (strict, ES2022)
- **Build**: Vite 7 (`npm run dev` on port 5173, `npm run preview` on port 4173)
- **Rendering**: HTML5 Canvas 2D + Rough.js (sketchy aesthetic)
- **State**: In-memory observer pattern — no React, no Vue, no Redux
- **Persistence**: localStorage (always) + Supabase PostgreSQL (optional, needs `.env`)
- **Auth**: Google OAuth via Supabase (on-demand, not required)
- **Testing**: Vitest (unit, jsdom), Playwright (e2e, headless Chromium)
- **Deployment**: Vercel

## Commands

```bash
npm run dev          # Vite dev server (http://localhost:5173)
npm run build        # TypeScript check + production build → dist/
npm run preview      # Serve dist/ at http://localhost:4173
npm run test:unit    # Vitest unit tests (fast, no browser)
npm run test:e2e     # Build + Playwright (needs port 4173 free)
npm run test         # Unit + e2e
```

## Project Structure

```
src/
  types/       — All TypeScript interfaces (elements, state, geometry)
  state/       — AppState, UIState, history, clipboard, selectors
  geometry/    — Transforms, hit detection, bounding box, selection (SAT)
  renderer/    — SceneRenderer + InteractionRenderer (two-layer canvas)
  tools/       — Tool classes (Select, Rectangle, Ellipse, Arrow, Text, Pencil…)
  canvas/      — CanvasManager (DPR setup), EventHandler (pointer/keyboard)
  storage/     — Serializer (JSON v1), localStorage, Supabase sync
  auth/        — Auth gate, Google OAuth flow
  lib/         — Supabase client singleton, typed DB helpers
  ui/          — Board picker UI
  utils/       — Color, math, text layout, theme, UUID
  main.ts      — Toolbar & properties panel wiring
  bootstrap.ts — App init sequence

tests/
  unit/        — Geometry, state, storage tests
  e2e/         — Drawing, selection, resize, rotation, undo/redo, clipboard…

supabase/migrations/  — SQL schema (workspaces, boards, board_data, RLS)
```

## Architecture: Key Patterns

### Data Flow
```
Pointer/Keyboard event
  → EventHandler (screen → world coords)
  → ToolManager → Active Tool
  → AppState / UIState mutation
  → SceneRenderer + InteractionRenderer (canvas redraws)
```

### Two-Layer Canvas (never collapse into one)
| Canvas | ID | Redraws When |
|---|---|---|
| Scene | `#scene` | AppState changes (committed elements) |
| Interaction | `#interaction` | Every pointermove (handles, provisional element, marquee) |

### Coordinate System (critical)
```
World-space: where elements live (x, y, width, height, angle in radians)
Screen-space: CSS pixels (depends on viewport)

screenX = worldX * zoom + viewport.x
worldX  = (screenX - viewport.x) / zoom

Canvas transform includes devicePixelRatio:
ctx.setTransform(zoom * dpr, 0, 0, zoom * dpr, viewport.x * dpr, viewport.y * dpr)
```

### State Stores
| Store | File | Persisted | Undo/Redo |
|---|---|---|---|
| `AppState` | `src/state/appState.ts` | Yes (localStorage + cloud) | Yes |
| `UIState` | `src/state/uiState.ts` | No | No |
| `History` | `src/state/history.ts` | No (patch-based diffs, max 100) | Yes |
| `Clipboard` | `src/state/clipboard.ts` | In-memory only | — |

### Element Types
All elements extend `BaseElement` (id, x, y, width, height, angle, zIndex, style, seed, version).

Concrete types: `rectangle` | `diamond` | `ellipse` | `text` | `arrow` | `line` | `pencil`

Rough.js renders: rectangle, diamond, ellipse, arrow, line.
Canvas 2D native: pencil (smooth strokes), text.

### Serialization Format
```json
{ "version": 1, "elements": [ /* DrawableElement[] */ ] }
```
- localStorage key: `ceziladraw_state`
- Supabase: `board_data.elements` (JSONB)
- `selection` is never persisted (always starts empty)

## Environment Variables

```env
# .env (copy from .env.example)
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

Without these, the app runs in local-only mode (no sign-in, single board, localStorage only).

## Bootstrap Sequence

```
bootstrap()
  → initTheme()
  → initAuth(onAuth)         # Supabase session or null
  → initBoardPicker(user)    # Cloud: list boards; Local: boardId = null
  → initStorage(boardId)     # Load data, subscribe auto-save (debounce 500ms)
  → main()                   # Wire toolbar, properties panel
```

## Supabase DB Schema (summary)

- `workspaces` (id, name, owner_id) — RLS: owner only
- `boards` (id, workspace_id, name, element_count, updated_at) — RLS: member access
- `board_data` (board_id PK, elements JSONB, version, updated_at) — RLS: editor access
- `workspace_members` (workspace_id, user_id, role: owner|editor|viewer)

## TypeScript Conventions

- `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`
- Module resolution: `bundler` (Vite-style)
- No barrel `index.ts` files — import from specific modules
- Each `src/*/ARCHITECTURE.md` documents public API, algorithms, and integration points

## Tool Keyboard Shortcuts

`V` Select · `R` Rectangle · `D` Diamond · `O` Ellipse · `A` Arrow · `L` Line · `T` Text · `P` Pencil · `H` Hand
`Ctrl+Z` Undo · `Ctrl+Y`/`Ctrl+Shift+Z` Redo · `Ctrl+A` Select all · `Ctrl+C/V` Copy/Paste
`Space` (hold) Temporary hand tool · `Delete`/`Backspace` Delete selected · `Escape` Deselect

## Common Gotchas

- **DPR handling**: Physical canvas size = CSS size × `devicePixelRatio`. Always use `src/renderer/utils/dpr.ts` helpers.
- **Roughness seed**: Each element has a `seed` field. Changing seed changes the sketchy shape — preserve it on updates.
- **zIndex sorting**: Elements render in ascending zIndex order. Use selectors in `src/state/selectors.ts`.
- **Angle**: Always in **radians** (not degrees). Selection handles rotate with the element.
- **SAT collision**: Marquee selection uses Separating Axis Theorem in `src/geometry/selection.ts`.
- **History patches**: History stores per-element version diffs, not full snapshots. Increment `element.version` on every mutation.
- **Cloud sync is non-fatal**: If Supabase fails, the app continues with localStorage. Never throw on sync errors.
- **Guest mode**: Supabase is configured but user is not signed in → show "Sign in" button in toolbar, still allow drawing (saves to localStorage only).
