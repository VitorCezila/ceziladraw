import type { DrawableElement } from '../types/elements';
import type { Point } from '../types/geometry';
import { rotatePoint, toElementLocalSpace } from './transform';

export type ResizeHandleIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type HandleHit =
  | { type: 'resize'; index: ResizeHandleIndex }
  | { type: 'rotate' };

// Must match InteractionRenderer constants
export const HANDLE_SIZE = 8;
export const ROTATE_OFFSET = 20;
export const HANDLE_PAD = 4;

/** Polyline elements use `points[]` for rendering — handles not applicable. */
export function isPolylineElement(el: DrawableElement): boolean {
  return el.type === 'arrow' || el.type === 'line' || el.type === 'pencil';
}

/**
 * Returns the 8 resize handle positions + 1 rotation handle position
 * in the element's LOCAL space (the same frame InteractionRenderer draws in).
 */
export function getHandlePositions(
  el: DrawableElement,
  zoom: number,
): { resize: Point[]; rotate: Point } {
  const pad = HANDLE_PAD / zoom;
  const x = el.x - pad;
  const y = el.y - pad;
  const w = el.width + pad * 2;
  const h = el.height + pad * 2;

  const resize: Point[] = [
    { x, y },                         // 0 TL
    { x: x + w / 2, y },             // 1 TC
    { x: x + w, y },                  // 2 TR
    { x: x + w, y: y + h / 2 },      // 3 MR
    { x: x + w, y: y + h },          // 4 BR
    { x: x + w / 2, y: y + h },      // 5 BC
    { x, y: y + h },                  // 6 BL
    { x, y: y + h / 2 },             // 7 ML
  ];

  const rotate: Point = { x: x + w / 2, y: y - ROTATE_OFFSET / zoom };

  return { resize, rotate };
}

/**
 * Test if a world-space point hits a resize or rotation handle of `el`.
 * Skips polyline elements.
 */
export function getHandleAtPoint(
  el: DrawableElement,
  worldPoint: Point,
  zoom: number,
): HandleHit | null {
  if (isPolylineElement(el)) return null;

  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  const local = toElementLocalSpace(worldPoint, cx, cy, el.angle);
  const { resize, rotate } = getHandlePositions(el, zoom);
  const threshold = (HANDLE_SIZE / zoom) * 1.5;

  if (_dist(local, rotate) <= threshold) {
    return { type: 'rotate' };
  }

  for (let i = 0; i < resize.length; i++) {
    if (_dist(local, resize[i]) <= threshold) {
      return { type: 'resize', index: i as ResizeHandleIndex };
    }
  }

  return null;
}

/**
 * Compute the new {x, y, width, height} after dragging a resize handle.
 * `startEl` is a snapshot of the element at drag-start.
 * Works correctly for any element rotation angle.
 */
export function applyResize(
  startEl: DrawableElement,
  handleIndex: ResizeHandleIndex,
  worldPoint: Point,
): { x: number; y: number; width: number; height: number } {
  const { x: sx, y: sy, width: sw, height: sh, angle } = startEl;
  const startCx = sx + sw / 2;
  const startCy = sy + sh / 2;
  const startCenter = { x: startCx, y: startCy };

  // Corner handles: both axes change; fixed corner stays in world space
  const CORNER_MAP: Partial<Record<ResizeHandleIndex, Point>> = {
    0: { x: sx + sw, y: sy + sh }, // TL → fix BR
    2: { x: sx, y: sy + sh },       // TR → fix BL
    4: { x: sx, y: sy },            // BR → fix TL
    6: { x: sx + sw, y: sy },       // BL → fix TR
  };

  const fixedLocal = CORNER_MAP[handleIndex];
  if (fixedLocal !== undefined) {
    const fixedWorld = rotatePoint(fixedLocal, startCenter, angle);
    const newCx = (fixedWorld.x + worldPoint.x) / 2;
    const newCy = (fixedWorld.y + worldPoint.y) / 2;

    const lFixed = toElementLocalSpace(fixedWorld, newCx, newCy, angle);
    const lDrag = toElementLocalSpace(worldPoint, newCx, newCy, angle);

    const newW = Math.max(2, Math.abs(lDrag.x - lFixed.x));
    const newH = Math.max(2, Math.abs(lDrag.y - lFixed.y));
    const newX = Math.min(lFixed.x, lDrag.x);
    const newY = Math.min(lFixed.y, lDrag.y);

    return { x: newX, y: newY, width: newW, height: newH };
  }

  // Edge handles: one axis changes, the other is fixed
  // Work in local space using original center (accurate for small rotations; widely used approach)
  const dragLocal = toElementLocalSpace(worldPoint, startCx, startCy, angle);
  let newX = sx, newY = sy, newW = sw, newH = sh;

  switch (handleIndex) {
    case 1: { // TC — top moves, bottom fixed
      const fixedBottom = sy + sh;
      newH = Math.max(2, fixedBottom - dragLocal.y);
      newY = fixedBottom - newH;
      break;
    }
    case 3: { // MR — right moves, left fixed
      newW = Math.max(2, dragLocal.x - sx);
      break;
    }
    case 5: { // BC — bottom moves, top fixed
      newH = Math.max(2, dragLocal.y - sy);
      break;
    }
    case 7: { // ML — left moves, right fixed
      const fixedRight = sx + sw;
      newW = Math.max(2, fixedRight - dragLocal.x);
      newX = fixedRight - newW;
      break;
    }
  }

  return { x: newX, y: newY, width: newW, height: newH };
}

function _dist(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}
