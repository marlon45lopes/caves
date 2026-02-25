import { Clock, User, Building2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import type { Appointment } from '@/types/appointment';
import { cn } from '@/lib/utils';

interface AppointmentCardProps {
  appointment: Appointment;
  onClick: () => void;
  variant?: 'default' | 'compact';
}

const statusColors: Record<string, string> = {
  agendado: 'bg-status-agendado/30 border-status-agendado/50 text-status-agendado hover:bg-status-agendado/40',
  compareceu: 'bg-status-compareceu/30 border-status-compareceu/50 text-status-compareceu hover:bg-status-compareceu/40',
  faltou: 'bg-status-faltou/30 border-status-faltou/50 text-status-faltou hover:bg-status-faltou/40',
  cancelado: 'bg-status-cancelado/30 border-status-cancelado/50 text-status-cancelado hover:bg-status-cancelado/40',
  reagendado: 'bg-status-reagendado/30 border-status-reagendado/50 text-status-reagendado hover:bg-status-reagendado/40',
};

export function AppointmentCard({ appointment, onClick, variant = 'default' }: AppointmentCardProps) {
  const isOnline = appointment.observacoes?.includes('[ONLINE]');

  const formatTime = (time: string | null) => {
    if (!time) return '--:--';
    return time.slice(0, 5);
  };

  const getStyle = () => {
    if (isOnline) {
      return 'bg-purple-100 border-purple-300 text-purple-700 hover:bg-purple-200';
    }
    return statusColors[appointment.status] || 'bg-secondary border-secondary';
  };

  if (variant === 'compact') {
    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={cn(
          'h-full w-full cursor-pointer rounded border p-1 text-[10px] transition-colors',
          getStyle(),
          'flex flex-col gap-0.5 overflow-hidden'
        )}
        title={`${appointment.paciente?.nome} - ${appointment.especialidade?.nome}`}
      >
        <div className="font-bold truncate leading-tight">
          {appointment.paciente?.nome}
        </div>
        <div className="flex items-center justify-between opacity-80 mt-auto">
          <span className="font-mono">
            {formatTime(appointment.hora_inicio)}
          </span>
          <div className={cn("w-1.5 h-1.5 rounded-full", {
            "bg-purple-500": isOnline,
            "bg-status-agendado": !isOnline && appointment.status === 'agendado',
            "bg-status-compareceu": !isOnline && appointment.status === 'compareceu',
            "bg-status-faltou": !isOnline && appointment.status === 'faltou',
            "bg-status-cancelado": !isOnline && appointment.status === 'cancelado',
            "bg-status-reagendado": !isOnline && appointment.status === 'reagendado',
          })} />
        </div>
      </div>
    );
  }

  return (
    <Card
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        'group cursor-pointer border-l-4 p-4 transition-all duration-200',
        'hover:shadow-md hover:scale-[1.02]',
        isOnline ? 'bg-purple-100 border-l-purple-500 text-purple-700 hover:bg-purple-200' : (statusColors[appointment.status] || 'bg-card border-l-status-' + appointment.status)
      )}
      style={{
        borderLeftColor: isOnline ? '#A855F7' : `hsl(var(--status-${appointment.status}))`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Clock className="h-3.5 w-3.5" />
            <span className="font-medium">
              {formatTime(appointment.hora_inicio)} - {formatTime(appointment.hora_fim)}
            </span>
          </div>

          <h4 className="font-semibold text-foreground truncate mb-1">
            {appointment.paciente?.nome || 'Paciente não informado'}
          </h4>

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {appointment.especialidade && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {appointment.especialidade.nome}
              </span>
            )}
            {appointment.clinica && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {appointment.clinica.nome}
              </span>
            )}
          </div>
        </div>

        <StatusBadge status={appointment.status} />
      </div>
    </Card>
  );
}
