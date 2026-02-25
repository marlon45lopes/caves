
import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CalendarIcon, Clock, Loader2, Check, ChevronsUpDown } from 'lucide-react';
import { format, startOfDay, subDays, isAfter, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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

import {
    usePatients,
    useClinics,
    useSpecialties,
    useCreateAppointment,
    usePendingPatientAppointments,
    usePatientHistoryAppointments
} from '@/hooks/useAppointments';

const formSchema = z.object({
    paciente_id: z.string().min(1, 'Selecione um paciente'),
    clinica_id: z.string().min(1, 'Selecione uma clínica'),
    especialidade_id: z.string().min(1, 'Selecione uma especialidade'),
    data: z.date({
        required_error: 'Selecione uma data',
    }),
    hora_inicio: z.string().min(1, 'Selecione o horário de início'),
    hora_fim: z.string().min(1, 'Selecione o horário de fim'),
    profissional: z.string().optional(),
    observacoes: z.string().optional(),
    atendimento_online: z.boolean().default(false),
    tipo_horario: z.enum(['hora_marcada', 'ordem_chegada']).default('hora_marcada'),
});

interface NewAppointmentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialDate?: Date;
    initialTime?: string;
    initialClinicId?: string;
    initialSpecialtyId?: string;
}

export function NewAppointmentDialog({
    open,
    onOpenChange,
    initialDate,
    initialTime,
    initialClinicId,
    initialSpecialtyId
}: NewAppointmentDialogProps) {
    const { data: patients } = usePatients();
    const { data: clinics } = useClinics(true); // Only active clinics
    const [patientOpen, setPatientOpen] = useState(false);
    const [patientSearch, setPatientSearch] = useState('');
    const { data: specialties } = useSpecialties();
    const createAppointment = useCreateAppointment();

    // Validity states
    const [isBlocked, setIsBlocked] = useState(false);
    const [isReleased, setIsReleased] = useState(false);
    const [justificativa, setJustificativa] = useState('');
    const [blockReason, setBlockReason] = useState<'validity' | 'penalty' | null>(null);

    // Helper to format time from Date
    const formatTimeFromDate = (date: Date) => {
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    };

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            paciente_id: '',
            clinica_id: initialClinicId || '',
            especialidade_id: initialSpecialtyId || '',
            data: initialDate || new Date(),
            hora_inicio: initialTime || '',
            hora_fim: initialTime ?
                formatTimeFromDate(new Date(new Date().setHours(Number(initialTime.split(':')[0]), Number(initialTime.split(':')[1]) + 30)))
                : '',
            profissional: '',
            observacoes: '',
            atendimento_online: false,
            tipo_horario: 'hora_marcada',
        },
    });



    // Generate time slots with 5-minute intervals
    const timeSlots = Array.from({ length: 12 * 13 + 1 }, (_, i) => {
        const totalMinutes = i * 5;
        const hour = Math.floor(totalMinutes / 60) + 6;
        const minute = totalMinutes % 60;
        return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }).filter(time => {
        const h = parseInt(time.split(':')[0]);
        const m = parseInt(time.split(':')[1]);
        if (h > 18) return false;
        if (h === 18 && m > 0) return false;
        return true;
    });



    // Update form values when initial props change
    useEffect(() => {
        if (open) {
            setIsBlocked(false);
            setIsReleased(false);
            setJustificativa('');
            setBlockReason(null);

            // Calculate initial end time (30 mins fallback)
            let endTime = '';
            if (initialTime) {
                const [hours, minutes] = initialTime.split(':').map(Number);
                const date = new Date();
                date.setHours(hours, minutes, 0, 0);
                const endDate = new Date(date.getTime() + 30 * 60000);
                endTime = formatTimeFromDate(endDate);
            }

            // Reset entire form to clean state with initial values
            form.reset({
                paciente_id: '',
                clinica_id: initialClinicId || '',
                especialidade_id: initialSpecialtyId || '',
                data: initialDate || new Date(),
                hora_inicio: initialTime || '',
                hora_fim: endTime,
                observacoes: '',
                profissional: '',
                atendimento_online: false,
                tipo_horario: 'hora_marcada',
            });
        }
    }, [open, initialDate, initialTime, initialClinicId, initialSpecialtyId, form]);

    const watchedHoraInicio = form.watch('hora_inicio');
    const watchedSpecialtyId = form.watch('especialidade_id');

    // Update hora_fim when hora_inicio or especialidade_id changes
    useEffect(() => {
        if (watchedHoraInicio && watchedSpecialtyId && specialties) {
            const spec = specialties.find(s => s.id === watchedSpecialtyId);
            const duration = spec?.duracao_minutos || 30;

            const [hours, minutes] = watchedHoraInicio.split(':').map(Number);
            const date = new Date();
            date.setHours(hours, minutes, 0, 0);

            const endDate = new Date(date.getTime() + duration * 60000);
            const endTime = formatTimeFromDate(endDate);

            form.setValue('hora_fim', endTime);
        }
    }, [watchedHoraInicio, watchedSpecialtyId, specialties, form]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            // Find selected patient to get empresa_id if available
            const selectedPatient = patients?.find(p => p.id === values.paciente_id);
            const selectedSpec = specialties?.find(s => s.id === values.especialidade_id);
            const duration = selectedSpec?.duracao_minutos || 30;

            const dateStr = format(values.data, 'yyyy-MM-dd');
            const inicio_em = new Date(`${dateStr}T${values.hora_inicio}:00`).toISOString();
            const fim_em = new Date(`${dateStr}T${values.hora_fim}:00`).toISOString();

            let finalObservacoes = values.observacoes || '';

            // Add Online marker if active
            if (values.atendimento_online) {
                finalObservacoes = `[ONLINE] ${finalObservacoes}`.trim();
            }

            // Add Arrival Order marker if active
            if (values.tipo_horario === 'ordem_chegada') {
                finalObservacoes = `[CHEGADA] ${finalObservacoes}`.trim();
            }

            if (isReleased && justificativa) {
                finalObservacoes = `LIBERADO COM JUSTIFICATIVA: ${justificativa}\n\n${finalObservacoes}`.trim();
            }

            await createAppointment.mutateAsync({
                paciente_id: values.paciente_id,
                clinica_id: values.clinica_id,
                especialidade_id: values.especialidade_id,
                data: dateStr,
                hora_inicio: values.hora_inicio,
                hora_fim: values.hora_fim,
                inicio_em,
                fim_em,
                duracao_minutos: duration,
                status: 'agendado',
                empresa_id: selectedPatient?.empresa_id || null,
                profissional: values.profissional,
                observacoes: finalObservacoes,
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
    const selectedSpecialtyId = form.watch('especialidade_id');

    // Determine validity period based on specialty
    const selectedSpecialty = useMemo(() =>
        specialties?.find(s => s.id === selectedSpecialtyId),
        [specialties, selectedSpecialtyId]
    );

    const isOftalmo = selectedSpecialty?.nome?.toLowerCase().includes('ofta') && selectedSpecialty?.tipo === 'CONSULTA';
    const isExame = selectedSpecialty?.tipo === 'EXAME';
    const monthsLimit = isOftalmo ? 12 : 6;

    const { data: pendingAppointments, isLoading: pendingLoading } = usePendingPatientAppointments(selectedPatientId);
    const { data: historyAppointments, isLoading: historyLoading } = usePatientHistoryAppointments(selectedPatientId, monthsLimit);

    // Effect to check procedure validity (6 or 12 months) and Penalty for missed appointments (15 days)
    useEffect(() => {
        // 1. Reset block if essential selection is missing
        if (!selectedPatientId || !selectedSpecialtyId || !specialties) {
            setIsBlocked(false);
            setIsReleased(false);
            setBlockReason(null);
            return;
        }

        // 2. Wait for history data to load
        if (!historyAppointments) return;

        // 3. Identify current specialty context
        const spec = specialties.find(s => s.id === selectedSpecialtyId);
        if (!spec) return;

        const specType = (spec.tipo || '').toUpperCase();
        const specName = (spec.nome || '').toLowerCase();

        // Define exclusions: only these types are EXEMPT from the 15-day penalty block
        const isExemptType = ['ADMISSIONAL', 'DEMISSIONAL', 'PSICOTESTE'].includes(specType);
        const isTargetOftalmo = specName.includes('ofta');
        const isConsult = specType === 'CONSULTA' || specName.includes('consulta') || specName.includes('médico') || isTargetOftalmo;
        const isExame = specType === 'EXAME' || specName.includes('exame');

        const today = startOfDay(new Date());
        const fifteenDaysAgo = startOfDay(subDays(today, 15));

        // 4. PENALTY CHECK (15 Days) - Applies to anything that isn't explicitly exempt
        if (!isExemptType) {
            const hasRecentMiss = historyAppointments.some(apt => {
                if (!apt.data) return false;
                const aptDate = startOfDay(new Date(apt.data + 'T00:00:00'));
                const aptStatus = (apt.status || '').toLowerCase();
                // Block if any appointment in the last 15 days was missed
                return aptStatus === 'faltou' && (isAfter(aptDate, fifteenDaysAgo) || aptDate.getTime() === fifteenDaysAgo.getTime());
            });

            if (hasRecentMiss) {
                setIsBlocked(true);
                setBlockReason('penalty');
                return; // Penalty takes precedence
            }
        }

        // 5. VALIDITY CHECK (6 or 12 Months) - Applies to Exams or Ophthalmologist Consultations
        if (isExame || (isTargetOftalmo && isConsult)) {
            const hasRecentProcedure = historyAppointments.some(apt => {
                const aptStatus = (apt.status || '').toLowerCase();
                return apt.especialidade_id === selectedSpecialtyId && aptStatus === 'compareceu';
            });

            if (hasRecentProcedure) {
                setIsBlocked(true);
                setBlockReason('validity');
                return; // Validity block triggered
            }
        }

        // 6. SUCCESS: No blocks triggered
        setIsBlocked(false);
        setIsReleased(false);
        setBlockReason(null);
    }, [selectedPatientId, selectedSpecialtyId, specialties, historyAppointments]);

    const hasSidebarData = (pendingAppointments && pendingAppointments.length > 0) || (historyAppointments && historyAppointments.length > 0);

    const formatAppointmentDate = (dateStr: string) => {
        return format(new Date(dateStr + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={selectedPatientId && hasSidebarData ? "sm:max-w-[800px]" : "sm:max-w-[425px]"}>
                <DialogHeader>
                    <DialogTitle>Novo Agendamento</DialogTitle>
                </DialogHeader>

                <div className={selectedPatientId && hasSidebarData ? "flex gap-6" : ""}>
                    {/* Form Column */}
                    <div className={selectedPatientId && hasSidebarData ? "flex-1" : "w-full"}>
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
                                                    <Command shouldFilter={false}>
                                                        <CommandInput
                                                            placeholder="Buscar por nome ou CPF (mín. 3 caracteres)..."
                                                            value={patientSearch}
                                                            onValueChange={setPatientSearch}
                                                        />
                                                        <CommandList>
                                                            {patientSearch.length < 3 ? (
                                                                <div className="py-6 text-center text-sm text-muted-foreground">
                                                                    Digite ao menos 3 caracteres para buscar
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <CommandEmpty>Nenhum paciente encontrado.</CommandEmpty>
                                                                    <CommandGroup>
                                                                        {patients
                                                                            ?.filter((patient) => {
                                                                                const search = patientSearch.toLowerCase().replace(/[.\-]/g, '');
                                                                                const nameMatch = patient.nome.toLowerCase().includes(search);
                                                                                const cpfClean = (patient.cpf || '').replace(/[.\-]/g, '');
                                                                                const cpfMatch = cpfClean.includes(search);
                                                                                return nameMatch || cpfMatch;
                                                                            })
                                                                            .map((patient) => (
                                                                                <CommandItem
                                                                                    value={patient.nome}
                                                                                    key={patient.id}
                                                                                    onSelect={() => {
                                                                                        form.setValue("paciente_id", patient.id);
                                                                                        setPatientOpen(false);
                                                                                        setPatientSearch('');
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
                                                                                    <div className="flex flex-col">
                                                                                        <span>{patient.nome}</span>
                                                                                        {patient.cpf && (
                                                                                            <span className="text-xs text-muted-foreground">
                                                                                                CPF: {patient.cpf}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </CommandItem>
                                                                            ))}
                                                                    </CommandGroup>
                                                                </>
                                                            )}
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
                                                    value={field.value}
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
                                                    value={field.value}
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
                                                <Select onValueChange={field.onChange} value={field.value}>
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
                                                <Select onValueChange={field.onChange} value={field.value}>
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

                                <FormField
                                    control={form.control}
                                    name="tipo_horario"
                                    render={({ field }) => (
                                        <FormItem className="space-y-3">
                                            <FormLabel>Tipo de Horário</FormLabel>
                                            <FormControl>
                                                <RadioGroup
                                                    onValueChange={field.onChange}
                                                    defaultValue={field.value}
                                                    className="flex gap-4"
                                                >
                                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                                        <FormControl>
                                                            <RadioGroupItem value="hora_marcada" />
                                                        </FormControl>
                                                        <FormLabel className="font-normal cursor-pointer">
                                                            Hora Marcada
                                                        </FormLabel>
                                                    </FormItem>
                                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                                        <FormControl>
                                                            <RadioGroupItem value="ordem_chegada" />
                                                        </FormControl>
                                                        <FormLabel className="font-normal cursor-pointer">
                                                            Ordem de Chegada
                                                        </FormLabel>
                                                    </FormItem>
                                                </RadioGroup>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="atendimento_online"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-sm font-medium">Atendimento Online</FormLabel>
                                            </div>
                                            <FormControl>
                                                <div
                                                    onClick={() => field.onChange(!field.value)}
                                                    className="flex items-center gap-2 cursor-pointer group"
                                                >
                                                    <div className={cn(
                                                        "w-10 h-5 rounded-full border transition-all relative flex items-center px-1",
                                                        field.value ? "bg-purple-100 border-purple-300" : "bg-secondary border-input"
                                                    )}>
                                                        <div className={cn(
                                                            "w-3 h-3 rounded-full transition-all shadow-sm",
                                                            field.value ? "bg-purple-500 ml-auto" : "bg-muted-foreground/30 ml-0"
                                                        )} />
                                                    </div>
                                                </div>
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

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

                                {/* Alerta de Validade de Exame */}
                                {isBlocked && !isReleased && (
                                    <div className="p-4 border border-destructive bg-destructive/5 rounded-lg space-y-3">
                                        <p className="text-sm font-semibold text-destructive">
                                            {blockReason === 'penalty' ? (
                                                <>⚠️ Este paciente possui uma falta registrada nos últimos 15 dias. Agendamentos de Consultas e Exames estão suspensos temporariamente por este período.</>
                                            ) : (
                                                <>⚠️ Este paciente já realizou este procedimento nos últimos {monthsLimit === 12 ? '1 ano' : '6 meses'} e ele ainda está na validade.</>
                                            )}
                                        </p>
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="sm"
                                            className="w-full"
                                            onClick={() => setIsReleased(true)}
                                        >
                                            Liberar com Justificativa
                                        </Button>
                                    </div>
                                )}

                                {isBlocked && isReleased && (
                                    <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg space-y-2">
                                        <FormLabel className="text-blue-700">Justificativa para liberação *</FormLabel>
                                        <Textarea
                                            placeholder="Descreva o motivo da liberação deste agendamento..."
                                            className="resize-none h-20 border-blue-300"
                                            value={justificativa}
                                            onChange={(e) => setJustificativa(e.target.value)}
                                        />
                                        <p className="text-[10px] text-blue-600">A justificativa será incluída nas observações do agendamento.</p>
                                    </div>
                                )}

                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                        Cancelar
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={
                                            createAppointment.isPending ||
                                            historyLoading ||
                                            pendingLoading ||
                                            (isBlocked && !isReleased) ||
                                            (isReleased && !justificativa.trim())
                                        }
                                    >
                                        {(createAppointment.isPending || historyLoading || pendingLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {historyLoading ? 'Verificando...' : 'Agendar'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </div>

                    {/* Sidebar Panel - Only show if patient selected and has appointments */}
                    {selectedPatientId && hasSidebarData && (
                        <div className="w-[320px] border-l pl-4">
                            <Tabs defaultValue="pending" className="w-full">
                                <TabsList className="grid w-full grid-cols-2 mb-4">
                                    <TabsTrigger value="pending" className="text-xs">Abertos</TabsTrigger>
                                    <TabsTrigger value="history" className="text-xs">Histórico</TabsTrigger>
                                </TabsList>

                                <TabsContent value="pending" className="mt-0">
                                    <h3 className="text-sm font-semibold text-orange-600 mb-3 flex items-center gap-2">
                                        <Clock className="h-4 w-4" />
                                        Agendamentos em Aberto ({pendingAppointments?.length || 0})
                                    </h3>
                                    <div className="space-y-2 max-h-[460px] overflow-y-auto pr-2">
                                        {pendingLoading ? (
                                            <div className="flex items-center justify-center py-4">
                                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                            </div>
                                        ) : pendingAppointments && pendingAppointments.length > 0 ? (
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
                                        ) : (
                                            <p className="text-sm text-muted-foreground text-center py-4 italic">Nenhum agendamento futuro</p>
                                        )}
                                    </div>
                                </TabsContent>

                                <TabsContent value="history" className="mt-0">
                                    <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                                        <Check className="h-4 w-4" />
                                        Histórico ({monthsLimit === 12 ? 'último 1 ano' : 'últimos 6 meses'})
                                    </h3>
                                    <div className="space-y-2 max-h-[460px] overflow-y-auto pr-2">
                                        {historyLoading ? (
                                            <div className="flex items-center justify-center py-4">
                                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                            </div>
                                        ) : historyAppointments && historyAppointments.length > 0 ? (
                                            historyAppointments.map((apt: any) => (
                                                <div
                                                    key={apt.id}
                                                    className={cn(
                                                        "p-3 rounded-lg border text-sm space-y-1",
                                                        apt.status === 'compareceu'
                                                            ? "bg-primary/5 border-primary/20"
                                                            : "bg-red-50 border-red-200"
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className={cn(
                                                            "font-medium",
                                                            apt.status === 'compareceu' ? "text-primary" : "text-red-700"
                                                        )}>
                                                            {formatAppointmentDate(apt.data)}
                                                            {apt.status === 'faltou' && " (Faltou)"}
                                                        </span>
                                                        <span className="text-muted-foreground font-semibold">
                                                            {apt.hora_inicio?.slice(0, 5)}
                                                        </span>
                                                    </div>
                                                    {apt.clinica?.nome && (
                                                        <p className="text-xs">
                                                            <strong>Clínica:</strong> {apt.clinica.nome}
                                                        </p>
                                                    )}
                                                    {apt.profissional && (
                                                        <p className="text-xs">
                                                            <strong>Profissional:</strong> {apt.profissional}
                                                        </p>
                                                    )}
                                                    {apt.especialidade?.nome && (
                                                        <p className="text-xs text-muted-foreground">
                                                            <strong>Especialidade:</strong> {apt.especialidade.nome}
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                                                        <strong>Observações:</strong> {apt.observacoes || "—"}
                                                    </p>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-muted-foreground text-center py-4 italic">Nenhum atendimento nos últimos 6 meses</p>
                                        )}
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>
                    )}
                </div>
            </DialogContent >
        </Dialog >
    );
}
