import { Calendar, Users, Building2, Stethoscope, Briefcase, TrendingUp } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/card';
import {
  useAppointments,
  usePatients,
  useClinics,
  useSpecialties,
  useCompanies,
  useAwaitingStats
} from '@/hooks/useAppointments';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const { profile } = useAuth();
  const isClinica = profile?.role === 'CLINICA';

  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: todayAppointments } = useAppointments(today);
  const { data: patients } = usePatients();
  const { data: awaitingStats } = useAwaitingStats(isClinica ? profile?.clinica_id : null);
  const { data: clinics } = useClinics();
  const { data: specialties } = useSpecialties();
  const { data: companies } = useCompanies();

  const filteredSpecialties = specialties?.filter(s =>
    !isClinica || s.clinica_id === profile?.clinica_id
  );

  const stats = [
    {
      label: 'Agendamentos Hoje',
      value: todayAppointments?.length || 0,
      icon: Calendar,
      color: 'bg-status-agendado/15 text-status-agendado',
    },
    {
      label: isClinica ? 'Consultas em Aberto' : 'Pacientes',
      value: isClinica ? (awaitingStats?.consultas || 0) : (patients?.length || 0),
      icon: Users,
      color: 'bg-primary/15 text-primary',
    },
    {
      label: 'Exames em Aberto',
      value: awaitingStats?.exames || 0,
      icon: TrendingUp,
      color: 'bg-indigo-500/15 text-indigo-500',
      onlyClinica: true,
    },
    {
      label: 'Clínicas Ativas',
      value: clinics?.length || 0,
      icon: Building2,
      color: 'bg-status-compareceu/15 text-status-compareceu',
      hideFromClinica: true,
    },
    {
      label: 'Especialidades',
      value: filteredSpecialties?.length || 0,
      icon: Stethoscope,
      color: 'bg-status-reagendado/15 text-status-reagendado',
    },
    {
      label: 'Empresas',
      value: companies?.length || 0,
      icon: Briefcase,
      color: 'bg-status-faltou/15 text-status-faltou',
      hideFromClinica: true,
    },
  ];

  const filteredStats = stats.filter(stat => {
    if (isClinica) {
      if ((stat as any).hideFromClinica) return false;
      return true;
    }
    return !(stat as any).onlyClinica;
  });

  return (
    <Layout title="Dashboard">
      <div className="space-y-8">
        {/* Stats Grid */}
        <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-${filteredStats.length}`}>
          {filteredStats.map((stat) => (
            <Card key={stat.label} className="p-6">
              <div className="flex items-center gap-4">
                <div className={`rounded-xl p-3 ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Today's Appointments Preview */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Agendamentos de Hoje</h2>
            <a
              href="/agenda"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              Ver agenda completa
              <TrendingUp className="h-3 w-3" />
            </a>
          </div>

          {!todayAppointments || todayAppointments.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum agendamento para hoje
            </p>
          ) : (
            <div className="space-y-3">
              {todayAppointments.slice(0, 5).map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-muted-foreground">
                      {apt.hora_inicio?.slice(0, 5) || '--:--'}
                    </span>
                    <div>
                      <p className="font-medium text-foreground">
                        {apt.paciente?.nome || 'Paciente não informado'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {apt.especialidade?.nome || 'Especialidade não informada'}
                      </p>
                    </div>
                  </div>
                  <span
                    className="text-xs px-2 py-1 rounded-full"
                    style={{
                      backgroundColor: `hsl(var(--status-${apt.status}) / 0.15)`,
                      color: `hsl(var(--status-${apt.status}))`,
                    }}
                  >
                    {apt.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
};

export default Index;
