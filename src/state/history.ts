import type { HistoryEntry, PartialAppState } from '../types/state';
import { getAppState, setAppState } from './appState';
import type { DrawableElement } from '../types/elements';

const MAX_HISTORY = 100;

const _undoStack: HistoryEntry[] = [];
const _redoStack: HistoryEntry[] = [];

const _listeners = new Set<() => void>();

export function pushHistory(before: PartialAppState, after: PartialAppState): void {
  _undoStack.push({ before, after });
  if (_undoStack.length > MAX_HISTORY) {
    _undoStack.shift();
  }
  _redoStack.length = 0;
  _notifyListeners();
}

export function undo(): void {
  const entry = _undoStack.pop();
  if (!entry) return;
  _redoStack.push(entry);
  _applyPatch(entry.before);
  _notifyListeners();
}

export function redo(): void {
  const entry = _redoStack.pop();
  if (!entry) return;
  _undoStack.push(entry);
  _applyPatch(entry.after);
  _notifyListeners();
}

export function canUndo(): boolean {
  return _undoStack.length > 0;
}

export function canRedo(): boolean {
  return _redoStack.length > 0;
}

export function snapshotElements(): Map<string, DrawableElement> {
  return new Map(getAppState().elements);
}

export function subscribeToHistory(listener: () => void): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

function _applyPatch(patch: PartialAppState): void {
  const current = getAppState();
  setAppState({
    elements: patch.elements !== undefined ? new Map(patch.elements) : current.elements,
    selectedIds: patch.selectedIds !== undefined ? new Set(patch.selectedIds) : current.selectedIds,
  });
}

function _notifyListeners(): void {
  _listeners.forEach((fn) => fn());
}
