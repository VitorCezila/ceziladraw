import type { RectangleElement } from '../../types/elements';
import type { RoughCanvas } from 'roughjs/bin/canvas';
import { isTransparent } from '../../utils/color';

function strokeLineDash(style: string): number[] {
  if (style === 'dashed') return [10, 6];
  if (style === 'dotted') return [2, 6];
  return [];
}

export function renderRect(rc: RoughCanvas, element: RectangleElement): void {
  const { x, y, width, height } = element;
  const lineDash = strokeLineDash(element.style.strokeStyle ?? 'solid');
  const baseOpts = {
    stroke: element.style.strokeColor,
    strokeWidth: element.style.strokeWidth,
    fill: isTransparent(element.style.fillColor) ? undefined : element.style.fillColor,
    fillStyle: element.style.fillStyle === 'none' ? 'solid' : element.style.fillStyle,
    roughness: element.style.roughness,
    seed: element.seed,
    strokeLineDash: lineDash,
  };

  if ((element.style.cornerStyle ?? 'sharp') === 'round') {
    const r = Math.min(16, Math.abs(width) * 0.2, Math.abs(height) * 0.2);
    const x2 = x + width;
    const y2 = y + height;
    const path =
      `M ${x + r},${y} H ${x2 - r} A ${r},${r} 0 0 1 ${x2},${y + r}` +
      ` V ${y2 - r} A ${r},${r} 0 0 1 ${x2 - r},${y2}` +
      ` H ${x + r} A ${r},${r} 0 0 1 ${x},${y2 - r}` +
      ` V ${y + r} A ${r},${r} 0 0 1 ${x + r},${y} Z`;
    rc.path(path, baseOpts);
  } else {
    rc.rectangle(x, y, width, height, baseOpts);
  }
}
