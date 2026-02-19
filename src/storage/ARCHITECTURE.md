# `src/storage/` — Persistence

---

## Files

| File | Purpose |
|------|---------|
| `serializer.ts` | `AppState` ↔ JSON (format v1) |
| `localStorage.ts` | Auto-save, export to file, import from file |

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

### Auto-Save

`initStorage()` is called once at app startup:

1. Reads `ceziladraw_state` from `localStorage`. If found and valid, loads it via `setAppState`.
2. Subscribes to `AppState` changes. On every change, **debounces** a save by 500 ms — only the last change within a burst is actually written.

```ts
subscribeToAppState(() => {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    localStorage.setItem(STORAGE_KEY, serializeState(getAppState()));
  }, 500);
});
```

### Export

`exportToJson()` serializes the current state and triggers a browser download of `ceziladraw.json`.

### Import

`importFromJson()` opens a file picker, reads the selected `.json` file, deserializes it, and calls `setAppState` — completely replacing the current canvas contents.
