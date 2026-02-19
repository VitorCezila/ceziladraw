import type { Renderer } from '../renderer/Renderer';
import type { DiamondElement } from '../types/elements';
import { RectangleTool } from './RectangleTool';
import { getUIState } from '../state/uiState';
import { generateId, generateSeed } from '../utils/id';
import { DEFAULT_STYLE } from '../types/elements';
import { getMaxZIndex } from '../state/selectors';

export class DiamondTool extends RectangleTool {
  constructor(renderer: Renderer) {
    super(renderer);
    this._elementType = 'diamond';
  }

  protected override _makeElement(x: number, y: number, w: number, h: number): DiamondElement {
    const { provisionalElement } = getUIState();
    return {
      id: provisionalElement?.id ?? generateId(),
      type: 'diamond',
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
