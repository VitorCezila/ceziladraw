# Code Style

Conventions derived from reading the actual source. Every rule has a reference.

---

## Naming Conventions

**Types and interfaces** — PascalCase, no `I-` prefix.
```ts
// src/types/elements.ts
interface BaseElement { ... }
interface StyleObject { ... }
interface Tool { ... }
```

**Classes** — PascalCase.
```ts
// src/tools/SelectTool.ts, src/canvas/CanvasManager.ts
class SelectTool implements Tool { ... }
class CanvasManager { ... }
class SceneRenderer { ... }
```

**Functions and variables** — camelCase.
```ts
// src/state/selectors.ts, src/geometry/hitTest.ts
getSortedElements()
hitTestElement()
strokeColor
```

**Constants** — UPPER_CASE with underscores.
```ts
// src/state/history.ts, src/geometry/hitTest.ts, src/utils/style.ts
const MAX_HISTORY = 100;
const HIT_THRESHOLD_PX = 8;
const DEFAULT_STYLE = { ... };
const ZOOM_STEP = 0.15;
```

**Private class members** — leading underscore.
```ts
// src/tools/SelectTool.ts
private _isDragging = false;
private _listeners: Array<...> = [];
private _makeElement(...) { ... }
```

**Unused parameters** — underscore prefix (required by `noUnusedParameters`).
```ts
onPointerMove(_point: Point, _e: PointerEvent): void { ... }
```

**Common abbreviations** (consistent across the codebase):
| Abbreviation | Meaning |
|---|---|
| `el` | element (DrawableElement) |
| `ctx` | Canvas 2D rendering context |
| `rc` | Rough.js canvas |
| `dpr` | device pixel ratio |

---

## Export Patterns

- **Named exports exclusively** — zero default exports in the codebase.
- `export type` / `export interface` for type-only exports (`verbatimModuleSyntax` enforces this).
- No barrel `index.ts` files — always import from the specific module path.

```ts
// CORRECT
export interface DrawableElement { ... }
export function getSortedElements(...): ... { ... }
export class SceneRenderer { ... }

// WRONG
export default class SceneRenderer { ... }
export { SceneRenderer };  // from index.ts barrel
```

---

## Import Ordering

1. `import type` statements first
2. Regular imports second, grouped by module or concern
3. Never wildcard imports (`import * as ...`)

```ts
import type { DrawableElement, StyleObject } from '../types/elements';
import type { AppState } from '../state/appState';

import { getAppState, subscribeToAppState } from '../state/appState';
import { getSortedElements } from '../state/selectors';
import { hitTestElement } from '../geometry/hitTest';
```

---

## Classes vs Functions

**Use classes** for stateful objects:
- Managers: `CanvasManager`, `ToolManager`
- Tools: `SelectTool`, `RectangleTool`, `PencilTool`

**Use pure functions** for:
- Utilities: `generateId()` (`src/utils/uuid.ts`)
- State selectors: `getSortedElements()` (`src/state/selectors.ts`)
- Geometry: `hitTestElement()` (`src/geometry/hitTest.ts`)
- Serialization: `deserializeState()` (`src/storage/serializer.ts`)

**State stores** — module-level singletons, not class instances:
```ts
// src/state/appState.ts
let _state: AppState = { ... };

export function getAppState(): Readonly<AppState> { return _state; }
export function subscribeToAppState(fn: () => void): () => void { ... }
```

---

## TypeScript Strictness

`tsconfig.json` enables: `strict`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`.

**`Readonly<T>` return types** to prevent external mutation:
```ts
export function getAppState(): Readonly<AppState> { return _state; }
```

**Type guards** with predicate syntax:
```ts
const isArrow = (el: DrawableElement): el is ArrowElement =>
  el.type === 'arrow';
```

**Union narrowing** via literal type discriminant:
```ts
if (element.type === 'rectangle') { /* narrowed to RectangleElement */ }
```

**`Partial<T>`** for patch/update functions:
```ts
function updateElement(id: string, patch: Partial<DrawableElement>): void { ... }
```

**Environment variables** — always `import.meta.env`, never `process.env`:
```ts
const url = import.meta.env.VITE_SUPABASE_URL;
```

---

## Immutability and State Updates

- Spread operator for immutable state updates:
```ts
_state = { ..._state, elements: newElements };
```

- `new Map(existing)` pattern when updating Map-based state:
```ts
const next = new Map(_state.elementMap);
next.set(el.id, el);
_state = { ..._state, elementMap: next };
```

- **Never mutate state directly.** Always create a new object.

---

## Comment Style

**Section headers** — short, title-cased labels above related fields:
```ts
// Body-drag state
private _dragStart: Point | null = null;
private _isDragging = false;
```

**Phase markers** for complex methods:
```ts
// ── Phase 1: check handles ──
// ── Phase 2: check body ──
// ── Phase 3: check marquee ──
```

**JSDoc blocks** only for public-facing, non-obvious functions:
```ts
/**
 * Wraps text into lines that fit within maxWidth using the given font.
 * Returns an array of line strings.
 */
export function wrapTextLines(text: string, font: string, maxWidth: number): string[] { ... }
```

- Comments explain **why** or clarify algorithm intent — not "what the code does".
- No commented-out dead code left in files.
