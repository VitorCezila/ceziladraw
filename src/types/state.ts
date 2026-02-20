import type { DrawableElement, StyleObject } from './elements';
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
  activeStyle: StyleObject;
  /** Active board ID when Supabase is configured; null in local-only mode. */
  currentBoardId: string | null;
}

export interface HistoryEntry {
  before: PartialAppState;
  after: PartialAppState;
}

export type PartialAppState = {
  elements?: Map<string, DrawableElement>;
  selectedIds?: Set<string>;
};
