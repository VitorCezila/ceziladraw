import type { Tool } from './ToolManager';
import type { Renderer } from '../renderer/Renderer';
import type { Point } from '../types/geometry';
import type { PencilElement } from '../types/elements';
import { setProvisionalElement, setActiveTool, getUIState } from '../state/uiState';
import { addElement } from '../state/appState';
import { pushHistory, snapshotElements } from '../state/history';
import { generateId, generateSeed } from '../utils/id';
import { getMaxZIndex } from '../state/selectors';

export class PencilTool implements Tool {
  private renderer: Renderer;
  private _isDrawing = false;

  constructor(renderer: Renderer) {
    this.renderer = renderer;
  }

  onPointerDown(point: Point, _e: PointerEvent): void {
    this._isDrawing = true;
    const el = this._makeElement([{ ...point }]);
    setProvisionalElement(el);
  }

  onPointerMove(point: Point, _e: PointerEvent): void {
    if (!this._isDrawing) return;
    const { provisionalElement } = getUIState();
    if (!provisionalElement || provisionalElement.type !== 'pencil') return;

    const pencil = provisionalElement as PencilElement;
    const lastPoint = pencil.points[pencil.points.length - 1];

    const dx = point.x - lastPoint.x;
    const dy = point.y - lastPoint.y;
    if (dx * dx + dy * dy < 4) return;

    const newPoints = [...pencil.points, { ...point }];
    const xs = newPoints.map((p) => p.x);
    const ys = newPoints.map((p) => p.y);

    setProvisionalElement({
      ...pencil,
      points: newPoints,
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    });

    this.renderer.renderInteraction(null);
  }

  onPointerUp(_point: Point, _e: PointerEvent): void {
    if (!this._isDrawing) return;
    this._isDrawing = false;

    const { provisionalElement } = getUIState();
    if (!provisionalElement || provisionalElement.type !== 'pencil') return;

    const pencil = provisionalElement as PencilElement;
    if (pencil.points.length < 2) {
      setProvisionalElement(null);
      return;
    }

    const before = snapshotElements();
    addElement(pencil);
    pushHistory({ elements: before }, { elements: snapshotElements() });

    setProvisionalElement(null);
    setActiveTool('select');

    this.renderer.renderScene();
    this.renderer.renderInteraction(null);
  }

  cancel(): void {
    this._isDrawing = false;
    setProvisionalElement(null);
  }

  private _makeElement(points: Point[]): PencilElement {
    const { provisionalElement } = getUIState();
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    return {
      id: provisionalElement?.id ?? generateId(),
      type: 'pencil',
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
      angle: 0,
      zIndex: getMaxZIndex() + 1,
      groupId: null,
      style: {
        ...getUIState().activeStyle,
        fillColor: 'transparent',
        fillStyle: 'none',
        roughness: 0,
      },
      version: 0,
      seed: provisionalElement?.seed ?? generateSeed(),
      points,
      smoothing: 0,
    };
  }
}
