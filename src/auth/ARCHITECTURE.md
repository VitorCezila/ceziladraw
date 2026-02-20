# `src/auth/` — Authentication Gate

Handles session check and Google OAuth sign-in. When Supabase is not configured, the auth gate is bypassed and the app runs in local-only mode.

---

## Files

| File | Purpose |
|------|---------|
| `authGate.ts` | `initAuth`, `showSignIn`, `signOut`, `getCurrentUser`; renders sign-in overlay on demand |

---

## Flow

```
initAuth(onAuth)
    │
    ├── !SUPABASE_ENABLED? → onAuth(null) immediately
    │
    ├── getSession()
    │   ├── session exists → _currentUser = user, onAuth(user)
    │   └── no session → onAuth(null) (guest mode; no overlay)
    │
    └── onAuthStateChange listener
        ├── session → _removeSignIn(), window.location.reload()
        └── no session → window.location.reload()
```

When the user clicks "Sign in" in the UI, the app calls `showSignIn()`, which renders the overlay. After OAuth redirect (or sign-out), the page reloads so bootstrap runs again with the new session state.

---

## API

| Function | Description |
|----------|-------------|
| `initAuth(onAuth)` | Checks session. Calls `onAuth(user)` when authenticated, or `onAuth(null)` when not (guest mode; overlay is not shown). |
| `showSignIn()` | Shows the sign-in overlay. Call this when the user explicitly chooses to sign in (e.g. "Sign in" button). Idempotent. |
| `signOut()` | Signs out via Supabase; `onAuthStateChange` fires and the page reloads. |
| `getCurrentUser()` | Returns the current `User` or `null`. |

---

## Sign-In Overlay

`_renderSignIn()` (used by `showSignIn()`) creates a full-screen `#auth-overlay` with:

- Title: "Ceziladraw"
- Subtitle: "A hand-drawn style canvas"
- Button: "Continue with Google" (Google logo SVG)
- Note: "Your boards are private and synced to your account."

Clicking the button calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })`. After the OAuth redirect, Supabase restores the session from the URL hash; `onAuthStateChange` fires and the page reloads so the next bootstrap loads cloud boards.

---

## Local-Only Mode

When `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is missing, `SUPABASE_ENABLED` is false. `initAuth` then calls `onAuth(null)` immediately without rendering any overlay. The app proceeds to `initBoardPicker(null)` and `initStorage(null)` — no auth, no cloud.
