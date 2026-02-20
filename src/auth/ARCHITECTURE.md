# `src/auth/` — Authentication Gate

Handles session check and Google OAuth sign-in. When Supabase is not configured, the auth gate is bypassed and the app runs in local-only mode.

---

## Files

| File | Purpose |
|------|---------|
| `authGate.ts` | `initAuth`, `signOut`, `getCurrentUser`; renders sign-in overlay |

---

## Flow

```
initAuth(onAuth)
    │
    ├── !SUPABASE_ENABLED? → onAuth(null) immediately
    │
    ├── getSession()
    │   ├── session exists → _currentUser = user, onAuth(user)
    │   └── no session → _renderSignIn()
    │
    └── onAuthStateChange listener
        ├── session → _removeSignIn(), onAuth(user)
        └── signOut → _renderSignIn()
```

---

## API

| Function | Description |
|----------|-------------|
| `initAuth(onAuth)` | Checks session; if none, shows overlay. Calls `onAuth(user)` when authenticated (or `onAuth(null)` in local mode). |
| `signOut()` | Signs out via Supabase; triggers `onAuthStateChange` which re-renders the overlay. |
| `getCurrentUser()` | Returns the current `User` or `null`. |

---

## Sign-In Overlay

`_renderSignIn()` creates a full-screen `#auth-overlay` with:

- Title: "Ceziladraw"
- Subtitle: "A hand-drawn style canvas"
- Button: "Continue with Google" (Google logo SVG)
- Note: "Your boards are private and synced to your account."

Clicking the button calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })`. After the OAuth redirect, Supabase restores the session from the URL hash; `onAuthStateChange` fires and `onAuth(user)` is called.

---

## Local-Only Mode

When `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is missing, `SUPABASE_ENABLED` is false. `initAuth` then calls `onAuth(null)` immediately without rendering any overlay. The app proceeds to `initBoardPicker(null)` and `initStorage(null)` — no auth, no cloud.
