/**
 * Persistence layer — localStorage (always) + Supabase cloud (when configured).
 *
 * Strategy:
 * 1. On load: try cloud first, fall back to localStorage if offline/unauthenticated.
 * 2. On save (debounced 500 ms): write localStorage immediately (optimistic),
 *    then sync to Supabase in the background.
 * 3. If the cloud write fails, we retry on the next save cycle. We never block the
 *    UI on a network round-trip.
 */

import { getAppState, setAppState, subscribeToAppState } from '../state/appState';
import { getUIState } from '../state/uiState';
import { serializeState, deserializeState } from './serializer';
import { SUPABASE_ENABLED } from '../lib/supabase';
import { loadBoardData, saveBoardData } from '../lib/db';

const STORAGE_KEY = 'ceziladraw_state';
let _saveTimer: ReturnType<typeof setTimeout> | null = null;

// ── Init ───────────────────────────────────────────────────

/**
 * Loads the initial board state. Called once after auth resolves.
 * Pass `boardId` when Supabase is configured.
 */
export async function initStorage(boardId: string | null = null): Promise<void> {
  const loaded = await _loadState(boardId);
  if (loaded) setAppState(loaded);

  subscribeToAppState(() => {
    // Immediate localStorage write (never blocks)
    localStorage.setItem(STORAGE_KEY, serializeState(getAppState()));

    // Debounced cloud sync
    if (_saveTimer) clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => _syncToCloud(), 500);
  });
}

// ── Load ───────────────────────────────────────────────────

async function _loadState(boardId: string | null): Promise<ReturnType<typeof deserializeState>> {
  // Try cloud when we have a board ID
  if (SUPABASE_ENABLED && boardId) {
    try {
      const data = await loadBoardData(boardId);
      if (data) {
        const state = deserializeState(JSON.stringify(data));
        if (state) return state;
      }
    } catch (err) {
      console.warn('[storage] Cloud load failed, falling back to localStorage:', err);
    }
  }

  // Fall back to localStorage
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return deserializeState(saved);

  return null;
}

// ── Cloud sync ─────────────────────────────────────────────

async function _syncToCloud(): Promise<void> {
  if (!SUPABASE_ENABLED) return;

  const { currentBoardId } = getUIState();
  if (!currentBoardId) return;

  const state = getAppState();
  const serialized = JSON.parse(serializeState(state));

  try {
    await saveBoardData(currentBoardId, serialized, state.elements.size);
  } catch (err) {
    // Non-fatal: the data is safe in localStorage; will retry on next save
    console.warn('[storage] Cloud sync failed (will retry):', err);
  }
}

// ── Export / Import ────────────────────────────────────────

export function exportToJson(): void {
  const data = serializeState(getAppState());
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ceziladraw.json';
  a.click();
  URL.revokeObjectURL(url);
}

export function importFromJson(): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const state = deserializeState(reader.result as string);
      if (state) setAppState(state);
    };
    reader.readAsText(file);
  });
  input.click();
}
