import type { DrawableElement } from '../types/elements';
import { getAppState, addElement } from './appState';
import { pushHistory, snapshotElements } from './history';
import { generateId } from '../utils/id';

const PASTE_OFFSET = 20;

let _clipboard: DrawableElement[] = [];

export function copySelected(): void {
  const { elements, selectedIds } = getAppState();
  _clipboard = [];
  selectedIds.forEach((id) => {
    const el = elements.get(id);
    if (el) _clipboard.push({ ...el, style: { ...el.style } } as DrawableElement);
  });
}

export function pasteClipboard(): void {
  if (_clipboard.length === 0) return;

  const before = snapshotElements();
  _clipboard.forEach((el) => {
    const clone = {
      ...el,
      id: generateId(),
      x: el.x + PASTE_OFFSET,
      y: el.y + PASTE_OFFSET,
      style: { ...el.style },
      version: 0,
    } as DrawableElement;
    addElement(clone);
  });
  pushHistory({ elements: before }, { elements: snapshotElements() });

  // Update clipboard to the newly pasted positions so repeated Ctrl+V cascades
  _clipboard = _clipboard.map((el) => ({
    ...el,
    x: el.x + PASTE_OFFSET,
    y: el.y + PASTE_OFFSET,
  })) as DrawableElement[];
}

export function hasClipboard(): boolean {
  return _clipboard.length > 0;
}
