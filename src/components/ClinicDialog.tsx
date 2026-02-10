
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
import { useCreateClinic, useUpdateClinic } from '@/hooks/useAppointments';
import type { Clinic } from '@/types/appointment';

const formSchema = z.object({
    nome: z.string().min(1, 'Nome é obrigatório'),
    telefone: z.string().optional(),
    endereco: z.string().optional(),
});

interface ClinicDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    clinic?: Clinic;
}

export function ClinicDialog({ open, onOpenChange, clinic }: ClinicDialogProps) {
    const createClinic = useCreateClinic();
    const updateClinic = useUpdateClinic();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            nome: '',
            telefone: '',
            endereco: '',
        },
    });

    useEffect(() => {
        if (clinic) {
            form.reset({
                nome: clinic.nome,
                telefone: clinic.telefone || '',
                endereco: clinic.endereco || '',
            });
        } else {
            form.reset({
                nome: '',
                telefone: '',
                endereco: '',
            });
        }
    }, [clinic, form, open]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            if (clinic) {
                await updateClinic.mutateAsync({
                    id: clinic.id,
                    ...values,
                });
                toast.success('Clínica atualizada com sucesso!');
            } else {
                await createClinic.mutateAsync(values);
                toast.success('Clínica criada com sucesso!');
            }
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast.error('Erro ao salvar clínica. Tente novamente.');
        }
    };

    const isPending = createClinic.isPending || updateClinic.isPending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{clinic ? 'Editar Clínica' : 'Nova Clínica'}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="nome"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome da Clínica</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Clínica Central" {...field} />
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
                                    <FormLabel>Telefone</FormLabel>
                                    <FormControl>
                                        <Input placeholder="(00) 0000-0000" {...field} />
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
                                        <Input placeholder="Rua, Número, Bairro" {...field} />
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
