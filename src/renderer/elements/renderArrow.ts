import type { ArrowElement, LineElement } from '../../types/elements';
import type { RoughCanvas } from 'roughjs/bin/canvas';
import type { Point } from '../../types/geometry';

export function renderArrow(
  rc: RoughCanvas,
  ctx: CanvasRenderingContext2D,
  element: ArrowElement,
): void {
  const { points } = element;
  if (points.length < 2) return;

  _drawPolyline(rc, element, points);

  if (element.endArrowhead !== 'none') {
    const last = points[points.length - 1];
    const prev = points[points.length - 2];
    _drawArrowhead(ctx, element, prev, last);
  }
  if (element.startArrowhead !== 'none') {
    const first = points[0];
    const second = points[1];
    _drawArrowhead(ctx, element, second, first);
  }
}

export function renderLine(rc: RoughCanvas, element: LineElement): void {
  const { points } = element;
  if (points.length < 2) return;
  _drawPolyline(rc, element as unknown as ArrowElement, points);
}

function _drawPolyline(rc: RoughCanvas, element: ArrowElement, points: Point[]): void {
  for (let i = 0; i < points.length - 1; i++) {
    rc.line(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y, {
      stroke: element.style.strokeColor,
      strokeWidth: element.style.strokeWidth,
      roughness: element.style.roughness,
      seed: element.seed + i,
    });
  }
}

function _drawArrowhead(
  ctx: CanvasRenderingContext2D,
  element: ArrowElement,
  from: Point,
  to: Point,
): void {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const size = element.style.strokeWidth * 5 + 6;

  ctx.save();
  ctx.strokeStyle = element.style.strokeColor;
  ctx.fillStyle = element.style.strokeColor;
  ctx.lineWidth = element.style.strokeWidth;
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(
    to.x - size * Math.cos(angle - Math.PI / 6),
    to.y - size * Math.sin(angle - Math.PI / 6),
  );
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(
    to.x - size * Math.cos(angle + Math.PI / 6),
    to.y - size * Math.sin(angle + Math.PI / 6),
  );
  ctx.stroke();
  ctx.restore();
}
