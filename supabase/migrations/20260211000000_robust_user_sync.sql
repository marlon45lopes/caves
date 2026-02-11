-- Migration: Final and Robust User Trigger
-- Description: Ensures the handle_new_user trigger matches the frontend metadata and handles all edge cases.

-- 1. Redefine trigger function with absolute safety
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role public.user_role;
    v_tipo text;
    v_clinica_id uuid;
BEGIN
    -- 1. Determine ROLE
    -- Priority 1: Check for explicit 'role' string in metadata (Set by our New User button)
    IF new.raw_user_meta_data->>'role' IS NOT NULL THEN
        BEGIN
            v_role := (new.raw_user_meta_data->>'role')::public.user_role;
        EXCEPTION WHEN OTHERS THEN
            v_role := 'ATENDENTE'::public.user_role;
        END;
    -- Priority 2: Check for legacy 'tipo' field
    ELSIF new.raw_user_meta_data->>'tipo' IS NOT NULL THEN
        v_role := CASE 
            WHEN new.raw_user_meta_data->>'tipo' = 'admin' THEN 'ADMIN'::public.user_role
            WHEN new.raw_user_meta_data->>'tipo' = 'clinica' THEN 'CLINICA'::public.user_role
            ELSE 'ATENDENTE'::public.user_role
        END;
    ELSE
        v_role := 'ATENDENTE'::public.user_role;
    END IF;

    -- 2. Determine TIPO (always lowercase based on role)
    v_tipo := LOWER(v_role::text);

    -- 3. Determine CLINICA_ID
    BEGIN
        IF new.raw_user_meta_data->>'clinica_id' IS NOT NULL AND new.raw_user_meta_data->>'clinica_id' <> '' THEN
            v_clinica_id := (new.raw_user_meta_data->>'clinica_id')::uuid;
        ELSE
            v_clinica_id := NULL;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_clinica_id := NULL;
    END;

    -- 4. INSERT OR UPDATE the profile
    INSERT INTO public.usuarios (id, email, nome, role, tipo, clinica_id)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
        v_role,
        v_tipo,
        v_clinica_id
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

-- 2. Re-attach trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Sync existing users one last time based on the list provided
INSERT INTO public.usuarios (id, email, nome, role, tipo, clinica_id)
VALUES 
('83ce5a78-30c3-4e17-8a44-50262da22422', 'jeff@gmail.com', 'jeff', 'ATENDENTE'::public.user_role, 'atendente', NULL),
('8c8f661f-dd87-473a-9484-6bc2e8f51007', 'marlon45lopes@gmail.com', 'Marlon Lopes', 'ADMIN'::public.user_role, 'admin', NULL),
('a1fa723b-acf7-41f3-9b08-b2cdee62c4c7', 'evellyn@gmail.com', 'evellyn', 'ADMIN'::public.user_role, 'admin', NULL),
('e18eba86-e6de-470b-9a11-924d11d41964', 'shirlqwey@gmail.com', 'Shirley Clinical', 'CLINICA'::public.user_role, 'clinica', 'f368776e-12f1-44f4-befc-dfbedd0b86a0')
ON CONFLICT (id) DO UPDATE SET 
    role = EXCLUDED.role, 
    tipo = EXCLUDED.tipo, 
    clinica_id = EXCLUDED.clinica_id,
    nome = EXCLUDED.nome;
