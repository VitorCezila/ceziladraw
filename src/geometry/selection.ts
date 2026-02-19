import type { DrawableElement } from '../types/elements';
import type { BoundingBox } from '../types/geometry';
import { getBoundingBox, boundingBoxesIntersect } from './boundingBox';
import { rotatePoint } from './transform';

/**
 * Returns true if the element overlaps the marquee selection rectangle.
 * For non-rotated elements: simple AABB intersection.
 * For rotated elements: SAT (Separating Axis Theorem) against the 4 corners.
 */
export function elementIntersectsMarquee(
  element: DrawableElement,
  marquee: BoundingBox,
): boolean {
  if (element.angle === 0) {
    const bb = getBoundingBox(element);
    return boundingBoxesIntersect(bb, marquee);
  }
  return rotatedElementIntersectsRect(element, marquee);
}

function rotatedElementIntersectsRect(element: DrawableElement, rect: BoundingBox): boolean {
  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;

  const elementCorners = [
    { x: element.x, y: element.y },
    { x: element.x + element.width, y: element.y },
    { x: element.x + element.width, y: element.y + element.height },
    { x: element.x, y: element.y + element.height },
  ].map((p) => rotatePoint(p, { x: cx, y: cy }, element.angle));

  const rectCorners = [
    { x: rect.minX, y: rect.minY },
    { x: rect.maxX, y: rect.minY },
    { x: rect.maxX, y: rect.maxY },
    { x: rect.minX, y: rect.maxY },
  ];

  const axes = [
    ...getAxes(elementCorners),
    ...getAxes(rectCorners),
  ];

  for (const axis of axes) {
    const projA = project(elementCorners, axis);
    const projB = project(rectCorners, axis);
    if (projA.max < projB.min || projB.max < projA.min) {
      return false;
    }
  }
  return true;
}

function getAxes(corners: { x: number; y: number }[]): { x: number; y: number }[] {
  return corners.map((_, i) => {
    const next = corners[(i + 1) % corners.length];
    const edge = { x: next.x - corners[i].x, y: next.y - corners[i].y };
    return { x: -edge.y, y: edge.x };
  });
}

function project(
  corners: { x: number; y: number }[],
  axis: { x: number; y: number },
): { min: number; max: number } {
  const dots = corners.map((c) => c.x * axis.x + c.y * axis.y);
  return { min: Math.min(...dots), max: Math.max(...dots) };
}
