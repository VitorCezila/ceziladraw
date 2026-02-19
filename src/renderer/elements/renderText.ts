import type { TextElement } from '../../types/elements';

export function renderText(ctx: CanvasRenderingContext2D, element: TextElement): void {
  ctx.save();
  ctx.globalAlpha = element.style.opacity;
  ctx.fillStyle = element.style.strokeColor;
  ctx.font = `${element.fontSize}px ${element.fontFamily}`;
  ctx.textAlign = element.textAlign;
  ctx.textBaseline = 'top';

  const lines = element.text.split('\n');
  const lineHeight = element.fontSize * 1.4;
  const startX =
    element.textAlign === 'center'
      ? element.x + element.width / 2
      : element.textAlign === 'right'
        ? element.x + element.width
        : element.x;

  lines.forEach((line, i) => {
    ctx.fillText(line, startX, element.y + i * lineHeight);
  });

  ctx.restore();
}
