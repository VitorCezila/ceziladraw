import './style.css';
import { CanvasManager } from './canvas/CanvasManager';
import { Renderer } from './renderer/Renderer';
import { ToolManager } from './tools/ToolManager';
import { EventHandler } from './canvas/EventHandler';
import { initStorage, exportToJson, importFromJson } from './storage/localStorage';
import { getAppState, updateElement, removeElements, subscribeToAppState } from './state/appState';
import { subscribeToUIState, setViewport, setActiveStyle, getUIState } from './state/uiState';
import { undo, redo, canUndo, canRedo, subscribeToHistory, snapshotElements, pushHistory } from './state/history';
import { zoomOnPoint } from './geometry/transform';
import { initTheme, toggleTheme, getTheme, getDefaultStrokeColor } from './utils/theme';
import { getSortedElements } from './state/selectors';
import { copySelected, pasteClipboard } from './state/clipboard';
import type { TextElement, StyleObject, DrawableElement, StrokeStyle, CornerStyle } from './types/elements';

const ZOOM_STEP = 0.15;

const FONT_FAMILY_MAP: Record<string, string> = {
  cursive: 'Virgil, "Comic Sans MS", cursive',
  'sans-serif': 'Inter, system-ui, sans-serif',
  monospace: 'monospace',
  serif: 'serif',
};

