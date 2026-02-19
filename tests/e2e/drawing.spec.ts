import { test, expect } from '@playwright/test';
import { getAppState, dragOnCanvas, clearCanvas } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => !!(window as any).__ceziladraw);
  await clearCanvas(page);
});

// ── Rectangle ──────────────────────────────────────────────

test('F-01: draw rectangle adds element', async ({ page }) => {
  await page.keyboard.press('r');
  await dragOnCanvas(page, 200, 200, 400, 350);
  const state = await getAppState(page);
  expect(state.elementCount).toBe(1);
  expect(state.elements[0].type).toBe('rectangle');
  expect(state.elements[0].width).toBeGreaterThan(0);
  expect(state.elements[0].height).toBeGreaterThan(0);
});

test('F-01: draw rectangle switches back to select tool', async ({ page }) => {
  await page.keyboard.press('r');
  await dragOnCanvas(page, 200, 200, 400, 350);
  const ui = await page.evaluate(() => (window as any).__ceziladraw.getUIState().activeTool);
  expect(ui).toBe('select');
});

test('E-01: draw right-to-left produces positive dimensions', async ({ page }) => {
  await page.keyboard.press('r');
  await dragOnCanvas(page, 400, 350, 200, 200);
  const state = await getAppState(page);
  expect(state.elementCount).toBe(1);
  expect(state.elements[0].width).toBeGreaterThan(0);
  expect(state.elements[0].height).toBeGreaterThan(0);
  expect(state.elements[0].x).toBeCloseTo(200, -1);
  expect(state.elements[0].y).toBeCloseTo(200, -1);
});

test('E-02: click without drag discards element', async ({ page }) => {
  await page.keyboard.press('r');
  await page.mouse.move(300, 300);
  await page.mouse.down();
  await page.mouse.up();
  const state = await getAppState(page);
  expect(state.elementCount).toBe(0);
});

// ── Ellipse ────────────────────────────────────────────────

test('F-02: draw ellipse adds element', async ({ page }) => {
  await page.keyboard.press('o');
  await dragOnCanvas(page, 200, 200, 400, 350);
  const state = await getAppState(page);
  expect(state.elementCount).toBe(1);
  expect(state.elements[0].type).toBe('ellipse');
});

// ── Arrow ──────────────────────────────────────────────────

test('F-03: draw arrow adds element with two points', async ({ page }) => {
  await page.keyboard.press('a');
  await dragOnCanvas(page, 200, 200, 400, 350);
  const state = await getAppState(page);
  expect(state.elementCount).toBe(1);
  expect(state.elements[0].type).toBe('arrow');
  expect(state.elements[0].points).toHaveLength(2);
  expect(state.elements[0].endArrowhead).toBe('arrow');
});

// ── Pencil ─────────────────────────────────────────────────

test('F-04: draw pencil adds element with multiple points', async ({ page }) => {
  await page.keyboard.press('p');
  await dragOnCanvas(page, 200, 200, 400, 350, 20);
  const state = await getAppState(page);
  expect(state.elementCount).toBe(1);
  expect(state.elements[0].type).toBe('pencil');
  expect(state.elements[0].points.length).toBeGreaterThanOrEqual(2);
});

test('E-08: pencil mousedown+up without move discards element', async ({ page }) => {
  await page.keyboard.press('p');
  await page.mouse.move(300, 300);
  await page.mouse.down();
  await page.mouse.up();
  const state = await getAppState(page);
  expect(state.elementCount).toBe(0);
});

// ── Diamond ────────────────────────────────────────────────

test('draw diamond adds element', async ({ page }) => {
  await page.keyboard.press('d');
  await dragOnCanvas(page, 200, 200, 400, 350);
  const state = await getAppState(page);
  expect(state.elementCount).toBe(1);
  expect(state.elements[0].type).toBe('diamond');
});
