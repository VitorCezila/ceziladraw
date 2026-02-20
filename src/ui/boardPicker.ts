/**
 * Board picker panel — lets users switch between boards in their workspace,
 * create new boards, rename, and delete them.
 *
 * Works in local-only mode (Supabase not configured) by skipping cloud ops.
 */

import type { User } from '@supabase/supabase-js';
import { SUPABASE_ENABLED } from '../lib/supabase';
import {
  getOrCreatePersonalWorkspace,
  listBoards,
  createBoard,
  renameBoard,
  deleteBoard,
  type Board,
  type Workspace,
} from '../lib/db';
import { getUIState, setUIState } from '../state/uiState';
import { getAppState, setAppState } from '../state/appState';
import { serializeState, deserializeState } from '../storage/serializer';
import { saveBoardData, loadBoardData } from '../lib/db';

let _workspace: Workspace | null = null;
let _boards: Board[] = [];
let _panel: HTMLElement | null = null;

// ── Public API ─────────────────────────────────────────────

/**
 * Initialises the board picker for the given user.
 * Must be called after auth resolves.
 */
export async function initBoardPicker(user: User | null): Promise<string | null> {
  _renderTrigger();

  if (!SUPABASE_ENABLED || !user) {
    // Local-only: single "Local Board" not backed by cloud
    return null;
  }

  _workspace = await getOrCreatePersonalWorkspace(user.id);
  if (!_workspace) return null;

  _boards = await listBoards(_workspace.id);

  // Create a default board on first login
  if (_boards.length === 0) {
    const board = await createBoard(_workspace.id, 'My First Board');
    if (board) _boards = [board];
  }

  const firstBoardId = _boards[0]?.id ?? null;
  setUIState({ currentBoardId: firstBoardId });
  return firstBoardId;
}

/**
 * Saves the current canvas state to the active board in the cloud.
 * Called by the storage layer on every debounced save.
 */
export async function saveCurrentBoard(): Promise<void> {
  const { currentBoardId } = getUIState();
  if (!currentBoardId) return;

  const state = getAppState();
  const serialized = JSON.parse(serializeState(state));
  const elementCount = state.elements.size;
  await saveBoardData(currentBoardId, serialized, elementCount);
}

// ── Trigger button ─────────────────────────────────────────

