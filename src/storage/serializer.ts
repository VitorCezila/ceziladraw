import type { AppState } from '../types/state';
import type { DrawableElement } from '../types/elements';

interface SerializedState {
  version: number;
  elements: DrawableElement[];
}

export function serializeState(state: AppState): string {
  const payload: SerializedState = {
    version: 1,
    elements: Array.from(state.elements.values()),
  };
  return JSON.stringify(payload);
}

export function deserializeState(json: string): Partial<AppState> | null {
  try {
    const parsed: SerializedState = JSON.parse(json);
    if (!parsed || !Array.isArray(parsed.elements)) return null;
    const elements = new Map<string, DrawableElement>();
    for (const el of parsed.elements) {
      elements.set(el.id, el);
    }
    return { elements, selectedIds: new Set() };
  } catch {
    return null;
  }
}
