import { useState } from 'react';
import { Search, Plus, Shield, Mail, Building2, Edit, Trash2 } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useUsers, useDeleteUser } from '@/hooks/useUsers';
import { useClinics } from '@/hooks/useAppointments';
import { Badge } from '@/components/ui/badge';
import { UserDialog } from '@/components/UserDialog';
import { UserProfile } from '@/hooks/useAuth';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const AdminPanelPage = () => {
    const [search, setSearch] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserProfile | undefined>(undefined);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const { data: users, isLoading } = useUsers();
    const { data: clinics } = useClinics();
    const deleteMutation = useDeleteUser();

    const filteredUsers = users?.filter((u) =>
    (u.nome?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase()))
    );

    const handleDelete = async () => {
        if (deleteId) {
            await deleteMutation.mutateAsync(deleteId);
            setDeleteId(null);
        }
    };

    const getClinicName = (id: string | null) => {
        if (!id) return null;
        return clinics?.find(c => c.id === id)?.nome || 'Clínica não encontrada';
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'ADMIN':
                return <Badge className="bg-purple-600">Admin</Badge>;
            case 'ATENDENTE':
                return <Badge variant="secondary">Atendente</Badge>;
            case 'CLINICA':
                return <Badge variant="outline" className="border-primary text-primary">Clínica</Badge>;
            default:
                return <Badge variant="secondary">{role}</Badge>;
        }
    };

    return (
        <Layout title="Painel do Administrador">
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div className="relative flex-1 w-full max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar usuário por nome ou email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Button onClick={() => {
                        setSelectedUser(undefined);
                        setDialogOpen(true);
                    }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Cadastrar Novo Usuário
                    </Button>
                </div>

                {isLoading ? (
                    <div className="grid gap-4">
                        {[...Array(4)].map((_, i) => (
                            <Card key={i} className="p-6 animate-pulse bg-muted/50 h-24" />
                        ))}
                    </div>
                ) : filteredUsers?.length === 0 ? (
                    <Card className="p-12 text-center">
                        <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                        <p className="text-muted-foreground">Nenhum usuário encontrado</p>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {filteredUsers?.map((user) => (
                            <Card key={user.id} className="p-6 hover:shadow-md transition-all border-l-4 border-l-primary/20">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-lg">{user.nome || 'Sem nome'}</h3>
                                            {getRoleBadge(user.role)}
                                        </div>
                                        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-3 w-3" />
                                                {user.email}
                                            </div>
                                            {user.role === 'CLINICA' && (
                                                <div className="flex items-center gap-2 text-primary">
                                                    <Building2 className="h-3 w-3" />
                                                    {getClinicName(user.clinica_id)}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setSelectedUser(user);
                                                setDialogOpen(true);
                                            }}
                                        >
                                            <Edit className="h-4 w-4 mr-2" />
                                            Editar
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => setDeleteId(user.id)}
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Excluir
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                <UserDialog
                    open={dialogOpen}
                    onOpenChange={setDialogOpen}
                    user={selectedUser}
                />

                <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta ação removerá o acesso do usuário ao sistema. O perfil do usuário será excluído permanentemente.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Confirmar Exclusão
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </Layout>
    );
};

export default AdminPanelPage;
