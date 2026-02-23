import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    ArrowLeft,
    User,
    Phone,
    Mail,
    Building2,
    Calendar,
    Clock,
    FileText,
    MapPin,
    Edit,
    Trash2
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { usePatient, usePatientAppointments, useDeletePatient } from '@/hooks/useAppointments';
import { useAuth } from '@/hooks/useAuth';
import { PatientFormDialog } from '@/components/PatientFormDialog';
import { StatusBadge } from '@/components/StatusBadge';
import { Loader2 } from 'lucide-react';

export default function PatientDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [editDialogOpen, setEditDialogOpen] = useState(false);

    const { data: patient, isLoading: isLoadingPatient } = usePatient(id);
    const { profile } = useAuth();
    const isClinica = profile?.role === 'CLINICA';

    const { data: appointments, isLoading: isLoadingAppointments } = usePatientAppointments(
        id,
        isClinica ? profile?.clinica_id : null
    );
    const deletePatient = useDeletePatient();

    const isAdmin = profile?.role === 'ADMIN';
    const isAtendente = profile?.role === 'ATENDENTE';
    const canModify = isAdmin || isAtendente;

    const pendingAppointments = appointments?.filter(a => a.status === 'agendado') || [];
    const pendingCount = pendingAppointments.length;

    const handleDeletePatient = async () => {
        if (!id || !canModify) return;
        try {
            await deletePatient.mutateAsync(id);
            navigate('/pacientes');
        } catch (error) {
            // error handled by mutation
        }
    };

    if (isLoadingPatient || isLoadingAppointments) {
        return (
            <Layout title="Ficha do Paciente">
                <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </Layout>
        );
    }

    if (!patient) {
        return (
            <Layout title="Ficha do Paciente">
                <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] gap-4">
                    <p className="text-muted-foreground">Paciente não encontrado</p>
                    <Button onClick={() => navigate('/pacientes')}>Voltar para lista</Button>
                </div>
            </Layout>
        );
    }

    const formatCurrency = (value?: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value || 0);
    };

    const formatDate = (dateString: string) => {
        return format(new Date(dateString + 'T00:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    };

    return (
        <Layout title="Ficha do Paciente">
            <div className="space-y-6">
                {/* Header / Back Button */}
                <div>
                    <Button variant="ghost" className="pl-0 gap-2 mb-4" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-4 w-4" />
                        Voltar
                    </Button>
                </div>

                {/* Patient Profile Header */}
                <div className="grid gap-6 md:grid-cols-[300px_1fr]">
                    <Card className="h-fit">
                        <CardHeader className="text-center">
                            <div className="mx-auto bg-primary/10 w-24 h-24 rounded-full flex items-center justify-center mb-4">
                                <User className="h-12 w-12 text-primary" />
                            </div>
                            <CardTitle>{patient.nome}</CardTitle>
                            <div className="flex justify-center gap-2 mt-4">
                                {canModify && (
                                    <Button variant="outline" size="sm" className="gap-2" onClick={() => setEditDialogOpen(true)}>
                                        <Edit className="h-4 w-4" />
                                        Editar Dados
                                    </Button>
                                )}
                                {canModify && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Excluir Paciente</AlertDialogTitle>
                                                <AlertDialogDescription asChild>
                                                    <div>
                                                        {pendingCount > 0 ? (
                                                            <>
                                                                <p className="text-destructive font-semibold mb-2">
                                                                    ⚠️ Este paciente possui {pendingCount} agendamento{pendingCount > 1 ? 's' : ''} em aberto!
                                                                </p>
                                                                <p>Deseja prosseguir com a exclusão de <strong>{patient.nome}</strong>? Todos os agendamentos serão excluídos junto. Esta ação não pode ser desfeita.</p>
                                                            </>
                                                        ) : (
                                                            <p>Tem certeza que deseja excluir o paciente <strong>{patient.nome}</strong>? Esta ação não pode ser desfeita.</p>
                                                        )}
                                                    </div>
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleDeletePatient} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                    Excluir
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <User className="h-4 w-4" />
                                    <span>CPF: {patient.cpf || 'Não informado'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Calendar className="h-4 w-4" />
                                    <span>Nasc: {patient['data de nascimento'] ? format(new Date(patient['data de nascimento'] + 'T00:00:00'), 'dd/MM/yyyy') : 'Não informado'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Phone className="h-4 w-4" />
                                    <span>{patient.telefone || 'Não informado'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Mail className="h-4 w-4" />
                                    <span>{patient.email || 'Não informado'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Building2 className="h-4 w-4" />
                                    <span>{patient.empresa?.nome || 'Sem empresa'}</span>
                                </div>
                                {patient.matricula && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <FileText className="h-4 w-4" />
                                        <span>Matrícula: {patient.matricula}</span>
                                    </div>
                                )}
                                {patient.tipo_paciente && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <User className="h-4 w-4" />
                                        <span>Tipo: </span>
                                        <Badge variant={
                                            patient.tipo_paciente === 'TITULAR' ? 'default' :
                                                patient.tipo_paciente === 'DEPENDENTE' ? 'secondary' :
                                                    'outline'
                                        }>
                                            {patient.tipo_paciente === 'EXTRAORDINARIO' ? 'Extraordinário' : patient.tipo_paciente.charAt(0) + patient.tipo_paciente.slice(1).toLowerCase()}
                                        </Badge>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Stats & History */}
                    <div className="space-y-6">
                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-2xl font-bold">{appointments?.length || 0}</div>
                                    <p className="text-xs text-muted-foreground">Total de Consultas</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-2xl font-bold text-green-600">
                                        {appointments?.filter(a => a.status === 'compareceu').length || 0}
                                    </div>
                                    <p className="text-xs text-muted-foreground">Realizadas</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-2xl font-bold text-blue-600">
                                        {appointments?.filter(a => a.status === 'agendado').length || 0}
                                    </div>
                                    <p className="text-xs text-muted-foreground">Agendadas</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-2xl font-bold text-red-600">
                                        {appointments?.filter(a => a.status === 'cancelado' || a.status === 'faltou').length || 0}
                                    </div>
                                    <p className="text-xs text-muted-foreground">Canceladas/Faltas</p>
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Histórico de Consultas</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Tabs defaultValue="all">
                                    <TabsList>
                                        <TabsTrigger value="all">Todas</TabsTrigger>
                                        <TabsTrigger value="scheduled">Agendadas</TabsTrigger>
                                        <TabsTrigger value="completed">Realizadas</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="all" className="mt-4">
                                        <AppointmentList appointments={appointments || []} />
                                    </TabsContent>
                                    <TabsContent value="scheduled" className="mt-4">
                                        <AppointmentList appointments={appointments?.filter(a => a.status === 'agendado') || []} />
                                    </TabsContent>
                                    <TabsContent value="completed" className="mt-4">
                                        <AppointmentList appointments={appointments?.filter(a => a.status === 'compareceu') || []} />
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            <PatientFormDialog
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                patient={patient}
            />
        </Layout>
    );
}

function AppointmentList({ appointments }: { appointments: any[] }) {
    if (appointments.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                Nenhum agendamento encontrado.
            </div>
        );
    }

    return (
        <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
                {appointments.map((apt) => (
                    <Card key={apt.id} className="overflow-hidden">
                        <div className="flex flex-col sm:flex-row border-l-4 border-l-primary">
                            {/* Date Column */}
                            <div className="p-4 bg-muted/20 min-w-[150px] flex flex-col justify-center items-center sm:items-start border-b sm:border-b-0 sm:border-r">
                                <div className="text-2xl font-bold leading-none mb-1">
                                    {format(new Date(apt.data + 'T00:00:00'), 'dd')}
                                </div>
                                <div className="text-sm uppercase font-medium text-muted-foreground mb-2">
                                    {format(new Date(apt.data + 'T00:00:00'), 'MMM yyyy', { locale: ptBR })}
                                </div>
                                <div className="flex items-center gap-1 text-sm bg-background px-2 py-1 rounded border">
                                    <Clock className="h-3 w-3" />
                                    {apt.hora_inicio.slice(0, 5)}
                                </div>
                            </div>

                            {/* Info Column */}
                            <div className="flex-1 p-4 space-y-3">
                                <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                                    <div>
                                        <h4 className="font-semibold text-lg">{apt.especialidade?.nome}</h4>
                                        <div className="flex items-center gap-1 text-muted-foreground text-sm">
                                            <MapPin className="h-3 w-3" />
                                            {apt.clinica?.nome}
                                        </div>
                                    </div>
                                    <StatusBadge status={apt.status} />
                                </div>

                                <div className="grid sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    {apt.profissional && (
                                        <div className="col-span-2 flex gap-2">
                                            <span className="font-medium text-muted-foreground">Profissional:</span>
                                            <span>{apt.profissional}</span>
                                        </div>
                                    )}
                                    {apt.observacoes && (
                                        <div className="col-span-2 flex gap-2">
                                            <span className="font-medium text-muted-foreground">Observações:</span>
                                            <span className="text-muted-foreground italic">{apt.observacoes}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </ScrollArea>
    );
}
