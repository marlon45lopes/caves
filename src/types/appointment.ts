export type AppointmentStatus = 'agendado' | 'compareceu' | 'faltou' | 'cancelado' | 'reagendado';

export interface Appointment {
  id: string;
  data: string;
  hora_inicio: string | null;
  hora_fim: string | null;
  status: AppointmentStatus;
  guia_gerada: boolean | null;
  empresa: string | null;
  paciente_id: string | null;
  clinica_id: string | null;
  especialidade_id: string | null;
  empresa_id: string | null;
  profissional?: string | null;
  observacoes?: string | null;
  paciente?: {
    id: string;
    nome: string;
    cpf: string | null;
    telefone: string | null;
    email: string | null;
  };
  clinica?: {
    id: string;
    nome: string;
    endereco?: string | null;
    telefone?: string | null;
  };
  especialidade?: {
    id: string;
    nome: string;
  };
}

export interface Patient {
  id: string;
  nome: string;
  cpf: string | null;
  telefone: string | null;
  email: string | null;
  sexo: string | null;
  'data de nascimento': string | null;
  matricula: string | null;
  empresa: string | null;
  empresa_id: string | null;
}

export interface Clinic {
  id: string;
  nome: string;
  telefone?: string | null;
  endereco?: string | null;
  ativa: boolean | null;
}

export interface Specialty {
  id: string;
  nome: string;
  clinica_id: string | null;
}

export interface Company {
  id: string;
  nome: string;
  telefone: string | null;
  endereco: string | null;
  email: string | null;
}

export const statusLabels: Record<AppointmentStatus, string> = {
  agendado: 'Agendado',
  compareceu: 'Compareceu',
  faltou: 'Faltou',
  cancelado: 'Cancelado',
  reagendado: 'Reagendado',
};
