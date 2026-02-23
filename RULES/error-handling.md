# Error Handling

Error handling conventions derived from actual patterns in the source. Every rule has a reference.

---

## Error Categories

| Category | When | Mechanism | Example |
|---|---|---|---|
| **Fatal (bootstrap)** | App cannot initialize | `_showError()` DOM overlay + reload button | DB connection fail at start |
| **Non-fatal (cloud sync)** | Supabase operation fails | `console.warn` + localStorage fallback | Save to cloud fails |
| **Silent (parse)** | JSON/deserialization fails | Return `null`; caller uses fallback | Invalid localStorage data |

---

## Console Log Format

Always prefix with the module name in brackets:

```ts
console.warn('[storage] cloud save failed, will retry on next change');
console.error('[db] failed to load board:', error);
console.warn('[bootstrap] Supabase unavailable, continuing in local mode');
```

- `console.warn` — recoverable, non-fatal errors
- `console.error` — actual failures (bootstrap errors, DB errors)
- `console.log` — dev-mode diagnostics only; avoid in production paths

---

## User-Facing Error Surfaces

**Bootstrap failure** — full-page overlay via `_showError()` (`src/main.ts:662`):
```ts
function _showError(): void {
  const el = document.createElement('div');
  el.id = 'app-error';
  // ... mounts a full-page overlay with a "Reload" button
  document.body.appendChild(el);
}
```

**Board load failure** — inline error state with "Try again" button (in board picker UI).

**Input validation** — CSS class toggle, no alerts:
```ts
input.classList.add('invalid');  // triggers red border via CSS
// Remove on fix:
input.addEventListener('input', () => input.classList.remove('invalid'));
```

**General rule**: user-facing messages are always generic — "Something went wrong" / "Please try again". Never expose technical details, stack traces, or raw error objects.

---

## Try/Catch Patterns

**Silent graceful degradation** (serializer):
```ts
// src/storage/serializer.ts
export function deserializeState(json: string): AppState | null {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed.elements)) return null;
    return buildState(parsed.elements);
  } catch {
    return null;  // caller uses empty canvas as fallback
  }
}
```

**Non-fatal with fallback** (cloud load):
```ts
// src/storage/localStorage.ts
async function loadFromCloud(): Promise<AppState | null> {
  try {
    return await db.loadBoard(boardId);
  } catch (err) {
    console.warn('[storage] cloud load failed, falling back to localStorage', err);
    return null;  // caller falls back to localStorage
  }
}
```

**Non-fatal with auto-retry** (cloud sync):
```ts
// src/storage/localStorage.ts
async function syncToCloud(state: AppState): Promise<void> {
  try {
    await db.saveBoard(boardId, state);
  } catch (err) {
    console.warn('[storage] cloud sync failed, will retry on next change', err);
    // no rethrow — debounced save will retry automatically on next state change
  }
}
```

**Bootstrap** — nested try/catch ensures loading overlay is always removed:
```ts
// src/bootstrap.ts
async function bootstrap(): Promise<void> {
  try {
    await initTheme();
    await initAuth(onAuth);
    // ...
    await main();
  } catch (err) {
    console.error('[bootstrap] fatal error:', err);
    _showError('Something went wrong. Please reload.');
  } finally {
    loadingOverlay.remove();  // always removed, even on failure
  }
}
```

---

## Recovery Patterns

| Failure | Recovery |
|---|---|
| Cloud load fails | Fall back to localStorage (written first on every save) |
| Cloud sync fails | Auto-retry on next user action (debounced 500ms) |
| Empty/invalid localStorage | Start with empty canvas — no crash |
| Failed board load | Show retry button; don't lock the user out |
| Auth state changes | Full page reload for clean state |

---

## Anti-Patterns to Avoid

- **Never throw** in non-fatal paths (cloud sync, serialization, auth state changes).
- **Never show raw error messages** or stack traces to users.
- **Never block the UI** while cloud operations are in-flight (fire-and-forget with `catch`).
- **Never use `alert()` or `confirm()`** — use the custom dialog system (`src/ui/dialog.ts`).
- **Never swallow errors silently** in bootstrap — fatal errors must reach `_showError()`.
- **Never retry infinitely** on repeated failures — let the debounced save handle retries naturally.
