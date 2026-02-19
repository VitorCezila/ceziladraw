import { getAppState, setAppState, subscribeToAppState } from '../state/appState';
import { serializeState, deserializeState } from './serializer';

const STORAGE_KEY = 'ceziladraw_state';
let _saveTimer: ReturnType<typeof setTimeout> | null = null;

export function initStorage(): void {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const state = deserializeState(saved);
    if (state) setAppState(state);
  }

  subscribeToAppState(() => {
    if (_saveTimer) clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, serializeState(getAppState()));
    }, 500);
  });
}

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
