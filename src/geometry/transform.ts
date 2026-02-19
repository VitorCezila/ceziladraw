import type { Point, Viewport } from '../types/geometry';
import { clamp } from '../utils/math';

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 20;

export function screenToWorld(screenX: number, screenY: number, viewport: Viewport): Point {
  return {
    x: (screenX - viewport.x) / viewport.zoom,
    y: (screenY - viewport.y) / viewport.zoom,
  };
}

export function worldToScreen(worldX: number, worldY: number, viewport: Viewport): Point {
  return {
    x: worldX * viewport.zoom + viewport.x,
    y: worldY * viewport.zoom + viewport.y,
  };
}

/**
 * Zoom centered on a screen-space point (e.g., the cursor).
 * The world point under the cursor stays fixed after zoom.
 */
export function zoomOnPoint(
  viewport: Viewport,
  screenX: number,
  screenY: number,
  newZoom: number,
): Viewport {
  const clamped = clamp(newZoom, MIN_ZOOM, MAX_ZOOM);
  const worldPoint = screenToWorld(screenX, screenY, viewport);
  return {
    zoom: clamped,
    x: screenX - worldPoint.x * clamped,
    y: screenY - worldPoint.y * clamped,
  };
}

/**
 * Rotate a point around an arbitrary center.
 */
export function rotatePoint(point: Point, center: Point, angle: number): Point {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: cos * dx - sin * dy + center.x,
    y: sin * dx + cos * dy + center.y,
  };
}

/**
 * Convert a click point to an element's local (unrotated) space.
 * Used for hit-detection of rotated elements.
 */
export function toElementLocalSpace(
  worldPoint: Point,
  elementCx: number,
  elementCy: number,
  angle: number,
): Point {
  return rotatePoint(worldPoint, { x: elementCx, y: elementCy }, -angle);
}
