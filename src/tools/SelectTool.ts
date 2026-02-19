import type { Tool } from './ToolManager';
import type { Renderer } from '../renderer/Renderer';
import type { Point, BoundingBox } from '../types/geometry';
import type { DrawableElement, TextElement, ArrowElement, LineElement, PencilElement } from '../types/elements';
import { getAppState, setAppState, removeElements } from '../state/appState';
import { getUIState } from '../state/uiState';
import { getSortedElements } from '../state/selectors';
import { hitTestElement, hitTestElementForHover } from '../geometry/hitDetection';
import { elementIntersectsMarquee } from '../geometry/selection';
import { pushHistory, snapshotElements } from '../state/history';
import {
  getHandleAtPoint,
  applyResize,
  type HandleHit,
  type ResizeHandleIndex,
} from '../geometry/handles';
import { computeTextHeight } from '../utils/textLayout';

export class SelectTool implements Tool {
  private renderer: Renderer;
  private _onEditText: (el: TextElement) => void;

  // Body-drag state
  private _isDragging = false;
  private _dragStartWorld: Point = { x: 0, y: 0 };
  private _elementStartPositions = new Map<string, { x: number; y: number }>();
  private _pointsStartPositions = new Map<string, Point[]>();

  // Marquee state
  private _isMarquee = false;
  private _marqueeStart: Point = { x: 0, y: 0 };

  // Resize state
  private _activeHandle: HandleHit | null = null;
  private _resizeStartEl: DrawableElement | null = null;
  private _resizingId: string | null = null;

  // Rotation state
  private _isRotating = false;
  private _rotatingId: string | null = null;
  private _rotateCx = 0;
  private _rotateCy = 0;
  private _rotateStartPointerAngle = 0;
  private _rotateStartElAngle = 0;

  // Snapshot before any operation (for history)
  private _beforeSnapshot: Map<string, DrawableElement> | null = null;
  // Tracks whether any element was actually mutated in this gesture
  private _elementsMutated = false;

  constructor(renderer: Renderer, onEditText: (el: TextElement) => void = () => {}) {
    this.renderer = renderer;
    this._onEditText = onEditText;
  }

  onDoubleClick(point: Point, _e: PointerEvent): void {
    const { zoom } = getUIState().viewport;
    const elements = getSortedElements().reverse();
    const hit = elements.find((el) => el.type === 'text' && hitTestElement(el, point, zoom));
    if (hit) {
      this._onEditText(hit as TextElement);
    }
  }

  onPointerDown(point: Point, e: PointerEvent): void {
    const { zoom } = getUIState().viewport;

    // ── Phase 1: check handles on currently selected elements ──
    const selectedEls = getSortedElements()
      .reverse()
      .filter((el) => getAppState().selectedIds.has(el.id));

    for (const el of selectedEls) {
      const handle = getHandleAtPoint(el, point, zoom);
      if (handle) {
        this._beforeSnapshot = snapshotElements();
        if (handle.type === 'rotate') {
          this._startRotate(el, point);
        } else {
          this._startResize(el, handle);
        }
        this.renderer.renderInteraction(null);
        return;
      }
    }

    // ── Phase 2: body hit test ──
    // Uses hitTestElementForHover so that unfilled shapes are only selectable by their border
    const elements = getSortedElements().reverse();
    const hit = elements.find((el) => hitTestElementForHover(el, point, zoom));

    if (hit) {
      if (e.shiftKey) {
        const ids = new Set(getAppState().selectedIds);
        ids.has(hit.id) ? ids.delete(hit.id) : ids.add(hit.id);
        setAppState({ selectedIds: ids });
      } else {
        if (!getAppState().selectedIds.has(hit.id)) {
          setAppState({ selectedIds: new Set([hit.id]) });
        }
      }

      this._isDragging = true;
      this._dragStartWorld = { ...point };
      this._beforeSnapshot = snapshotElements();

      getAppState().selectedIds.forEach((id) => {
        const el = getAppState().elements.get(id);
        if (!el) return;
        this._elementStartPositions.set(id, { x: el.x, y: el.y });
        if (el.type === 'arrow' || el.type === 'line' || el.type === 'pencil') {
          this._pointsStartPositions.set(
            id,
            (el as ArrowElement | LineElement | PencilElement).points.map((p) => ({ ...p })),
          );
        }
      });
    } else {
      if (!e.shiftKey) setAppState({ selectedIds: new Set() });
      this._isMarquee = true;
      this._marqueeStart = { ...point };
    }

    this.renderer.renderInteraction(null);
  }

  private _startResize(
    el: DrawableElement,
    handle: { type: 'resize'; index: ResizeHandleIndex },
  ): void {
    this._activeHandle = handle;
    this._resizeStartEl = { ...el } as DrawableElement;
    this._resizingId = el.id;
    setAppState({ selectedIds: new Set([el.id]) });
  }

