-- Add telefone and endereco columns to clinicas table
ALTER TABLE public.clinicas
ADD COLUMN IF NOT EXISTS telefone text,
ADD COLUMN IF NOT EXISTS endereco text;
