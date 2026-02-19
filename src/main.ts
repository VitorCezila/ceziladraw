import './style.css';
import { CanvasManager } from './canvas/CanvasManager';
import { Renderer } from './renderer/Renderer';
import { ToolManager } from './tools/ToolManager';
import { EventHandler } from './canvas/EventHandler';
import { initStorage, exportToJson, importFromJson } from './storage/localStorage';
import { subscribeToAppState } from './state/appState';
import { subscribeToUIState, setViewport, getUIState } from './state/uiState';
import { canUndo, canRedo, subscribeToHistory } from './state/history';
import { zoomOnPoint } from './geometry/transform';

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

  // ── Core setup ──────────────────────────────────────────
  initStorage();
  const canvasManager = new CanvasManager(container);
  const renderer = new Renderer(canvasManager.sceneCanvas, canvasManager.interactionCanvas);
  const toolManager = new ToolManager(renderer, textContainer);
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
      select: 'tool-select', text: 'tool-text',
    };
    container.className = cursorMap[activeTool] ?? '';

    zoomLabel.textContent = `${Math.round(viewport.zoom * 100)}%`;
  });

  // ── Undo/Redo buttons ────────────────────────────────────
  const updateUndoRedo = () => {
    btnUndo.disabled = !canUndo();
    btnRedo.disabled = !canRedo();
  };
  subscribeToHistory(updateUndoRedo);
  updateUndoRedo();

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

  // ── Export / Import ──────────────────────────────────────
  btnExport.addEventListener('click', exportToJson);
  btnImport.addEventListener('click', () => {
    importFromJson();
    setTimeout(() => renderer.requestFullRender(), 300);
  });

  // ── Re-render on state changes ────────────────────────────
  subscribeToAppState(() => renderer.requestFullRender());
}

main();
