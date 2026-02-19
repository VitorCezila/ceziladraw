import type { RectangleElement } from '../../types/elements';
import type { RoughCanvas } from 'roughjs/bin/canvas';
import { isTransparent } from '../../utils/color';

export function renderRect(rc: RoughCanvas, element: RectangleElement): void {
  rc.rectangle(element.x, element.y, element.width, element.height, {
    stroke: element.style.strokeColor,
    strokeWidth: element.style.strokeWidth,
    fill: isTransparent(element.style.fillColor) ? undefined : element.style.fillColor,
    fillStyle: element.style.fillStyle === 'none' ? 'solid' : element.style.fillStyle,
    roughness: element.style.roughness,
    seed: element.seed,
  });
}
