
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CalendarIcon, Clock, Loader2, Check, ChevronsUpDown } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import { usePatients, useClinics, useSpecialties, useCreateAppointment, usePendingPatientAppointments } from '@/hooks/useAppointments';

const formSchema = z.object({
    paciente_id: z.string().min(1, 'Selecione um paciente'),
    clinica_id: z.string().min(1, 'Selecione uma clínica'),
    especialidade_id: z.string().min(1, 'Selecione uma especialidade'),
    data: z.date({
        required_error: 'Selecione uma data',
    }),
    hora_inicio: z.string().min(1, 'Selecione o horário de início'),
    hora_fim: z.string().min(1, 'Selecione o horário de fim'),
    profissional: z.string().min(1, 'Informe o nome do profissional'),
    observacoes: z.string().optional(),
});

interface NewAppointmentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialDate?: Date;
    initialTime?: string;
}

export function NewAppointmentDialog({
    open,
    onOpenChange,
    initialDate,
    initialTime
}: NewAppointmentDialogProps) {
    const { data: patients } = usePatients();
    const { data: clinics } = useClinics(true); // Only active clinics
    const [patientOpen, setPatientOpen] = useState(false);
    const { data: specialties } = useSpecialties();
    const createAppointment = useCreateAppointment();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            paciente_id: '',
            clinica_id: '',
            especialidade_id: '',
            data: initialDate || new Date(),
            hora_inicio: initialTime || '',
            hora_fim: initialTime ?
                (() => {
                    const [hours, minutes] = initialTime.split(':').map(Number);
                    const endMinutes = minutes + 30;
                    const endHours = hours + Math.floor(endMinutes / 60);
                    const finalMinutes = endMinutes % 60;
                    return `${endHours.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`;
                })()
                : '',
            observacoes: '',
            profissional: '',
        },
    });

    // Update form values when initial props change
    useEffect(() => {
        if (open) {
            if (initialDate) {
                form.setValue('data', initialDate);
            }
            if (initialTime) {
                form.setValue('hora_inicio', initialTime);
                const [hours, minutes] = initialTime.split(':').map(Number);
                const endMinutes = minutes + 30;
                const endHours = hours + Math.floor(endMinutes / 60);
                const finalMinutes = endMinutes % 60;
                const endTime = `${endHours.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`;
                form.setValue('hora_fim', endTime);
            }
        }
    }, [open, initialDate, initialTime, form]);

    const timeSlots = Array.from({ length: 24 }, (_, i) => {
        const hour = Math.floor(i / 2) + 7; // Start at 07:00
        const minute = i % 2 === 0 ? '00' : '30';
        return `${String(hour).padStart(2, '0')}:${minute}`;
    }).filter(time => {
        const h = parseInt(time.split(':')[0]);
        return h < 19; // End at 18:30
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            // Find selected patient to get empresa_id if available
            const selectedPatient = patients?.find(p => p.id === values.paciente_id);

            await createAppointment.mutateAsync({
                paciente_id: values.paciente_id,
                clinica_id: values.clinica_id,
                especialidade_id: values.especialidade_id,
                data: format(values.data, 'yyyy-MM-dd'),
                hora_inicio: values.hora_inicio,
                hora_fim: values.hora_fim,
                status: 'agendado',
                empresa_id: selectedPatient?.empresa_id || null,
                profissional: values.profissional,
                observacoes: values.observacoes,
            });

            toast.success('Agendamento criado com sucesso!');
            form.reset();
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast.error('Erro ao criar agendamento. Tente novamente.');
        }
    };

    // Filter specialties based on selected clinic
    const selectedClinicId = form.watch('clinica_id');
    const filteredSpecialties = specialties?.filter(
        (s) => !selectedClinicId || s.clinica_id === selectedClinicId
    );

    // Watch for patient selection to fetch pending appointments
    const selectedPatientId = form.watch('paciente_id');
    const { data: pendingAppointments, isLoading: pendingLoading } = usePendingPatientAppointments(selectedPatientId);

    const formatAppointmentDate = (dateStr: string) => {
        return format(new Date(dateStr + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={selectedPatientId && pendingAppointments && pendingAppointments.length > 0 ? "sm:max-w-[800px]" : "sm:max-w-[425px]"}>
                <DialogHeader>
                    <DialogTitle>Novo Agendamento</DialogTitle>
                </DialogHeader>

                <div className={selectedPatientId && pendingAppointments && pendingAppointments.length > 0 ? "flex gap-6" : ""}>
                    {/* Form Column */}
                    <div className={selectedPatientId && pendingAppointments && pendingAppointments.length > 0 ? "flex-1" : "w-full"}>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                                {/* Paciente */}
                                <FormField
                                    control={form.control}
                                    name="paciente_id"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Paciente</FormLabel>
                                            <Popover open={patientOpen} onOpenChange={setPatientOpen}>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant="outline"
                                                            role="combobox"
                                                            aria-expanded={patientOpen}
                                                            className={cn(
                                                                "w-full justify-between",
                                                                !field.value && "text-muted-foreground"
                                                            )}
                                                        >
                                                            {field.value
                                                                ? patients?.find((patient) => patient.id === field.value)?.nome
                                                                : "Selecione um paciente..."}
                                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[400px] p-0">
                                                    <Command>
                                                        <CommandInput placeholder="Procurar paciente..." />
                                                        <CommandList>
                                                            <CommandEmpty>Nenhum paciente encontrado.</CommandEmpty>
                                                            <CommandGroup>
                                                                {patients?.map((patient) => (
                                                                    <CommandItem
                                                                        value={patient.nome}
                                                                        key={patient.id}
                                                                        onSelect={() => {
                                                                            form.setValue("paciente_id", patient.id);
                                                                            setPatientOpen(false);
                                                                        }}
                                                                    >
                                                                        <Check
                                                                            className={cn(
                                                                                "mr-2 h-4 w-4",
                                                                                patient.id === field.value
                                                                                    ? "opacity-100"
                                                                                    : "opacity-0"
                                                                            )}
                                                                        />
                                                                        {patient.nome}
                                                                    </CommandItem>
                                                                ))}
                                                            </CommandGroup>
                                                        </CommandList>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Professional Name */}
                                <FormField
                                    control={form.control}
                                    name="profissional"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nome do Profissional</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Digite o nome do médico/profissional" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    {/* Clínica */}
                                    <FormField
                                        control={form.control}
                                        name="clinica_id"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Clínica</FormLabel>
                                                <Select
                                                    onValueChange={(value) => {
                                                        field.onChange(value);
                                                        form.setValue('especialidade_id', ''); // Reset specialty when clinic changes
                                                    }}
                                                    defaultValue={field.value}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Selecione" />
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

                                    {/* Especialidade */}
                                    <FormField
                                        control={form.control}
                                        name="especialidade_id"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Especialidade</FormLabel>
                                                <Select
                                                    onValueChange={field.onChange}
                                                    defaultValue={field.value}
                                                    disabled={!selectedClinicId}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Selecione" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {filteredSpecialties?.map((spec) => (
                                                            <SelectItem key={spec.id} value={spec.id}>
                                                                {spec.nome}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Data */}
                                <FormField
                                    control={form.control}
                                    name="data"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Data</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant={"outline"}
                                                            className={cn(
                                                                "w-full pl-3 text-left font-normal",
                                                                !field.value && "text-muted-foreground"
                                                            )}
                                                        >
                                                            {field.value ? (
                                                                format(field.value, "PPP", { locale: ptBR })
                                                            ) : (
                                                                <span>Selecione uma data</span>
                                                            )}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={field.value}
                                                        onSelect={field.onChange}
                                                        disabled={(date) =>
                                                            date < new Date(new Date().setHours(0, 0, 0, 0))
                                                        }
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    {/* Hora Início */}
                                    <FormField
                                        control={form.control}
                                        name="hora_inicio"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Início</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="00:00" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {timeSlots.map((time) => (
                                                            <SelectItem key={`start-${time}`} value={time}>
                                                                {time}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Hora Fim */}
                                    <FormField
                                        control={form.control}
                                        name="hora_fim"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Fim</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="00:00" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {timeSlots.map((time) => (
                                                            <SelectItem key={`end-${time}`} value={time}>
                                                                {time}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Observações */}
                                <FormField
                                    control={form.control}
                                    name="observacoes"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Observações</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Detalhes adicionais (opcional)"
                                                    className="resize-none h-24"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                        Cancelar
                                    </Button>
                                    <Button type="submit" disabled={createAppointment.isPending}>
                                        {createAppointment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Agendar
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </div>

                    {/* Pending Appointments Panel - Only show if patient selected and has pending appointments */}
                    {selectedPatientId && pendingAppointments && pendingAppointments.length > 0 && (
                        <div className="w-[280px] border-l pl-4">
                            <h3 className="text-sm font-semibold text-orange-600 mb-3 flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Agendamentos em Aberto ({pendingAppointments.length})
                            </h3>
                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                                {pendingLoading ? (
                                    <div className="flex items-center justify-center py-4">
                                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                    </div>
                                ) : (
                                    pendingAppointments.map((apt: any) => (
                                        <div
                                            key={apt.id}
                                            className="p-3 rounded-lg border bg-orange-50 border-orange-200 text-sm space-y-1"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium text-orange-700">
                                                    {formatAppointmentDate(apt.data)}
                                                </span>
                                                <span className="text-orange-600 font-semibold">
                                                    {apt.hora_inicio?.slice(0, 5)}
                                                </span>
                                            </div>
                                            {apt.clinica?.nome && (
                                                <p className="text-xs text-muted-foreground">
                                                    <strong>Clínica:</strong> {apt.clinica.nome}
                                                </p>
                                            )}
                                            {apt.especialidade?.nome && (
                                                <p className="text-xs text-muted-foreground">
                                                    <strong>Especialidade:</strong> {apt.especialidade.nome}
                                                </p>
                                            )}
                                            {apt.observacoes && (
                                                <p className="text-xs text-muted-foreground truncate" title={apt.observacoes}>
                                                    <strong>Obs:</strong> {apt.observacoes}
                                                </p>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
