-- 1. Limpar TODAS as políticas possíveis para agendamentos (legadas e novas)
DROP POLICY IF EXISTS "agendamentos_select_policy" ON public.agendamentos;
DROP POLICY IF EXISTS "agendamentos_insert_delete_policy" ON public.agendamentos;
DROP POLICY IF EXISTS "agendamentos_update_policy" ON public.agendamentos;
DROP POLICY IF EXISTS "Permitir leitura de agendamentos para todos autenticados" ON public.agendamentos;
DROP POLICY IF EXISTS "Permitir atualização de agendamentos para autenticados" ON public.agendamentos;
DROP POLICY IF EXISTS "Permitir exclusão de agendamentos para autenticados" ON public.agendamentos;
DROP POLICY IF EXISTS "Permitir inserção de agendamentos para autenticados" ON public.agendamentos;
DROP POLICY IF EXISTS "agendamentos_update_v1" ON public.agendamentos;

-- 2. Garantir o valor no Enum
DO $$ BEGIN
    ALTER TYPE public.status_agendamento ADD VALUE 'medico_ausente';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Criar Políticas Novas e Consolidadas (v2)
-- SELECT: Admins/Atendentes veem tudo, Clínicas veem os seus
CREATE POLICY "agendamentos_select_v2" ON public.agendamentos FOR SELECT TO authenticated
USING (
    public.get_my_role() IN ('ADMIN', 'ATENDENTE') 
    OR clinica_id = public.get_my_clinica_id()
);

-- UPDATE: Admins/Atendentes atualizam tudo, Clínicas atualizam os seus com status específicos
CREATE POLICY "agendamentos_update_v2" ON public.agendamentos FOR UPDATE TO authenticated
USING (
    public.get_my_role() IN ('ADMIN', 'ATENDENTE') 
    OR clinica_id = public.get_my_clinica_id()
)
WITH CHECK (
    public.get_my_role() IN ('ADMIN', 'ATENDENTE') 
    OR (
        clinica_id = public.get_my_clinica_id() 
        AND status IN ('compareceu', 'faltou', 'medico_ausente')
    )
);

-- INSERT: Apenas Admins/Atendentes
CREATE POLICY "agendamentos_insert_v2" ON public.agendamentos FOR INSERT TO authenticated
WITH CHECK (public.get_my_role() IN ('ADMIN', 'ATENDENTE'));

-- DELETE: Apenas Admins/Atendentes
CREATE POLICY "agendamentos_delete_v2" ON public.agendamentos FOR DELETE TO authenticated
USING (public.get_my_role() IN ('ADMIN', 'ATENDENTE'));
