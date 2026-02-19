import { getAppState } from './appState';
import type { DrawableElement } from '../types/elements';

export function getSortedElements(): DrawableElement[] {
  const { elements } = getAppState();
  return Array.from(elements.values()).sort((a, b) => a.zIndex - b.zIndex);
}

export function getSelectedElements(): DrawableElement[] {
  const { elements, selectedIds } = getAppState();
  return Array.from(selectedIds)
    .map((id) => elements.get(id))
    .filter((el): el is DrawableElement => el !== undefined);
}

export function getElementsByGroup(groupId: string): DrawableElement[] {
  const { elements } = getAppState();
  return Array.from(elements.values()).filter((el) => el.groupId === groupId);
}

export function getMaxZIndex(): number {
  const { elements } = getAppState();
  if (elements.size === 0) return 0;
  return Math.max(...Array.from(elements.values()).map((el) => el.zIndex));
}
