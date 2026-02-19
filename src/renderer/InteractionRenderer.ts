import rough from 'roughjs';
import type { RoughCanvas } from 'roughjs/bin/canvas';
import type { DrawableElement } from '../types/elements';
import type { Viewport, BoundingBox } from '../types/geometry';
import { getDpr } from './utils/dpr';
import { renderRect } from './elements/renderRect';
import { renderDiamond } from './elements/renderDiamond';
import { renderEllipse } from './elements/renderEllipse';
import { renderArrow, renderLine } from './elements/renderArrow';
import { renderPencil } from './elements/renderPencil';

const HANDLE_SIZE = 8;
const HANDLE_COLOR = '#3b82f6';
const SELECTION_COLOR = '#3b82f6';

export class InteractionRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private rc: RoughCanvas;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.rc = rough.canvas(canvas);
  }

  render(
    provisionalElement: DrawableElement | null,
    selectedElements: DrawableElement[],
    marquee: BoundingBox | null,
    viewport: Viewport,
  ): void {
    const { ctx, canvas } = this;
    const dpr = getDpr();
    const cssW = canvas.width / dpr;
    const cssH = canvas.height / dpr;

    ctx.clearRect(0, 0, cssW, cssH);

    ctx.save();
    ctx.setTransform(
      viewport.zoom * dpr,
      0,
      0,
      viewport.zoom * dpr,
      viewport.x * dpr,
      viewport.y * dpr,
    );

    if (provisionalElement) {
      this._renderElement(provisionalElement);
    }

    for (const el of selectedElements) {
      this._drawSelectionOutline(el, viewport.zoom);
    }

    ctx.restore();

    if (marquee) {
      this._drawMarquee(ctx, marquee, viewport, dpr);
    }
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
      case 'arrow':
        renderArrow(this.rc, this.ctx, el);
        break;
      case 'line':
        renderLine(this.rc, el);
        break;
      case 'pencil':
        renderPencil(this.ctx, el);
        break;
    }
  }

  private _drawSelectionOutline(el: DrawableElement, zoom: number): void {
    const { ctx } = this;
    const pad = 4 / zoom;
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;

    ctx.save();
    if (el.angle !== 0) {
      ctx.translate(cx, cy);
      ctx.rotate(el.angle);
      ctx.translate(-cx, -cy);
    }

    ctx.strokeStyle = SELECTION_COLOR;
    ctx.lineWidth = 1.5 / zoom;
    ctx.setLineDash([4 / zoom, 3 / zoom]);
    ctx.strokeRect(el.x - pad, el.y - pad, el.width + pad * 2, el.height + pad * 2);
    ctx.setLineDash([]);

    this._drawResizeHandles(el, pad, zoom);
    ctx.restore();
  }

  private _drawResizeHandles(el: DrawableElement, pad: number, zoom: number): void {
    const { ctx } = this;
    const hs = HANDLE_SIZE / zoom;
    const x = el.x - pad;
    const y = el.y - pad;
    const w = el.width + pad * 2;
    const h = el.height + pad * 2;
    const half = hs / 2;

    const handles = [
      [x, y], [x + w / 2, y], [x + w, y],
      [x + w, y + h / 2],
      [x + w, y + h], [x + w / 2, y + h], [x, y + h],
      [x, y + h / 2],
    ];

    ctx.fillStyle = '#fff';
    ctx.strokeStyle = HANDLE_COLOR;
    ctx.lineWidth = 1.5 / zoom;

    for (const [hx, hy] of handles) {
      ctx.fillRect(hx - half, hy - half, hs, hs);
      ctx.strokeRect(hx - half, hy - half, hs, hs);
    }

    const rotHandleY = y - 20 / zoom;
    ctx.beginPath();
    ctx.arc(x + w / 2, rotHandleY, hs / 2, 0, Math.PI * 2);
    ctx.fillStyle = HANDLE_COLOR;
    ctx.fill();
  }

  private _drawMarquee(
    ctx: CanvasRenderingContext2D,
    marquee: BoundingBox,
    viewport: Viewport,
    dpr: number,
  ): void {
    const toScreen = (v: number, offset: number) => v * viewport.zoom * dpr + offset * dpr;
    const sx = toScreen(marquee.minX, viewport.x) / dpr;
    const sy = toScreen(marquee.minY, viewport.y) / dpr;
    const sw = (marquee.maxX - marquee.minX) * viewport.zoom;
    const sh = (marquee.maxY - marquee.minY) * viewport.zoom;

    ctx.save();
    ctx.strokeStyle = SELECTION_COLOR;
    ctx.fillStyle = 'rgba(59, 130, 246, 0.06)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.fillRect(sx, sy, sw, sh);
    ctx.strokeRect(sx, sy, sw, sh);
    ctx.setLineDash([]);
    ctx.restore();
  }
}
