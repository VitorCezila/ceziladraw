import { describe, it, expect, beforeEach, vi } from 'vitest';

// Each test block gets a fresh module instance to avoid singleton state bleed
let pushHistory: typeof import('../../../src/state/history').pushHistory;
let undo: typeof import('../../../src/state/history').undo;
let redo: typeof import('../../../src/state/history').redo;
let canUndo: typeof import('../../../src/state/history').canUndo;
let canRedo: typeof import('../../../src/state/history').canRedo;

beforeEach(async () => {
  vi.resetModules();
  const historyMod = await import('../../../src/state/history');
  const appStateMod = await import('../../../src/state/appState');
  pushHistory = historyMod.pushHistory;
  undo = historyMod.undo;
  redo = historyMod.redo;
  canUndo = historyMod.canUndo;
  canRedo = historyMod.canRedo;
  // Reset appState to empty
  appStateMod.setAppState({ elements: new Map(), selectedIds: new Set() });
});

function makePatch(label: string) {
  const elements = new Map();
  elements.set(label, {
    id: label, type: 'rectangle', x: 0, y: 0, width: 10, height: 10,
    angle: 0, zIndex: 0, groupId: null,
    style: { strokeColor: '#000', strokeWidth: 1, fillColor: 'transparent', fillStyle: 'none', roughness: 0, opacity: 1 },
    version: 0, seed: 0,
  } as any);
  return { elements };
}

describe('canUndo / canRedo — initial state', () => {
  it('canUndo is false initially', () => {
    expect(canUndo()).toBe(false);
  });
  it('canRedo is false initially', () => {
    expect(canRedo()).toBe(false);
  });
});

describe('pushHistory + undo + redo', () => {
  it('canUndo is true after push', () => {
    pushHistory(makePatch('before'), makePatch('after'));
    expect(canUndo()).toBe(true);
  });

  it('undo applies before patch', async () => {
    const { getAppState, setAppState } = await import('../../../src/state/appState');
    const before = makePatch('state-a');
    const after = makePatch('state-b');
    setAppState(after);
    pushHistory(before, after);
    undo();
    expect(getAppState().elements.has('state-a')).toBe(true);
  });

  it('redo applies after patch', async () => {
    const { getAppState, setAppState } = await import('../../../src/state/appState');
    const before = makePatch('state-a');
    const after = makePatch('state-b');
    setAppState(after);
    pushHistory(before, after);
    undo();
    redo();
    expect(getAppState().elements.has('state-b')).toBe(true);
  });

  it('canRedo becomes true after undo', () => {
    pushHistory(makePatch('a'), makePatch('b'));
    undo();
    expect(canRedo()).toBe(true);
  });

  it('canRedo becomes false after new push', () => {
    pushHistory(makePatch('a'), makePatch('b'));
    undo();
    pushHistory(makePatch('c'), makePatch('d'));
    expect(canRedo()).toBe(false);
  });
});

describe('undo stack cap at 100', () => {
  it('caps the stack at 100 entries', () => {
    for (let i = 0; i < 101; i++) {
      pushHistory(makePatch(`before-${i}`), makePatch(`after-${i}`));
    }
    // Still can undo (stack is capped at 100, not cleared)
    expect(canUndo()).toBe(true);
    // Undo all 100 entries
    for (let i = 0; i < 100; i++) undo();
    // The 101st entry was evicted — cannot undo further
    expect(canUndo()).toBe(false);
  });
});

describe('undo on empty stack', () => {
  it('does not throw', () => {
    expect(() => undo()).not.toThrow();
  });
});

describe('redo on empty stack', () => {
  it('does not throw', () => {
    expect(() => redo()).not.toThrow();
  });
});
