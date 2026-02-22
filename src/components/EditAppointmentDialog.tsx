import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format, startOfDay, subDays, isAfter } from 'date-fns';
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
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import {
    useClinics,
    useSpecialties,
    useUpdateAppointment,
    usePatientHistoryAppointments
} from '@/hooks/useAppointments';
import type { Appointment } from '@/types/appointment';

const formSchema = z.object({
    clinica_id: z.string().min(1, 'Selecione uma clínica'),
    especialidade_id: z.string().min(1, 'Selecione uma especialidade'),
    data: z.date({
        required_error: 'Selecione uma data',
    }),
    hora_inicio: z.string().min(1, 'Selecione o horário de início'),
    hora_fim: z.string().min(1, 'Selecione o horário de fim'),
    profissional: z.string().optional(),
    observacoes: z.string().optional(),
});

interface EditAppointmentDialogProps {
    appointment: Appointment;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function EditAppointmentDialog({
    appointment,
    open,
    onOpenChange,
}: EditAppointmentDialogProps) {
    const { data: clinics } = useClinics(true);
    const { data: specialties } = useSpecialties();
    const updateAppointment = useUpdateAppointment();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            clinica_id: appointment.clinica_id || '',
            especialidade_id: appointment.especialidade_id || '',
            data: new Date(appointment.data + 'T00:00:00'),
            hora_inicio: appointment.hora_inicio?.slice(0, 5) || '',
            hora_fim: appointment.hora_fim?.slice(0, 5) || '',
            profissional: appointment.profissional || '',
            observacoes: appointment.observacoes || '',
        },
    });

    // Validity states
    const [isBlocked, setIsBlocked] = useState(false);
    const [isReleased, setIsReleased] = useState(false);
    const [justificativa, setJustificativa] = useState('');
    const [blockReason, setBlockReason] = useState<'validity' | 'penalty' | null>(null);

    const selectedPatientId = appointment.paciente_id;
    const selectedSpecialtyId = form.watch('especialidade_id');

    // Determine limits for procedure validity
    const selectedSpecialty = specialties?.find(s => s.id === selectedSpecialtyId);
    const isOftalmo = selectedSpecialty?.nome.toLowerCase().includes('ofta');
    const monthsLimit = isOftalmo ? 12 : 6;

    const { data: historyAppointments, isLoading: historyLoading } = usePatientHistoryAppointments(selectedPatientId || undefined, monthsLimit);

    // Reset form when appointment changes
    useEffect(() => {
        if (open && appointment) {
            setIsBlocked(false);
            setIsReleased(false);
            setJustificativa('');
            setBlockReason(null);
            form.reset({
                clinica_id: appointment.clinica_id || '',
                especialidade_id: appointment.especialidade_id || '',
                data: new Date(appointment.data + 'T00:00:00'),
                hora_inicio: appointment.hora_inicio?.slice(0, 5) || '',
                hora_fim: appointment.hora_fim?.slice(0, 5) || '',
                profissional: appointment.profissional || '',
                observacoes: appointment.observacoes || '',
            });
        }
    }, [open, appointment, form]);

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
                // DON'T count the current appointment itself if it's already marked as faltou in a previous edit
                // though usually you'd be editing a future one.
                if (apt.id === appointment.id) return false;
                if (!apt.data) return false;
                const aptDate = startOfDay(new Date(apt.data + 'T00:00:00'));
                const aptStatus = (apt.status || '').toLowerCase();
                return aptStatus === 'faltou' && (isAfter(aptDate, fifteenDaysAgo) || aptDate.getTime() === fifteenDaysAgo.getTime());
            });

            if (hasRecentMiss) {
                setIsBlocked(true);
                setBlockReason('penalty');
                return;
            }
        }

        // 5. VALIDITY CHECK (6 or 12 Months) - Applies to Exams or Ophthalmologist Consultations
        if (isExame || (isTargetOftalmo && isConsult)) {
            const hasRecentProcedure = historyAppointments.some(apt => {
                if (apt.id === appointment.id) return false;
                const aptStatus = (apt.status || '').toLowerCase();
                return apt.especialidade_id === selectedSpecialtyId && aptStatus === 'compareceu';
            });

            if (hasRecentProcedure) {
                setIsBlocked(true);
                setBlockReason('validity');
                return;
            }
        }

        // 6. SUCCESS: No blocks triggered
        setIsBlocked(false);
        setIsReleased(false);
        setBlockReason(null);
    }, [selectedPatientId, selectedSpecialtyId, specialties, historyAppointments, appointment.id]);

    const timeSlots = Array.from({ length: 24 }, (_, i) => {
        const hour = Math.floor(i / 2) + 6; // Start at 06:00
        const minute = i % 2 === 0 ? '00' : '30';
        return `${String(hour).padStart(2, '0')}:${minute}`;
    }).filter(time => {
        const h = parseInt(time.split(':')[0]);
        return h <= 17; // End at 17:30
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            let finalObservacoes = values.observacoes || '';
            if (isReleased && justificativa) {
                finalObservacoes = `LIBERADO COM JUSTIFICATIVA: ${justificativa}\n\n${finalObservacoes}`.trim();
            }

            await updateAppointment.mutateAsync({
                id: appointment.id,
                clinica_id: values.clinica_id,
                especialidade_id: values.especialidade_id,
                data: format(values.data, 'yyyy-MM-dd'),
                hora_inicio: values.hora_inicio,
                hora_fim: values.hora_fim,
                profissional: values.profissional || undefined,
                observacoes: finalObservacoes || undefined,
            });

            toast.success('Agendamento atualizado com sucesso!');
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast.error('Erro ao atualizar agendamento. Tente novamente.');
        }
    };

    // Filter specialties based on selected clinic
    const selectedClinicId = form.watch('clinica_id');
    const filteredSpecialties = specialties?.filter(
        (s) => !selectedClinicId || s.clinica_id === selectedClinicId
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Editar Agendamento</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {/* Patient Info (read-only) */}
                        <div className="p-3 bg-secondary/50 rounded-lg">
                            <p className="text-sm text-muted-foreground">Paciente</p>
                            <p className="font-medium">{appointment.paciente?.nome || 'Não informado'}</p>
                        </div>

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
                                                form.setValue('especialidade_id', '');
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

                        {/* Alerta de Validade de Exame */}
                        {isBlocked && !isReleased && (
                            <div className="p-4 border border-destructive bg-destructive/5 rounded-lg space-y-3">
                                <p className="text-sm font-semibold text-destructive text-center">
                                    {blockReason === 'penalty' ? (
                                        <>⚠️ Este paciente possui uma falta registrada nos últimos 15 dias. Agendamentos Clínicos estão suspensos temporariamente.</>
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
                                    updateAppointment.isPending ||
                                    historyLoading ||
                                    (isBlocked && !isReleased) ||
                                    (isReleased && !justificativa.trim())
                                }
                            >
                                {(updateAppointment.isPending || historyLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {historyLoading ? 'Verificando...' : 'Salvar Alterações'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
