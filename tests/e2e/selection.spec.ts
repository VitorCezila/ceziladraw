import { test, expect } from '@playwright/test';
import { getAppState, dragOnCanvas, clearCanvas } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => !!(window as any).__ceziladraw);
  await clearCanvas(page);
});

async function drawRect(page: any, x1: number, y1: number, x2: number, y2: number) {
  await page.keyboard.press('r');
  await dragOnCanvas(page, x1, y1, x2, y2);
}

test('F-05: click inside element selects it', async ({ page }) => {
  await drawRect(page, 200, 200, 400, 350);
  await page.keyboard.press('v');
  await page.mouse.click(300, 275);
  await page.waitForTimeout(50);
  const state = await getAppState(page);
  expect(state.selectedCount).toBe(1);
});

test('F-06: shift+click adds to selection', async ({ page }) => {
  await drawRect(page, 100, 100, 200, 200);
  await drawRect(page, 350, 350, 450, 450);
  await page.keyboard.press('v');
  await page.mouse.click(150, 150);
  await page.waitForTimeout(50);
  await page.keyboard.down('Shift');
  await page.mouse.click(400, 400);
  await page.keyboard.up('Shift');
  await page.waitForTimeout(50);
  const state = await getAppState(page);
  expect(state.selectedCount).toBe(2);
});

test('F-07: marquee selects all covered elements', async ({ page }) => {
  await drawRect(page, 100, 100, 200, 200);
  await drawRect(page, 300, 300, 400, 400);
  await page.keyboard.press('v');
  // Drag a marquee covering both rectangles
  await dragOnCanvas(page, 50, 50, 450, 450);
  await page.waitForTimeout(50);
  const state = await getAppState(page);
  expect(state.selectedCount).toBe(2);
});

test('F-19: delete selected element removes it', async ({ page }) => {
  await drawRect(page, 200, 200, 400, 350);
  await page.keyboard.press('v');
  await page.mouse.click(300, 275);
  await page.waitForTimeout(50);
  await page.keyboard.press('Delete');
  await page.waitForTimeout(50);
  const state = await getAppState(page);
  expect(state.elementCount).toBe(0);
  expect(state.selectedCount).toBe(0);
});

test('E-10: Ctrl+A with empty canvas does not crash', async ({ page }) => {
  await page.keyboard.press('Control+a');
  await page.waitForTimeout(50);
  const state = await getAppState(page);
  expect(state.selectedCount).toBe(0);
});

test('E-11: Delete key with no selection leaves elements intact', async ({ page }) => {
  await drawRect(page, 200, 200, 400, 350);
  // Do NOT select it
  await page.keyboard.press('v');
  await page.keyboard.press('Delete');
  await page.waitForTimeout(50);
  const state = await getAppState(page);
  expect(state.elementCount).toBe(1);
});

test('click outside deselects all', async ({ page }) => {
  await drawRect(page, 200, 200, 400, 350);
  await page.keyboard.press('v');
  await page.mouse.click(300, 275);
  await page.mouse.click(600, 500);
  await page.waitForTimeout(50);
  const state = await getAppState(page);
  expect(state.selectedCount).toBe(0);
});
