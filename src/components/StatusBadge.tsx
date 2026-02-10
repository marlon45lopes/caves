import { cn } from '@/lib/utils';
import type { AppointmentStatus } from '@/types/appointment';
import { statusLabels } from '@/types/appointment';

interface StatusBadgeProps {
  status: AppointmentStatus;
  className?: string;
}

const statusStyles: Record<AppointmentStatus, string> = {
  agendado: 'bg-status-agendado/30 text-status-agendado border-status-agendado/50',
  compareceu: 'bg-status-compareceu/30 text-status-compareceu border-status-compareceu/50',
  faltou: 'bg-status-faltou/30 text-status-faltou border-status-faltou/50',
  cancelado: 'bg-status-cancelado/30 text-status-cancelado border-status-cancelado/50',
  reagendado: 'bg-status-reagendado/30 text-status-reagendado border-status-reagendado/50',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        statusStyles[status],
        className
      )}
    >
      {statusLabels[status]}
    </span>
  );
}
