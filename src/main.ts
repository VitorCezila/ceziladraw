import './style.css';
import { CanvasManager } from './canvas/CanvasManager';
import { Renderer } from './renderer/Renderer';
import { ToolManager } from './tools/ToolManager';
import { EventHandler } from './canvas/EventHandler';
import { initStorage, exportToJson, importFromJson } from './storage/localStorage';
import { getAppState, updateElement, subscribeToAppState } from './state/appState';
import { subscribeToUIState, setViewport, setActiveStyle, getUIState } from './state/uiState';
import { undo, redo, canUndo, canRedo, subscribeToHistory, snapshotElements, pushHistory } from './state/history';
import { zoomOnPoint } from './geometry/transform';
import { initTheme, toggleTheme, getTheme, getDefaultStrokeColor } from './utils/theme';
import type { TextElement, TextAlign, StyleObject, DrawableElement } from './types/elements';

const ZOOM_STEP = 0.15;

function main() {
  const container = document.getElementById('canvas-container')!;
  const textContainer = document.getElementById('text-editor-container')!;
  const toolbar = document.getElementById('toolbar')!;
  const zoomLabel = document.getElementById('zoom-label')!;
  const btnUndo = document.getElementById('btn-undo') as HTMLButtonElement;
  const btnRedo = document.getElementById('btn-redo') as HTMLButtonElement;
  const btnExport = document.getElementById('btn-export')!;
  const btnImport = document.getElementById('btn-import')!;
  const btnZoomIn = document.getElementById('zoom-in')!;
  const btnZoomOut = document.getElementById('zoom-out')!;
  const btnZoomReset = document.getElementById('zoom-reset')!;

  const btnTheme = document.getElementById('btn-theme')!;
  const strokeSwatches = document.getElementById('stroke-swatches')!;
  const fillSwatches = document.getElementById('fill-swatches')!;
  const strokeCustom = document.getElementById('stroke-custom') as HTMLInputElement;
  const fillCustom = document.getElementById('fill-custom') as HTMLInputElement;
  const strokeWidthBtns = document.querySelectorAll<HTMLButtonElement>('.sw-btn');
  const textFormatPanel = document.getElementById('text-format-panel')!;

  // ── Core setup ──────────────────────────────────────────
  initTheme();
  initStorage();
  const canvasManager = new CanvasManager(container);
  const renderer = new Renderer(canvasManager.sceneCanvas, canvasManager.interactionCanvas);
  const toolManager = new ToolManager(renderer, textContainer, container);
  new EventHandler(
    canvasManager.interactionCanvas,
    toolManager,
    renderer,
  );

  canvasManager.setResizeCallback(() => renderer.requestFullRender());

  // ── Initial render ───────────────────────────────────────
  renderer.requestFullRender();

  // ── Toolbar buttons ──────────────────────────────────────
  toolbar.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-tool]');
    if (!btn) return;
    const tool = btn.dataset.tool as Parameters<typeof toolManager.setTool>[0];
    toolManager.setTool(tool);
  });

  subscribeToUIState(() => {
    const { activeTool, viewport } = getUIState();

    toolbar.querySelectorAll<HTMLButtonElement>('.tool-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tool === activeTool);
    });

    const cursorMap: Record<string, string> = {
      select: 'tool-select', text: 'tool-text', hand: 'tool-hand',
    };
    const draggingClass = container.classList.contains('dragging') ? ' dragging' : '';
    container.className = (cursorMap[activeTool] ?? '') + draggingClass;

    zoomLabel.textContent = `${Math.round(viewport.zoom * 100)}%`;
  });

  // ── Undo/Redo buttons ────────────────────────────────────
  const updateUndoRedo = () => {
    btnUndo.disabled = !canUndo();
    btnRedo.disabled = !canRedo();
  };
  subscribeToHistory(updateUndoRedo);
  updateUndoRedo();

  btnUndo.addEventListener('click', () => { undo(); renderer.requestFullRender(); });
  btnRedo.addEventListener('click', () => { redo(); renderer.requestFullRender(); });

  // ── Zoom buttons ─────────────────────────────────────────
  const getCenterPoint = () => {
    const rect = canvasManager.sceneCanvas.getBoundingClientRect();
    return { x: rect.width / 2, y: rect.height / 2 };
  };

  btnZoomIn.addEventListener('click', () => {
    const { viewport } = getUIState();
    const { x, y } = getCenterPoint();
    setViewport(zoomOnPoint(viewport, x, y, viewport.zoom * (1 + ZOOM_STEP)));
    renderer.requestFullRender();
  });

  btnZoomOut.addEventListener('click', () => {
    const { viewport } = getUIState();
    const { x, y } = getCenterPoint();
    setViewport(zoomOnPoint(viewport, x, y, viewport.zoom * (1 - ZOOM_STEP)));
    renderer.requestFullRender();
  });

  btnZoomReset.addEventListener('click', () => {
    setViewport({ x: 0, y: 0, zoom: 1 });
    renderer.requestFullRender();
  });

  // ── Theme toggle ─────────────────────────────────────────
  const updateThemeBtn = () => {
    btnTheme.textContent = getTheme() === 'dark' ? '🌙' : '☀️';
    btnTheme.title = getTheme() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  };
  updateThemeBtn();

  btnTheme.addEventListener('click', () => {
    toggleTheme();
    updateThemeBtn();
    renderer.requestFullRender();
  });

  window.addEventListener('themechange', () => {
    updateThemeBtn();
    renderer.requestFullRender();
    // Update active stroke color to match new theme
    const newStroke = getDefaultStrokeColor();
    setActiveStyle({ strokeColor: newStroke });
    strokeCustom.value = newStroke;
    strokeSwatches.querySelectorAll<HTMLButtonElement>('.swatch').forEach((s) => {
      s.classList.toggle('active', s.dataset.color === newStroke);
    });
  });

  // ── Export / Import ──────────────────────────────────────
  btnExport.addEventListener('click', exportToJson);
  btnImport.addEventListener('click', () => {
    importFromJson();
    setTimeout(() => renderer.requestFullRender(), 300);
  });

  // ── Style helper — apply to activeStyle AND any selected elements ────
  function applyStyleToSelected(patch: Partial<StyleObject>): void {
    setActiveStyle(patch);
    const { selectedIds } = getAppState();
    if (selectedIds.size === 0) return;
    const before = snapshotElements();
    let mutated = false;
    selectedIds.forEach((id) => {
      const el = getAppState().elements.get(id);
      if (!el) return;
      updateElement(id, { style: { ...el.style, ...patch } } as Partial<DrawableElement>);
      mutated = true;
    });
    if (mutated) pushHistory({ elements: before }, { elements: snapshotElements() });
  }

  // ── Style panel — stroke color ───────────────────────────
  strokeSwatches.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-color]');
    if (!btn) return;
    const color = btn.dataset.color!;
    applyStyleToSelected({ strokeColor: color });
    strokeCustom.value = color === 'transparent' ? '#000000' : color;
    strokeSwatches.querySelectorAll('.swatch').forEach((s) =>
      s.classList.toggle('active', s === btn),
    );
  });

  strokeCustom.addEventListener('input', () => {
    applyStyleToSelected({ strokeColor: strokeCustom.value });
    strokeSwatches.querySelectorAll('.swatch').forEach((s) => s.classList.remove('active'));
  });

  // ── Style panel — fill color ─────────────────────────────
  fillSwatches.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-color]');
    if (!btn) return;
    const color = btn.dataset.color!;
    applyStyleToSelected({ fillColor: color });
    if (color !== 'transparent') fillCustom.value = color;
    fillSwatches.querySelectorAll('.swatch').forEach((s) =>
      s.classList.toggle('active', s === btn),
    );
  });

  fillCustom.addEventListener('input', () => {
    applyStyleToSelected({ fillColor: fillCustom.value });
    fillSwatches.querySelectorAll('.swatch').forEach((s) => s.classList.remove('active'));
  });

  // ── Style panel — stroke width ───────────────────────────
  strokeWidthBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const width = Number(btn.dataset.width);
      applyStyleToSelected({ strokeWidth: width });
      strokeWidthBtns.forEach((b) => b.classList.toggle('active', b === btn));
    });
  });

  // ── Text format panel ────────────────────────────────────
  const updateTextFormatPanel = () => {
    const { selectedIds } = getAppState();
    if (selectedIds.size !== 1) {
      textFormatPanel.classList.remove('visible');
      return;
    }
    const id = Array.from(selectedIds)[0];
    const el = getAppState().elements.get(id);
    if (!el || el.type !== 'text') {
      textFormatPanel.classList.remove('visible');
      return;
    }
    const textEl = el as TextElement;

    // Position panel above selection box (approximate screen position)
    const { viewport } = getUIState();
    const screenX = textEl.x * viewport.zoom + viewport.x;
    const screenY = textEl.y * viewport.zoom + viewport.y;
    textFormatPanel.style.left = `${Math.max(8, screenX)}px`;
    textFormatPanel.style.top = `${Math.max(8, screenY - 48)}px`;
    textFormatPanel.classList.add('visible');

    textFormatPanel.querySelectorAll<HTMLButtonElement>('[data-size]').forEach((btn) =>
      btn.classList.toggle('active', Number(btn.dataset.size) === textEl.fontSize),
    );
    textFormatPanel.querySelectorAll<HTMLButtonElement>('[data-align]').forEach((btn) =>
      btn.classList.toggle('active', btn.dataset.align === textEl.textAlign),
    );
  };

  textFormatPanel.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-size],[data-align]');
    if (!btn) return;
    const { selectedIds } = getAppState();
    if (selectedIds.size !== 1) return;
    const id = Array.from(selectedIds)[0];
    const el = getAppState().elements.get(id);
    if (!el || el.type !== 'text') return;

    const before = snapshotElements();
    if (btn.dataset.size) {
      updateElement(id, { fontSize: Number(btn.dataset.size) } as Partial<TextElement>);
    }
    if (btn.dataset.align) {
      updateElement(id, { textAlign: btn.dataset.align as TextAlign } as Partial<TextElement>);
    }
    pushHistory({ elements: before }, { elements: snapshotElements() });
    renderer.requestFullRender();
  });

  // ── Re-render on state changes ────────────────────────────
  subscribeToAppState(() => {
    renderer.requestFullRender();
    updateTextFormatPanel();
  });

  // ── Test hook (dev / preview only) ───────────────────────
  if (import.meta.env.DEV || import.meta.env.MODE === 'production') {
    (window as unknown as Record<string, unknown>)['__ceziladraw'] = {
      getAppState,
      getUIState,
    };
  }
}

main();
