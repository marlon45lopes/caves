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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useCreateSpecialty, useUpdateSpecialty, useClinics } from '@/hooks/useAppointments';
import type { Specialty } from '@/types/appointment';

const formSchema = z.object({
    nome: z.string().min(1, 'Nome é obrigatório'),
    tipo: z.string().min(1, 'Tipo é obrigatório'),
    duracao_minutos: z.coerce.number().min(5, 'Duração mínima é 5 minutos').optional(),
    clinica_id: z.string().optional(),
    clinica_ids: z.array(z.string()).optional(),
}).refine((data) => {
    // If we have clinica_ids (create mode), it must verify length
    if (data.clinica_ids && data.clinica_ids.length > 0) return true;
    // If we have clinica_id (edit mode), it must be present
    if (data.clinica_id) return true;
    return false;
}, {
    message: "Selecione pelo menos uma clínica",
    path: ["clinica_ids"], // Error path
});

interface SpecialtyDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    specialty?: Specialty;
}

export function SpecialtyDialog({ open, onOpenChange, specialty }: SpecialtyDialogProps) {
    const createSpecialty = useCreateSpecialty();
    const updateSpecialty = useUpdateSpecialty();
    const { data: clinics } = useClinics(true);

    const isEditMode = !!specialty;

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            nome: '',
            tipo: '',
            duracao_minutos: 30,
            clinica_id: '',
            clinica_ids: [],
        },
    });

    useEffect(() => {
        if (specialty) {
            form.reset({
                nome: specialty.nome,
                tipo: specialty.tipo || '',
                duracao_minutos: specialty.duracao_minutos || 30,
                clinica_id: specialty.clinica_id || '',
                clinica_ids: [],
            });
        } else {
            form.reset({
                nome: '',
                tipo: '',
                duracao_minutos: 30,
                clinica_id: '',
                clinica_ids: [],
            });
        }
    }, [specialty, form, open]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            if (isEditMode && specialty) {
                if (!values.clinica_id) {
                    toast.error("Selecione uma clínica");
                    return;
                }
                await updateSpecialty.mutateAsync({
                    id: specialty.id,
                    nome: values.nome,
                    tipo: values.tipo,
                    duracao_minutos: values.duracao_minutos,
                    clinica_id: values.clinica_id,
                });
                toast.success('Especialidade atualizada com sucesso!');
            } else {
                if (!values.clinica_ids || values.clinica_ids.length === 0) {
                    toast.error("Selecione pelo menos uma clínica");
                    return;
                }
                await createSpecialty.mutateAsync({
                    nome: values.nome,
                    tipo: values.tipo,
                    duracao_minutos: values.duracao_minutos,
                    clinica_ids: values.clinica_ids,
                });
                toast.success('Especialidade(s) criada(s) com sucesso!');
            }
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast.error('Erro ao salvar especialidade. Tente novamente.');
        }
    };

    const isPending = createSpecialty.isPending || updateSpecialty.isPending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Editar Especialidade' : 'Nova Especialidade'}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="nome"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome da Especialidade</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Cardiologia" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="duracao_minutos"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Duração da consulta (minutos)</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="Ex: 30" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="tipo"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tipo da Especialidade</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione o tipo" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="CONSULTA">CONSULTA</SelectItem>
                                            <SelectItem value="EXAME">EXAME</SelectItem>
                                            <SelectItem value="ADMISSIONAL">ADMISSIONAL</SelectItem>
                                            <SelectItem value="DEMISSIONAL">DEMISSIONAL</SelectItem>
                                            <SelectItem value="PSICOTESTE">PSICOTESTE</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {isEditMode ? (
                            <FormField
                                control={form.control}
                                name="clinica_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Clínica</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione a clínica" />
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
                        ) : (
                            <FormField
                                control={form.control}
                                name="clinica_ids"
                                render={() => (
                                    <FormItem>
                                        <div className="mb-4">
                                            <FormLabel className="text-base">Clínicas</FormLabel>
                                        </div>
                                        <ScrollArea className="h-[200px] border rounded-md p-4">
                                            {clinics?.map((clinic) => (
                                                <FormField
                                                    key={clinic.id}
                                                    control={form.control}
                                                    name="clinica_ids"
                                                    render={({ field }) => {
                                                        return (
                                                            <FormItem
                                                                key={clinic.id}
                                                                className="flex flex-row items-start space-x-3 space-y-0 mb-3"
                                                            >
                                                                <FormControl>
                                                                    <Checkbox
                                                                        checked={field.value?.includes(clinic.id)}
                                                                        onCheckedChange={(checked) => {
                                                                            return checked
                                                                                ? field.onChange([...(field.value || []), clinic.id])
                                                                                : field.onChange(
                                                                                    field.value?.filter(
                                                                                        (value) => value !== clinic.id
                                                                                    )
                                                                                )
                                                                        }}
                                                                    />
                                                                </FormControl>
                                                                <FormLabel className="font-normal cursor-pointer text-sm">
                                                                    {clinic.nome}
                                                                </FormLabel>
                                                            </FormItem>
                                                        )
                                                    }}
                                                />
                                            ))}
                                        </ScrollArea>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

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
        </Dialog >
    );
}
