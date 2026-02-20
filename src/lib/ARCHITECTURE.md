# `src/lib/` — Supabase Client & DB Helpers

Infrastructure for cloud persistence. All functions are no-ops when Supabase is not configured.

---

## Files

| File | Purpose |
|------|---------|
| `supabase.ts` | Supabase client singleton, `SUPABASE_ENABLED` flag |
| `db.ts` | Typed helpers for workspaces, boards, and board data |

---

## `supabase.ts`

```ts
SUPABASE_ENABLED = Boolean(VITE_SUPABASE_URL && VITE_SUPABASE_ANON_KEY)
supabase = SUPABASE_ENABLED ? createClient(url, key) : null
```

When env vars are missing, `supabase` is `null` and the app runs in local-only mode.

---

## `db.ts` — Workspace Helpers

| Function | Description |
|----------|-------------|
| `getOrCreatePersonalWorkspace(userId)` | Returns the user's workspace; creates "My Workspace" on first login. |

---

## `db.ts` — Board Helpers

| Function | Description |
|----------|-------------|
| `listBoards(workspaceId)` | Returns boards in the workspace, ordered by `updated_at` desc. |
| `createBoard(workspaceId, name)` | Inserts a board and an empty `board_data` row. |
| `renameBoard(boardId, name)` | Updates the board name. |
| `deleteBoard(boardId)` | Deletes the board (cascade deletes `board_data`). |

---

## `db.ts` — Board Data Helpers

| Function | Description |
|----------|-------------|
| `loadBoardData(boardId)` | Fetches `board_data.elements` (JSONB) for the board. Returns `null` on error. |
| `saveBoardData(boardId, elements, elementCount)` | Upserts `board_data` and updates `boards.element_count` and `boards.updated_at`. |

The `elements` payload matches the output of `serializeState()` — `{ version: 1, elements: DrawableElement[] }`.

---

## No-Op Behavior

Every function checks `SUPABASE_ENABLED` at the start. When false, they return `null`, `[]`, or `void` without making network calls.
