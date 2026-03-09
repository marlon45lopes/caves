-- Migration: Add criado_por_nome to agendamentos
-- Description: Adds a column to track which user created the appointment.

ALTER TABLE public.agendamentos
ADD COLUMN IF NOT EXISTS criado_por_nome text;
