import { useState } from 'react';
import {
  Edit,
  FileText,
  UserPlus,
  FileCheck,
  CheckCircle,
  XCircle,
  Calendar,
  Clock,
  User,
  Building2,
  Download,
  Trash2
} from 'lucide-react';
import { generateAppointmentReceipt, generateGuide } from '@/utils/pdfGenerator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { Appointment } from '@/types/appointment';
import { useUpdateAppointmentStatus, useDeleteAppointment } from '@/hooks/useAppointments';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { EditAppointmentDialog } from './EditAppointmentDialog';
import { useAuth } from '@/hooks/useAuth';

interface AppointmentActionsDialogProps {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppointmentActionsDialog({
  appointment,
  open,
  onOpenChange,
}: AppointmentActionsDialogProps) {
  const [editOpen, setEditOpen] = useState(false);
  const { profile } = useAuth();
  const updateStatus = useUpdateAppointmentStatus();
  const deleteAppointment = useDeleteAppointment();
  const navigate = useNavigate();

  const isAdmin = profile?.role === 'ADMIN';
  const isAtendente = profile?.role === 'ATENDENTE';
  const isClinica = profile?.role === 'CLINICA';

  if (!appointment) return null;

  const formatTime = (time: string | null) => {
    if (!time) return '--:--';
    return time.slice(0, 5);
  };

  const formatDate = (date: string) => {
    return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const handleConfirm = async () => {
    try {
      await updateStatus.mutateAsync({ id: appointment.id, status: 'compareceu' });
      toast.success('Comparecimento registrado com sucesso!');
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao registrar comparecimento');
    }
  };

  const handleFaltou = async () => {
    try {
      await updateStatus.mutateAsync({ id: appointment.id, status: 'faltou' });
      toast.success('Falta registrada com sucesso!');
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao registrar falta');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Tem certeza que deseja excluir este agendamento permanentemente? Esta ação não pode ser desfeita.')) {
      try {
        await deleteAppointment.mutateAsync(appointment.id);
        toast.success('Agendamento excluído com sucesso!');
        onOpenChange(false);
      } catch (error) {
        toast.error('Erro ao excluir agendamento');
        console.error(error);
      }
    }
  };

  const handleEditClick = () => {
    setEditOpen(true);
  };

  const actions = [
    {
      icon: Edit,
      label: 'Editar agendamento',
      onClick: handleEditClick,
      show: isAdmin || isAtendente
    },
    {
      icon: FileText,
      label: 'Ficha do paciente',
      onClick: () => {
        if (appointment?.paciente?.id) {
          navigate(`/pacientes/${appointment.paciente.id}`);
          onOpenChange(false);
        } else {
          toast.error("Paciente não identificado neste agendamento");
        }
      },
      show: true // Everyone can see the record? User didn't specify, but safer to keep
    },
    {
      icon: FileCheck,
      label: 'Gerar guia',
      onClick: () => {
        try {
          generateGuide(appointment);
          toast.success('Guia gerada com sucesso!');
        } catch (error) {
          console.error(error);
          toast.error('Erro ao gerar guia');
        }
      },
      show: isAdmin || isAtendente
    },
    {
      icon: Download,
      label: 'Baixar comprovante',
      onClick: () => {
        try {
          generateAppointmentReceipt(appointment);
          toast.success('Comprovante gerado com sucesso!');
        } catch (error) {
          console.error(error);
          toast.error('Erro ao gerar comprovante');
        }
      },
      show: true
    },
  ].filter(action => action.show);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Detalhes do Agendamento</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Appointment Info */}
            <div className="rounded-lg bg-secondary/50 p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg text-foreground">
                    {appointment.paciente?.nome || 'Paciente não informado'}
                  </h3>
                  {appointment.paciente?.telefone && (
                    <p className="text-sm text-muted-foreground">{appointment.paciente.telefone}</p>
                  )}
                </div>
                <StatusBadge status={appointment.status} />
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="capitalize">{formatDate(appointment.data)}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{formatTime(appointment.hora_inicio)} - {formatTime(appointment.hora_fim)}</span>
                </div>
                {appointment.especialidade && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    <span>{appointment.especialidade.nome}</span>
                  </div>
                )}
                {appointment.clinica && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>{appointment.clinica.nome}</span>
                  </div>
                )}
              </div>

              {appointment.observacoes && (
                <div className="mt-3 space-y-3">
                  {appointment.observacoes.includes('LIBERADO COM JUSTIFICATIVA:') ? (() => {
                    const parts = appointment.observacoes.split('\n\n');
                    const justificationPart = parts[0];
                    const otherObs = parts.length > 1 ? parts.slice(1).join('\n\n') : '';

                    return (
                      <>
                        <div className="p-3 bg-red-50 border border-destructive/20 rounded-md shadow-sm">
                          <p className="text-[10px] font-bold text-destructive mb-1 uppercase tracking-widest flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            Justificativa de Liberação
                          </p>
                          <p className="text-sm font-semibold text-destructive whitespace-pre-wrap leading-relaxed">
                            {justificationPart.replace('LIBERADO COM JUSTIFICATIVA:', '').trim()}
                          </p>
                        </div>

                        {otherObs && (
                          <div className="p-3 bg-white border border-secondary rounded-md shadow-sm">
                            <p className="text-[10px] font-bold text-muted-foreground mb-1 uppercase tracking-widest flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              Detalhes Adicionais / Observações
                            </p>
                            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                              {otherObs}
                            </p>
                          </div>
                        )}
                      </>
                    );
                  })() : (
                    <div className="p-3 bg-white border border-secondary rounded-md shadow-sm">
                      <p className="text-[10px] font-bold text-muted-foreground mb-1 uppercase tracking-widest flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        Observações
                      </p>
                      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                        {appointment.observacoes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              {actions.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  className="h-auto py-3 px-4 justify-start gap-3 text-left"
                  onClick={action.onClick}
                >
                  <action.icon className="h-4 w-4 text-primary" />
                  <span className="text-sm">{action.label}</span>
                </Button>
              ))}
            </div>

            <Separator />

            {/* Status Actions */}
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-status-compareceu hover:bg-status-compareceu/90"
                  onClick={handleConfirm}
                  disabled={updateStatus.isPending || deleteAppointment.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Compareceu
                </Button>
                <Button
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white"
                  onClick={handleFaltou}
                  disabled={updateStatus.isPending || deleteAppointment.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Faltou
                </Button>
              </div>

              {!isClinica && (
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={handleDelete}
                  disabled={updateStatus.isPending || deleteAppointment.isPending || !(isAdmin || isAtendente)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir agendamento
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Appointment Dialog */}
      <EditAppointmentDialog
        appointment={appointment}
        open={editOpen}
        onOpenChange={(isOpen) => {
          setEditOpen(isOpen);
          if (!isOpen) {
            // Refresh the parent dialog when edit is closed
            onOpenChange(false);
          }
        }}
      />
    </>
  );
}

