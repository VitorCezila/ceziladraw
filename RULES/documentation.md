# Documentation

Documentation conventions derived from actual patterns in the source. Every rule has a reference.

---

## What to Document

- Every `src/*/` folder gets an `ARCHITECTURE.md` covering: public API, key algorithms, integration points, and design decisions.
- Complex functions with non-obvious algorithms get a JSDoc block above the function.
- State stores: document the observer pattern subscription API.
- Critical constraints (coordinate system, DPR handling, roughness seed): document in `CLAUDE.md` and the relevant folder `ARCHITECTURE.md`.

---

## What NOT to Document

- **Obvious code** — `// set the color` above `ctx.fillStyle = color` is noise, never signal.
- **Inline explanation of what TypeScript already says clearly** — types are documentation.
- **Commented-out code or TODO stubs** — delete the code, or open a GitHub issue.
- **Duplication** — don't repeat the same explanation in both `ARCHITECTURE.md` and source comments.

---

## ARCHITECTURE.md Format

Each per-folder `ARCHITECTURE.md` follows this structure:

1. **One-line purpose statement** — what this folder is responsible for.
2. **Public API table** — function/class → short description → file location.
3. **Key algorithms or data structures** — with ASCII diagrams or code snippets where helpful.
4. **Integration points** — what it imports from, who imports it.
5. **Design decisions and gotchas** — the "why" that isn't obvious from the code.

Example structure:
```markdown
# State

Manages all mutable application state with an observer pattern.

## Public API

| Export | Description | File |
|---|---|---|
| `getAppState()` | Returns the current state (readonly) | `appState.ts` |
| `subscribeToAppState(fn)` | Subscribe to state changes; returns unsubscribe fn | `appState.ts` |
| `getSortedElements()` | Elements sorted by zIndex ascending | `selectors.ts` |

## Observer Pattern

...

## Integration Points

Imported by: `renderer/`, `tools/`, `canvas/`, `storage/`

## Design Decisions

- State is a module-level singleton, not a class instance, to avoid passing it through constructors.
- `Readonly<T>` return type prevents accidental external mutations.
```

---

## Source Code Comments

**Section headers** — short, title-cased labels above groups of related fields:
```ts
// Body-drag state
private _dragStart: Point | null = null;
private _isDragging = false;
private _dragOrigins: Map<string, Point> = new Map();
```

**Phase markers** — divide complex methods into named, scannable phases:
```ts
onPointerDown(point: Point, e: PointerEvent): void {
  // ── Phase 1: check handles ──
  const handle = this._hitTestHandles(point);
  if (handle) { ... return; }

  // ── Phase 2: check body ──
  const el = hitTestElement(point, state);
  if (el) { ... return; }

  // ── Phase 3: start marquee ──
  this._startMarquee(point);
}
```

**JSDoc blocks** — only for non-trivial public functions:
```ts
/**
 * Wraps text into lines that fit within maxWidth using the given font.
 * Uses a binary-search-style greedy algorithm. Returns an array of line strings.
 */
export function wrapTextLines(text: string, font: string, maxWidth: number): string[] { ... }
```

- Use `//` for section headers and inline notes.
- Use `// ── Phase N ──` to divide complex methods.
- Use `/** ... */` only for JSDoc on public, non-trivial functions.
- One-liners are fine; avoid multi-line `/* */` blocks unless writing JSDoc.

---

## README Structure

**Root README**:
- Project name + tagline
- Feature list (screenshots welcome)
- Tech stack summary
- Getting started (clone → install → dev)
- Available npm scripts
- Project structure with links to per-folder `ARCHITECTURE.md` files

**Not in README**: API reference (belongs in `ARCHITECTURE.md`), implementation details, internal architecture.

---

## CLAUDE.md

The root `CLAUDE.md` is the **single source of truth for AI assistants**. It contains:
- Tech stack and versions
- All npm commands
- Project structure overview
- Architecture patterns (data flow, two-layer canvas, coordinate system)
- State store reference table
- Element types and rendering model
- Environment variables
- Bootstrap sequence
- DB schema summary
- TypeScript conventions
- Tool keyboard shortcuts
- Common gotchas

Keep it accurate and up-to-date. It is AI context, not a tutorial — be terse and precise.

---

## Keeping Docs Current

| Change | Documentation to update |
|---|---|
| New module folder | Add `ARCHITECTURE.md` for it; link from README |
| Changed public API | Update the relevant `ARCHITECTURE.md` table |
| New element type | Update `src/types/ARCHITECTURE.md` and `src/tools/ARCHITECTURE.md` |
| New tool | Update `src/tools/ARCHITECTURE.md`; add keyboard shortcut to `CLAUDE.md` |
| New env variable | Add to `CLAUDE.md` and `.env.example` |
| New architectural pattern | Add to `CLAUDE.md` under "Architecture: Key Patterns" |
