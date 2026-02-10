import { useState } from 'react';
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
  const navigate = useNavigate();

  const { profile } = useAuth();
  const { data: patients, isLoading } = usePatients();
  const deletePatientMutation = useDeletePatient();

  const isAdmin = profile?.role === 'ADMIN';
  const isAtendente = profile?.role === 'ATENDENTE';
  const isClinica = profile?.role === 'CLINICA';

  // Only Admin or Atendente can create/edit patients
  const canModify = isAdmin || isAtendente;

  const filteredPatients = patients?.filter((p) =>
    p.nome.toLowerCase().includes(search.toLowerCase()) ||
    p.cpf?.includes(search) ||
    p.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (patient: Patient) => {
    if (!canModify) return;
    setEditingPatient(patient);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deletePatient || !isAdmin) return;
    try {
      await deletePatientMutation.mutateAsync(deletePatient.id);
      toast.success('Paciente excluído com sucesso!');
      setDeletePatient(null);
    } catch (error) {
      toast.error('Erro ao excluir paciente');
    }
  };

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
              placeholder="Buscar paciente por nome, CPF ou email..."
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </Card>
            ))}
          </div>
        ) : filteredPatients?.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Nenhum paciente encontrado</p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredPatients?.map((patient) => (
              <Card
                key={patient.id}
                className="p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-foreground">{patient.nome}</h3>
                  <div className="flex gap-1">
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

                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
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
                    <p>CPF: {patient.cpf}</p>
                  )}
                  {patient.telefone && (
                    <p className="flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      {patient.telefone}
                    </p>
                  )}
                  {patient.email && (
                    <p className="flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      {patient.email}
                    </p>
                  )}
                  {patient.empresa && (
                    <p className="flex items-center gap-2">
                      <Building2 className="h-3 w-3" />
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
            <AlertDialogDescription>
              Tem certeza que deseja excluir o paciente "{deletePatient?.nome}"? Esta ação não pode ser desfeita.
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
