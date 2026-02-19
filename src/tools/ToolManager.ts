import type { ToolType } from '../types/state';
import type { Renderer } from '../renderer/Renderer';
import type { Point } from '../types/geometry';
import { getUIState, setActiveTool } from '../state/uiState';
import { SelectTool } from './SelectTool';
import { RectangleTool } from './RectangleTool';
import { DiamondTool } from './DiamondTool';
import { EllipseTool } from './EllipseTool';
import { ArrowTool } from './ArrowTool';
import { LineTool } from './LineTool';
import { TextTool } from './TextTool';

export interface Tool {
  onPointerDown(point: Point, e: PointerEvent): void;
  onPointerMove(point: Point, e: PointerEvent): void;
  onPointerUp(point: Point, e: PointerEvent): void;
  onKeyDown?(e: KeyboardEvent): void;
  cancel(): void;
}

export class ToolManager {
  private tools: Record<ToolType, Tool>;

  constructor(renderer: Renderer, textContainer: HTMLElement) {
    this.tools = {
      select: new SelectTool(renderer),
      rectangle: new RectangleTool(renderer),
      diamond: new DiamondTool(renderer),
      ellipse: new EllipseTool(renderer),
      arrow: new ArrowTool(renderer),
      line: new LineTool(renderer),
      text: new TextTool(renderer, textContainer),
    };
  }

  getActiveTool(): Tool {
    return this.tools[getUIState().activeTool];
  }

  setTool(tool: ToolType): void {
    this.getActiveTool().cancel();
    setActiveTool(tool);
  }

  onPointerDown(point: Point, e: PointerEvent): void {
    this.getActiveTool().onPointerDown(point, e);
  }

  onPointerMove(point: Point, e: PointerEvent): void {
    this.getActiveTool().onPointerMove(point, e);
  }

  onPointerUp(point: Point, e: PointerEvent): void {
    this.getActiveTool().onPointerUp(point, e);
  }

  onKeyDown(e: KeyboardEvent): void {
    this.getActiveTool().onKeyDown?.(e);
  }
}
