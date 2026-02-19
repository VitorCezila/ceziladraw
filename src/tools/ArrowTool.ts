import type { Tool } from './ToolManager';
import type { Renderer } from '../renderer/Renderer';
import type { Point } from '../types/geometry';
import type { ArrowElement } from '../types/elements';
import { setProvisionalElement, setActiveTool, getUIState } from '../state/uiState';
import { addElement } from '../state/appState';
import { pushHistory, snapshotElements } from '../state/history';
import { generateId, generateSeed } from '../utils/id';
import { getMaxZIndex } from '../state/selectors';

export class ArrowTool implements Tool {
  private renderer: Renderer;
  private _startPoint: Point | null = null;

  constructor(renderer: Renderer) {
    this.renderer = renderer;
  }

  onPointerDown(point: Point, _e: PointerEvent): void {
    this._startPoint = { ...point };
    setProvisionalElement(this._makeArrow([{ ...point }, { ...point }]));
  }

  onPointerMove(point: Point, _e: PointerEvent): void {
    if (!this._startPoint) return;
    setProvisionalElement(this._makeArrow([{ ...this._startPoint }, { ...point }]));
    this.renderer.renderInteraction(null);
  }

  onPointerUp(_point: Point, _e: PointerEvent): void {
    const { provisionalElement } = getUIState();
    if (!provisionalElement) return;

    const arrow = provisionalElement as ArrowElement;
    const dx = arrow.points[1].x - arrow.points[0].x;
    const dy = arrow.points[1].y - arrow.points[0].y;
    if (Math.sqrt(dx * dx + dy * dy) < 5) {
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

  private _makeArrow(points: Point[]): ArrowElement {
    const { provisionalElement } = getUIState();
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    return {
      id: provisionalElement?.id ?? generateId(),
      type: 'arrow',
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.abs(xs[1] - xs[0]),
      height: Math.abs(ys[1] - ys[0]),
      angle: 0,
      zIndex: getMaxZIndex() + 1,
      groupId: null,
      style: { ...getUIState().activeStyle },
      version: 0,
      seed: provisionalElement?.seed ?? generateSeed(),
      startId: null,
      endId: null,
      points,
      curve: 'linear',
      startArrowhead: 'none',
      endArrowhead: 'arrow',
    };
  }
}
