import { test, expect } from '@playwright/test';
import { getAppState, dragOnCanvas, clearCanvas } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => !!(window as any).__ceziladraw);
  await clearCanvas(page);
});

test('F-16: elements persist after page reload', async ({ page }) => {
  await page.keyboard.press('r');
  await dragOnCanvas(page, 200, 200, 400, 350);
  const stateBefore = await getAppState(page);
  expect(stateBefore.elementCount).toBe(1);
  const originalEl = stateBefore.elements[0];

  // Wait for auto-save debounce (500ms)
  await page.waitForTimeout(700);
  await page.reload();
  await page.waitForFunction(() => !!(window as any).__ceziladraw);

  const stateAfter = await getAppState(page);
  expect(stateAfter.elementCount).toBe(1);
  const restoredEl = stateAfter.elements[0];
  expect(restoredEl.id).toBe(originalEl.id);
  expect(restoredEl.type).toBe(originalEl.type);
  expect(restoredEl.x).toBeCloseTo(originalEl.x, 0);
  expect(restoredEl.y).toBeCloseTo(originalEl.y, 0);
  expect(restoredEl.width).toBeCloseTo(originalEl.width, 0);
  expect(restoredEl.height).toBeCloseTo(originalEl.height, 0);
});

test('E-09: corrupted localStorage loads empty canvas without crash', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('ceziladraw_state', '{"version":1,"elements":"corrupt"}');
  });
  await page.reload();
  await page.waitForFunction(() => !!(window as any).__ceziladraw);
  const state = await getAppState(page);
  expect(state.elementCount).toBe(0);
});

test('E-09: invalid JSON in localStorage loads empty canvas', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('ceziladraw_state', 'not json at all {{{}}}');
  });
  await page.reload();
  await page.waitForFunction(() => !!(window as any).__ceziladraw);
  const state = await getAppState(page);
  expect(state.elementCount).toBe(0);
});

test('multiple elements persist after reload', async ({ page }) => {
  await page.keyboard.press('r');
  await dragOnCanvas(page, 100, 100, 200, 200);
  await page.keyboard.press('o');
  await dragOnCanvas(page, 300, 300, 450, 400);
  await page.waitForTimeout(700);
  await page.reload();
  await page.waitForFunction(() => !!(window as any).__ceziladraw);
  const state = await getAppState(page);
  expect(state.elementCount).toBe(2);
});
