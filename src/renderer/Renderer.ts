import { SceneRenderer } from './SceneRenderer';
import { InteractionRenderer } from './InteractionRenderer';
import { getSortedElements, getSelectedElements } from '../state/selectors';
import { getUIState } from '../state/uiState';
import type { BoundingBox } from '../types/geometry';

export class Renderer {
  private sceneRenderer: SceneRenderer;
  private interactionRenderer: InteractionRenderer;
  private _frameRequested = false;
  private _pendingMarquee: BoundingBox | null = null;

  constructor(sceneCanvas: HTMLCanvasElement, interactionCanvas: HTMLCanvasElement) {
    this.sceneRenderer = new SceneRenderer(sceneCanvas);
    this.interactionRenderer = new InteractionRenderer(interactionCanvas);
  }

  requestFullRender(): void {
    if (this._frameRequested) return;
    this._frameRequested = true;
    requestAnimationFrame(() => {
      this._frameRequested = false;
      this.renderScene();
      this.renderInteraction(this._pendingMarquee);
    });
  }

  renderScene(): void {
    const elements = getSortedElements();
    const { viewport } = getUIState();
    this.sceneRenderer.render(elements, viewport);
  }

  renderInteraction(marquee: BoundingBox | null): void {
    this._pendingMarquee = marquee;
    const { provisionalElement, viewport } = getUIState();
    const selected = getSelectedElements();
    this.interactionRenderer.render(provisionalElement, selected, marquee, viewport);
  }
}
