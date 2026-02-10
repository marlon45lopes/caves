-- Migration: Apply User Role Enum to Usuarios Table
-- Description: Safely converts the role column to the public.user_role ENUM type.

-- 1. Ensure table exists first (in case this is run before the main RBAC)
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT
);

-- 2. Add role column if it doesn't exist as TEXT
DO $$ BEGIN
    ALTER TABLE public.usuarios ADD COLUMN role TEXT DEFAULT 'ATENDENTE';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 3. Safely convert TEXT to ENUM
-- Step 1: Remove existing default to avoid casting errors
ALTER TABLE public.usuarios ALTER COLUMN role DROP DEFAULT;

-- Step 2: Convert the column type with an explicit cast
ALTER TABLE public.usuarios 
ALTER COLUMN role TYPE public.user_role 
USING role::text::public.user_role;

-- Step 3: Set the new default using the ENUM type
ALTER TABLE public.usuarios ALTER COLUMN role SET DEFAULT 'ATENDENTE'::public.user_role;
