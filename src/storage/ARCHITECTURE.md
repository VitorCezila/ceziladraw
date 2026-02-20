# `src/storage/` — Persistence

Persistence layer — localStorage (always) + Supabase cloud (when configured). Strategy: cloud-first on load; optimistic localStorage write + debounced cloud sync on save.

---

## Files

| File | Purpose |
|------|---------|
| `serializer.ts` | `AppState` ↔ JSON (format v1) |
| `localStorage.ts` | Load/save orchestration, cloud sync, export/import |

---

## Serialization (`serializer.ts`)

### Format

```json
{
  "version": 1,
  "elements": [ /* DrawableElement[] */ ]
}
```

`AppState.elements` is a `Map<string, DrawableElement>`. The serializer converts it to a plain array for JSON, and back to a `Map` on load.

`selectedIds` is never persisted — it is reset to an empty `Set` on every load.

### `serializeState(state)` → `string`

Converts the elements `Map` to an array and calls `JSON.stringify`.

### `deserializeState(json)` → `Partial<AppState> | null`

Parses JSON defensively — returns `null` on any error rather than throwing. Rebuilds the `Map` by keying on `element.id`.

---

## localStorage (`localStorage.ts`)

### Strategy

1. **On load**: Try cloud first when `boardId` is provided; fall back to `localStorage` if offline or unauthenticated.
2. **On save**: Write to `localStorage` immediately (optimistic). Debounce cloud sync by 500 ms — only the last change within a burst is actually sent.
3. **Cloud failure**: Non-fatal; data is safe in localStorage; will retry on next save cycle.

### `initStorage(boardId)`

Called once at app startup, after auth and board picker resolve.

1. **Load**: If `SUPABASE_ENABLED` and `boardId`, call `loadBoardData(boardId)`. On success, deserialize and `setAppState`. On failure or offline, fall back to `localStorage.getItem(STORAGE_KEY)`.
2. **Subscribe**: On every `AppState` change:
   - `localStorage.setItem(STORAGE_KEY, serializeState(getAppState()))` — immediate
   - Debounce 500 ms → `_syncToCloud()` — calls `saveBoardData(currentBoardId, serialized, elementCount)`

### `_syncToCloud()`

Runs only when `SUPABASE_ENABLED` and `currentBoardId` exist. Writes to `board_data` via `saveBoardData`. If the write fails, logs a warning; the next save cycle will retry.

### Export / Import

- **exportToJson()**: Serializes current state and triggers a browser download of `ceziladraw.json`.
- **importFromJson()**: Opens a file picker, reads the selected `.json` file, deserializes it, and calls `setAppState` — completely replacing the current canvas contents.

These are file-based only; no cloud involvement.
