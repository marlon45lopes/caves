-- Migration: Assign ADMIN role to specific user
-- email: marlon45lopes@gmail.com

-- Ensure the role column and constraints exist (re-running the core logic safely)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'role') THEN
        ALTER TABLE public.usuarios ADD COLUMN role TEXT;
    END IF;
END $$;

-- Update the specific user
UPDATE public.usuarios 
SET role = 'ADMIN' 
WHERE email = 'marlon45lopes@gmail.com';

-- If the user doesn't exist in 'usuarios' but exists in 'auth.users' (sync verification)
-- Note: This is a fallback in case the trigger didn't catch it
INSERT INTO public.usuarios (id, email, nome, role, tipo)
SELECT id, email, COALESCE(raw_user_meta_data->>'nome', split_part(email, '@', 1)), 'ADMIN', 'admin'
FROM auth.users
WHERE email = 'marlon45lopes@gmail.com'
ON CONFLICT (id) DO UPDATE SET
    role = 'ADMIN',
    tipo = 'admin';
