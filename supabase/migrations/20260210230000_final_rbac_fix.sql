-- Migration: Final RBAC Fixes
-- Description: Ensures permissions are bulletproof and avoids JSON coercion errors.

-- 1. Optimized and safer role detection
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role AS $$
DECLARE
    v_role text;
BEGIN
    -- Check JWT metadata first (fastest)
    v_role := auth.jwt() -> 'user_metadata' ->> 'role';
    
    -- If not in JWT, check table
    IF v_role IS NULL THEN
        SELECT role::text INTO v_role FROM public.usuarios WHERE id = auth.uid();
    END IF;
    
    RETURN COALESCE(v_role, 'ATENDENTE')::public.user_role;
EXCEPTION WHEN OTHERS THEN
    RETURN 'ATENDENTE'::public.user_role;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. Direct and Simple Policies for USUARIOS
-- Deleting/Updating these policies to rebuild them cleanly
DROP POLICY IF EXISTS "usuarios_update_policy" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_delete_policy" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_select_policy" ON public.usuarios;

-- SELECT is public for authenticated
CREATE POLICY "usuarios_select_policy" ON public.usuarios 
FOR SELECT TO authenticated USING (true);

-- UPDATE: High priority check for ADMIN
CREATE POLICY "usuarios_update_policy" ON public.usuarios 
FOR UPDATE TO authenticated 
USING (
    (SELECT (auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN')
    OR (SELECT role::text FROM public.usuarios WHERE id = auth.uid()) = 'ADMIN'
    OR id = auth.uid()
)
WITH CHECK (
    (SELECT (auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN')
    OR (SELECT role::text FROM public.usuarios WHERE id = auth.uid()) = 'ADMIN'
    OR id = auth.uid()
);

-- DELETE: Admin only
CREATE POLICY "usuarios_delete_policy" ON public.usuarios 
FOR DELETE TO authenticated 
USING (
    (SELECT (auth.jwt() -> 'user_metadata' ->> 'role') = 'ADMIN')
    OR (SELECT role::text FROM public.usuarios WHERE id = auth.uid()) = 'ADMIN'
);

-- 3. FORCE MARLON AS ADMIN in both table and auth metadata
-- This is critical to ensure you can perform these actions.
UPDATE public.usuarios 
SET role = 'ADMIN'::public.user_role, tipo = 'admin' 
WHERE email = 'marlon45lopes@gmail.com';

-- Note: To update auth.users metadata, use the Supabase dashboard or a function:
-- UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"role": "ADMIN", "tipo": "admin"}'::jsonb WHERE email = 'marlon45lopes@gmail.com';
