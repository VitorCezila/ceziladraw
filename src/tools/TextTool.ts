import type { Tool } from './ToolManager';
import type { Renderer } from '../renderer/Renderer';
import type { Point } from '../types/geometry';
import type { TextElement } from '../types/elements';
import { setActiveTool, getUIState } from '../state/uiState';
import { addElement } from '../state/appState';
import { pushHistory, snapshotElements } from '../state/history';
import { generateId, generateSeed } from '../utils/id';
import { DEFAULT_STYLE } from '../types/elements';
import { getMaxZIndex } from '../state/selectors';

const FONT_SIZE = 20;
const FONT_FAMILY = 'Virgil, "Comic Sans MS", cursive';

export class TextTool implements Tool {
  private renderer: Renderer;
  private container: HTMLElement;
  private _textarea: HTMLTextAreaElement | null = null;
  private _currentElement: TextElement | null = null;

  constructor(renderer: Renderer, container: HTMLElement) {
    this.renderer = renderer;
    this.container = container;
  }

  onPointerDown(point: Point, _e: PointerEvent): void {
    if (this._textarea) {
      this._commit();
    }
    this._spawnTextarea(point);
  }

  onPointerMove(_point: Point, _e: PointerEvent): void {}

  onPointerUp(_point: Point, _e: PointerEvent): void {}

  cancel(): void {
    this._discard();
  }

  private _spawnTextarea(worldPoint: Point): void {
    const { viewport } = getUIState();
    const screenX = worldPoint.x * viewport.zoom + viewport.x;
    const screenY = worldPoint.y * viewport.zoom + viewport.y;

    const el: TextElement = {
      id: generateId(),
      type: 'text',
      x: worldPoint.x,
      y: worldPoint.y,
      width: 200,
      height: FONT_SIZE * 1.4,
      angle: 0,
      zIndex: getMaxZIndex() + 1,
      groupId: null,
      style: { ...DEFAULT_STYLE },
      version: 0,
      seed: generateSeed(),
      text: '',
      fontSize: FONT_SIZE,
      fontFamily: FONT_FAMILY,
      textAlign: 'left',
    };
    this._currentElement = el;

    const ta = document.createElement('textarea');
    ta.className = 'text-editor';
    ta.style.left = `${screenX}px`;
    ta.style.top = `${screenY}px`;
    ta.style.fontSize = `${FONT_SIZE * viewport.zoom}px`;
    ta.style.fontFamily = FONT_FAMILY;

    ta.addEventListener('input', () => this._onInput(ta));
    ta.addEventListener('blur', () => this._commit());
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this._discard();
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this._commit();
      }
    });

    this.container.appendChild(ta);
    this._textarea = ta;
    requestAnimationFrame(() => ta.focus());
  }

  private _onInput(ta: HTMLTextAreaElement): void {
    if (!this._currentElement) return;
    this._currentElement = { ...this._currentElement, text: ta.value };
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  }

  private _commit(): void {
    if (!this._currentElement || !this._textarea) return;
    const text = this._textarea.value.trim();

    if (text.length > 0) {
      const el = { ...this._currentElement, text };
      const before = snapshotElements();
      addElement(el);
      pushHistory({ elements: before }, { elements: snapshotElements() });
      this.renderer.renderScene();
    }

    this._cleanup();
    setActiveTool('select');
  }

  private _discard(): void {
    this._cleanup();
  }

  private _cleanup(): void {
    this._textarea?.remove();
    this._textarea = null;
    this._currentElement = null;
  }
}
