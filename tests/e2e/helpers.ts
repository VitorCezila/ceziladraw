import type { Page } from '@playwright/test';

interface CezilaDrawState {
  elements: { size: number };
  selectedIds: { size: number };
}

interface CezilaDrawWindow {
  getAppState(): {
    elements: Map<string, unknown>;
    selectedIds: Set<string>;
  };
  getUIState(): {
    activeTool: string;
    viewport: { x: number; y: number; zoom: number };
  };
}

export async function getAppState(page: Page) {
  return page.evaluate(() => {
    const api = (window as unknown as { __ceziladraw: CezilaDrawWindow }).__ceziladraw;
    const s = api.getAppState();
    return {
      elementCount: s.elements.size,
      selectedCount: s.selectedIds.size,
      elements: Array.from(s.elements.values()) as any[],
      selectedIds: Array.from(s.selectedIds),
    };
  });
}

export async function getUIState(page: Page) {
  return page.evaluate(() => {
    const api = (window as unknown as { __ceziladraw: CezilaDrawWindow }).__ceziladraw;
    return api.getUIState();
  });
}

export async function dragOnCanvas(
  page: Page,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  steps = 10,
) {
  await page.mouse.move(fromX, fromY);
  await page.mouse.down();
  await page.mouse.move(toX, toY, { steps });
  await page.mouse.up();
}

export async function clearCanvas(page: Page) {
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Delete');
  // Wait for state to settle
  await page.waitForTimeout(50);
}
