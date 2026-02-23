/**
 * Custom themed modal dialogs — replacements for native prompt() and confirm().
 * Animations, keyboard handling, and backdrop click are all supported.
 */

// ── Shared helpers ──────────────────────────────────────────

function _makeSvg(paths: string): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.innerHTML = paths;
  return svg;
}

function _warningSvg(): SVGElement {
  return _makeSvg(
    '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>' +
    '<line x1="12" y1="9" x2="12" y2="13"/>' +
    '<line x1="12" y1="17" x2="12.01" y2="17"/>',
  );
}

function _editSvg(): SVGElement {
  return _makeSvg(
    '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>' +
    '<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
  );
}

interface BackdropResult {
  backdrop: HTMLDivElement;
  dialog: HTMLDivElement;
}

function _createBackdrop(): BackdropResult {
  const backdrop = document.createElement('div');
  backdrop.className = 'dialog-backdrop';

  const dialog = document.createElement('div');
  dialog.className = 'dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');

  backdrop.appendChild(dialog);
  document.getElementById('app')!.appendChild(backdrop);

  return { backdrop, dialog };
}

function _closeWithAnimation(backdrop: HTMLDivElement): Promise<void> {
  return new Promise((resolve) => {
    backdrop.classList.add('closing');
    setTimeout(() => {
      backdrop.remove();
      resolve();
    }, 150);
  });
}

// ── showConfirm ─────────────────────────────────────────────

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export function showConfirm(options: ConfirmOptions): Promise<boolean> {
  const {
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    danger = false,
  } = options;

  return new Promise((resolve) => {
    const { backdrop, dialog } = _createBackdrop();

    // Icon
    const iconWrap = document.createElement('div');
    iconWrap.className = 'dialog-icon dialog-icon--warning';
    iconWrap.appendChild(_warningSvg());

    // Title
    const titleEl = document.createElement('h2');
    titleEl.className = 'dialog-title';
    titleEl.textContent = title;

    // Message
    const msgEl = document.createElement('p');
    msgEl.className = 'dialog-message';
    msgEl.textContent = message;

    // Actions
    const actions = document.createElement('div');
    actions.className = 'dialog-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'dialog-btn dialog-btn--cancel';
    cancelBtn.type = 'button';
    cancelBtn.textContent = cancelLabel;

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'dialog-btn dialog-btn--confirm' + (danger ? ' dialog-btn--danger' : '');
    confirmBtn.type = 'button';
    confirmBtn.textContent = confirmLabel;

    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);

    dialog.appendChild(iconWrap);
    dialog.appendChild(titleEl);
    dialog.appendChild(msgEl);
    dialog.appendChild(actions);

    let settled = false;

    function settle(result: boolean): void {
      if (settled) return;
      settled = true;
      cleanup();
      _closeWithAnimation(backdrop).then(() => resolve(result));
    }

    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') settle(false);
    }

    function onBackdropClick(e: MouseEvent): void {
      if (e.target === backdrop) settle(false);
    }

    function cleanup(): void {
      document.removeEventListener('keydown', onKeyDown);
      backdrop.removeEventListener('click', onBackdropClick);
    }

    cancelBtn.addEventListener('click', () => settle(false));
    confirmBtn.addEventListener('click', () => settle(true));
    backdrop.addEventListener('click', onBackdropClick);
    document.addEventListener('keydown', onKeyDown);

    // Focus confirm button on mount
    requestAnimationFrame(() => confirmBtn.focus());
  });
}

// ── showPrompt ──────────────────────────────────────────────

export interface PromptOptions {
  title: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function showPrompt(options: PromptOptions): Promise<string | null> {
  const {
    title,
    message,
    placeholder = '',
    defaultValue = '',
    confirmLabel = 'OK',
    cancelLabel = 'Cancel',
  } = options;

  return new Promise((resolve) => {
    const { backdrop, dialog } = _createBackdrop();

    // Icon
    const iconWrap = document.createElement('div');
    iconWrap.className = 'dialog-icon dialog-icon--info';
    iconWrap.appendChild(_editSvg());

    // Title
    const titleEl = document.createElement('h2');
    titleEl.className = 'dialog-title';
    titleEl.textContent = title;

    // Optional message
    if (message) {
      const msgEl = document.createElement('p');
      msgEl.className = 'dialog-message';
      msgEl.textContent = message;
      dialog.appendChild(iconWrap);
      dialog.appendChild(titleEl);
      dialog.appendChild(msgEl);
    } else {
      dialog.appendChild(iconWrap);
      dialog.appendChild(titleEl);
    }

    // Input
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'dialog-input';
    input.placeholder = placeholder;
    input.value = defaultValue;

    // Actions
    const actions = document.createElement('div');
    actions.className = 'dialog-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'dialog-btn dialog-btn--cancel';
    cancelBtn.type = 'button';
    cancelBtn.textContent = cancelLabel;

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'dialog-btn dialog-btn--confirm';
    confirmBtn.type = 'button';
    confirmBtn.textContent = confirmLabel;

    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);

    dialog.appendChild(input);
    dialog.appendChild(actions);

    let settled = false;

    function settle(result: string | null): void {
      if (settled) return;
      settled = true;
      cleanup();
      _closeWithAnimation(backdrop).then(() => resolve(result));
    }

    function confirm(): void {
      const val = input.value.trim();
      settle(val.length > 0 ? val : null);
    }

    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') settle(null);
    }

    function onInputKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Enter') {
        e.preventDefault();
        confirm();
      }
    }

    function onBackdropClick(e: MouseEvent): void {
      if (e.target === backdrop) settle(null);
    }

    function cleanup(): void {
      document.removeEventListener('keydown', onKeyDown);
      backdrop.removeEventListener('click', onBackdropClick);
    }

    cancelBtn.addEventListener('click', () => settle(null));
    confirmBtn.addEventListener('click', confirm);
    input.addEventListener('keydown', onInputKeyDown);
    backdrop.addEventListener('click', onBackdropClick);
    document.addEventListener('keydown', onKeyDown);

    // Focus and select input on mount
    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  });
}
