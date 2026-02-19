import { test, expect } from '@playwright/test';
import { getAppState, dragOnCanvas, clearCanvas } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => !!(window as any).__ceziladraw);
  await clearCanvas(page);
});

test('F-20: drag BR resize handle grows width and height', async ({ page }) => {
  // Draw a rect at (150,150) to (350,300)
  await page.keyboard.press('r');
  await dragOnCanvas(page, 150, 150, 350, 300);

  const before = await getAppState(page);
  const el = before.elements[0];
  expect(el.type).toBe('rectangle');

  // Switch to select and click element
  await page.keyboard.press('Escape');
  await page.keyboard.press('v');
  await page.mouse.click(250, 225);
  await page.waitForTimeout(50);

  const viewport = await page.evaluate(
    () => (window as any).__ceziladraw.getUIState().viewport,
  );
  const zoom = viewport.zoom;

  // BR handle is at (el.x + el.width + 4) * zoom + vp.x, same for y
  const brScreenX = (el.x + el.width + 4) * zoom + viewport.x;
  const brScreenY = (el.y + el.height + 4) * zoom + viewport.y;

  // Drag BR handle 60px right and 40px down
  await dragOnCanvas(page, brScreenX, brScreenY, brScreenX + 60, brScreenY + 40, 15);

  const after = await getAppState(page);
  const resized = after.elements[0];
  expect(resized.width).toBeGreaterThan(el.width + 40);
  expect(resized.height).toBeGreaterThan(el.height + 20);
});

test('E-14: resize → undo → redo restores state correctly', async ({ page }) => {
  // Draw rect
  await page.keyboard.press('r');
  await dragOnCanvas(page, 150, 150, 350, 300);

  const original = await getAppState(page);
  const origEl = original.elements[0];

  // Select and grab BR handle
  await page.keyboard.press('v');
  await page.mouse.click(250, 225);
  await page.waitForTimeout(50);

  const viewport = await page.evaluate(
    () => (window as any).__ceziladraw.getUIState().viewport,
  );
  const zoom = viewport.zoom;

  const brScreenX = (origEl.x + origEl.width + 4) * zoom + viewport.x;
  const brScreenY = (origEl.y + origEl.height + 4) * zoom + viewport.y;

  await dragOnCanvas(page, brScreenX, brScreenY, brScreenX + 80, brScreenY + 60, 15);

  const resized = await getAppState(page);
  expect(resized.elements[0].width).toBeGreaterThan(origEl.width + 50);

  // Undo resize
  await page.keyboard.press('Control+z');
  const afterUndo = await getAppState(page);
  expect(afterUndo.elements[0].width).toBeCloseTo(origEl.width, -1);

  // Redo resize
  await page.keyboard.press('Control+y');
  const afterRedo = await getAppState(page);
  expect(afterRedo.elements[0].width).toBeGreaterThan(origEl.width + 50);

  // Only 1 element (no ghosts)
  expect(afterRedo.elementCount).toBe(1);
});
