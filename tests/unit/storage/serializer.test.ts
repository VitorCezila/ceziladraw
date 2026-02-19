import { describe, it, expect } from 'vitest';
import { serializeState, deserializeState } from '../../../src/storage/serializer';
import type { AppState } from '../../../src/types/state';
import type { DrawableElement, ArrowElement, PencilElement } from '../../../src/types/elements';
import { DEFAULT_STYLE } from '../../../src/types/elements';

function makeRect(id: string): DrawableElement {
  return {
    id, type: 'rectangle', x: 10, y: 20, width: 100, height: 50,
    angle: 0.5, zIndex: 1, groupId: null,
    style: { ...DEFAULT_STYLE, fillColor: '#abc' },
    version: 3, seed: 999,
  };
}

function makeArrow(id: string): ArrowElement {
  return {
    id, type: 'arrow', x: 0, y: 0, width: 100, height: 0,
    angle: 0, zIndex: 2, groupId: null,
    style: { ...DEFAULT_STYLE },
    version: 0, seed: 42,
    startId: null, endId: null,
    curve: 'linear',
    startArrowhead: 'none', endArrowhead: 'arrow',
    points: [{ x: 0, y: 0 }, { x: 100, y: 50 }],
  };
}

function makePencil(id: string): PencilElement {
  return {
    id, type: 'pencil', x: 0, y: 0, width: 50, height: 50,
    angle: 0, zIndex: 3, groupId: null,
    style: { ...DEFAULT_STYLE },
    version: 0, seed: 7,
    points: [{ x: 5, y: 10 }, { x: 20, y: 30 }, { x: 40, y: 15 }],
    smoothing: 0,
  };
}

function makeState(...elements: DrawableElement[]): AppState {
  const map = new Map<string, DrawableElement>();
  for (const el of elements) map.set(el.id, el);
  return { elements: map, selectedIds: new Set() };
}

describe('serializeState', () => {
  it('produces valid JSON', () => {
    const state = makeState(makeRect('r1'));
    expect(() => JSON.parse(serializeState(state))).not.toThrow();
  });

  it('includes version field', () => {
    const json = JSON.parse(serializeState(makeState()));
    expect(json.version).toBe(1);
  });

  it('includes all elements', () => {
    const json = JSON.parse(serializeState(makeState(makeRect('r1'), makeArrow('a1'))));
    expect(json.elements.length).toBe(2);
  });
});

describe('deserializeState — roundtrip fidelity', () => {
  it('roundtrip preserves rectangle fields', () => {
    const rect = makeRect('r1');
    const state = makeState(rect);
    const restored = deserializeState(serializeState(state));
    const el = restored?.elements?.get('r1') as DrawableElement;
    expect(el.x).toBe(rect.x);
    expect(el.y).toBe(rect.y);
    expect(el.width).toBe(rect.width);
    expect(el.height).toBe(rect.height);
    expect(el.angle).toBe(rect.angle);
    expect(el.version).toBe(rect.version);
    expect(el.seed).toBe(rect.seed);
    expect(el.style.fillColor).toBe('#abc');
  });

  it('roundtrip preserves arrow points', () => {
    const arrow = makeArrow('a1');
    const restored = deserializeState(serializeState(makeState(arrow)));
    const el = restored?.elements?.get('a1') as ArrowElement;
    expect(el.points).toHaveLength(2);
    expect(el.points[0]).toEqual({ x: 0, y: 0 });
    expect(el.points[1]).toEqual({ x: 100, y: 50 });
  });

  it('roundtrip preserves pencil points', () => {
    const pencil = makePencil('p1');
    const restored = deserializeState(serializeState(makeState(pencil)));
    const el = restored?.elements?.get('p1') as PencilElement;
    expect(el.points).toHaveLength(3);
  });

  it('restores selectedIds as empty Set', () => {
    const state = makeState(makeRect('r1'));
    state.selectedIds = new Set(['r1']);
    const restored = deserializeState(serializeState(state));
    expect(restored?.selectedIds?.size).toBe(0);
  });
});

describe('deserializeState — error handling', () => {
  it('returns null for non-JSON input', () => {
    expect(deserializeState('not valid json')).toBeNull();
  });

  it('returns null for missing elements field', () => {
    expect(deserializeState('{"version":1}')).toBeNull();
  });

  it('returns null when elements is not an array', () => {
    expect(deserializeState('{"version":1,"elements":"bad"}')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(deserializeState('')).toBeNull();
  });

  it('returns empty map for empty elements array', () => {
    const result = deserializeState('{"version":1,"elements":[]}');
    expect(result?.elements?.size).toBe(0);
  });
});
