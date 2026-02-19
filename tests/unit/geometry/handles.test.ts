import { describe, it, expect } from 'vitest';
import { getHandleAtPoint, applyResize } from '../../../src/geometry/handles';
import type { RectangleElement } from '../../../src/types/elements';
import { DEFAULT_STYLE } from '../../../src/types/elements';

function makeRect(
  x: number,
  y: number,
  width: number,
  height: number,
  angle = 0,
): RectangleElement {
  return {
    id: 'r1',
    type: 'rectangle',
    x,
    y,
    width,
    height,
    angle,
    zIndex: 0,
    groupId: null,
    style: { ...DEFAULT_STYLE },
    version: 0,
    seed: 1,
    cornerRadius: 0,
  };
}

describe('getHandleAtPoint', () => {
  const zoom = 1;

  it('returns null when point is not near any handle', () => {
    const el = makeRect(100, 100, 200, 150);
    // Click inside the element (body)
    expect(getHandleAtPoint(el, { x: 200, y: 175 }, zoom)).toBeNull();
  });

  it('detects BR handle (index 4) for axis-aligned rect', () => {
    const el = makeRect(100, 100, 200, 150);
    // BR corner is at (300, 250) with pad=4 → handle at (304, 254)
    const result = getHandleAtPoint(el, { x: 302, y: 252 }, zoom);
    expect(result).not.toBeNull();
    expect(result?.type).toBe('resize');
    if (result?.type === 'resize') {
      expect(result.index).toBe(4);
    }
  });

  it('detects TL handle (index 0)', () => {
    const el = makeRect(100, 100, 200, 150);
    // TL corner at (100, 100) with pad=4 → handle at (96, 96)
    const result = getHandleAtPoint(el, { x: 97, y: 97 }, zoom);
    expect(result).not.toBeNull();
    expect(result?.type).toBe('resize');
    if (result?.type === 'resize') {
      expect(result.index).toBe(0);
    }
  });

  it('detects TC handle (index 1)', () => {
    const el = makeRect(100, 100, 200, 150);
    // TC at (200, 100) with pad=4 → (200, 96)
    const result = getHandleAtPoint(el, { x: 200, y: 97 }, zoom);
    expect(result?.type).toBe('resize');
    if (result?.type === 'resize') {
      expect(result.index).toBe(1);
    }
  });

  it('detects rotation handle above TC', () => {
    const el = makeRect(100, 100, 200, 150);
    // Rotation handle at TC x, y - 20/zoom - pad = (200, 76)
    const result = getHandleAtPoint(el, { x: 200, y: 76 }, zoom);
    expect(result).not.toBeNull();
    expect(result?.type).toBe('rotate');
  });

  it('returns null for polyline elements (arrow)', () => {
    const arrow = {
      id: 'a1',
      type: 'arrow' as const,
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      angle: 0,
      zIndex: 0,
      groupId: null,
      style: { ...DEFAULT_STYLE },
      version: 0,
      seed: 1,
      points: [{ x: 0, y: 0 }, { x: 200, y: 100 }],
      curve: 'linear' as const,
      startArrowhead: 'none' as const,
      endArrowhead: 'arrow' as const,
      startId: null,
      endId: null,
    };
    // Even clicking right on where a handle would be — returns null
    expect(getHandleAtPoint(arrow, { x: 202, y: 102 }, zoom)).toBeNull();
  });
});

describe('applyResize', () => {
  it('E-13: clamps width/height to minimum 2px', () => {
    const el = makeRect(100, 100, 200, 150);
    // Drag BR handle to left of TL — should clamp
    const result = applyResize(el, 4, { x: 80, y: 80 });
    expect(result.width).toBeGreaterThanOrEqual(2);
    expect(result.height).toBeGreaterThanOrEqual(2);
  });

  it('F-20: BR handle on axis-aligned rect expands correctly', () => {
    const el = makeRect(0, 0, 100, 100);
    // Drag BR from (100,100) to (150,130)
    const result = applyResize(el, 4, { x: 150, y: 130 });
    expect(result.x).toBeCloseTo(0, 1);
    expect(result.y).toBeCloseTo(0, 1);
    expect(result.width).toBeCloseTo(150, 1);
    expect(result.height).toBeCloseTo(130, 1);
  });

  it('F-20: TL handle on axis-aligned rect: opposite corner (BR) stays fixed', () => {
    const el = makeRect(0, 0, 100, 100);
    // Drag TL to (-20, -20) — BR should remain at (100, 100)
    const result = applyResize(el, 0, { x: -20, y: -20 });
    expect(result.x).toBeCloseTo(-20, 1);
    expect(result.y).toBeCloseTo(-20, 1);
    expect(result.x + result.width).toBeCloseTo(100, 1);
    expect(result.y + result.height).toBeCloseTo(100, 1);
  });

  it('TC handle: only height changes, x and width unchanged', () => {
    const el = makeRect(0, 0, 100, 100);
    // Drag TC up to y=-20
    const result = applyResize(el, 1, { x: 50, y: -20 });
    expect(result.x).toBeCloseTo(0, 1);
    expect(result.width).toBeCloseTo(100, 1);
    expect(result.y).toBeCloseTo(-20, 1);
    expect(result.height).toBeCloseTo(120, 1);
  });

  it('MR handle: only width changes, y and height unchanged', () => {
    const el = makeRect(0, 0, 100, 100);
    // Drag MR to x=200
    const result = applyResize(el, 3, { x: 200, y: 50 });
    expect(result.y).toBeCloseTo(0, 1);
    expect(result.height).toBeCloseTo(100, 1);
    expect(result.width).toBeCloseTo(200, 1);
  });

  it('F-21: BR handle on 45° rotated rect — opposite corner (TL) stays fixed in world space', () => {
    const angle = Math.PI / 4; // 45°
    const el = makeRect(0, 0, 100, 100, angle);
    const startCx = 50;
    const startCy = 50;

    // Compute world position of TL corner before resize
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const tlX = cos * (0 - startCx) - sin * (0 - startCy) + startCx;
    const tlY = sin * (0 - startCx) + cos * (0 - startCy) + startCy;

    // Drag BR handle
    const result = applyResize(el, 4, { x: 120, y: 50 });

    // Compute new TL world position from result
    const newCx = result.x + result.width / 2;
    const newCy = result.y + result.height / 2;
    const newTlWorldX = cos * (result.x - newCx) - sin * (result.y - newCy) + newCx;
    const newTlWorldY = sin * (result.x - newCx) + cos * (result.y - newCy) + newCy;

    // TL world position should be approximately the same (within 2px — float precision)
    expect(Math.abs(newTlWorldX - tlX)).toBeLessThan(2);
    expect(Math.abs(newTlWorldY - tlY)).toBeLessThan(2);
  });

  it('ML handle: right edge stays fixed', () => {
    const el = makeRect(0, 0, 100, 100);
    // Drag ML (left edge) to x=30 — right edge should stay at 100
    const result = applyResize(el, 7, { x: 30, y: 50 });
    expect(result.x).toBeCloseTo(30, 1);
    expect(result.x + result.width).toBeCloseTo(100, 1);
  });
});