  private _startRotate(el: DrawableElement, point: Point): void {
    this._isRotating = true;
    this._rotatingId = el.id;
    this._rotateCx = el.x + el.width / 2;
    this._rotateCy = el.y + el.height / 2;
    this._rotateStartPointerAngle = Math.atan2(
      point.y - this._rotateCy,
      point.x - this._rotateCx,
    );
    this._rotateStartElAngle = el.angle;
    setAppState({ selectedIds: new Set([el.id]) });
  }

  onPointerMove(point: Point, _e: PointerEvent): void {
    // ── Resize ──
    if (
      this._activeHandle?.type === 'resize' &&
      this._resizeStartEl !== null &&
      this._resizingId !== null
    ) {
      this._elementsMutated = true;
      let newGeom = applyResize(
        this._resizeStartEl,
        this._activeHandle.index,
        point,
      );
      const el = getAppState().elements.get(this._resizingId);
      if (el) {
        if (el.type === 'text') {
          const startTextEl = this._resizeStartEl as TextElement;
          const widthRatio = newGeom.width / startTextEl.width;
          const newFontSize = Math.max(8, Math.round(startTextEl.fontSize * widthRatio));
          const newHeight = computeTextHeight(
            startTextEl.text, newGeom.width, newFontSize, startTextEl.fontFamily,
          );
          const elements = new Map(getAppState().elements);
          elements.set(this._resizingId, {
            ...el, ...newGeom, height: newHeight, fontSize: newFontSize,
          } as DrawableElement);
          setAppState({ elements });
          this.renderer.renderScene();
          this.renderer.renderInteraction(null);
          return;
        }
        const elements = new Map(getAppState().elements);
        elements.set(this._resizingId, { ...el, ...newGeom });
        setAppState({ elements });
      }
      this.renderer.renderScene();
      this.renderer.renderInteraction(null);
      return;
    }

    // ── Rotation ──
    if (this._isRotating && this._rotatingId) {
      this._elementsMutated = true;
      const el = getAppState().elements.get(this._rotatingId);
      if (el) {
        const currentAngle = Math.atan2(
          point.y - this._rotateCy,
          point.x - this._rotateCx,
        );
        const delta = currentAngle - this._rotateStartPointerAngle;
        const elements = new Map(getAppState().elements);
        elements.set(this._rotatingId, {
          ...el,
          angle: this._rotateStartElAngle + delta,
        });
        setAppState({ elements });
      }
      this.renderer.renderScene();
      this.renderer.renderInteraction(null);
      return;
    }

    // ── Body drag ──
    if (this._isDragging) {
      const dx = point.x - this._dragStartWorld.x;
      const dy = point.y - this._dragStartWorld.y;
      if (dx !== 0 || dy !== 0) this._elementsMutated = true;

      getAppState().selectedIds.forEach((id) => {
        const start = this._elementStartPositions.get(id);
        if (!start) return;
        const el = getAppState().elements.get(id);
        if (!el) return;
        const startPts = this._pointsStartPositions.get(id);
        const newEl = startPts
          ? {
              ...el,
              x: start.x + dx,
              y: start.y + dy,
              points: startPts.map((p) => ({ x: p.x + dx, y: p.y + dy })),
            }
          : { ...el, x: start.x + dx, y: start.y + dy };
        const elements = new Map(getAppState().elements);
        elements.set(id, newEl as DrawableElement);
        setAppState({ elements });
      });

      this.renderer.renderScene();
      this.renderer.renderInteraction(null);
      return;
    }

    // ── Marquee ──
    if (this._isMarquee) {
      const marquee: BoundingBox = {
        minX: Math.min(this._marqueeStart.x, point.x),
        minY: Math.min(this._marqueeStart.y, point.y),
        maxX: Math.max(this._marqueeStart.x, point.x),
        maxY: Math.max(this._marqueeStart.y, point.y),
      };
      const hits = getSortedElements().filter((el) =>
        elementIntersectsMarquee(el, marquee),
      );
      setAppState({ selectedIds: new Set(hits.map((el) => el.id)) });
      this.renderer.renderInteraction(marquee);
    }
  }

  onPointerUp(_point: Point, _e: PointerEvent): void {
    if (this._elementsMutated && this._beforeSnapshot) {
      const afterSnapshot = snapshotElements();
      pushHistory(
        { elements: this._beforeSnapshot },
        { elements: afterSnapshot },
      );
    }

    this._reset();
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
    this._reset();
  }

  private _reset(): void {
    this._isDragging = false;
    this._isMarquee = false;
    this._elementStartPositions.clear();
    this._pointsStartPositions.clear();
    this._beforeSnapshot = null;
    this._elementsMutated = false;
    this._activeHandle = null;
    this._resizeStartEl = null;
    this._resizingId = null;
    this._isRotating = false;
    this._rotatingId = null;
  }
}
