import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { DrawableElement } from '../../../src/types/elements';
import { DEFAULT_STYLE } from '../../../src/types/elements';

let getAppState: typeof import('../../../src/state/appState').getAppState;
let setAppState: typeof import('../../../src/state/appState').setAppState;
let addElement: typeof import('../../../src/state/appState').addElement;
let updateElement: typeof import('../../../src/state/appState').updateElement;
let removeElements: typeof import('../../../src/state/appState').removeElements;
let subscribeToAppState: typeof import('../../../src/state/appState').subscribeToAppState;

beforeEach(async () => {
  vi.resetModules();
  const mod = await import('../../../src/state/appState');
  getAppState = mod.getAppState;
  setAppState = mod.setAppState;
  addElement = mod.addElement;
  updateElement = mod.updateElement;
  removeElements = mod.removeElements;
  subscribeToAppState = mod.subscribeToAppState;
  setAppState({ elements: new Map(), selectedIds: new Set() });
});

function makeElement(id: string): DrawableElement {
  return {
    id, type: 'rectangle', x: 10, y: 20, width: 100, height: 50,
    angle: 0, zIndex: 1, groupId: null,
    style: { ...DEFAULT_STYLE },
    version: 0, seed: 42,
  };
}

describe('addElement', () => {
  it('adds element to map', () => {
    addElement(makeElement('el-1'));
    expect(getAppState().elements.has('el-1')).toBe(true);
  });

  it('preserves existing elements on add', () => {
    addElement(makeElement('el-1'));
    addElement(makeElement('el-2'));
    expect(getAppState().elements.size).toBe(2);
  });
});

describe('updateElement', () => {
  it('updates element fields', () => {
    addElement(makeElement('el-1'));
    updateElement('el-1', { x: 99 });
    expect(getAppState().elements.get('el-1')?.x).toBe(99);
  });

  it('increments version on update', () => {
    addElement(makeElement('el-1'));
    updateElement('el-1', { x: 50 });
    expect(getAppState().elements.get('el-1')?.version).toBe(1);
  });

  it('does nothing for unknown id', () => {
    expect(() => updateElement('nonexistent', { x: 0 })).not.toThrow();
    expect(getAppState().elements.size).toBe(0);
  });
});

describe('removeElements', () => {
  it('removes specified elements', () => {
    addElement(makeElement('el-1'));
    addElement(makeElement('el-2'));
    removeElements(['el-1']);
    expect(getAppState().elements.has('el-1')).toBe(false);
    expect(getAppState().elements.has('el-2')).toBe(true);
  });

  it('removes from selectedIds as well', () => {
    addElement(makeElement('el-1'));
    setAppState({ selectedIds: new Set(['el-1']) });
    removeElements(['el-1']);
    expect(getAppState().selectedIds.has('el-1')).toBe(false);
  });

  it('does nothing for unknown ids', () => {
    addElement(makeElement('el-1'));
    expect(() => removeElements(['unknown'])).not.toThrow();
    expect(getAppState().elements.size).toBe(1);
  });
});

describe('subscribeToAppState', () => {
  it('calls listener on state change', () => {
    const listener = vi.fn();
    subscribeToAppState(listener);
    addElement(makeElement('el-1'));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('unsubscribe stops listener from firing', () => {
    const listener = vi.fn();
    const unsub = subscribeToAppState(listener);
    unsub();
    addElement(makeElement('el-1'));
    expect(listener).not.toHaveBeenCalled();
  });
});
