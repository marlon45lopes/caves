-- Adicionar o novo status 'medico_ausente' ao tipo enum status_agendamento
ALTER TYPE public.status_agendamento ADD VALUE 'medico_ausente';
