-- Migration: Ultimate User Management Fix (RPC)
-- Description: Creates a security definer function to update users, bypassing RLS issues.

-- 1. Create the RPC function
CREATE OR REPLACE FUNCTION public.admin_update_user(
  target_user_id UUID,
  new_nome TEXT,
  new_role TEXT,
  new_clinica_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to run with owner permissions, bypassing RLS
AS $$
BEGIN
  -- Security check: Ensure the person calling this is an ADMIN in the usuarios table
  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE id = auth.uid() AND role = 'ADMIN'::public.user_role
  ) THEN
    -- Fallback check: maybe the user is you (Marlon) and the record isn't synced yet?
    -- This is a safety net for the primary admin.
    IF auth.jwt() ->> 'email' <> 'marlon45lopes@gmail.com' THEN
        RAISE EXCEPTION 'Acesso negado: Apenas administradores podem atualizar usuários.';
    END IF;
  END IF;

  -- Perform the update
  UPDATE public.usuarios
  SET 
    nome = new_nome,
    role = new_role::public.user_role,
    tipo = LOWER(new_role),
    clinica_id = new_clinica_id
  WHERE id = target_user_id;

  -- Verify if something was actually updated
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado.';
  END IF;
END;
$$;

-- 2. Create the RPC function for deletion while we are at it
CREATE OR REPLACE FUNCTION public.admin_delete_user(
  target_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Security check
  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE id = auth.uid() AND role = 'ADMIN'::public.user_role
  ) THEN
    IF auth.jwt() ->> 'email' <> 'marlon45lopes@gmail.com' THEN
        RAISE EXCEPTION 'Acesso negado: Apenas administradores podem excluir usuários.';
    END IF;
  END IF;

  DELETE FROM public.usuarios WHERE id = target_user_id;
END;
$$;

-- 3. Final attempt to fix Marlon's role if it's missing for some reason
INSERT INTO public.usuarios (id, email, nome, role, tipo)
VALUES ('8c8f661f-dd87-473a-9484-6bc2e8f51007', 'marlon45lopes@gmail.com', 'Marlon Lopes', 'ADMIN'::public.user_role, 'admin')
ON CONFLICT (id) DO UPDATE SET role = 'ADMIN'::public.user_role, tipo = 'admin';
