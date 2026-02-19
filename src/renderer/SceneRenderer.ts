import rough from 'roughjs';
import type { RoughCanvas } from 'roughjs/bin/canvas';
import type { DrawableElement } from '../types/elements';
import type { Viewport } from '../types/geometry';
import { getDpr } from './utils/dpr';
import { renderRect } from './elements/renderRect';
import { renderDiamond } from './elements/renderDiamond';
import { renderEllipse } from './elements/renderEllipse';
import { renderText } from './elements/renderText';
import { renderArrow, renderLine } from './elements/renderArrow';

export class SceneRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private rc: RoughCanvas;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.rc = rough.canvas(canvas);
  }

  render(elements: DrawableElement[], viewport: Viewport): void {
    const { ctx, canvas } = this;
    const dpr = getDpr();
    const cssW = canvas.width / dpr;
    const cssH = canvas.height / dpr;

    ctx.clearRect(0, 0, cssW, cssH);
    this._drawBackground(ctx, cssW, cssH, viewport);

    ctx.save();
    ctx.setTransform(
      viewport.zoom * dpr,
      0,
      0,
      viewport.zoom * dpr,
      viewport.x * dpr,
      viewport.y * dpr,
    );

    for (const el of elements) {
      ctx.save();
      ctx.globalAlpha = el.style.opacity;
      if (el.angle !== 0) {
        const cx = el.x + el.width / 2;
        const cy = el.y + el.height / 2;
        ctx.translate(cx, cy);
        ctx.rotate(el.angle);
        ctx.translate(-cx, -cy);
      }
      this._renderElement(el);
      ctx.restore();
    }

    ctx.restore();
  }

  private _renderElement(el: DrawableElement): void {
    switch (el.type) {
      case 'rectangle':
        renderRect(this.rc, el);
        break;
      case 'diamond':
        renderDiamond(this.rc, el);
        break;
      case 'ellipse':
        renderEllipse(this.rc, el);
        break;
      case 'text':
        renderText(this.ctx, el);
        break;
      case 'arrow':
        renderArrow(this.rc, this.ctx, el);
        break;
      case 'line':
        renderLine(this.rc, el);
        break;
    }
  }

  private _drawBackground(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    viewport: Viewport,
  ): void {
    ctx.fillStyle = '#fafaf9';
    ctx.fillRect(0, 0, w, h);
    this._drawDotGrid(ctx, w, h, viewport);
  }

  private _drawDotGrid(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    viewport: Viewport,
  ): void {
    const gridSize = 20 * viewport.zoom;
    if (gridSize < 8) return;

    const dotRadius = Math.min(1.2, viewport.zoom * 0.8);
    const offsetX = viewport.x % gridSize;
    const offsetY = viewport.y % gridSize;

    ctx.fillStyle = '#d4d4d4';
    for (let x = offsetX; x < w; x += gridSize) {
      for (let y = offsetY; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
