-- Migration: Advanced RBAC (Role-Based Access Control)
-- Description: Standardizes roles and enforces RLS policies.
-- Note: Requires public.user_role enum to be created first.

-- 1. Reset Table (as requested, dropping and recreating to ensure clean state)
DROP TABLE IF EXISTS public.usuarios CASCADE;

CREATE TABLE public.usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    nome TEXT,
    tipo TEXT DEFAULT 'atendente',
    role public.user_role DEFAULT 'ATENDENTE'::public.user_role,
    clinica_id UUID REFERENCES public.clinicas(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Cleanup: DROP all dependent policies first (just in case they survived the table drop)
DROP POLICY IF EXISTS "pacientes_select_policy" ON public.pacientes;
DROP POLICY IF EXISTS "pacientes_write_policy" ON public.pacientes;
DROP POLICY IF EXISTS "pacientes_update_policy" ON public.pacientes;
DROP POLICY IF EXISTS "pacientes_delete_policy" ON public.pacientes;
DROP POLICY IF EXISTS "agendamentos_select_policy" ON public.agendamentos;
DROP POLICY IF EXISTS "agendamentos_insert_delete_policy" ON public.agendamentos;
DROP POLICY IF EXISTS "agendamentos_update_policy" ON public.agendamentos;

-- 3. Helper Functions for RLS
DROP FUNCTION IF EXISTS public.get_my_role();
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role AS $$
    SELECT role FROM public.usuarios WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_my_clinica_id()
RETURNS UUID AS $$
    SELECT clinica_id FROM public.usuarios WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 4. Recreate Policies for PACIENTES
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pacientes_select_policy" 
ON public.pacientes FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "pacientes_write_policy" 
ON public.pacientes FOR INSERT 
TO authenticated 
WITH CHECK (public.get_my_role() IN ('ADMIN'::public.user_role, 'ATENDENTE'::public.user_role));

CREATE POLICY "pacientes_update_policy" 
ON public.pacientes FOR UPDATE 
TO authenticated 
USING (public.get_my_role() IN ('ADMIN'::public.user_role, 'ATENDENTE'::public.user_role));

CREATE POLICY "pacientes_delete_policy" 
ON public.pacientes FOR DELETE 
TO authenticated 
USING (public.get_my_role() = 'ADMIN'::public.user_role);

-- 5. Recreate Policies for AGENDAMENTOS
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agendamentos_select_policy" 
ON public.agendamentos FOR SELECT 
TO authenticated 
USING (
    public.get_my_role() IN ('ADMIN'::public.user_role, 'ATENDENTE'::public.user_role) 
    OR clinica_id = public.get_my_clinica_id()
);

CREATE POLICY "agendamentos_insert_delete_policy" 
ON public.agendamentos FOR ALL 
TO authenticated 
USING (public.get_my_role() IN ('ADMIN'::public.user_role, 'ATENDENTE'::public.user_role))
WITH CHECK (public.get_my_role() IN ('ADMIN'::public.user_role, 'ATENDENTE'::public.user_role));

CREATE POLICY "agendamentos_update_policy" 
ON public.agendamentos FOR UPDATE 
TO authenticated 
USING (
    public.get_my_role() IN ('ADMIN'::public.user_role, 'ATENDENTE'::public.user_role) 
    OR clinica_id = public.get_my_clinica_id()
)
WITH CHECK (
    public.get_my_role() IN ('ADMIN'::public.user_role, 'ATENDENTE'::public.user_role) 
    OR (
        clinica_id = public.get_my_clinica_id() 
        AND status IN ('compareceu', 'faltou')
    )
);

-- 6. Policies for USUARIOS
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios_select_policy"
ON public.usuarios FOR SELECT
TO authenticated
USING (true);

-- 7. Standardize Trigger for New Users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role public.user_role;
BEGIN
    v_role := COALESCE(
        CASE 
            WHEN new.raw_user_meta_data->>'tipo' = 'admin' THEN 'ADMIN'::public.user_role
            WHEN new.raw_user_meta_data->>'tipo' = 'clinica' THEN 'CLINICA'::public.user_role
            WHEN new.raw_user_meta_data->>'tipo' = 'atendente' THEN 'ATENDENTE'::public.user_role
            ELSE (UPPER(new.raw_user_meta_data->>'role'))::public.user_role
        END,
        'ATENDENTE'::public.user_role
    );

    INSERT INTO public.usuarios (id, email, nome, role, tipo, clinica_id)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
        v_role,
        LOWER(v_role::text),
        (new.raw_user_meta_data->>'clinica_id')::uuid
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        nome = COALESCE(EXCLUDED.nome, public.usuarios.nome),
        role = EXCLUDED.role,
        tipo = EXCLUDED.tipo,
        clinica_id = EXCLUDED.clinica_id;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Data Migration: Insert specific users with correct IDs and roles
-- Jeff
INSERT INTO public.usuarios (id, email, nome, role, tipo)
VALUES ('83ce5a78-30c3-4e17-8a44-50262da22422', 'jeff@gmail.com', 'jeff', 'ATENDENTE'::public.user_role, 'atendente')
ON CONFLICT (id) DO UPDATE SET role = 'ATENDENTE'::public.user_role, tipo = 'atendente';

-- Marlon
INSERT INTO public.usuarios (id, email, nome, role, tipo)
VALUES ('8c8f661f-dd87-473a-9484-6bc2e8f51007', 'marlon45lopes@gmail.com', 'Marlon Lopes', 'ADMIN'::public.user_role, 'admin')
ON CONFLICT (id) DO UPDATE SET role = 'ADMIN'::public.user_role, tipo = 'admin';

-- Shirley
INSERT INTO public.usuarios (id, email, nome, role, tipo)
VALUES ('e18eba86-e6de-470b-9a11-924d11d41964', 'shirlqwey@gmail.com', 'Shirley Clinical', 'CLINICA'::public.user_role, 'clinica')
ON CONFLICT (id) DO UPDATE SET role = 'CLINICA'::public.user_role, tipo = 'clinica';
