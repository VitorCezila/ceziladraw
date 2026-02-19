import type { EllipseElement } from '../../types/elements';
import type { RoughCanvas } from 'roughjs/bin/canvas';
import { isTransparent } from '../../utils/color';

function strokeLineDash(style: string): number[] {
  if (style === 'dashed') return [10, 6];
  if (style === 'dotted') return [2, 6];
  return [];
}

export function renderEllipse(rc: RoughCanvas, element: EllipseElement): void {
  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;

  rc.ellipse(cx, cy, element.width, element.height, {
    stroke: element.style.strokeColor,
    strokeWidth: element.style.strokeWidth,
    fill: isTransparent(element.style.fillColor) ? undefined : element.style.fillColor,
    fillStyle: element.style.fillStyle === 'none' ? 'solid' : element.style.fillStyle,
    roughness: element.style.roughness,
    seed: element.seed,
    strokeLineDash: strokeLineDash(element.style.strokeStyle ?? 'solid'),
  });
}
