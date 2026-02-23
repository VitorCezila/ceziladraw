# Security

Security conventions derived from actual patterns in the source. Every rule has a reference.

---

## Secrets Management

- Vite env vars accessed via `import.meta.env.VITE_*` — never `process.env`.
- The Supabase anon key is a public-by-design credential (Supabase architecture); it is safe to expose in client code because Row Level Security (RLS) is the real access control layer.
- `SUPABASE_ENABLED` flag gates all cloud code; requires **both** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to be present and non-empty.
- Never trust client-provided user IDs for DB operations — always use `auth.uid()` server-side in RLS policies and `SECURITY DEFINER` RPC functions.

```ts
// src/lib/supabase.ts
const SUPABASE_ENABLED =
  !!import.meta.env.VITE_SUPABASE_URL &&
  !!import.meta.env.VITE_SUPABASE_ANON_KEY;
```

---

## Input Validation

**Colors** — strict hex regex before applying to state:
```ts
// src/utils/color.ts
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
if (!HEX_COLOR_RE.test(value)) return;
```

**Text inputs** — `.trim()` + length > 0 before committing:
```ts
const trimmed = input.trim();
if (trimmed.length === 0) return;
```

**User-provided names** (board names, workspace names) — validated non-empty in dialog before submission.

**Deserialized data** (localStorage / cloud) — `deserializeState()` in `src/storage/serializer.ts:17` checks `Array.isArray(parsed.elements)` and returns `null` on failure. It never throws.

```ts
// src/storage/serializer.ts
export function deserializeState(json: string): AppState | null {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed.elements)) return null;
    // ...
  } catch {
    return null;
  }
}
```

---

## Output Encoding / XSS Prevention

**Drawing text** — rendered via Canvas 2D `fillText()`, not DOM. No XSS risk.

**User-provided strings inserted into `innerHTML`** — must be HTML-escaped using the `_esc()` pattern from `src/ui/boardPicker.ts:298`:
```ts
// src/ui/boardPicker.ts
function _esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Usage — safe interpolation:
li.innerHTML = `<span class="board-name">${_esc(board.name)}</span>`;
```

**Dialog title/message** — always `textContent`, never `innerHTML` (`src/ui/dialog.ts:93`):
```ts
titleEl.textContent = options.title;
messageEl.textContent = options.message;
```

**Static SVG paths** — hardcoded strings only, never interpolate user data.

**Rule of thumb**: prefer `document.createElement` + `textContent` over `innerHTML`. Only use `innerHTML` for trusted, static markup or after escaping with `_esc()`.

---

## Authentication and Authorization

- Session management delegated entirely to the Supabase SDK — no manual token handling.
- **Full page reload** on auth state change (ensures clean state, no stale references).
- **Guest mode always allowed** — Supabase features are opt-in. Drawing saves to localStorage when not signed in.
- `SECURITY DEFINER` RPC functions validate `auth.uid()` server-side before any INSERT.
- All Supabase tables have **RLS enabled** — no client-side permission checks are needed or trusted.

```sql
-- supabase/migrations/
-- boards RLS: member access only
CREATE POLICY "members can read boards"
  ON boards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = boards.workspace_id
        AND user_id = auth.uid()
    )
  );
```

---

## Dependencies

- No new dependencies without a strong reason — the project is intentionally dependency-light.
- Runtime dependencies: **Rough.js** (sketchy rendering), **Supabase JS SDK** (cloud sync).
- Everything else is vanilla TypeScript + Canvas 2D.
- Before adding a library: check if the need can be met with ~20 lines of vanilla code.
