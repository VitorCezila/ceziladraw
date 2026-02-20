import type { Tool } from './ToolManager';
import type { Renderer } from '../renderer/Renderer';
import type { Point } from '../types/geometry';
import type { TextElement } from '../types/elements';
import { setActiveTool, getUIState } from '../state/uiState';
import { addElement, getAppState, setAppState } from '../state/appState';
import { pushHistory, snapshotElements } from '../state/history';
import { generateId, generateSeed } from '../utils/id';
import { getMaxZIndex } from '../state/selectors';
import { computeTextHeight } from '../utils/textLayout';

const FONT_SIZE = 20;
const FONT_FAMILY = 'Virgil, "Comic Sans MS", cursive';

export class TextTool implements Tool {
  private renderer: Renderer;
  private container: HTMLElement;
  private _textarea: HTMLTextAreaElement | null = null;
  private _currentElement: TextElement | null = null;
  private _editingExisting = false;

  constructor(renderer: Renderer, container: HTMLElement) {
    this.renderer = renderer;
    this.container = container;
  }

  onPointerDown(point: Point, _e: PointerEvent): void {
    if (this._textarea) {
      this._commit();
      return;
    }
    this._spawnTextarea(point);
  }

  /** Open the editor for an already-existing text element. */
  beginEdit(el: TextElement): void {
    if (this._textarea) this._commit();
    this._editingExisting = true;
    this._currentElement = { ...el };
    this._spawnTextareaForElement(el);
  }

  onPointerMove(_point: Point, _e: PointerEvent): void {}

  onPointerUp(_point: Point, _e: PointerEvent): void {}

  cancel(): void {
    this._discard();
  }

  private _spawnTextarea(worldPoint: Point): void {
    const { viewport, activeStyle } = getUIState();
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
      style: { ...activeStyle },
      version: 0,
      seed: generateSeed(),
      text: '',
      fontSize: FONT_SIZE,
      fontFamily: FONT_FAMILY,
      textAlign: 'left',
    };
    this._currentElement = el;
    this._editingExisting = false;
    this._mountTextarea(screenX, screenY, FONT_SIZE, FONT_FAMILY, activeStyle.strokeColor, '');
  }

  private _spawnTextareaForElement(el: TextElement): void {
    const { viewport } = getUIState();
    const screenX = el.x * viewport.zoom + viewport.x;
    const screenY = el.y * viewport.zoom + viewport.y;
    this._mountTextarea(screenX, screenY, el.fontSize, el.fontFamily, el.style.strokeColor, el.text);
  }

  private _mountTextarea(
    screenX: number,
    screenY: number,
    fontSize: number,
    fontFamily: string,
    strokeColor: string,
    initialText: string,
  ): void {
    const { viewport } = getUIState();
    const ta = document.createElement('textarea');
    ta.className = 'text-editor';
    ta.style.left = `${screenX}px`;
    ta.style.top = `${screenY}px`;
    ta.style.fontSize = `${fontSize * viewport.zoom}px`;
    ta.style.fontFamily = fontFamily;
    ta.style.color = strokeColor;
    ta.style.padding = '0';
    ta.style.lineHeight = '1.4';
    ta.value = initialText;

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
    requestAnimationFrame(() => {
      ta.focus();
      ta.select();
    });
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
    const base = this._currentElement;

    if (this._editingExisting) {
      const height = computeTextHeight(text, base.width, base.fontSize, base.fontFamily);
      const before = snapshotElements();
      if (text.length > 0) {
        const elements = new Map(getAppState().elements);
        elements.set(base.id, { ...base, text, height });
        setAppState({ elements, selectedIds: new Set([base.id]) });
      } else {
        // Empty text — remove the element
        const elements = new Map(getAppState().elements);
        elements.delete(base.id);
        setAppState({ elements, selectedIds: new Set() });
      }
      pushHistory({ elements: before }, { elements: snapshotElements() });
      this.renderer.renderScene();
    } else if (text.length > 0) {
      const height = computeTextHeight(text, base.width, base.fontSize, base.fontFamily);
      const el = { ...base, text, height };
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
    this._editingExisting = false;
  }
}
