import { describe, it, expect } from 'vitest';
import { elementIntersectsMarquee } from '../../../src/geometry/selection';
import type { RectangleElement } from '../../../src/types/elements';
import type { BoundingBox } from '../../../src/types/geometry';
import { DEFAULT_STYLE } from '../../../src/types/elements';

const BASE_RECT: RectangleElement = {
  id: 'r1',
  type: 'rectangle',
  x: 100,
  y: 100,
  width: 100,
  height: 100,
  angle: 0,
  zIndex: 0,
  groupId: null,
  style: { ...DEFAULT_STYLE },
  version: 0,
  seed: 1,
};

describe('elementIntersectsMarquee — axis-aligned', () => {
  it('returns true when element fully inside marquee', () => {
    const marquee: BoundingBox = { minX: 50, minY: 50, maxX: 250, maxY: 250 };
    expect(elementIntersectsMarquee(BASE_RECT, marquee)).toBe(true);
  });

  it('returns true when marquee partially overlaps element', () => {
    const marquee: BoundingBox = { minX: 150, minY: 150, maxX: 300, maxY: 300 };
    expect(elementIntersectsMarquee(BASE_RECT, marquee)).toBe(true);
  });

  it('returns false when marquee is completely to the right', () => {
    const marquee: BoundingBox = { minX: 250, minY: 100, maxX: 400, maxY: 250 };
    expect(elementIntersectsMarquee(BASE_RECT, marquee)).toBe(false);
  });

  it('returns false when marquee is completely above', () => {
    const marquee: BoundingBox = { minX: 100, minY: 0, maxX: 200, maxY: 80 };
    expect(elementIntersectsMarquee(BASE_RECT, marquee)).toBe(false);
  });

  it('returns true when element fully contains the marquee', () => {
    const marquee: BoundingBox = { minX: 110, minY: 110, maxX: 190, maxY: 190 };
    expect(elementIntersectsMarquee(BASE_RECT, marquee)).toBe(true);
  });
});

describe('elementIntersectsMarquee — rotated element (SAT)', () => {
  const rotated: RectangleElement = {
    ...BASE_RECT,
    angle: Math.PI / 4,
  };

  it('returns true when marquee clearly overlaps rotated element center', () => {
    const marquee: BoundingBox = { minX: 120, minY: 120, maxX: 180, maxY: 180 };
    expect(elementIntersectsMarquee(rotated, marquee)).toBe(true);
  });

  it('returns false when marquee is far from rotated element', () => {
    const marquee: BoundingBox = { minX: 400, minY: 400, maxX: 500, maxY: 500 };
    expect(elementIntersectsMarquee(rotated, marquee)).toBe(false);
  });
});