function fontFamilyKey(family: string): string {
  if (family.includes('cursive') || family.includes('Virgil') || family.includes('Comic')) return 'cursive';
  if (family.includes('monospace')) return 'monospace';
  if (family.includes('serif') && !family.includes('sans')) return 'serif';
  return 'sans-serif';
}

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

  const propPanel = document.getElementById('properties-panel')!;
  const strokeSwatches = document.getElementById('stroke-swatches')!;
  const fillSwatches = document.getElementById('fill-swatches')!;
  const opacitySlider = document.getElementById('opacity-slider') as HTMLInputElement;
  const opacityValue = document.getElementById('opacity-value')!;

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
    container,
  );

  canvasManager.setResizeCallback(() => renderer.requestFullRender());
  renderer.requestFullRender();

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

    container.classList.remove('tool-select', 'tool-text', 'tool-hand');
    const cursorClass: Record<string, string> = { select: 'tool-select', text: 'tool-text', hand: 'tool-hand' };
    if (cursorClass[activeTool]) container.classList.add(cursorClass[activeTool]);

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
    const newStroke = getDefaultStrokeColor();
    setActiveStyle({ strokeColor: newStroke });
  });

  window.addEventListener('themechange', () => {
    updateThemeBtn();
    renderer.requestFullRender();
    const newStroke = getDefaultStrokeColor();
    setActiveStyle({ strokeColor: newStroke });
  });

  // ── Export / Import ──────────────────────────────────────
  btnExport.addEventListener('click', exportToJson);
  btnImport.addEventListener('click', () => {
    importFromJson();
    setTimeout(() => renderer.requestFullRender(), 300);
  });

  // ── Properties panel: stroke color ───────────────────────
  strokeSwatches.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-color]');
    if (!btn) return;
    const color = btn.dataset.color!;
    applyStyleToSelected({ strokeColor: color });
    strokeSwatches.querySelectorAll('.swatch').forEach((s) =>
      s.classList.toggle('active', s === btn),
    );
  });

  // ── Properties panel: fill color ─────────────────────────
  fillSwatches.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-color]');
    if (!btn) return;
    const rawColor = btn.dataset.color!;
    const color = rawColor === 'checker' ? 'transparent' : rawColor;
    applyStyleToSelected({ fillColor: color });
    fillSwatches.querySelectorAll('.swatch').forEach((s) =>
      s.classList.toggle('active', s === btn),
    );
  });

  // ── Properties panel: stroke width ───────────────────────
  propPanel.addEventListener('click', (e) => {
    const swBtn = (e.target as HTMLElement).closest<HTMLButtonElement>('.sw-btn');
    if (swBtn) {
      const width = Number(swBtn.dataset.width);
      applyStyleToSelected({ strokeWidth: width });
      propPanel.querySelectorAll('.sw-btn').forEach((b) => b.classList.toggle('active', b === swBtn));
      return;
    }

    // ── Stroke style ──────────────────────────────────────
    const ssBtn = (e.target as HTMLElement).closest<HTMLButtonElement>('.ss-btn');
    if (ssBtn) {
      const style = ssBtn.dataset.strokeStyle as StrokeStyle;
      applyStyleToSelected({ strokeStyle: style });
      propPanel.querySelectorAll('.ss-btn').forEach((b) => b.classList.toggle('active', b === ssBtn));
      return;
    }

    // ── Roughness (sloppiness) ────────────────────────────
    const roughBtn = (e.target as HTMLElement).closest<HTMLButtonElement>('.rough-btn');
    if (roughBtn) {
      const roughness = Number(roughBtn.dataset.roughness);
      applyStyleToSelected({ roughness });
      propPanel.querySelectorAll('.rough-btn').forEach((b) => b.classList.toggle('active', b === roughBtn));
      return;
    }

    // ── Corner style (edges) ──────────────────────────────
    const edgeBtn = (e.target as HTMLElement).closest<HTMLButtonElement>('.edge-btn');
    if (edgeBtn) {
      const cornerStyle = edgeBtn.dataset.cornerStyle as CornerStyle;
      applyStyleToSelected({ cornerStyle });
      propPanel.querySelectorAll('.edge-btn').forEach((b) => b.classList.toggle('active', b === edgeBtn));
      return;
    }

    // ── Font family ───────────────────────────────────────
    const ffBtn = (e.target as HTMLElement).closest<HTMLButtonElement>('.ff-btn');
    if (ffBtn) {
      const fontKey = ffBtn.dataset.fontFamily!;
      const fontFamily = FONT_FAMILY_MAP[fontKey] ?? fontKey;
      const { selectedIds } = getAppState();
      if (selectedIds.size === 0) return;
      const before = snapshotElements();
      selectedIds.forEach((id) => {
        const el = getAppState().elements.get(id);
        if (!el || el.type !== 'text') return;
        updateElement(id, { fontFamily } as Partial<TextElement>);
      });
      pushHistory({ elements: before }, { elements: snapshotElements() });
      renderer.requestFullRender();
      propPanel.querySelectorAll('.ff-btn').forEach((b) => b.classList.toggle('active', b === ffBtn));
      return;
    }

    // ── Font size ─────────────────────────────────────────
    const fsBtn = (e.target as HTMLElement).closest<HTMLButtonElement>('.fs-btn');
    if (fsBtn) {
      const fontSize = Number(fsBtn.dataset.size);
      const { selectedIds } = getAppState();
      if (selectedIds.size === 0) return;
      const before = snapshotElements();
      selectedIds.forEach((id) => {
        const el = getAppState().elements.get(id);
        if (!el || el.type !== 'text') return;
        updateElement(id, { fontSize } as Partial<TextElement>);
      });
      pushHistory({ elements: before }, { elements: snapshotElements() });
      renderer.requestFullRender();
      propPanel.querySelectorAll('.fs-btn').forEach((b) => b.classList.toggle('active', b === fsBtn));
      return;
    }

    // ── Text align ────────────────────────────────────────
    const taBtn = (e.target as HTMLElement).closest<HTMLButtonElement>('.ta-btn');
    if (taBtn) {
      const textAlign = taBtn.dataset.align as TextElement['textAlign'];
      const { selectedIds } = getAppState();
      if (selectedIds.size === 0) return;
      const before = snapshotElements();
      selectedIds.forEach((id) => {
        const el = getAppState().elements.get(id);
        if (!el || el.type !== 'text') return;
        updateElement(id, { textAlign } as Partial<TextElement>);
      });
      pushHistory({ elements: before }, { elements: snapshotElements() });
      renderer.requestFullRender();
      propPanel.querySelectorAll('.ta-btn').forEach((b) => b.classList.toggle('active', b === taBtn));
      return;
    }
  });

  // ── Opacity slider ────────────────────────────────────────
  opacitySlider.addEventListener('input', () => {
    const pct = Number(opacitySlider.value);
    opacityValue.textContent = String(pct);
    applyStyleToSelected({ opacity: pct / 100 });
  });

  // ── Layer buttons ─────────────────────────────────────────
  document.getElementById('btn-bring-front')!.addEventListener('click', () => {
    const { selectedIds } = getAppState();
    if (selectedIds.size === 0) return;
    const allEls = getSortedElements();
    const maxZ = allEls.length > 0 ? allEls[allEls.length - 1].zIndex : 0;
    const before = snapshotElements();
    let offset = 1;
    selectedIds.forEach((id) => {
      updateElement(id, { zIndex: maxZ + offset } as Partial<DrawableElement>);
      offset++;
    });
    pushHistory({ elements: before }, { elements: snapshotElements() });
    renderer.requestFullRender();
  });

  document.getElementById('btn-send-back')!.addEventListener('click', () => {
    const { selectedIds } = getAppState();
    if (selectedIds.size === 0) return;
    const allEls = getSortedElements();
    const minZ = allEls.length > 0 ? allEls[0].zIndex : 0;
    const before = snapshotElements();
    let offset = 1;
    selectedIds.forEach((id) => {
      updateElement(id, { zIndex: minZ - offset } as Partial<DrawableElement>);
      offset++;
    });
    pushHistory({ elements: before }, { elements: snapshotElements() });
    renderer.requestFullRender();
  });

  document.getElementById('btn-bring-forward')!.addEventListener('click', () => {
    const { selectedIds } = getAppState();
    if (selectedIds.size !== 1) return;
    const [id] = Array.from(selectedIds);
    const el = getAppState().elements.get(id);
    if (!el) return;
    const sorted = getSortedElements();
    const next = sorted.find((e) => e.zIndex > el.zIndex && !selectedIds.has(e.id));
    if (!next) return;
    const before = snapshotElements();
    updateElement(id, { zIndex: next.zIndex + 1 } as Partial<DrawableElement>);
    pushHistory({ elements: before }, { elements: snapshotElements() });
    renderer.requestFullRender();
  });

  document.getElementById('btn-send-backward')!.addEventListener('click', () => {
    const { selectedIds } = getAppState();
    if (selectedIds.size !== 1) return;
    const [id] = Array.from(selectedIds);
    const el = getAppState().elements.get(id);
    if (!el) return;
    const sorted = getSortedElements();
    const prev = [...sorted].reverse().find((e) => e.zIndex < el.zIndex && !selectedIds.has(e.id));
    if (!prev) return;
    const before = snapshotElements();
    updateElement(id, { zIndex: prev.zIndex - 1 } as Partial<DrawableElement>);
    pushHistory({ elements: before }, { elements: snapshotElements() });
    renderer.requestFullRender();
  });

  // ── Action buttons ────────────────────────────────────────
  document.getElementById('btn-duplicate')!.addEventListener('click', () => {
    copySelected();
    pasteClipboard();
    renderer.requestFullRender();
  });

  document.getElementById('btn-delete')!.addEventListener('click', () => {
    const { selectedIds } = getAppState();
    if (selectedIds.size === 0) return;
    const before = snapshotElements();
    removeElements(Array.from(selectedIds));
    pushHistory({ elements: before }, { elements: snapshotElements() });
    renderer.requestFullRender();
  });

  document.getElementById('btn-link')!.addEventListener('click', () => {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
  });

  // ── updatePropertiesPanel ─────────────────────────────────
  function updatePropertiesPanel(): void {
    const { selectedIds } = getAppState();

    if (selectedIds.size === 0) {
      propPanel.classList.remove('visible');
      return;
    }

    propPanel.classList.add('visible');

    const selectedEls = Array.from(selectedIds)
      .map((id) => getAppState().elements.get(id))
      .filter((el): el is DrawableElement => !!el);

    if (selectedEls.length === 0) {
      propPanel.classList.remove('visible');
      return;
    }

    const isText = selectedEls.every((el) => el.type === 'text');
    const isShape = selectedEls.every((el) => el.type !== 'text');
    const isRect = selectedEls.every((el) => el.type === 'rectangle');
    const firstEl = selectedEls[0];
    const firstStyle = firstEl.style;

    const show = (section: string, visible: boolean) => {
      const el = propPanel.querySelector(`[data-section="${section}"]`);
      el?.classList.toggle('show', visible);
    };

    show('stroke', true);
    show('fill', isShape);
    show('stroke-width', isShape);
    show('stroke-style', isShape);
    show('sloppiness', isShape);
    show('edges', isRect);
    show('font-family', isText);
    show('font-size', isText);
    show('text-align', isText);
    show('opacity', true);
    show('layers', true);
    show('actions', true);

    // Sync stroke color swatches
    strokeSwatches.querySelectorAll<HTMLButtonElement>('.swatch').forEach((s) => {
      s.classList.toggle('active', s.dataset.color === firstStyle.strokeColor);
    });

    // Sync fill color swatches
    fillSwatches.querySelectorAll<HTMLButtonElement>('.swatch').forEach((s) => {
      const col = s.dataset.color === 'checker' ? 'transparent' : s.dataset.color;
      s.classList.toggle('active', col === firstStyle.fillColor);
    });

    // Sync stroke width
    propPanel.querySelectorAll<HTMLButtonElement>('.sw-btn').forEach((b) => {
      b.classList.toggle('active', Number(b.dataset.width) === firstStyle.strokeWidth);
    });

    // Sync stroke style
    propPanel.querySelectorAll<HTMLButtonElement>('.ss-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.strokeStyle === (firstStyle.strokeStyle ?? 'solid'));
    });

    // Sync roughness
    propPanel.querySelectorAll<HTMLButtonElement>('.rough-btn').forEach((b) => {
      b.classList.toggle('active', Number(b.dataset.roughness) === firstStyle.roughness);
    });

    // Sync corner style
    propPanel.querySelectorAll<HTMLButtonElement>('.edge-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.cornerStyle === (firstStyle.cornerStyle ?? 'sharp'));
    });

    // Sync opacity slider
    const opacityPct = Math.round((firstStyle.opacity ?? 1) * 100);
    opacitySlider.value = String(opacityPct);
    opacityValue.textContent = String(opacityPct);

    // Sync text-specific controls
    if (isText) {
      const textEl = firstEl as TextElement;
      const ffKey = fontFamilyKey(textEl.fontFamily ?? '');
      propPanel.querySelectorAll<HTMLButtonElement>('.ff-btn').forEach((b) => {
        b.classList.toggle('active', b.dataset.fontFamily === ffKey);
      });

      propPanel.querySelectorAll<HTMLButtonElement>('.fs-btn').forEach((b) => {
        b.classList.toggle('active', Number(b.dataset.size) === textEl.fontSize);
      });

      propPanel.querySelectorAll<HTMLButtonElement>('.ta-btn').forEach((b) => {
        b.classList.toggle('active', b.dataset.align === textEl.textAlign);
      });
    }
  }

  // ── Re-render on state changes ────────────────────────────
  subscribeToAppState(() => {
    renderer.requestFullRender();
    updatePropertiesPanel();
  });

  // Initial panel state
  updatePropertiesPanel();

  // ── Test hook ─────────────────────────────────────────────
  if (import.meta.env.DEV || import.meta.env.MODE === 'production') {
    (window as unknown as Record<string, unknown>)['__ceziladraw'] = {
      getAppState,
      getUIState,
    };
  }
}

main();
