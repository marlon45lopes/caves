import { User, Building2 } from 'lucide-react';
import type { Appointment } from '@/types/appointment';
import { statusLabels } from '@/types/appointment';
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
  medico_ausente: 'bg-status-medico-ausente/30 border-status-medico-ausente/50 text-status-medico-ausente hover:bg-status-medico-ausente/40',
};

const statusDotColors: Record<string, string> = {
  agendado: 'bg-status-agendado',
  compareceu: 'bg-status-compareceu',
  faltou: 'bg-status-faltou',
  cancelado: 'bg-status-cancelado',
  reagendado: 'bg-status-reagendado',
  medico_ausente: 'bg-status-medico-ausente',
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
            "bg-status-medico-ausente": !isOnline && appointment.status === 'medico_ausente',
          })} />
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        'h-full w-full cursor-pointer rounded-md border-l-[3px] transition-all duration-200',
        'hover:shadow-md hover:brightness-95',
        'flex flex-col overflow-hidden',
        isOnline
          ? 'bg-purple-50 border-l-purple-500 text-purple-800'
          : (statusColors[appointment.status] || 'bg-card border-l-muted')
      )}
      style={{
        borderLeftColor: isOnline ? '#A855F7' : `hsl(var(--status-${appointment.status.replace('_', '-')}))`,
        padding: '5px 6px',
      }}
      title={`${appointment.paciente?.nome || 'Paciente'} — ${formatTime(appointment.hora_inicio)}-${formatTime(appointment.hora_fim)} — ${statusLabels[appointment.status] || appointment.status} — ${appointment.especialidade?.nome || ''} — ${appointment.clinica?.nome || ''}`}
    >
      {/* Status dot + Time range */}
      <div className="flex items-center gap-1.5 mb-1">
        <div className={cn(
          "w-2 h-2 rounded-full flex-shrink-0",
          isOnline ? "bg-purple-500" : (statusDotColors[appointment.status] || "bg-gray-400")
        )} />
        <span className="text-[11px] font-semibold font-mono whitespace-nowrap leading-none">
          {formatTime(appointment.hora_inicio)}
        </span>
        <span className="text-[10px] text-muted-foreground font-mono leading-none">
          - {formatTime(appointment.hora_fim)}
        </span>
      </div>

      {/* Patient name — prominent, wraps up to 2 lines */}
      <h4
        className="font-bold text-[12px] leading-tight text-foreground mb-1"
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical' as any,
          wordBreak: 'break-word',
          minWidth: 0,
        }}
      >
        {appointment.paciente?.nome || 'Paciente'}
      </h4>

      {/* Specialty */}
      {appointment.especialidade && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground leading-tight mb-0.5 min-w-0">
          <Building2 className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{appointment.especialidade.nome}</span>
        </div>
      )}

      {/* Clinic */}
      {appointment.clinica && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground leading-tight min-w-0">
          <User className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{appointment.clinica.nome}</span>
        </div>
      )}
    </div>
  );
}
