-- ============================================================
-- Get-or-create personal workspace via RPC (avoids RLS 42501
-- when auth.uid() is not available in the INSERT context).
-- Run in Supabase SQL Editor or: supabase db push
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_or_create_personal_workspace(workspace_name text DEFAULT 'My Workspace')
RETURNS public.workspaces
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w public.workspaces;
  uid uuid;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO w FROM public.workspaces WHERE owner_id = uid LIMIT 1;
  IF FOUND THEN
    RETURN w;
  END IF;

  INSERT INTO public.workspaces (name, owner_id)
  VALUES (workspace_name, uid)
  RETURNING * INTO w;
  RETURN w;
END;
$$;

-- Allow authenticated users (and anon with JWT) to call this
GRANT EXECUTE ON FUNCTION public.get_or_create_personal_workspace(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_personal_workspace(text) TO anon;
