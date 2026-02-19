import { test, expect } from '@playwright/test';
import { getAppState, getUIState, dragOnCanvas, clearCanvas } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => !!(window as any).__ceziladraw);
  await clearCanvas(page);
});

async function drawRect(page: any) {
  await page.keyboard.press('r');
  await dragOnCanvas(page, 200, 200, 400, 350);
}

test('F-09: Ctrl+Z undoes last draw', async ({ page }) => {
  await drawRect(page);
  expect((await getAppState(page)).elementCount).toBe(1);
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(50);
  expect((await getAppState(page)).elementCount).toBe(0);
});

test('F-10: undo button undoes last draw', async ({ page }) => {
  await drawRect(page);
  await page.click('#btn-undo');
  await page.waitForTimeout(50);
  expect((await getAppState(page)).elementCount).toBe(0);
});

test('F-10: undo button is disabled when stack is empty', async ({ page }) => {
  const btn = page.locator('#btn-undo');
  await expect(btn).toBeDisabled();
});

test('F-10: undo button is enabled after draw', async ({ page }) => {
  await drawRect(page);
  const btn = page.locator('#btn-undo');
  await expect(btn).toBeEnabled();
});

test('F-11: Ctrl+Y redoes after undo', async ({ page }) => {
  await drawRect(page);
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(50);
  await page.keyboard.press('Control+y');
  await page.waitForTimeout(50);
  expect((await getAppState(page)).elementCount).toBe(1);
});

test('F-11: redo button restores element', async ({ page }) => {
  await drawRect(page);
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(50);
  await page.click('#btn-redo');
  await page.waitForTimeout(50);
  expect((await getAppState(page)).elementCount).toBe(1);
});

test('E-03: undo does not undo pan', async ({ page }) => {
  await drawRect(page);
  // Pan by pressing H and dragging
  await page.keyboard.press('h');
  await dragOnCanvas(page, 400, 400, 300, 350);
  const viewportAfterPan = (await getUIState(page)).viewport;
  // Undo — should remove the rectangle, not reverse the pan
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(50);
  expect((await getAppState(page)).elementCount).toBe(0);
  const viewportAfterUndo = (await getUIState(page)).viewport;
  // Pan offset should remain (undo doesn't touch viewport)
  expect(viewportAfterUndo.x).toBeCloseTo(viewportAfterPan.x, 0);
  expect(viewportAfterUndo.y).toBeCloseTo(viewportAfterPan.y, 0);
});

test('E-05: new action clears redo stack', async ({ page }) => {
  await drawRect(page);
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(50);
  // New draw
  await drawRect(page);
  const btn = page.locator('#btn-redo');
  await expect(btn).toBeDisabled();
});
