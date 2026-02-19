import type { DrawableElement, ArrowElement, LineElement } from '../types/elements';
import type { BoundingBox } from '../types/geometry';
import { rotatePoint } from './transform';

export function getBoundingBox(element: DrawableElement): BoundingBox {
  if (element.type === 'arrow' || element.type === 'line') {
    return getPolylineBoundingBox(element as ArrowElement | LineElement);
  }
  if (element.angle === 0) {
    return {
      minX: element.x,
      minY: element.y,
      maxX: element.x + element.width,
      maxY: element.y + element.height,
    };
  }
  return getRotatedBoundingBox(element);
}

function getRotatedBoundingBox(element: DrawableElement): BoundingBox {
  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;
  const corners = [
    { x: element.x, y: element.y },
    { x: element.x + element.width, y: element.y },
    { x: element.x + element.width, y: element.y + element.height },
    { x: element.x, y: element.y + element.height },
  ].map((p) => rotatePoint(p, { x: cx, y: cy }, element.angle));

  return {
    minX: Math.min(...corners.map((p) => p.x)),
    minY: Math.min(...corners.map((p) => p.y)),
    maxX: Math.max(...corners.map((p) => p.x)),
    maxY: Math.max(...corners.map((p) => p.y)),
  };
}

function getPolylineBoundingBox(element: ArrowElement | LineElement): BoundingBox {
  const xs = element.points.map((p) => p.x);
  const ys = element.points.map((p) => p.y);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

export function boundingBoxToRect(bb: BoundingBox) {
  return {
    x: bb.minX,
    y: bb.minY,
    width: bb.maxX - bb.minX,
    height: bb.maxY - bb.minY,
  };
}

export function boundingBoxesIntersect(a: BoundingBox, b: BoundingBox): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}
