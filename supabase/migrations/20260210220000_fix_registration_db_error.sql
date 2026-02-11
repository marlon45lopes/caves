-- Migration: Fix Registration Database Error
-- Description: Refines handle_new_user trigger to be defensive against invalid metadata.

-- 1. Redefine trigger function with robust casting and fallbacks
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role public.user_role;
    v_clinica_id uuid;
BEGIN
    -- Defensive Role Determination
    v_role := CASE 
        WHEN new.raw_user_meta_data->>'role' = 'ADMIN' THEN 'ADMIN'::public.user_role
        WHEN new.raw_user_meta_data->>'role' = 'CLINICA' THEN 'CLINICA'::public.user_role
        WHEN new.raw_user_meta_data->>'role' = 'ATENDENTE' THEN 'ATENDENTE'::public.user_role
        WHEN new.raw_user_meta_data->>'tipo' = 'admin' THEN 'ADMIN'::public.user_role
        WHEN new.raw_user_meta_data->>'tipo' = 'clinica' THEN 'CLINICA'::public.user_role
        WHEN new.raw_user_meta_data->>'tipo' = 'atendente' THEN 'ATENDENTE'::public.user_role
        ELSE 'ATENDENTE'::public.user_role
    END;

    -- Defensive Clinica ID Casting (handles empty strings or invalid UUIDs)
    BEGIN
        IF new.raw_user_meta_data->>'clinica_id' IS NOT NULL AND new.raw_user_meta_data->>'clinica_id' <> '' THEN
            v_clinica_id := (new.raw_user_meta_data->>'clinica_id')::uuid;
        ELSE
            v_clinica_id := NULL;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_clinica_id := NULL;
    END;

    -- Insert into public.usuarios
    INSERT INTO public.usuarios (id, email, nome, role, tipo, clinica_id)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
        v_role,
        LOWER(v_role::text),
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

-- 2. Ensure the trigger is properly attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
