import { describe, it, expect } from 'vitest';
import { hitTestElement, distanceToSegment } from '../../../src/geometry/hitDetection';
import type { RectangleElement, EllipseElement, DiamondElement, ArrowElement } from '../../../src/types/elements';
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

const ZOOM = 1;

function makeRect(x: number, y: number, w: number, h: number): RectangleElement {
  return { ...BASE, type: 'rectangle', x, y, width: w, height: h };
}

function makeEllipse(x: number, y: number, w: number, h: number): EllipseElement {
  return { ...BASE, type: 'ellipse', x, y, width: w, height: h };
}

function makeDiamond(x: number, y: number, w: number, h: number): DiamondElement {
  return { ...BASE, type: 'diamond', x, y, width: w, height: h };
}

describe('hitTestElement — rectangle', () => {
  const rect = makeRect(100, 100, 200, 100);

  it('returns true for click inside', () => {
    expect(hitTestElement(rect, { x: 150, y: 150 }, ZOOM)).toBe(true);
  });

  it('returns false for click clearly outside', () => {
    expect(hitTestElement(rect, { x: 400, y: 400 }, ZOOM)).toBe(false);
  });

  it('returns true near the border (within threshold)', () => {
    expect(hitTestElement(rect, { x: 100, y: 100 }, ZOOM)).toBe(true);
  });

  it('returns false far outside border', () => {
    expect(hitTestElement(rect, { x: 50, y: 50 }, ZOOM)).toBe(false);
  });
});

describe('hitTestElement — ellipse', () => {
  const ellipse = makeEllipse(100, 100, 200, 100);

  it('returns true at center', () => {
    expect(hitTestElement(ellipse, { x: 200, y: 150 }, ZOOM)).toBe(true);
  });

  it('returns false at a corner (outside ellipse but inside bounding box)', () => {
    expect(hitTestElement(ellipse, { x: 104, y: 104 }, ZOOM)).toBe(false);
  });

  it('returns true near the ellipse boundary', () => {
    expect(hitTestElement(ellipse, { x: 300, y: 150 }, ZOOM)).toBe(true);
  });
});

describe('hitTestElement — diamond', () => {
  const diamond = makeDiamond(100, 100, 200, 100);

  it('returns true at center', () => {
    expect(hitTestElement(diamond, { x: 200, y: 150 }, ZOOM)).toBe(true);
  });

  it('returns false at corners', () => {
    expect(hitTestElement(diamond, { x: 105, y: 105 }, ZOOM)).toBe(false);
  });
});

describe('hitTestElement — rotated rectangle', () => {
  it('detects click in rotated space', () => {
    const rotated: RectangleElement = {
      ...BASE,
      type: 'rectangle',
      x: 100,
      y: 90,
      width: 100,
      height: 20,
      angle: Math.PI / 2,
    };
    // After 90° rotation around center (150, 100):
    // The shape extends vertically: ~140–160 in x, 50–150 in y
    expect(hitTestElement(rotated, { x: 150, y: 100 }, ZOOM)).toBe(true);
  });
});

describe('hitTestElement — polyline (arrow)', () => {
  const arrow: ArrowElement = {
    ...BASE,
    type: 'arrow',
    x: 100,
    y: 100,
    width: 200,
    height: 0,
    startId: null,
    endId: null,
    curve: 'linear',
    startArrowhead: 'none',
    endArrowhead: 'arrow',
    points: [{ x: 100, y: 100 }, { x: 300, y: 100 }],
  };

  it('returns true for click near the segment', () => {
    expect(hitTestElement(arrow, { x: 200, y: 102 }, ZOOM)).toBe(true);
  });

  it('returns false for click far from segment', () => {
    expect(hitTestElement(arrow, { x: 200, y: 200 }, ZOOM)).toBe(false);
  });

  it('threshold scales with zoom — further threshold at low zoom', () => {
    expect(hitTestElement(arrow, { x: 200, y: 115 }, 0.5)).toBe(true);
    expect(hitTestElement(arrow, { x: 200, y: 115 }, 10)).toBe(false);
  });
});

describe('distanceToSegment', () => {
  it('returns 0 for point on segment', () => {
    expect(distanceToSegment({ x: 5, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(0);
  });

  it('returns correct perpendicular distance', () => {
    expect(distanceToSegment({ x: 5, y: 5 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(5);
  });

  it('clamps to start when before segment', () => {
    const d = distanceToSegment({ x: -5, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 });
    expect(d).toBeCloseTo(5);
  });

  it('handles degenerate segment (a === b)', () => {
    const d = distanceToSegment({ x: 3, y: 4 }, { x: 0, y: 0 }, { x: 0, y: 0 });
    expect(d).toBeCloseTo(5);
  });
});
