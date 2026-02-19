import type { Renderer } from '../renderer/Renderer';
import type { EllipseElement } from '../types/elements';
import { RectangleTool } from './RectangleTool';
import { getUIState } from '../state/uiState';
import { generateId, generateSeed } from '../utils/id';
import { DEFAULT_STYLE } from '../types/elements';
import { getMaxZIndex } from '../state/selectors';

export class EllipseTool extends RectangleTool {
  constructor(renderer: Renderer) {
    super(renderer);
    this._elementType = 'ellipse';
  }

  protected override _makeElement(x: number, y: number, w: number, h: number): EllipseElement {
    const { provisionalElement } = getUIState();
    return {
      id: provisionalElement?.id ?? generateId(),
      type: 'ellipse',
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
