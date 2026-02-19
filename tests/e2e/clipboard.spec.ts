import { test, expect } from '@playwright/test';
import { getAppState, dragOnCanvas, clearCanvas } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => !!(window as any).__ceziladraw);
  await clearCanvas(page);
});

test('F-27: Ctrl+C then Ctrl+V clones selected element with +20/+20 offset', async ({ page }) => {
  // Draw a rect
  await page.keyboard.press('r');
  await dragOnCanvas(page, 200, 200, 400, 350);

  const before = await getAppState(page);
  const orig = before.elements[0];

  // Select element
  await page.keyboard.press('v');
  await page.mouse.click(300, 275);
  await page.waitForTimeout(50);

  // Copy
  await page.keyboard.press('Control+c');
  // Paste
  await page.keyboard.press('Control+v');
  await page.waitForTimeout(50);

  const after = await getAppState(page);
  expect(after.elementCount).toBe(2);

  // Find the clone (different id)
  const clone = after.elements.find((e: any) => e.id !== orig.id)!;
  expect(clone).toBeDefined();
  expect(clone.x).toBeCloseTo(orig.x + 20, 0);
  expect(clone.y).toBeCloseTo(orig.y + 20, 0);
  expect(clone.width).toBeCloseTo(orig.width, 0);
  expect(clone.height).toBeCloseTo(orig.height, 0);
});

test('F-27: multiple pastes cascade the offset', async ({ page }) => {
  await page.keyboard.press('r');
  await dragOnCanvas(page, 200, 200, 400, 350);

  const before = await getAppState(page);
  const orig = before.elements[0];

  // Select & copy
  await page.keyboard.press('v');
  await page.mouse.click(300, 275);
  await page.waitForTimeout(50);
  await page.keyboard.press('Control+c');

  // Paste twice
  await page.keyboard.press('Control+v');
  await page.waitForTimeout(30);
  await page.keyboard.press('Control+v');
  await page.waitForTimeout(30);

  const after = await getAppState(page);
  expect(after.elementCount).toBe(3);

  // Second paste should be offset by 40px from original
  const sorted = after.elements.slice().sort((a: any, b: any) => a.x - b.x);
  expect(sorted[1].x).toBeCloseTo(orig.x + 20, 0);
  expect(sorted[2].x).toBeCloseTo(orig.x + 40, 0);
});

test('F-28: Ctrl+V with empty clipboard does not crash or add elements', async ({ page }) => {
  // Draw a rect (don't copy it)
  await page.keyboard.press('r');
  await dragOnCanvas(page, 200, 200, 400, 350);

  const before = await getAppState(page);

  // Paste without copying first (clipboard empty)
  await page.keyboard.press('Control+v');
  await page.waitForTimeout(50);

  const after = await getAppState(page);
  expect(after.elementCount).toBe(before.elementCount);
});

test('F-27: copied element can be pasted after undo of previous action', async ({ page }) => {
  // Draw rect
  await page.keyboard.press('r');
  await dragOnCanvas(page, 200, 200, 400, 350);

  // Select & copy
  await page.keyboard.press('v');
  await page.mouse.click(300, 275);
  await page.waitForTimeout(50);
  await page.keyboard.press('Control+c');

  // Undo the draw
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(50);

  // Paste — clipboard still has the element
  await page.keyboard.press('Control+v');
  await page.waitForTimeout(50);

  const after = await getAppState(page);
  // 1 element pasted (the original was undone, clone was added)
  expect(after.elementCount).toBe(1);
});
