import type { UIState, ToolType } from '../types/state';
import type { DrawableElement } from '../types/elements';
import type { Viewport } from '../types/geometry';

let _state: UIState = {
  activeTool: 'select',
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  pointerX: 0,
  pointerY: 0,
  editingElementId: null,
  provisionalElement: null,
  viewport: { x: 0, y: 0, zoom: 1 },
};

const _listeners = new Set<() => void>();

export function getUIState(): Readonly<UIState> {
  return _state;
}

export function setUIState(patch: Partial<UIState>): void {
  _state = { ..._state, ...patch };
  _notifyListeners();
}

export function setActiveTool(tool: ToolType): void {
  setUIState({ activeTool: tool, provisionalElement: null });
}

export function setProvisionalElement(element: DrawableElement | null): void {
  setUIState({ provisionalElement: element });
}

export function setViewport(viewport: Partial<Viewport>): void {
  setUIState({ viewport: { ..._state.viewport, ...viewport } });
}

export function subscribeToUIState(listener: () => void): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

function _notifyListeners(): void {
  _listeners.forEach((fn) => fn());
}
