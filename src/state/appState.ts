import type { AppState } from '../types/state';
import type { DrawableElement } from '../types/elements';

let _state: AppState = {
  elements: new Map(),
  selectedIds: new Set(),
};

const _listeners = new Set<() => void>();

export function getAppState(): Readonly<AppState> {
  return _state;
}

export function setAppState(patch: Partial<AppState>): void {
  _state = { ..._state, ...patch };
  _notifyListeners();
}

export function addElement(element: DrawableElement): void {
  const elements = new Map(_state.elements);
  elements.set(element.id, element);
  setAppState({ elements });
}

export function updateElement(id: string, patch: Partial<DrawableElement>): void {
  const existing = _state.elements.get(id);
  if (!existing) return;
  const elements = new Map(_state.elements);
  elements.set(id, { ...existing, ...patch, version: existing.version + 1 } as DrawableElement);
  setAppState({ elements });
}

export function removeElements(ids: string[]): void {
  const elements = new Map(_state.elements);
  ids.forEach((id) => elements.delete(id));
  const selectedIds = new Set(_state.selectedIds);
  ids.forEach((id) => selectedIds.delete(id));
  setAppState({ elements, selectedIds });
}

export function setSelectedIds(ids: Set<string>): void {
  setAppState({ selectedIds: ids });
}

export function subscribeToAppState(listener: () => void): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

function _notifyListeners(): void {
  _listeners.forEach((fn) => fn());
}
