import { test, expect } from '@playwright/test';
import { getAppState, dragOnCanvas, clearCanvas } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => !!(window as any).__ceziladraw);
  await clearCanvas(page);
});

test('F-23: click stroke swatch then draw rect — element uses swatch color', async ({ page }) => {
  // Click the red stroke swatch (#ef4444)
  const redSwatch = page
    .locator('#stroke-swatches .swatch[data-color="#ef4444"]');
  await redSwatch.click();

  // Draw a rect
  await page.keyboard.press('r');
  await dragOnCanvas(page, 200, 200, 400, 350);

  const state = await getAppState(page);
  expect(state.elementCount).toBe(1);
  expect(state.elements[0].style.strokeColor).toBe('#ef4444');
});

test('F-24: toggle dark mode then draw rect — stroke color is light (#cdd6f4)', async ({ page }) => {
  // Toggle to dark mode
  await page.click('#btn-theme');
  await page.waitForTimeout(100);

  // Draw a rect
  await page.keyboard.press('r');
  await dragOnCanvas(page, 200, 200, 400, 350);

  const state = await getAppState(page);
  expect(state.elementCount).toBe(1);
  expect(state.elements[0].style.strokeColor).toBe('#cdd6f4');
});

test('F-23: clicking fill swatch sets fill color on new elements', async ({ page }) => {
  // Click the light blue fill swatch (#bfdbfe)
  const blueFill = page.locator('#fill-swatches .swatch[data-color="#bfdbfe"]');
  await blueFill.click();

  await page.keyboard.press('r');
  await dragOnCanvas(page, 200, 200, 400, 350);

  const state = await getAppState(page);
  expect(state.elements[0].style.fillColor).toBe('#bfdbfe');
});

test('stroke width button sets strokeWidth on new elements', async ({ page }) => {
  // Click the 4px width button
  await page.click('.sw-btn[data-width="4"]');

  await page.keyboard.press('r');
  await dragOnCanvas(page, 200, 200, 400, 350);

  const state = await getAppState(page);
  expect(state.elements[0].style.strokeWidth).toBe(4);
});
