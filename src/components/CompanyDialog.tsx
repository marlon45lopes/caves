
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useCreateCompany, useUpdateCompany } from '@/hooks/useAppointments';
import type { Company } from '@/types/appointment';

const formSchema = z.object({
    nome: z.string().min(1, 'Nome é obrigatório'),
    telefone: z.string().optional(),
    email: z.string().email('Email inválido').optional().or(z.literal('')),
    endereco: z.string().optional(),
});

interface CompanyDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    company?: Company;
}

export function CompanyDialog({ open, onOpenChange, company }: CompanyDialogProps) {
    const createCompany = useCreateCompany();
    const updateCompany = useUpdateCompany();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            nome: '',
            telefone: '',
            email: '',
            endereco: '',
        },
    });

    useEffect(() => {
        if (open) {
            if (company) {
                form.reset({
                    nome: company.nome,
                    telefone: company.telefone || '',
                    email: company.email || '',
                    endereco: company.endereco || '',
                });
            } else {
                form.reset({
                    nome: '',
                    telefone: '',
                    email: '',
                    endereco: '',
                });
            }
        }
    }, [company, form, open]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            if (company) {
                await updateCompany.mutateAsync({
                    id: company.id,
                    nome: values.nome,
                    email: values.email || undefined,
                    telefone: values.telefone || undefined,
                    endereco: values.endereco || undefined,
                });
                toast.success('Empresa atualizada com sucesso!');
            } else {
                await createCompany.mutateAsync({
                    nome: values.nome,
                    email: values.email || undefined,
                    telefone: values.telefone || undefined,
                    endereco: values.endereco || undefined,
                });
                toast.success('Empresa criada com sucesso!');
            }
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast.error('Erro ao salvar empresa. Tente novamente.');
        }
    };

    const isPending = createCompany.isPending || updateCompany.isPending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{company ? 'Editar Empresa' : 'Nova Empresa'}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="nome"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome da Empresa</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: ProSegur" {...field} />
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
                                    <FormLabel>E-mail</FormLabel>
                                    <FormControl>
                                        <Input placeholder="empresa@exemplo.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="telefone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>WhatsApp / Telefone</FormLabel>
                                    <FormControl>
                                        <Input placeholder="(00) 00000-0000" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="endereco"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Endereço</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Rua, Número, Cidade" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
