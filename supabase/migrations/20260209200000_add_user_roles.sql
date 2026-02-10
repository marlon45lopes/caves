-- Migration: Add user roles and update sync trigger
-- Objective: Ensure strict role-based access control base structure

-- 1. Add role column if it doesn't exist
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS role TEXT;

-- 2. Update existing data from 'tipo' to 'role'
-- Mapping: admin -> ADMIN, atendente -> ATENDENTE, clinica -> DIRIGENTE
UPDATE public.usuarios SET role = 'ADMIN' WHERE tipo = 'admin';
UPDATE public.usuarios SET role = 'ATENDENTE' WHERE tipo = 'atendente';
UPDATE public.usuarios SET role = 'DIRIGENTE' WHERE tipo = 'clinica';

-- Default for anything else
UPDATE public.usuarios SET role = 'ATENDENTE' WHERE role IS NULL;

-- 3. Add CHECK constraint to enforce valid roles
ALTER TABLE public.usuarios 
ADD CONSTRAINT usuarios_role_check 
CHECK (role IN ('ADMIN', 'ATENDENTE', 'DIRIGENTE'));

-- 4. Make role NOT NULL after migration
ALTER TABLE public.usuarios 
ALTER COLUMN role SET NOT NULL;

-- 5. Update handle_new_user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role TEXT;
BEGIN
    -- Determine role from metadata, mapping old values to new ones if necessary
    v_role := COALESCE(
        CASE 
            WHEN new.raw_user_meta_data->>'tipo' = 'admin' THEN 'ADMIN'
            WHEN new.raw_user_meta_data->>'tipo' = 'clinica' THEN 'DIRIGENTE'
            WHEN new.raw_user_meta_data->>'tipo' = 'atendente' THEN 'ATENDENTE'
            ELSE UPPER(new.raw_user_meta_data->>'role')
        END,
        'ATENDENTE'
    );

    -- Ensure role is valid, fallback to ATENDENTE if invalid
    IF v_role NOT IN ('ADMIN', 'ATENDENTE', 'DIRIGENTE') THEN
        v_role := 'ATENDENTE';
    END IF;

    INSERT INTO public.usuarios (id, email, nome, role, tipo)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
        v_role,
        COALESCE(new.raw_user_meta_data->>'tipo', LOWER(v_role))
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        nome = COALESCE(EXCLUDED.nome, public.usuarios.nome),
        role = EXCLUDED.role,
        tipo = EXCLUDED.tipo;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
