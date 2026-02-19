import { test, expect } from '@playwright/test';
import { clearCanvas } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => !!(window as any).__ceziladraw);
  await clearCanvas(page);
});

async function drawText(page: import('@playwright/test').Page, x: number, y: number, text: string) {
  await page.keyboard.press('t');
  await page.mouse.click(x, y);
  await page.waitForTimeout(100);
  await page.keyboard.type(text);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
}

test('F-25: select text element then click L size button → fontSize becomes 28', async ({ page }) => {
  await drawText(page, 300, 250, 'Hello');

  // Select the text element
  await page.keyboard.press('v');
  await page.mouse.click(300, 250);
  await page.waitForTimeout(100);

  // Click the L (28px) button
  await page.click('#text-format-panel .fmt-btn[data-size="28"]');
  await page.waitForTimeout(50);

  const fontSize = await page.evaluate(() => {
    const s = (window as any).__ceziladraw.getAppState();
    return (Array.from(s.elements.values())[0] as any).fontSize;
  });
  expect(fontSize).toBe(28);
});

test('F-26: select text element then click center align → textAlign becomes center', async ({ page }) => {
  await drawText(page, 300, 250, 'World');

  await page.keyboard.press('v');
  await page.mouse.click(300, 250);
  await page.waitForTimeout(100);

  await page.click('#text-format-panel .fmt-btn[data-align="center"]');
  await page.waitForTimeout(50);

  const textAlign = await page.evaluate(() => {
    const s = (window as any).__ceziladraw.getAppState();
    return (Array.from(s.elements.values())[0] as any).textAlign;
  });
  expect(textAlign).toBe('center');
});

test('text format panel not visible when no element selected', async ({ page }) => {
  const visible = await page.locator('#text-format-panel').isVisible();
  expect(visible).toBe(false);
});

test('text format panel not visible when non-text element selected', async ({ page }) => {
  await page.keyboard.press('r');
  // Use page.mouse to draw
  await page.mouse.move(150, 150);
  await page.mouse.down();
  await page.mouse.move(350, 300, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(50);

  await page.keyboard.press('v');
  await page.mouse.click(250, 225);
  await page.waitForTimeout(100);

  const visible = await page.locator('#text-format-panel').isVisible();
  expect(visible).toBe(false);
});
