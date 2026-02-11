import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useClinics } from '@/hooks/useAppointments';
import { UserProfile, UserRole } from '@/hooks/useAuth';
import { useUpdateUser } from '@/hooks/useUsers';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const userSchema = z.object({
    email: z.string().email('Email inválido'),
    nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    role: z.enum(['ADMIN', 'ATENDENTE', 'CLINICA'] as const),
    clinica_id: z.string().uuid().nullable().optional(),
    password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').optional().or(z.literal('')),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user?: UserProfile;
}

export function UserDialog({ open, onOpenChange, user }: UserDialogProps) {
    const { signUp } = useAuth();
    const updateUserMutation = useUpdateUser();
    const { data: clinics } = useClinics();

    const form = useForm<UserFormData>({
        resolver: zodResolver(userSchema),
        defaultValues: {
            email: '',
            nome: '',
            role: 'ATENDENTE',
            clinica_id: null,
            password: '',
        },
    });

    useEffect(() => {
        if (user) {
            form.reset({
                email: user.email || '',
                nome: user.nome || '',
                role: user.role,
                clinica_id: user.clinica_id || null,
                password: '',
            });
        } else {
            form.reset({
                email: '',
                nome: '',
                role: 'ATENDENTE',
                clinica_id: null,
                password: '',
            });
        }
    }, [user, form, open]);

    const onSubmit = async (data: UserFormData) => {
        if (user) {
            // Edit existing user
            await updateUserMutation.mutateAsync({
                id: user.id,
                nome: data.nome,
                role: data.role,
                clinica_id: data.role === 'CLINICA' ? data.clinica_id : null,
            });
            onOpenChange(false);
        } else {
            // Create new user using signUp
            if (!data.password) {
                toast.error('Senha é obrigatória para novos usuários');
                return;
            }

            const { error } = await signUp(data.email, data.password, {
                nome: data.nome,
                role: data.role,
                tipo: data.role.toLowerCase(),
                clinica_id: data.role === 'CLINICA' ? data.clinica_id : null,
            });
            if (error) {
                toast.error(error.message);
            } else {
                toast.success('Usuário convidado! Um email de confirmação foi enviado.');
                // Note: The profile will be created by the trigger, but we might want to update it immediately
                // However, we don't have the ID yet easily. 
                // For a better UX in an admin panel, a service role is needed.
                onOpenChange(false);
            }
        }
    };

    const selectedRole = form.watch('role');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{user ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="nome"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Nome completo" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input placeholder="email@exemplo.com" {...field} disabled={!!user} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {!user && (
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Senha</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="••••••••" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                        <FormField
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Papel (Role)</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        value={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione um papel" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="ADMIN">Administrador</SelectItem>
                                            <SelectItem value="ATENDENTE">Atendente</SelectItem>
                                            <SelectItem value="CLINICA">Clínica</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {selectedRole === 'CLINICA' && (
                            <FormField
                                control={form.control}
                                name="clinica_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Clínica Vinculada</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value || undefined}
                                            value={field.value || undefined}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione uma clínica" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {clinics?.map((clinic) => (
                                                    <SelectItem key={clinic.id} value={clinic.id}>
                                                        {clinic.nome}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <DialogFooter>
                            <Button type="submit" disabled={updateUserMutation.isPending}>
                                {user ? 'Salvar Alterações' : 'Criar Usuário'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