function _renderTrigger(): void {
  if (document.getElementById('board-picker-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'board-picker-btn';
  btn.className = 'board-picker-btn';
  btn.title = 'Switch board';
  btn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <path d="M8 21h8M12 17v4"/>
    </svg>
    <span id="board-picker-label">Board</span>
  `;
  btn.addEventListener('click', () => _togglePanel());

  // Insert before the theme button in the actions bar
  const actionsBar = document.getElementById('actions-bar');
  const themeBtn = document.getElementById('btn-theme');
  if (actionsBar && themeBtn) {
    actionsBar.insertBefore(btn, themeBtn);
    const divider = document.createElement('div');
    divider.className = 'actions-divider';
    actionsBar.insertBefore(divider, themeBtn);
  }
}

function _togglePanel(): void {
  if (_panel) {
    _panel.remove();
    _panel = null;
  } else {
    _openPanel();
  }
}

// ── Panel ──────────────────────────────────────────────────

function _openPanel(): void {
  _panel = document.createElement('div');
  _panel.id = 'board-picker-panel';
  _panel.className = 'board-picker-panel';
  _renderPanel();
  document.getElementById('app')!.appendChild(_panel);

  // Close when clicking outside
  setTimeout(() => {
    document.addEventListener('pointerdown', _onOutsideClick, { once: true });
  }, 0);
}

function _onOutsideClick(e: PointerEvent): void {
  if (_panel && !_panel.contains(e.target as Node)) {
    _panel.remove();
    _panel = null;
  }
}

function _renderPanel(): void {
  if (!_panel) return;

  const { currentBoardId } = getUIState();
  const isCloud = SUPABASE_ENABLED && _workspace;

  _panel.innerHTML = `
    <div class="bp-header">
      <span class="bp-workspace-name">${_workspace?.name ?? 'Local Mode'}</span>
      ${isCloud ? `<button class="bp-new-btn" id="bp-new-board">+ New board</button>` : ''}
    </div>
    <ul class="bp-list">
      ${
        isCloud
          ? _boards
              .map(
                (b) => `
          <li class="bp-item ${b.id === currentBoardId ? 'bp-item--active' : ''}" data-id="${b.id}">
            <span class="bp-item-name" data-id="${b.id}">${_esc(b.name)}</span>
            <div class="bp-item-actions">
              <button class="bp-rename" data-id="${b.id}" title="Rename">✏️</button>
              <button class="bp-delete" data-id="${b.id}" title="Delete">🗑</button>
            </div>
          </li>
        `,
              )
              .join('')
          : `<li class="bp-item bp-item--active"><span class="bp-item-name">Local Board</span></li>`
      }
    </ul>
  `;

  _panel.querySelector('#bp-new-board')?.addEventListener('click', _createNewBoard);

  _panel.querySelectorAll<HTMLElement>('.bp-item-name[data-id]').forEach((el) => {
    el.addEventListener('click', () => _switchBoard(el.dataset.id!));
  });

  _panel.querySelectorAll<HTMLButtonElement>('.bp-rename').forEach((btn) => {
    btn.addEventListener('click', () => _renameBoard(btn.dataset.id!));
  });

  _panel.querySelectorAll<HTMLButtonElement>('.bp-delete').forEach((btn) => {
    btn.addEventListener('click', () => _deleteBoard(btn.dataset.id!));
  });
}

// ── Actions ────────────────────────────────────────────────

async function _switchBoard(boardId: string): Promise<void> {
  if (!_workspace) return;

  // Load the selected board's data
  const data = await loadBoardData(boardId);
  if (data) {
    const state = deserializeState(JSON.stringify(data));
    if (state) setAppState(state);
  } else {
    setAppState({ elements: new Map(), selectedIds: new Set() });
  }

  setUIState({ currentBoardId: boardId });
  _updateLabel(boardId);
  _panel?.remove();
  _panel = null;
}

async function _createNewBoard(): Promise<void> {
  if (!_workspace) return;

  const name = prompt('Board name:', 'Untitled Board');
  if (!name) return;

  const board = await createBoard(_workspace.id, name);
  if (board) {
    _boards = [board, ..._boards];
    await _switchBoard(board.id);
  }
}

async function _renameBoard(boardId: string): Promise<void> {
  const board = _boards.find((b) => b.id === boardId);
  if (!board) return;

  const name = prompt('New name:', board.name);
  if (!name || name === board.name) return;

  await renameBoard(boardId, name);
  _boards = _boards.map((b) => (b.id === boardId ? { ...b, name } : b));
  _updateLabel(boardId);
  _renderPanel();
}

async function _deleteBoard(boardId: string): Promise<void> {
  const board = _boards.find((b) => b.id === boardId);
  if (!board) return;
  if (!confirm(`Delete "${board.name}"? This cannot be undone.`)) return;

  await deleteBoard(boardId);
  _boards = _boards.filter((b) => b.id !== boardId);

  const { currentBoardId } = getUIState();
  if (currentBoardId === boardId) {
    // Switch to another board or blank canvas
    const next = _boards[0];
    if (next) {
      await _switchBoard(next.id);
    } else {
      setAppState({ elements: new Map(), selectedIds: new Set() });
      setUIState({ currentBoardId: null });
      _updateLabel(null);
    }
  }
  _renderPanel();
}

function _updateLabel(boardId: string | null): void {
  const label = document.getElementById('board-picker-label');
  if (!label) return;
  const board = _boards.find((b) => b.id === boardId);
  label.textContent = board?.name ?? 'Board';
}

function _esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
