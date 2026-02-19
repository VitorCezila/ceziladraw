import type { Tool } from './ToolManager';
import type { Renderer } from '../renderer/Renderer';
import type { Point } from '../types/geometry';
import { getUIState, setViewport } from '../state/uiState';

export class HandTool implements Tool {
  private renderer: Renderer;
  private _isDown = false;
  private _container: HTMLElement | null = null;

  constructor(renderer: Renderer, container: HTMLElement) {
    this.renderer = renderer;
    this._container = container;
  }

  onPointerDown(_point: Point, _e: PointerEvent): void {
    this._isDown = true;
    this._container?.classList.add('dragging');
  }

  onPointerMove(_point: Point, e: PointerEvent): void {
    if (!this._isDown) return;
    const { viewport } = getUIState();
    setViewport({
      x: viewport.x + e.movementX,
      y: viewport.y + e.movementY,
    });
    this.renderer.requestFullRender();
  }

  onPointerUp(_point: Point, _e: PointerEvent): void {
    this._isDown = false;
    this._container?.classList.remove('dragging');
  }

  cancel(): void {
    this._isDown = false;
    this._container?.classList.remove('dragging');
  }
}
