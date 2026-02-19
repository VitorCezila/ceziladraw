import { getDpr, setupCanvasDpr } from '../renderer/utils/dpr';

export class CanvasManager {
  readonly sceneCanvas: HTMLCanvasElement;
  readonly interactionCanvas: HTMLCanvasElement;
  readonly sceneCtx: CanvasRenderingContext2D;
  readonly interactionCtx: CanvasRenderingContext2D;

  private _resizeObserver: ResizeObserver;
  private _onResize: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.sceneCanvas = this._createCanvas('scene-canvas');
    this.interactionCanvas = this._createCanvas('interaction-canvas');

    container.appendChild(this.sceneCanvas);
    container.appendChild(this.interactionCanvas);

    this.sceneCtx = setupCanvasDpr(this.sceneCanvas);
    this.interactionCtx = setupCanvasDpr(this.interactionCanvas);

    this._resizeObserver = new ResizeObserver(() => this._handleResize());
    this._resizeObserver.observe(container);
  }

  setResizeCallback(fn: () => void): void {
    this._onResize = fn;
  }

  getCssSize(): { width: number; height: number } {
    const rect = this.sceneCanvas.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }

  destroy(): void {
    this._resizeObserver.disconnect();
    this.sceneCanvas.remove();
    this.interactionCanvas.remove();
  }

  private _createCanvas(id: string): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.id = id;
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    return canvas;
  }

  private _handleResize(): void {
    const dpr = getDpr();
    for (const canvas of [this.sceneCanvas, this.interactionCanvas]) {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }
    this._onResize?.();
  }
}
