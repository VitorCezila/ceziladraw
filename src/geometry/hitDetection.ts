import type { DrawableElement, ArrowElement, LineElement, PencilElement } from '../types/elements';
import type { Point } from '../types/geometry';
import { toElementLocalSpace } from './transform';
import { distance } from '../utils/math';

const HIT_THRESHOLD_PX = 8;

export function hitTestElement(
  element: DrawableElement,
  worldPoint: Point,
  zoom: number,
): boolean {
  const threshold = HIT_THRESHOLD_PX / zoom;

  if (element.type === 'arrow' || element.type === 'line' || element.type === 'pencil') {
    return hitTestPolyline(element as ArrowElement | LineElement | PencilElement, worldPoint, threshold);
  }

  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;
  const local = toElementLocalSpace(worldPoint, cx, cy, element.angle);

  if (element.type === 'ellipse') {
    return hitTestEllipse(element.x, element.y, element.width, element.height, local, threshold);
  }

  if (element.type === 'diamond') {
    return hitTestDiamond(element.x, element.y, element.width, element.height, local, threshold);
  }

  return hitTestRect(element.x, element.y, element.width, element.height, local, threshold);
}

/**
 * Like hitTestElement but for the hover cursor:
 * - Polylines (arrow/line/pencil): unchanged — always proximity-tested against the stroke.
 * - Text: always full-body (text characters are always visible content).
 * - Rectangle / Diamond / Ellipse with a fill: full-body (same as hitTestElement).
 * - Rectangle / Diamond / Ellipse with no fill (transparent): border-only — the point must
 *   be within `threshold` of the shape edge, not inside the hollow interior.
 */
export function hitTestElementForHover(
  element: DrawableElement,
  worldPoint: Point,
  zoom: number,
): boolean {
  const threshold = HIT_THRESHOLD_PX / zoom;

  if (element.type === 'arrow' || element.type === 'line' || element.type === 'pencil') {
    return hitTestPolyline(element as ArrowElement | LineElement | PencilElement, worldPoint, threshold);
  }

  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;
  const local = toElementLocalSpace(worldPoint, cx, cy, element.angle);
  const hasFill = element.style.fillColor !== 'transparent';

  if (element.type === 'ellipse') {
    if (hasFill) {
      return hitTestEllipse(element.x, element.y, element.width, element.height, local, threshold);
    }
    return hitTestEllipseBorder(element.x, element.y, element.width, element.height, local, threshold);
  }

  if (element.type === 'diamond') {
    if (hasFill) {
      return hitTestDiamond(element.x, element.y, element.width, element.height, local, threshold);
    }
    return hitTestDiamondBorder(element.x, element.y, element.width, element.height, local, threshold);
  }

  // Rectangle and text — text always uses full-body
  if (element.type === 'text' || hasFill) {
    return hitTestRect(element.x, element.y, element.width, element.height, local, threshold);
  }
  return hitTestRectBorder(element.x, element.y, element.width, element.height, local, threshold);
}

function hitTestRect(
  x: number,
  y: number,
  w: number,
  h: number,
  point: Point,
  threshold: number,
): boolean {
  return (
    point.x >= x - threshold &&
    point.x <= x + w + threshold &&
    point.y >= y - threshold &&
    point.y <= y + h + threshold
  );
}

function hitTestEllipse(
  x: number,
  y: number,
  w: number,
  h: number,
  point: Point,
  threshold: number,
): boolean {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rx = w / 2 + threshold;
  const ry = h / 2 + threshold;
  const dx = point.x - cx;
  const dy = point.y - cy;
  return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1;
}

function hitTestDiamond(
  x: number,
  y: number,
  w: number,
  h: number,
  point: Point,
  threshold: number,
): boolean {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const dx = Math.abs(point.x - cx) / (w / 2 + threshold);
  const dy = Math.abs(point.y - cy) / (h / 2 + threshold);
  return dx + dy <= 1;
}

function hitTestPolyline(
  element: ArrowElement | LineElement | PencilElement,
  point: Point,
  threshold: number,
): boolean {
  const { points } = element;
  for (let i = 0; i < points.length - 1; i++) {
    if (distanceToSegment(point, points[i], points[i + 1]) <= threshold) {
      return true;
    }
  }
  return false;
}

export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return distance(p.x, p.y, a.x, a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  return distance(p.x, p.y, a.x + t * dx, a.y + t * dy);
}

/** Point is within the outer rect but NOT within the inner rect (inset by threshold). */
function hitTestRectBorder(
  x: number,
  y: number,
  w: number,
  h: number,
  point: Point,
  threshold: number,
): boolean {
  const inOuter =
    point.x >= x - threshold &&
    point.x <= x + w + threshold &&
    point.y >= y - threshold &&
    point.y <= y + h + threshold;
  if (!inOuter) return false;
  const inInner =
    point.x > x + threshold &&
    point.x < x + w - threshold &&
    point.y > y + threshold &&
    point.y < y + h - threshold;
  return !inInner;
}

/** Point is within the outer ellipse but NOT within the inner ellipse (inset by threshold). */
function hitTestEllipseBorder(
  x: number,
  y: number,
  w: number,
  h: number,
  point: Point,
  threshold: number,
): boolean {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rxO = w / 2 + threshold;
  const ryO = h / 2 + threshold;
  const rxI = Math.max(0, w / 2 - threshold);
  const ryI = Math.max(0, h / 2 - threshold);
  const dx = point.x - cx;
  const dy = point.y - cy;
  const inOuter = (dx * dx) / (rxO * rxO) + (dy * dy) / (ryO * ryO) <= 1;
  if (!inOuter) return false;
  if (rxI === 0 || ryI === 0) return true;
  const inInner = (dx * dx) / (rxI * rxI) + (dy * dy) / (ryI * ryI) < 1;
  return !inInner;
}

/** Point is within the outer diamond but NOT within the inner diamond (inset by threshold). */
function hitTestDiamondBorder(
  x: number,
  y: number,
  w: number,
  h: number,
  point: Point,
  threshold: number,
): boolean {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const hw = w / 2;
  const hh = h / 2;
  const dx = Math.abs(point.x - cx);
  const dy = Math.abs(point.y - cy);
  const inOuter = dx / (hw + threshold) + dy / (hh + threshold) <= 1;
  if (!inOuter) return false;
  const hwI = Math.max(0, hw - threshold);
  const hhI = Math.max(0, hh - threshold);
  if (hwI === 0 || hhI === 0) return true;
  const inInner = dx / hwI + dy / hhI < 1;
  return !inInner;
}
