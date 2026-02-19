import type { Tool } from './ToolManager';
import type { Renderer } from '../renderer/Renderer';
import type { Point } from '../types/geometry';
import type { RectangleElement, DiamondElement, EllipseElement } from '../types/elements';
import { getUIState, setProvisionalElement, setActiveTool } from '../state/uiState';
import { addElement } from '../state/appState';
import { pushHistory, snapshotElements } from '../state/history';
import { generateId, generateSeed } from '../utils/id';
import { DEFAULT_STYLE } from '../types/elements';
import { getMaxZIndex } from '../state/selectors';

export class RectangleTool implements Tool {
  protected renderer: Renderer;
  protected _startPoint: Point | null = null;
  protected _elementType: 'rectangle' | 'diamond' | 'ellipse' = 'rectangle';

  constructor(renderer: Renderer) {
    this.renderer = renderer;
  }

  onPointerDown(point: Point, _e: PointerEvent): void {
    this._startPoint = { ...point };
    const el = this._makeElement(point.x, point.y, 0, 0);
    setProvisionalElement(el);
  }

  onPointerMove(point: Point, e: PointerEvent): void {
    if (!this._startPoint) return;

    let x = Math.min(this._startPoint.x, point.x);
    let y = Math.min(this._startPoint.y, point.y);
    let w = Math.abs(point.x - this._startPoint.x);
    let h = Math.abs(point.y - this._startPoint.y);

    if (e.shiftKey) {
      const side = Math.min(w, h);
      w = side;
      h = side;
      x = point.x < this._startPoint.x ? this._startPoint.x - side : this._startPoint.x;
      y = point.y < this._startPoint.y ? this._startPoint.y - side : this._startPoint.y;
    }

    const el = this._makeElement(x, y, w, h);
    setProvisionalElement(el);
    this.renderer.renderInteraction(null);
  }

  onPointerUp(_point: Point, _e: PointerEvent): void {
    const { provisionalElement } = getUIState();
    if (!provisionalElement || provisionalElement.width < 2 || provisionalElement.height < 2) {
      setProvisionalElement(null);
      this._startPoint = null;
      return;
    }

    const before = snapshotElements();
    addElement(provisionalElement);
    pushHistory({ elements: before }, { elements: snapshotElements() });

    setProvisionalElement(null);
    this._startPoint = null;
    setActiveTool('select');

    this.renderer.renderScene();
    this.renderer.renderInteraction(null);
  }

  cancel(): void {
    setProvisionalElement(null);
    this._startPoint = null;
  }

  protected _makeElement(x: number, y: number, w: number, h: number): RectangleElement | DiamondElement | EllipseElement {
    const { provisionalElement } = getUIState();
    return {
      id: provisionalElement?.id ?? generateId(),
      type: 'rectangle',
      x, y, width: w, height: h,
      angle: 0,
      zIndex: getMaxZIndex() + 1,
      groupId: null,
      style: { ...DEFAULT_STYLE },
      version: 0,
      seed: provisionalElement?.seed ?? generateSeed(),
    };
  }
}
