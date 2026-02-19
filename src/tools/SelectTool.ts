import type { Tool } from './ToolManager';
import type { Renderer } from '../renderer/Renderer';
import type { Point, BoundingBox } from '../types/geometry';
import type { DrawableElement } from '../types/elements';
import { getAppState, setAppState, removeElements } from '../state/appState';
import { getUIState } from '../state/uiState';
import { getSortedElements } from '../state/selectors';
import { hitTestElement } from '../geometry/hitDetection';
import { elementIntersectsMarquee } from '../geometry/selection';
import { pushHistory, snapshotElements } from '../state/history';

export class SelectTool implements Tool {
  private renderer: Renderer;
  private _isDragging = false;
  private _isMarquee = false;
  private _dragStartWorld: Point = { x: 0, y: 0 };
  private _elementStartPositions = new Map<string, { x: number; y: number }>();
  private _marqueeStart: Point = { x: 0, y: 0 };
  private _beforeSnapshot: Map<string, DrawableElement> | null = null;

  constructor(renderer: Renderer) {
    this.renderer = renderer;
  }

  onPointerDown(point: Point, e: PointerEvent): void {
    const { zoom } = getUIState().viewport;
    const elements = getSortedElements().reverse();
    const hit = elements.find((el) => hitTestElement(el, point, zoom));

    if (hit) {
      if (e.shiftKey) {

        const ids = new Set(getAppState().selectedIds);
        ids.has(hit.id) ? ids.delete(hit.id) : ids.add(hit.id);
        setAppState({ selectedIds: ids });
      } else {
        const ids = getAppState().selectedIds;
        if (!ids.has(hit.id)) {
          setAppState({ selectedIds: new Set([hit.id]) });
        }
      }

      this._isDragging = true;
      this._isMarquee = false;
      this._dragStartWorld = { ...point };
      this._beforeSnapshot = snapshotElements();

      getAppState().selectedIds.forEach((id) => {
        const el = getAppState().elements.get(id);
        if (el) this._elementStartPositions.set(id, { x: el.x, y: el.y });
      });
    } else {
      if (!e.shiftKey) {
        setAppState({ selectedIds: new Set() });
      }
      this._isMarquee = true;
      this._isDragging = false;
      this._marqueeStart = { ...point };
    }

    this.renderer.renderInteraction(null);
  }

  onPointerMove(point: Point, _e: PointerEvent): void {
    if (this._isDragging) {
      const dx = point.x - this._dragStartWorld.x;
      const dy = point.y - this._dragStartWorld.y;

      getAppState().selectedIds.forEach((id) => {
        const start = this._elementStartPositions.get(id);
        if (!start) return;
        const el = getAppState().elements.get(id);
        if (!el) return;
        const elements = new Map(getAppState().elements);
        elements.set(id, { ...el, x: start.x + dx, y: start.y + dy });
        setAppState({ elements });
      });

      this.renderer.renderInteraction(null);
    } else if (this._isMarquee) {
      const marquee: BoundingBox = {
        minX: Math.min(this._marqueeStart.x, point.x),
        minY: Math.min(this._marqueeStart.y, point.y),
        maxX: Math.max(this._marqueeStart.x, point.x),
        maxY: Math.max(this._marqueeStart.y, point.y),
      };

      const hits = getSortedElements().filter((el) => elementIntersectsMarquee(el, marquee));
      setAppState({ selectedIds: new Set(hits.map((el) => el.id)) });
      this.renderer.renderInteraction(marquee);
    }
  }

  onPointerUp(_point: Point, _e: PointerEvent): void {
    if (this._isDragging && this._beforeSnapshot) {
      const afterSnapshot = snapshotElements();
      pushHistory({ elements: this._beforeSnapshot }, { elements: afterSnapshot });
    }

    this._isDragging = false;
    this._isMarquee = false;
    this._elementStartPositions.clear();
    this._beforeSnapshot = null;

    this.renderer.renderScene();
    this.renderer.renderInteraction(null);
  }

  onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const ids = Array.from(getAppState().selectedIds);
      if (ids.length === 0) return;
      const before = snapshotElements();
      removeElements(ids);
      pushHistory({ elements: before }, { elements: snapshotElements() });
      this.renderer.renderScene();
      this.renderer.renderInteraction(null);
    }

    if (e.key === 'Escape') {
      setAppState({ selectedIds: new Set() });
      this.renderer.renderInteraction(null);
    }
  }

  cancel(): void {
    this._isDragging = false;
    this._isMarquee = false;
    this._elementStartPositions.clear();
  }
}
