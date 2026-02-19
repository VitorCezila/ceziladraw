import type { DiamondElement } from '../../types/elements';
import type { RoughCanvas } from 'roughjs/bin/canvas';
import { isTransparent } from '../../utils/color';

function strokeLineDash(style: string): number[] {
  if (style === 'dashed') return [10, 6];
  if (style === 'dotted') return [2, 6];
  return [];
}

export function renderDiamond(rc: RoughCanvas, element: DiamondElement): void {
  const { x, y, width, height } = element;
  const cx = x + width / 2;
  const cy = y + height / 2;

  const points: [number, number][] = [
    [cx, y],
    [x + width, cy],
    [cx, y + height],
    [x, cy],
  ];

  rc.polygon(points, {
    stroke: element.style.strokeColor,
    strokeWidth: element.style.strokeWidth,
    fill: isTransparent(element.style.fillColor) ? undefined : element.style.fillColor,
    fillStyle: element.style.fillStyle === 'none' ? 'solid' : element.style.fillStyle,
    roughness: element.style.roughness,
    seed: element.seed,
    strokeLineDash: strokeLineDash(element.style.strokeStyle ?? 'solid'),
  });
}
