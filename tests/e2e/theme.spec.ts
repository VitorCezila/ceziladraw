import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => !!(window as any).__ceziladraw);
  // Reset to light mode before each test
  await page.evaluate(() => {
    document.documentElement.removeAttribute('data-theme');
    localStorage.removeItem('ceziladraw_theme');
  });
  await page.reload();
  await page.waitForFunction(() => !!(window as any).__ceziladraw);
});

test('F-17: clicking theme button sets dark mode', async ({ page }) => {
  // Force light mode baseline
  const initialTheme = await page.evaluate(() => document.documentElement.dataset.theme);
  if (initialTheme === 'dark') {
    await page.click('#btn-theme');
    await page.waitForTimeout(50);
  }
  await page.click('#btn-theme');
  await page.waitForTimeout(50);
  const theme = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(theme).toBe('dark');
});

test('F-17: dark mode sets localStorage key', async ({ page }) => {
  const initialTheme = await page.evaluate(() => document.documentElement.dataset.theme);
  if (initialTheme === 'dark') {
    await page.click('#btn-theme');
    await page.waitForTimeout(50);
  }
  await page.click('#btn-theme');
  await page.waitForTimeout(50);
  const stored = await page.evaluate(() => localStorage.getItem('ceziladraw_theme'));
  expect(stored).toBe('dark');
});

test('F-18: dark mode persists after reload', async ({ page }) => {
  const initialTheme = await page.evaluate(() => document.documentElement.dataset.theme);
  if (initialTheme === 'dark') {
    await page.click('#btn-theme');
    await page.waitForTimeout(50);
  }
  await page.click('#btn-theme');
  await page.waitForTimeout(50);
  await page.reload();
  await page.waitForFunction(() => !!(window as any).__ceziladraw);
  const theme = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(theme).toBe('dark');
});

test('toggling twice returns to light mode', async ({ page }) => {
  const initialTheme = await page.evaluate(() => document.documentElement.dataset.theme);
  if (initialTheme === 'dark') {
    await page.click('#btn-theme');
    await page.waitForTimeout(50);
  }
  await page.click('#btn-theme');
  await page.waitForTimeout(50);
  await page.click('#btn-theme');
  await page.waitForTimeout(50);
  const theme = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(theme).toBe('light');
});
