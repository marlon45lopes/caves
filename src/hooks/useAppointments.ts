import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AppointmentStatus } from '@/types/appointment';

export function useAppointments(date?: string, clinicId?: string | null, specialtyName?: string | null) {
  return useQuery({
    queryKey: ['appointments', date, clinicId, specialtyName],
    queryFn: async () => {
      let query = supabase
        .from('agendamentos')
        .select(`
          *,
          paciente:pacientes(id, nome, cpf, telefone, email),
          clinica:clinicas(id, nome, endereco, telefone),
          especialidade:especialidades(id, nome)
        `)
        .order('hora_inicio', { ascending: true });

      if (date) {
        query = query.eq('data', date);
      }

      if (clinicId && clinicId !== 'all') {
        query = query.eq('clinica_id', clinicId);
      }

      if (specialtyName && specialtyName !== 'all') {
        query = query.eq('especialidade.nome' as any, specialtyName);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as any[]) || [];
    },
  });
}

export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AppointmentStatus }) => {
      const { data, error } = await supabase
        .from('agendamentos')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      clinica_id?: string;
      especialidade_id?: string;
      data?: string;
      hora_inicio?: string;
      hora_fim?: string;
      profissional?: string;
      observacoes?: string;
    }) => {
      const { data, error } = await supabase
        .from('agendamentos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['patient-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['pending-patient-appointments'] });
    },
  });
}

export function useDeleteAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('agendamentos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['patient-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['pending-patient-appointments'] });
    },
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (appointment: {
      paciente_id: string;
      clinica_id: string;
      especialidade_id: string;
      data: string;
      hora_inicio: string;
      hora_fim: string;
      status: AppointmentStatus;
      empresa_id?: string | null;
      profissional?: string;
      observacoes?: string;
    }) => {
      const { data, error } = await supabase
        .from('agendamentos')
        .insert(appointment)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

export function usePatients() {
  return useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pacientes')
        .select('*')
        .order('nome');

      if (error) throw error;
      return data;
    },
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patient: {
      nome: string;
      cpf?: string | null;
      telefone?: string | null;
      email?: string | null;
      sexo?: string | null;
      'data de nascimento'?: string | null;
      matricula?: string | null;
      empresa_id?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('pacientes')
        .insert(patient)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}

export function useUpdatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...patient }: {
      id: string;
      nome: string;
      cpf?: string | null;
      telefone?: string | null;
      email?: string | null;
      sexo?: string | null;
      'data de nascimento'?: string | null;
      matricula?: string | null;
      empresa_id?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('pacientes')
        .update(patient)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}

export function useDeletePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pacientes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}

export function useClinics(onlyActive: boolean = false) {
  return useQuery({
    queryKey: ['clinics', onlyActive],
    queryFn: async () => {
      let query = supabase
        .from('clinicas')
        .select('*')
        .order('nome');

      if (onlyActive) {
        query = query.eq('ativa', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useSpecialties() {
  return useQuery({
    queryKey: ['specialties'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('especialidades')
        .select(`
          *,
          clinica:clinicas(id, nome)
        `)
        .order('nome');

      if (error) throw error;
      return data;
    },
  });
}

export function useCompanies() {
  return useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .order('nome');

      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (company: { nome: string; email?: string; endereco?: string; telefone?: string }) => {
      const { data, error } = await supabase
        .from('empresas')
        .insert([company])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...company }: { id: string; nome: string; email?: string; endereco?: string; telefone?: string }) => {
      const { data, error } = await supabase
        .from('empresas')
        .update(company)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('empresas')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}

export function useCreateClinic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clinic: { nome: string; telefone?: string; endereco?: string }) => {
      const { data, error } = await supabase
        .from('clinicas')
        .insert([{ ...clinic, ativa: true }] as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinics'] });
    },
  });
}

export function useUpdateClinic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...clinic }: { id: string; nome: string; telefone?: string; endereco?: string; ativa?: boolean }) => {
      const { data, error } = await supabase
        .from('clinicas')
        .update(clinic)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinics'] });
    },
  });
}

export function useCreateSpecialty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ nome, clinica_ids }: { nome: string; clinica_ids: string[] }) => {
      const records = clinica_ids.map((id) => ({
        nome,
        clinica_id: id,
      }));

      const { data, error } = await supabase
        .from('especialidades')
        .insert(records)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specialties'] });
    },
  });
}

export function useUpdateSpecialty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...specialty }: { id: string; nome: string; clinica_id: string }) => {
      const { data, error } = await supabase
        .from('especialidades')
        .update(specialty)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['specialties'] });
    },
  });
}

export function usePatient(id?: string) {
  return useQuery({
    queryKey: ['patient', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('pacientes')
        .select(`
          *,
          empresa:empresas(id, nome)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function usePatientAppointments(patientId?: string) {
  return useQuery({
    queryKey: ['patient-appointments', patientId],
    queryFn: async () => {
      if (!patientId) return [];
      const { data, error } = await supabase
        .from('agendamentos')
        .select(`
          *,
          clinica:clinicas(id, nome, endereco, telefone),
          especialidade:especialidades(id, nome)
        `)
        .eq('paciente_id', patientId)
        .order('data', { ascending: false })
        .order('hora_inicio', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!patientId,
  });
}

export function usePendingPatientAppointments(patientId?: string) {
  return useQuery({
    queryKey: ['pending-patient-appointments', patientId],
    queryFn: async () => {
      if (!patientId) return [];
      const { data, error } = await supabase
        .from('agendamentos')
        .select(`
          *,
          clinica:clinicas(id, nome, endereco, telefone),
          especialidade:especialidades(id, nome)
        `)
        .eq('paciente_id', patientId)
        .eq('status', 'agendado')
        .order('data', { ascending: true })
        .order('hora_inicio', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!patientId,
  });
}
export function usePatientHistoryAppointments(patientId?: string) {
  return useQuery({
    queryKey: ['patient-history-appointments', patientId],
    queryFn: async () => {
      if (!patientId) return [];

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const dateLimit = sixMonthsAgo.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('agendamentos')
        .select(`
          *,
          clinica:clinicas(id, nome, endereco, telefone),
          especialidade:especialidades(id, nome)
        `)
        .eq('paciente_id', patientId)
        .in('status', ['compareceu', 'faltou'])
        .gte('data', dateLimit)
        .order('data', { ascending: false })
        .order('hora_inicio', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!patientId,
  });
}
