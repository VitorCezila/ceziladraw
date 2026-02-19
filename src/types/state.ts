import type { DrawableElement } from './elements';
import type { Viewport } from './geometry';

export type ToolType =
  | 'select'
  | 'rectangle'
  | 'diamond'
  | 'ellipse'
  | 'arrow'
  | 'line'
  | 'text'
  | 'pencil'
  | 'hand';

export interface AppState {
  elements: Map<string, DrawableElement>;
  selectedIds: Set<string>;
}

export interface UIState {
  activeTool: ToolType;
  isDragging: boolean;
  dragStartX: number;
  dragStartY: number;
  pointerX: number;
  pointerY: number;
  editingElementId: string | null;
  provisionalElement: DrawableElement | null;
  viewport: Viewport;
}

export interface HistoryEntry {
  before: PartialAppState;
  after: PartialAppState;
}

export type PartialAppState = {
  elements?: Map<string, DrawableElement>;
  selectedIds?: Set<string>;
};
