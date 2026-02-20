# `src/utils/` — Pure Helpers

All utilities are pure functions (or nearly so — `textLayout.ts` uses a shared off-screen canvas). No imports from `state/`, `tools/`, or `renderer/`.

---

## Files

| File | Purpose |
|------|---------|
| `math.ts` | `clamp`, `lerp`, `distance`, `angleBetween` |
| `color.ts` | `hexToRgba`, `isTransparent`, `PALETTE` |
| `id.ts` | UUID v4 generator, roughjs seed generator |
| `textLayout.ts` | Word-wrapping and height calculation for text elements |
| `theme.ts` | Theme read/write, canvas background colors, default stroke color |

---

## `math.ts`

General numeric utilities used across geometry and rendering:

```ts
clamp(value, min, max): number
lerp(a, b, t): number
distance(x1, y1, x2, y2): number
angleBetween(p1, p2): number  // atan2-based angle in radians
```

---

## `color.ts`

### `isTransparent(color)`

Returns `true` for `'transparent'`, `'none'`, or `''`. Used by element renderers to skip the roughjs fill, and by hit detection to decide between full-body and border-only interaction.

### `hexToRgba(hex, alpha?)`

Converts a 6-digit hex string to `rgba(r, g, b, alpha)`. Used by renderers that need opacity control over a named color.

### `PALETTE`

Preset color arrays used by the properties panel stroke and fill swatches:

```ts
PALETTE.stroke  // 5 dark/neutral colors
PALETTE.fill    // 'transparent' + 8 pastel colors
```

---

## `id.ts`

```ts
generateId(): string   // crypto.randomUUID() or Math.random() fallback
generateSeed(): number // integer in [1, 2^31) for roughjs seed
```

The roughjs `seed` value is fixed at element creation and never changes, ensuring the hand-drawn jitter is stable across re-renders.

---

## `textLayout.ts`

Uses a shared 1×1 off-screen `<canvas>` context for font measurement — works outside any active render pass (e.g. during resize in `SelectTool`).

### `wrapTextLines(text, maxWidth, fontSize, fontFamily)` → `string[]`

Splits `text` into display lines that fit within `maxWidth` pixels:
- Respects explicit `\n` line breaks.
- Wraps at word boundaries.
- If a single word is wider than `maxWidth`, it is broken **character by character** so each line stays within the box. Prevents text overflow when typing long strings without spaces (e.g. "Saaaaaaaaaaaaaaaaaaaaaaaaaaaaaa").

### `computeTextHeight(text, maxWidth, fontSize, fontFamily)` → `number`

```ts
lines.length * fontSize * 1.4
```

The `1.4` factor gives a comfortable line height. Called by:
- `TextTool._commit` — to set the initial element height.
- `SelectTool.onPointerMove` — to recompute height after font size changes during resize.

---

## `theme.ts`

### Theme Storage

Theme is stored as `data-theme="dark|light"` on `<html>` and mirrored to `localStorage`.

`initTheme()` is called at app startup and restores the saved theme, falling back to the OS preference (`prefers-color-scheme`).

### Canvas Colors

```ts
getCanvasColors(): { background: string, dot: string }
```

O(1) DOM attribute read — called every frame by `SceneRenderer._drawBackground`, no caching needed.

### Default Stroke Color

```ts
getDefaultStrokeColor(): '#cdd6f4' (dark) | '#1e1e2e' (light)
```

Used to initialize `UIState.activeStyle.strokeColor` so that newly created elements are always readable on the current theme background.

### Theme Change Event

`setTheme` dispatches a `CustomEvent('themechange')` on `window`. `main.ts` listens for this to update `activeStyle.strokeColor` when the user toggles the theme.
