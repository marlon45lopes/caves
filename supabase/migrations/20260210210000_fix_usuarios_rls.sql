-- Migration: Fix Usuarios RLS and Function
-- Description: Ensures get_my_role is robust and permissions are clear.

-- 1. Update Helper Function to be more robust
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role AS $$
DECLARE
    v_role public.user_role;
BEGIN
    -- Try to get from table
    SELECT role INTO v_role FROM public.usuarios WHERE id = auth.uid();
    
    -- Fallback: If not in table yet, check JWT metadata (useful during first login/creation)
    IF v_role IS NULL THEN
        v_role := (auth.jwt() -> 'user_metadata' ->> 'role')::public.user_role;
    END IF;
    
    RETURN COALESCE(v_role, 'ATENDENTE'::public.user_role);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. Simplify Policies for Usuarios
DROP POLICY IF EXISTS "usuarios_update_policy" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_delete_policy" ON public.usuarios;

-- Explicitly allow ADMIN to update ANY user
CREATE POLICY "usuarios_update_policy"
ON public.usuarios FOR UPDATE
TO authenticated
USING (
    (SELECT role FROM public.usuarios WHERE id = auth.uid()) = 'ADMIN'::public.user_role
    OR id = auth.uid() -- Everyone can update their own profile (name, etc)
)
WITH CHECK (
    (SELECT role FROM public.usuarios WHERE id = auth.uid()) = 'ADMIN'::public.user_role
    OR id = auth.uid()
);

-- Explicitly allow ADMIN to delete ANY user
CREATE POLICY "usuarios_delete_policy"
ON public.usuarios FOR DELETE
TO authenticated
USING (
    (SELECT role FROM public.usuarios WHERE id = auth.uid()) = 'ADMIN'::public.user_role
);

-- 3. Ensure Marlon is definitely an Admin in the table
-- (Using the ID provided by the user)
INSERT INTO public.usuarios (id, email, nome, role, tipo)
VALUES ('8c8f661f-dd87-473a-9484-6bc2e8f51007', 'marlon45lopes@gmail.com', 'Marlon Lopes', 'ADMIN'::public.user_role, 'admin')
ON CONFLICT (id) DO UPDATE SET role = 'ADMIN'::public.user_role, tipo = 'admin';
