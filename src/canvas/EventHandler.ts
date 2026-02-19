import type { ToolManager } from '../tools/ToolManager';
import type { Renderer } from '../renderer/Renderer';
import type { ToolType } from '../types/state';
import { getUIState, setUIState, setViewport } from '../state/uiState';
import { getAppState, setAppState } from '../state/appState';
import { screenToWorld, zoomOnPoint } from '../geometry/transform';
import { undo, redo } from '../state/history';
import { copySelected, pasteClipboard } from '../state/clipboard';

export class EventHandler {
  private canvas: HTMLCanvasElement;
  private toolManager: ToolManager;
  private renderer: Renderer;
  private _isPointerDown = false;
  private _toolBeforeSpace: ToolType | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    toolManager: ToolManager,
    renderer: Renderer,
  ) {
    this.canvas = canvas;
    this.toolManager = toolManager;
    this.renderer = renderer;
    this._bind();
  }

  private _bind(): void {
    const c = this.canvas;
    c.addEventListener('pointerdown', this._onPointerDown);
    c.addEventListener('pointermove', this._onPointerMove);
    c.addEventListener('pointerup', this._onPointerUp);
    c.addEventListener('pointercancel', this._onPointerUp);
    c.addEventListener('wheel', this._onWheel, { passive: false });
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
  }

  destroy(): void {
    const c = this.canvas;
    c.removeEventListener('pointerdown', this._onPointerDown);
    c.removeEventListener('pointermove', this._onPointerMove);
    c.removeEventListener('pointerup', this._onPointerUp);
    c.removeEventListener('pointercancel', this._onPointerUp);
    c.removeEventListener('wheel', this._onWheel);
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
  }

  private _onPointerDown = (e: PointerEvent): void => {
    this.canvas.setPointerCapture(e.pointerId);
    this._isPointerDown = true;
    const worldPoint = this._toWorld(e);
    setUIState({ isDragging: true, dragStartX: worldPoint.x, dragStartY: worldPoint.y });
    this.toolManager.onPointerDown(worldPoint, e);
  };

  private _onPointerMove = (e: PointerEvent): void => {
    const worldPoint = this._toWorld(e);
    setUIState({ pointerX: worldPoint.x, pointerY: worldPoint.y });

    if (e.buttons === 4 || (e.buttons === 1 && e.altKey)) {
      const { viewport } = getUIState();
      setViewport({
        x: viewport.x + e.movementX,
        y: viewport.y + e.movementY,
      });
      this.renderer.requestFullRender();
      return;
    }

    if (this._isPointerDown) {
      this.toolManager.onPointerMove(worldPoint, e);
    }
  };

  private _onPointerUp = (e: PointerEvent): void => {
    this._isPointerDown = false;
    setUIState({ isDragging: false });
    const worldPoint = this._toWorld(e);
    this.toolManager.onPointerUp(worldPoint, e);
  };

  private _onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const { viewport } = getUIState();

    if (e.ctrlKey || e.metaKey) {
      const delta = -e.deltaY * 0.01;
      const newZoom = viewport.zoom * (1 + delta);
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      setViewport(zoomOnPoint(viewport, mouseX, mouseY, newZoom));
    } else {
      setViewport({
        x: viewport.x - e.deltaX,
        y: viewport.y - e.deltaY,
      });
    }
    this.renderer.requestFullRender();
  };

  private _onKeyDown = (e: KeyboardEvent): void => {
    if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;

    const ctrl = e.ctrlKey || e.metaKey;

    if (ctrl && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); this.renderer.requestFullRender(); return; }
    if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); this.renderer.requestFullRender(); return; }
    if (ctrl && e.key === 'a') { e.preventDefault(); setAppState({ selectedIds: new Set(getAppState().elements.keys()) }); this.renderer.renderInteraction(null); return; }
    if (ctrl && e.key === 'c') { e.preventDefault(); copySelected(); return; }
    if (ctrl && e.key === 'v') { e.preventDefault(); pasteClipboard(); this.renderer.requestFullRender(); return; }

    if (e.code === 'Space' && !e.repeat && this._toolBeforeSpace === null) {
      e.preventDefault();
      const { activeTool } = getUIState();
      if (activeTool !== 'hand') {
        this._toolBeforeSpace = activeTool;
        this.toolManager.setTool('hand');
      }
      return;
    }

    const toolKeys: Record<string, ToolType> = {
      v: 'select', r: 'rectangle', d: 'diamond',
      o: 'ellipse', a: 'arrow', l: 'line', t: 'text',
      p: 'pencil', h: 'hand',
    };
    if (toolKeys[e.key.toLowerCase()]) {
      this.toolManager.setTool(toolKeys[e.key.toLowerCase()]);
      return;
    }

    this.toolManager.onKeyDown(e);
  };

  private _onKeyUp = (e: KeyboardEvent): void => {
    if (e.code === 'Space' && this._toolBeforeSpace !== null) {
      this.toolManager.setTool(this._toolBeforeSpace);
      this._toolBeforeSpace = null;
    }
  };

  private _toWorld(e: PointerEvent | WheelEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const { viewport } = getUIState();
    return screenToWorld(e.clientX - rect.left, e.clientY - rect.top, viewport);
  }
}
