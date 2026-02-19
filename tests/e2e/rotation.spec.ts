import { test, expect } from '@playwright/test';
import { dragOnCanvas, clearCanvas } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => !!(window as any).__ceziladraw);
  await clearCanvas(page);
});

test('F-22: drag rotation handle rotates element by ~90°', async ({ page }) => {
  // Draw a large rect so handles are well-positioned
  await page.keyboard.press('r');
  await dragOnCanvas(page, 150, 150, 450, 350);

  // Select it
  await page.keyboard.press('v');
  await page.mouse.click(300, 250);
  await page.waitForTimeout(50);

  const el = await page.evaluate(() => {
    const api = (window as any).__ceziladraw;
    const s = api.getAppState();
    return Array.from(s.elements.values())[0] as any;
  });

  const viewport = await page.evaluate(
    () => (window as any).__ceziladraw.getUIState().viewport,
  );
  const zoom = viewport.zoom;

  // Rotation handle is above TC: x = (el.x + el.width/2), y = el.y - 24
  const rotX = (el.x + el.width / 2) * zoom + viewport.x;
  const rotY = (el.y - 24) * zoom + viewport.y;

  // Center of element in screen space
  const cx = (el.x + el.width / 2) * zoom + viewport.x;
  const cy = (el.y + el.height / 2) * zoom + viewport.y;

  // Drag from rotation handle to a point 90° clockwise from its initial position
  // Initial angle from center to rotHandle ≈ -π/2 (straight up)
  // 90° clockwise from -π/2 is 0 → drag to (cx + radius, cy)
  const radius = Math.hypot(rotX - cx, rotY - cy);
  const targetX = cx + radius;
  const targetY = cy;

  await dragOnCanvas(page, rotX, rotY, targetX, targetY, 20);

  const angleAfter = await page.evaluate(() => {
    const s = (window as any).__ceziladraw.getAppState();
    return (Array.from(s.elements.values())[0] as any).angle;
  });

  // Should be close to π/2 (90°) — allow tolerance of 0.5 rad
  expect(Math.abs(angleAfter)).toBeGreaterThan(0.5);
});
