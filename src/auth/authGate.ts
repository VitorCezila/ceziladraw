import type { User } from '@supabase/supabase-js';
import { supabase, SUPABASE_ENABLED } from '../lib/supabase';

export type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; user: User };

let _currentUser: User | null = null;

/**
 * Returns the currently authenticated user, or null in local-only mode.
 */
export function getCurrentUser(): User | null {
  return _currentUser;
}

/**
 * Initializes the auth gate.
 *
 * - If Supabase is not configured: resolves immediately and calls onAuth(null)
 *   so the app runs in local-only mode.
 * - If Supabase is configured: checks for an existing session (handles the
 *   OAuth redirect callback too). Calls onAuth(user) when authenticated, or
 *   renders the sign-in screen when not.
 */
export async function initAuth(
  onAuth: (user: User | null) => void,
): Promise<void> {
  if (!SUPABASE_ENABLED || !supabase) {
    onAuth(null);
    return;
  }

  // Handle the OAuth redirect (hash fragment from Google)
  const { data: sessionData } = await supabase.auth.getSession();

  if (sessionData.session) {
    _currentUser = sessionData.session.user;
    onAuth(_currentUser);
    return;
  }

  // No session — show the sign-in overlay
  _renderSignIn();

  // Listen for future auth state changes (after redirect)
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session) {
      _currentUser = session.user;
      _removeSignIn();
      onAuth(_currentUser);
    } else {
      _currentUser = null;
      _renderSignIn();
    }
  });
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

// ── Private helpers ────────────────────────────────────────

function _renderSignIn(): void {
  if (document.getElementById('auth-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'auth-overlay';
  overlay.innerHTML = `
    <div class="auth-card">
      <h1 class="auth-title">Ceziladraw</h1>
      <p class="auth-subtitle">A hand-drawn style canvas</p>
      <button id="btn-google-signin" class="auth-btn">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>
      <p class="auth-note">Your boards are private and synced to your account.</p>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('btn-google-signin')!.addEventListener('click', async () => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  });
}

function _removeSignIn(): void {
  document.getElementById('auth-overlay')?.remove();
}
