-- Add profissional and observacoes columns to agendamentos table
ALTER TABLE public.agendamentos
ADD COLUMN IF NOT EXISTS profissional text,
ADD COLUMN IF NOT EXISTS observacoes text;
