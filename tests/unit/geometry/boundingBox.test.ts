import { describe, it, expect } from 'vitest';
import { getBoundingBox, boundingBoxesIntersect } from '../../../src/geometry/boundingBox';
import type { RectangleElement, ArrowElement, PencilElement } from '../../../src/types/elements';
import { DEFAULT_STYLE } from '../../../src/types/elements';

const BASE = {
  id: 'test',
  angle: 0,
  zIndex: 0,
  groupId: null,
  style: { ...DEFAULT_STYLE },
  version: 0,
  seed: 1,
};

describe('getBoundingBox — rectangle', () => {
  it('returns exact AABB for axis-aligned rect', () => {
    const rect: RectangleElement = { ...BASE, type: 'rectangle', x: 10, y: 20, width: 100, height: 50 };
    const bb = getBoundingBox(rect);
    expect(bb.minX).toBe(10);
    expect(bb.minY).toBe(20);
    expect(bb.maxX).toBe(110);
    expect(bb.maxY).toBe(70);
  });

  it('expands bounding box for 45° rotation', () => {
    const rect: RectangleElement = { ...BASE, type: 'rectangle', x: 0, y: 0, width: 100, height: 100, angle: Math.PI / 4 };
    const bb = getBoundingBox(rect);
    expect(bb.minX).toBeLessThan(0);
    expect(bb.minY).toBeLessThan(0);
    expect(bb.maxX).toBeGreaterThan(100);
    expect(bb.maxY).toBeGreaterThan(100);
  });
});

describe('getBoundingBox — polyline (arrow)', () => {
  it('returns bounding box of all points', () => {
    const arrow: ArrowElement = {
      ...BASE,
      type: 'arrow',
      x: 0, y: 0, width: 0, height: 0,
      startId: null, endId: null,
      curve: 'linear',
      startArrowhead: 'none', endArrowhead: 'arrow',
      points: [{ x: 50, y: 80 }, { x: 200, y: 30 }, { x: 300, y: 150 }],
    };
    const bb = getBoundingBox(arrow);
    expect(bb.minX).toBe(50);
    expect(bb.minY).toBe(30);
    expect(bb.maxX).toBe(300);
    expect(bb.maxY).toBe(150);
  });
});

describe('getBoundingBox — pencil', () => {
  it('computes bounding box from dense points', () => {
    const pencil: PencilElement = {
      ...BASE,
      type: 'pencil',
      x: 0, y: 0, width: 0, height: 0,
      points: [{ x: 10, y: 20 }, { x: 50, y: 5 }, { x: 30, y: 80 }],
      smoothing: 0,
    };
    const bb = getBoundingBox(pencil);
    expect(bb.minX).toBe(10);
    expect(bb.minY).toBe(5);
    expect(bb.maxX).toBe(50);
    expect(bb.maxY).toBe(80);
  });
});

describe('boundingBoxesIntersect', () => {
  it('returns true for overlapping boxes', () => {
    const a = { minX: 0, minY: 0, maxX: 100, maxY: 100 };
    const b = { minX: 50, minY: 50, maxX: 150, maxY: 150 };
    expect(boundingBoxesIntersect(a, b)).toBe(true);
  });

  it('returns true for touching boxes', () => {
    const a = { minX: 0, minY: 0, maxX: 100, maxY: 100 };
    const b = { minX: 100, minY: 0, maxX: 200, maxY: 100 };
    expect(boundingBoxesIntersect(a, b)).toBe(true);
  });

  it('returns false for non-overlapping boxes (right)', () => {
    const a = { minX: 0, minY: 0, maxX: 100, maxY: 100 };
    const b = { minX: 101, minY: 0, maxX: 200, maxY: 100 };
    expect(boundingBoxesIntersect(a, b)).toBe(false);
  });

  it('returns false for non-overlapping boxes (above)', () => {
    const a = { minX: 0, minY: 100, maxX: 100, maxY: 200 };
    const b = { minX: 0, minY: 0, maxX: 100, maxY: 99 };
    expect(boundingBoxesIntersect(a, b)).toBe(false);
  });
});
