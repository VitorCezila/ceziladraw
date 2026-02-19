import type { PencilElement } from '../../types/elements';

function strokeLineDash(style: string): number[] {
  if (style === 'dashed') return [10, 6];
  if (style === 'dotted') return [2, 6];
  return [];
}

export function renderPencil(ctx: CanvasRenderingContext2D, element: PencilElement): void {
  const { points } = element;
  if (points.length < 2) return;

  ctx.save();
  ctx.globalAlpha = element.style.opacity;
  ctx.strokeStyle = element.style.strokeColor;
  ctx.lineWidth = element.style.strokeWidth;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.setLineDash(strokeLineDash(element.style.strokeStyle ?? 'solid'));

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  if (points.length === 2) {
    ctx.lineTo(points[1].x, points[1].y);
  } else {
    for (let i = 1; i < points.length - 1; i++) {
      const midX = (points[i].x + points[i + 1].x) / 2;
      const midY = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
    }
    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
  }

  ctx.stroke();
  ctx.restore();
}
