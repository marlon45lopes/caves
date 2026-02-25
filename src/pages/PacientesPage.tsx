import { useState, useEffect } from 'react';
import { Search, Plus, Phone, Mail, Building2, Edit, Trash2, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { usePatients, useDeletePatient } from '@/hooks/useAppointments';
import { PatientFormDialog } from '@/components/PatientFormDialog';
import { useAuth } from '@/hooks/useAuth';
import type { Patient } from '@/types/appointment';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const PacientesPage = () => {
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [deletePatient, setDeletePatient] = useState<Patient | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const navigate = useNavigate();

  const { profile } = useAuth();
  const { data: patients, isLoading } = usePatients();
  const deletePatientMutation = useDeletePatient();

  const isAdmin = profile?.role === 'ADMIN';
  const isAtendente = profile?.role === 'ATENDENTE';
  const isClinica = profile?.role === 'CLINICA';

  // Only Admin or Atendente can create/edit patients
  const canModify = isAdmin || isAtendente;

  const filteredPatients = search.length >= 3
    ? patients?.filter((p) => {
      const searchTerms = search.toLowerCase().trim().replace(/[.\-]/g, '');
      const nameMatch = p.nome.toLowerCase().includes(searchTerms);
      const cpfClean = (p.cpf || '').replace(/[.\-]/g, '');
      const cpfMatch = cpfClean.includes(searchTerms);
      const emailMatch = p.email?.toLowerCase().includes(searchTerms);
      return nameMatch || cpfMatch || emailMatch;
    })
    : [];

  const handleEdit = (patient: Patient) => {
    if (!canModify) return;
    setEditingPatient(patient);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deletePatient || !canModify) return;
    try {
      await deletePatientMutation.mutateAsync(deletePatient.id);
      toast.success('Paciente excluído com sucesso!');
      setDeletePatient(null);
      setPendingCount(0);
    } catch (error) {
      toast.error('Erro ao excluir paciente');
    }
  };

  // Check for pending appointments when a patient is selected for deletion
  useEffect(() => {
    if (!deletePatient) {
      setPendingCount(0);
      return;
    }
    const checkPending = async () => {
      const { count } = await supabase
        .from('agendamentos')
        .select('*', { count: 'exact', head: true })
        .eq('paciente_id', deletePatient.id)
        .eq('status', 'agendado');
      setPendingCount(count || 0);
    };
    checkPending();
  }, [deletePatient]);

  const handleNewPatient = () => {
    if (!canModify) return;
    setEditingPatient(null);
    setFormOpen(true);
  };

  return (
    <Layout title="Pacientes">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar paciente por nome ou CPF (mín. 3 caracteres)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          {canModify && (
            <Button onClick={handleNewPatient}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Paciente
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </Card>
            ))}
          </div>
        ) : search.length < 3 ? (
          <Card className="p-12 text-center border-dashed bg-secondary/10">
            <div className="max-w-xs mx-auto space-y-3">
              <Search className="h-10 w-10 text-muted-foreground/30 mx-auto" />
              <div className="space-y-1">
                <p className="text-lg font-medium text-foreground">Pesquisar Pacientes</p>
                <p className="text-sm text-muted-foreground">
                  Digite ao menos 3 caracteres para buscar por nome ou CPF.
                </p>
              </div>
            </div>
          </Card>
        ) : filteredPatients?.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <div className="max-w-xs mx-auto space-y-2">
              <Plus className="h-8 w-8 text-muted-foreground/30 mx-auto" />
              <p className="text-muted-foreground font-medium">Nenhum paciente encontrado para "{search}"</p>
              {canModify && (
                <Button variant="outline" size="sm" onClick={handleNewPatient} className="mt-2">
                  Cadastrar novo paciente
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPatients?.map((patient) => (
              <Card
                key={patient.id}
                className="p-4 hover:shadow-md transition-shadow border-l-4 border-l-primary/20"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-foreground truncate mr-2" title={patient.nome}>
                    {patient.nome}
                  </h3>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                      title="Ficha do Paciente"
                      onClick={() => navigate(`/pacientes/${patient.id}`)}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>

                    {canModify && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(patient as Patient)}
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}

                    {canModify && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeletePatient(patient as Patient)}
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {patient.cpf && (
                    <p className="font-medium text-foreground/80">CPF: {patient.cpf}</p>
                  )}
                  {patient.telefone && (
                    <p className="flex items-center gap-2">
                      <Phone className="h-3 w-3 shrink-0" />
                      {patient.telefone}
                    </p>
                  )}
                  {patient.email && (
                    <p className="flex items-center gap-2 truncate" title={patient.email}>
                      <Mail className="h-3 w-3 shrink-0" />
                      {patient.email}
                    </p>
                  )}
                  {patient.empresa && (
                    <p className="flex items-center gap-2 truncate" title={patient.empresa}>
                      <Building2 className="h-3 w-3 shrink-0" />
                      {patient.empresa}
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <PatientFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        patient={editingPatient}
      />

      <AlertDialog open={!!deletePatient} onOpenChange={() => setDeletePatient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {pendingCount > 0 ? (
                  <>
                    <p className="text-destructive font-semibold mb-2">
                      ⚠️ Este paciente possui {pendingCount} agendamento{pendingCount > 1 ? 's' : ''} em aberto!
                    </p>
                    <p>Deseja prosseguir com a exclusão de "{deletePatient?.nome}"? Todos os agendamentos serão excluídos junto. Esta ação não pode ser desfeita.</p>
                  </>
                ) : (
                  <p>Tem certeza que deseja excluir o paciente "{deletePatient?.nome}"? Esta ação não pode ser desfeita.</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default PacientesPage;
