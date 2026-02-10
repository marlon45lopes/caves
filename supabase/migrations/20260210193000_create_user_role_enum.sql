-- Migration: Create User Role Enum
-- Description: Creates the user_role type for RBAC categorization.

DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('ADMIN', 'ATENDENTE', 'CLINICA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
