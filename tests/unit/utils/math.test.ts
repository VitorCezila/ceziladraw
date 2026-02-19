import { describe, it, expect } from 'vitest';
import { clamp, lerp, distance, degToRad, radToDeg, normalizeAngle } from '../../../src/utils/math';

describe('clamp', () => {
  it('returns value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
  it('clamps below min', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });
  it('clamps above max', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });
  it('works at boundary values', () => {
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });
});

describe('lerp', () => {
  it('returns a at t=0', () => {
    expect(lerp(10, 20, 0)).toBe(10);
  });
  it('returns b at t=1', () => {
    expect(lerp(10, 20, 1)).toBe(20);
  });
  it('returns midpoint at t=0.5', () => {
    expect(lerp(0, 100, 0.5)).toBe(50);
  });
});

describe('distance', () => {
  it('returns 0 for same point', () => {
    expect(distance(5, 5, 5, 5)).toBe(0);
  });
  it('returns correct distance for 3-4-5 triangle', () => {
    expect(distance(0, 0, 3, 4)).toBe(5);
  });
  it('returns correct distance for horizontal segment', () => {
    expect(distance(0, 0, 10, 0)).toBe(10);
  });
});

describe('degToRad / radToDeg', () => {
  it('converts 180° to π', () => {
    expect(degToRad(180)).toBeCloseTo(Math.PI);
  });
  it('converts π to 180°', () => {
    expect(radToDeg(Math.PI)).toBeCloseTo(180);
  });
  it('is a round-trip', () => {
    expect(radToDeg(degToRad(45))).toBeCloseTo(45);
  });
});

describe('normalizeAngle', () => {
  it('keeps values in [0, 2π)', () => {
    const result = normalizeAngle(-0.1);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThan(Math.PI * 2);
  });
  it('normalizes value above 2π', () => {
    const result = normalizeAngle(Math.PI * 3);
    expect(result).toBeCloseTo(Math.PI);
  });
});
