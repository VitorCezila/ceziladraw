import { describe, it, expect } from 'vitest';
import {
  screenToWorld,
  worldToScreen,
  zoomOnPoint,
  rotatePoint,
  toElementLocalSpace,
  MIN_ZOOM,
  MAX_ZOOM,
} from '../../../src/geometry/transform';
import type { Viewport } from '../../../src/types/geometry';

const DEFAULT_VP: Viewport = { x: 0, y: 0, zoom: 1 };

describe('screenToWorld / worldToScreen — inverse pair', () => {
  it('are inverse at zoom=1, no offset', () => {
    const world = screenToWorld(300, 200, DEFAULT_VP);
    const screen = worldToScreen(world.x, world.y, DEFAULT_VP);
    expect(screen.x).toBeCloseTo(300);
    expect(screen.y).toBeCloseTo(200);
  });

  it('are inverse at zoom=2 with offset', () => {
    const vp: Viewport = { x: 100, y: 50, zoom: 2 };
    const world = screenToWorld(400, 300, vp);
    const screen = worldToScreen(world.x, world.y, vp);
    expect(screen.x).toBeCloseTo(400);
    expect(screen.y).toBeCloseTo(300);
  });

  it('screenToWorld accounts for pan offset', () => {
    const vp: Viewport = { x: 100, y: 0, zoom: 1 };
    const world = screenToWorld(200, 0, vp);
    expect(world.x).toBeCloseTo(100);
  });

  it('screenToWorld accounts for zoom', () => {
    const vp: Viewport = { x: 0, y: 0, zoom: 2 };
    const world = screenToWorld(200, 100, vp);
    expect(world.x).toBeCloseTo(100);
    expect(world.y).toBeCloseTo(50);
  });
});

describe('zoomOnPoint', () => {
  it('clamps zoom at MIN_ZOOM', () => {
    const vp: Viewport = { x: 0, y: 0, zoom: 0.15 };
    const result = zoomOnPoint(vp, 400, 300, 0.01);
    expect(result.zoom).toBe(MIN_ZOOM);
  });

  it('clamps zoom at MAX_ZOOM', () => {
    const vp: Viewport = { x: 0, y: 0, zoom: 19 };
    const result = zoomOnPoint(vp, 400, 300, 999);
    expect(result.zoom).toBe(MAX_ZOOM);
  });

  it('world point under cursor stays fixed after zoom', () => {
    const vp: Viewport = { x: 0, y: 0, zoom: 1 };
    const screenX = 400;
    const screenY = 300;

    const worldBefore = screenToWorld(screenX, screenY, vp);
    const newVp = zoomOnPoint(vp, screenX, screenY, 2);
    const worldAfter = screenToWorld(screenX, screenY, newVp);

    expect(worldAfter.x).toBeCloseTo(worldBefore.x);
    expect(worldAfter.y).toBeCloseTo(worldBefore.y);
  });

  it('world point is preserved when zooming out', () => {
    const vp: Viewport = { x: -50, y: -30, zoom: 2 };
    const screenX = 300;
    const screenY = 200;
    const worldBefore = screenToWorld(screenX, screenY, vp);
    const newVp = zoomOnPoint(vp, screenX, screenY, 0.5);
    const worldAfter = screenToWorld(screenX, screenY, newVp);
    expect(worldAfter.x).toBeCloseTo(worldBefore.x);
    expect(worldAfter.y).toBeCloseTo(worldBefore.y);
  });
});

describe('rotatePoint', () => {
  it('angle=0 returns the same point', () => {
    const p = rotatePoint({ x: 10, y: 5 }, { x: 0, y: 0 }, 0);
    expect(p.x).toBeCloseTo(10);
    expect(p.y).toBeCloseTo(5);
  });

  it('rotates 90° around origin', () => {
    const p = rotatePoint({ x: 1, y: 0 }, { x: 0, y: 0 }, Math.PI / 2);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(1);
  });

  it('rotates 180° around origin', () => {
    const p = rotatePoint({ x: 5, y: 0 }, { x: 0, y: 0 }, Math.PI);
    expect(p.x).toBeCloseTo(-5);
    expect(p.y).toBeCloseTo(0);
  });

  it('rotates around an arbitrary center', () => {
    const p = rotatePoint({ x: 10, y: 5 }, { x: 5, y: 5 }, Math.PI / 2);
    expect(p.x).toBeCloseTo(5);
    expect(p.y).toBeCloseTo(10);
  });
});

describe('toElementLocalSpace', () => {
  it('angle=0 returns the same point', () => {
    const local = toElementLocalSpace({ x: 10, y: 20 }, 5, 5, 0);
    expect(local.x).toBeCloseTo(10);
    expect(local.y).toBeCloseTo(20);
  });

  it('inverse of rotatePoint', () => {
    const original = { x: 15, y: 10 };
    const cx = 10;
    const cy = 10;
    const angle = Math.PI / 4;
    const rotated = rotatePoint(original, { x: cx, y: cy }, angle);
    const back = toElementLocalSpace(rotated, cx, cy, angle);
    expect(back.x).toBeCloseTo(original.x);
    expect(back.y).toBeCloseTo(original.y);
  });
});
