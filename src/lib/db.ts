/**
 * Typed database operations for workspaces and boards.
 * All functions are no-ops (returning safe defaults) when Supabase is not configured.
 */

import { supabase, SUPABASE_ENABLED } from './supabase';

// ── Types ──────────────────────────────────────────────────

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface Board {
  id: string;
  workspace_id: string;
  name: string;
  element_count: number;
  updated_at: string;
}

export interface BoardData {
  board_id: string;
  elements: object;
  version: number;
  updated_at: string;
}

// ── Workspace helpers ──────────────────────────────────────

/**
 * Returns the user's personal workspace, creating it on first login.
 */
export async function getOrCreatePersonalWorkspace(userId: string): Promise<Workspace | null> {
  if (!SUPABASE_ENABLED || !supabase) return null;

  const { data: existing } = await supabase
    .from('workspaces')
    .select('*')
    .eq('owner_id', userId)
    .limit(1)
    .single();

  if (existing) return existing as Workspace;

  const { data: created, error } = await supabase
    .from('workspaces')
    .insert({ name: 'My Workspace', owner_id: userId })
    .select()
    .single();

  if (error) {
    console.error('[db] Failed to create workspace:', error.message);
    return null;
  }
  return created as Workspace;
}

// ── Board helpers ──────────────────────────────────────────

export async function listBoards(workspaceId: string): Promise<Board[]> {
  if (!SUPABASE_ENABLED || !supabase) return [];

  const { data, error } = await supabase
    .from('boards')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[db] Failed to list boards:', error.message);
    return [];
  }
  return (data ?? []) as Board[];
}

export async function createBoard(workspaceId: string, name: string): Promise<Board | null> {
  if (!SUPABASE_ENABLED || !supabase) return null;

  const { data, error } = await supabase
    .from('boards')
    .insert({ workspace_id: workspaceId, name, element_count: 0 })
    .select()
    .single();

  if (error) {
    console.error('[db] Failed to create board:', error.message);
    return null;
  }

  // Initialise empty board_data row
  await supabase.from('board_data').insert({
    board_id: data.id,
    elements: { version: 1, elements: [] },
    version: 0,
  });

  return data as Board;
}

export async function renameBoard(boardId: string, name: string): Promise<void> {
  if (!SUPABASE_ENABLED || !supabase) return;

  const { error } = await supabase
    .from('boards')
    .update({ name })
    .eq('id', boardId);

  if (error) console.error('[db] Failed to rename board:', error.message);
}

export async function deleteBoard(boardId: string): Promise<void> {
  if (!SUPABASE_ENABLED || !supabase) return;

  // board_data is deleted via ON DELETE CASCADE
  const { error } = await supabase.from('boards').delete().eq('id', boardId);
  if (error) console.error('[db] Failed to delete board:', error.message);
}

// ── Board data helpers ─────────────────────────────────────

export async function loadBoardData(boardId: string): Promise<object | null> {
  if (!SUPABASE_ENABLED || !supabase) return null;

  const { data, error } = await supabase
    .from('board_data')
    .select('elements')
    .eq('board_id', boardId)
    .single();

  if (error) {
    console.error('[db] Failed to load board data:', error.message);
    return null;
  }
  return data?.elements ?? null;
}

export async function saveBoardData(
  boardId: string,
  elements: object,
  elementCount: number,
): Promise<void> {
  if (!SUPABASE_ENABLED || !supabase) return;

  const { error: dataErr } = await supabase.from('board_data').upsert(
    { board_id: boardId, elements, version: Date.now() },
    { onConflict: 'board_id' },
  );

  if (dataErr) {
    console.error('[db] Failed to save board data:', dataErr.message);
    return;
  }

  // Keep element_count in sync for the board list view
  await supabase
    .from('boards')
    .update({ element_count: elementCount, updated_at: new Date().toISOString() })
    .eq('id', boardId);
}
