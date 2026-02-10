-- Habilitar RLS e criar policies para todas as tabelas principais

-- Políticas para CLINICAS
ALTER TABLE public.clinicas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura de clínicas para todos autenticados"
ON public.clinicas FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Permitir leitura pública de clínicas"
ON public.clinicas FOR SELECT
TO anon
USING (true);

CREATE POLICY "Permitir inserção de clínicas para autenticados"
ON public.clinicas FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Permitir atualização de clínicas para autenticados"
ON public.clinicas FOR UPDATE
TO authenticated
USING (true);

-- Políticas para PACIENTES
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura de pacientes para todos autenticados"
ON public.pacientes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Permitir leitura pública de pacientes"
ON public.pacientes FOR SELECT
TO anon
USING (true);

CREATE POLICY "Permitir inserção de pacientes para autenticados"
ON public.pacientes FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Permitir atualização de pacientes para autenticados"
ON public.pacientes FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Permitir exclusão de pacientes para autenticados"
ON public.pacientes FOR DELETE
TO authenticated
USING (true);

-- Políticas para ESPECIALIDADES
ALTER TABLE public.especialidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura de especialidades para todos autenticados"
ON public.especialidades FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Permitir leitura pública de especialidades"
ON public.especialidades FOR SELECT
TO anon
USING (true);

CREATE POLICY "Permitir inserção de especialidades para autenticados"
ON public.especialidades FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Permitir atualização de especialidades para autenticados"
ON public.especialidades FOR UPDATE
TO authenticated
USING (true);

-- Políticas para AGENDAMENTOS
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura de agendamentos para todos autenticados"
ON public.agendamentos FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Permitir leitura pública de agendamentos"
ON public.agendamentos FOR SELECT
TO anon
USING (true);

CREATE POLICY "Permitir inserção de agendamentos para autenticados"
ON public.agendamentos FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Permitir atualização de agendamentos para autenticados"
ON public.agendamentos FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Permitir exclusão de agendamentos para autenticados"
ON public.agendamentos FOR DELETE
TO authenticated
USING (true);

-- Políticas para GUIAS
ALTER TABLE public.guias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura de guias para todos autenticados"
ON public.guias FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Permitir leitura pública de guias"
ON public.guias FOR SELECT
TO anon
USING (true);

CREATE POLICY "Permitir inserção de guias para autenticados"
ON public.guias FOR INSERT
TO authenticated
WITH CHECK (true);

-- Políticas para USUARIOS
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura de usuarios para todos autenticados"
ON public.usuarios FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Permitir inserção de usuarios para autenticados"
ON public.usuarios FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Permitir atualização de usuarios para autenticados"
ON public.usuarios FOR UPDATE
TO authenticated
USING (true);