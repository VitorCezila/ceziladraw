import { test, expect } from '@playwright/test';
import { getAppState, getUIState, dragOnCanvas, clearCanvas } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => !!(window as any).__ceziladraw);
  await clearCanvas(page);
});

test('F-12: Hand tool pans the viewport', async ({ page }) => {
  const vpBefore = (await getUIState(page)).viewport;
  await page.keyboard.press('h');
  await dragOnCanvas(page, 400, 300, 500, 350);
  await page.waitForTimeout(50);
  const vpAfter = (await getUIState(page)).viewport;
  expect(vpAfter.x).toBeGreaterThan(vpBefore.x);
  expect(vpAfter.y).toBeGreaterThan(vpBefore.y);
});

test('F-12: Hand tool pan does not mutate elements', async ({ page }) => {
  await page.keyboard.press('r');
  await dragOnCanvas(page, 200, 200, 400, 350);
  const stateBefore = await getAppState(page);
  await page.keyboard.press('h');
  await dragOnCanvas(page, 400, 300, 500, 350);
  const stateAfter = await getAppState(page);
  expect(stateAfter.elementCount).toBe(stateBefore.elementCount);
  expect(stateAfter.elements[0].x).toBe(stateBefore.elements[0].x);
});

test('F-13: Space key activates hand tool temporarily', async ({ page }) => {
  await page.keyboard.press('r');
  const uiBefore = await getUIState(page);
  expect(uiBefore.activeTool).toBe('rectangle');
  await page.keyboard.down('Space');
  await page.waitForTimeout(50);
  const uiDuringSpace = await getUIState(page);
  expect(uiDuringSpace.activeTool).toBe('hand');
  await page.keyboard.up('Space');
  await page.waitForTimeout(50);
  const uiAfterSpace = await getUIState(page);
  expect(uiAfterSpace.activeTool).toBe('rectangle');
});

test('F-14: Ctrl+scroll zooms in', async ({ page }) => {
  const vpBefore = (await getUIState(page)).viewport;
  await page.mouse.move(400, 300);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -200);
  await page.keyboard.up('Control');
  await page.waitForTimeout(50);
  const vpAfter = (await getUIState(page)).viewport;
  expect(vpAfter.zoom).toBeGreaterThan(vpBefore.zoom);
});

test('F-14: Ctrl+scroll zooms out', async ({ page }) => {
  const vpBefore = (await getUIState(page)).viewport;
  await page.mouse.move(400, 300);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, 200);
  await page.keyboard.up('Control');
  await page.waitForTimeout(50);
  const vpAfter = (await getUIState(page)).viewport;
  expect(vpAfter.zoom).toBeLessThan(vpBefore.zoom);
});

test('zoom is clamped above MIN_ZOOM', async ({ page }) => {
  await page.keyboard.down('Control');
  for (let i = 0; i < 20; i++) {
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(10);
  }
  await page.keyboard.up('Control');
  const vp = (await getUIState(page)).viewport;
  expect(vp.zoom).toBeGreaterThanOrEqual(0.1);
});

test('zoom-in button increases zoom', async ({ page }) => {
  const vpBefore = (await getUIState(page)).viewport;
  await page.click('#zoom-in');
  await page.waitForTimeout(50);
  const vpAfter = (await getUIState(page)).viewport;
  expect(vpAfter.zoom).toBeGreaterThan(vpBefore.zoom);
});

test('zoom-reset button resets to 1', async ({ page }) => {
  await page.click('#zoom-in');
  await page.waitForTimeout(50);
  await page.click('#zoom-reset');
  await page.waitForTimeout(50);
  const vp = (await getUIState(page)).viewport;
  expect(vp.zoom).toBeCloseTo(1);
  expect(vp.x).toBeCloseTo(0);
  expect(vp.y).toBeCloseTo(0);
});
