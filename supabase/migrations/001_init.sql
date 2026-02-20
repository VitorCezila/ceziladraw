-- ============================================================
-- Ceziladraw — initial schema
-- Run via: supabase db push  (or paste into Supabase SQL editor)
-- ============================================================

-- ── Extensions ────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Workspaces ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workspaces (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  owner_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Workspace members (future collaboration) ──────────────
CREATE TABLE IF NOT EXISTS public.workspace_members (
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'editor', 'viewer')),
  PRIMARY KEY (workspace_id, user_id)
);

-- ── Boards ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.boards (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL DEFAULT 'Untitled Board',
  element_count INT NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Board data (the actual canvas JSON) ───────────────────
CREATE TABLE IF NOT EXISTS public.board_data (
  board_id   UUID PRIMARY KEY REFERENCES public.boards(id) ON DELETE CASCADE,
  elements   JSONB NOT NULL DEFAULT '{"version":1,"elements":[]}'::jsonb,
  version    BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON public.workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_boards_workspace ON public.boards(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON public.workspace_members(user_id);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.workspaces        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boards            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_data        ENABLE ROW LEVEL SECURITY;

-- Helper: set of workspace IDs the current user can access
CREATE OR REPLACE FUNCTION public.accessible_workspace_ids()
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
  UNION
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
$$;

-- ── Workspace policies ────────────────────────────────────
CREATE POLICY "workspaces: owner or member can read"
  ON public.workspaces FOR SELECT
  USING (id IN (SELECT public.accessible_workspace_ids()));

CREATE POLICY "workspaces: owner can insert"
  ON public.workspaces FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "workspaces: owner can update"
  ON public.workspaces FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "workspaces: owner can delete"
  ON public.workspaces FOR DELETE
  USING (owner_id = auth.uid());

-- ── Workspace member policies ─────────────────────────────
CREATE POLICY "workspace_members: accessible workspace members visible"
  ON public.workspace_members FOR SELECT
  USING (workspace_id IN (SELECT public.accessible_workspace_ids()));

CREATE POLICY "workspace_members: owner can manage"
  ON public.workspace_members FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
  );

-- ── Board policies ────────────────────────────────────────
CREATE POLICY "boards: accessible workspace boards visible"
  ON public.boards FOR SELECT
  USING (workspace_id IN (SELECT public.accessible_workspace_ids()));

CREATE POLICY "boards: accessible workspace members can insert"
  ON public.boards FOR INSERT
  WITH CHECK (workspace_id IN (SELECT public.accessible_workspace_ids()));

CREATE POLICY "boards: accessible workspace members can update"
  ON public.boards FOR UPDATE
  USING (workspace_id IN (SELECT public.accessible_workspace_ids()));

CREATE POLICY "boards: owner can delete"
  ON public.boards FOR DELETE
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
  );

-- ── Board data policies ───────────────────────────────────
CREATE POLICY "board_data: readable if board is readable"
  ON public.board_data FOR SELECT
  USING (
    board_id IN (
      SELECT id FROM public.boards
      WHERE workspace_id IN (SELECT public.accessible_workspace_ids())
    )
  );

CREATE POLICY "board_data: writable if board is writable"
  ON public.board_data FOR ALL
  USING (
    board_id IN (
      SELECT id FROM public.boards
      WHERE workspace_id IN (SELECT public.accessible_workspace_ids())
    )
  );
