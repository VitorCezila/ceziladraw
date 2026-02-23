import { exportToJson, importFromJson } from '../storage/localStorage';
import { setAppState } from '../state/appState';
import { pushHistory, snapshotElements } from '../state/history';
import type { Renderer } from '../renderer/Renderer';

export function initAppMenu(renderer: Renderer): void {
  const btn = document.getElementById('btn-app-menu')!;
  let panel: HTMLElement | null = null;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (panel) {
      close();
    } else {
      open();
    }
  });

  function open(): void {
    panel = buildPanel();
    document.getElementById('app')!.appendChild(panel);
    setTimeout(() => document.addEventListener('click', onClickOutside), 0);
  }

  function close(): void {
    panel?.remove();
    panel = null;
    document.removeEventListener('click', onClickOutside);
  }

  function onClickOutside(e: MouseEvent): void {
    if (panel && !panel.contains(e.target as Node)) {
      close();
    }
  }

  function buildPanel(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'app-menu-panel';

    el.appendChild(makeItem(
      exportSvg(),
      'Export JSON',
      () => {
        exportToJson();
        close();
      },
    ));

    el.appendChild(makeItem(
      importSvg(),
      'Import JSON',
      () => {
        importFromJson();
        setTimeout(() => renderer.requestFullRender(), 300);
        close();
      },
    ));

    el.appendChild(makeDivider());

    el.appendChild(makeItem(
      trashSvg(),
      'Reset Board',
      () => {
        if (confirm('Reset the board? All elements will be deleted. This cannot be undone.')) {
          const before = snapshotElements();
          setAppState({ elements: new Map(), selectedIds: new Set() });
          pushHistory({ elements: before }, { elements: new Map() });
          renderer.requestFullRender();
        }
        close();
      },
      'app-menu-item--danger',
    ));

    el.appendChild(makeDivider());

    el.appendChild(makeItem(
      githubSvg(),
      'GitHub',
      () => {
        window.open('https://github.com/VitorCezila/ceziladraw', '_blank');
        close();
      },
    ));

    return el;
  }

  function makeItem(icon: SVGElement, label: string, onClick: () => void, extraClass?: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'app-menu-item' + (extraClass ? ` ${extraClass}` : '');
    btn.appendChild(icon);
    const text = document.createElement('span');
    text.textContent = label;
    btn.appendChild(text);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });
    return btn;
  }

  function makeDivider(): HTMLElement {
    const div = document.createElement('div');
    div.className = 'app-menu-divider';
    return div;
  }
}

// ── SVG helpers ────────────────────────────────────────────

function makeSvg(path: string): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.innerHTML = path;
  return svg;
}

function exportSvg(): SVGElement {
  return makeSvg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>');
}

function importSvg(): SVGElement {
  return makeSvg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>');
}

function trashSvg(): SVGElement {
  return makeSvg('<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>');
}

function githubSvg(): SVGElement {
  return makeSvg('<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>');
}
