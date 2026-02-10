import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { format, addDays, startOfWeek, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppointmentCard } from '@/components/AppointmentCard';
import { AppointmentActionsDialog } from '@/components/AppointmentActionsDialog';
import { NewAppointmentDialog } from '@/components/NewAppointmentDialog';
import { useAppointments, useClinics, useSpecialties } from '@/hooks/useAppointments';
import type { Appointment } from '@/types/appointment';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type ViewMode = 'day' | 'week';

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newAppointmentOpen, setNewAppointmentOpen] = useState(false);
  const [newAppointmentData, setNewAppointmentData] = useState<{ date: Date; time: string } | undefined>(undefined);
  const [selectedClinicId, setSelectedClinicId] = useState<string>('all');
  const [selectedSpecialtyName, setSelectedSpecialtyName] = useState<string>('all');

  const { data: appointments, isLoading } = useAppointments(undefined, selectedClinicId, selectedSpecialtyName);
  const { data: clinics } = useClinics(true);
  const { data: specialties, isLoading: isSpecialtiesLoading } = useSpecialties();

  const filteredSpecialties = useMemo(() => {
    if (!specialties) return [];
    if (selectedClinicId === 'all') {
      // Return unique specialties by name if "all clinics" is selected
      const uniqueNames = new Set<string>();
      return specialties.filter(s => {
        if (uniqueNames.has(s.nome)) return false;
        uniqueNames.add(s.nome);
        return true;
      });
    }
    return specialties.filter(s => s.clinica_id === selectedClinicId);
  }, [specialties, selectedClinicId]);

  const weekDays = useMemo(() => {
    // Show 7 days starting from current date (rolling week)
    return Array.from({ length: 7 }, (_, i) => addDays(currentDate, i));
  }, [currentDate]);

  const getAppointmentsForDate = (date: Date) => {
    if (!appointments) return [];
    const dateStr = format(date, 'yyyy-MM-dd');
    return appointments.filter((apt) => apt.data === dateStr);
  };

  const navigate = (direction: 'prev' | 'next') => {
    if (viewMode === 'week') {
      setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
    } else {
      setCurrentDate(direction === 'prev' ? addDays(currentDate, -1) : addDays(currentDate, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setDialogOpen(true);
  };

  const handleNewAppointment = (date?: Date, time?: string) => {
    setNewAppointmentData(date && time ? { date, time } : undefined);
    setNewAppointmentOpen(true);
  };

  const getAppointmentsForSlot = (date: Date, hour: number) => {
    if (!appointments) return [];
    const dateStr = format(date, 'yyyy-MM-dd');
    return appointments.filter((apt) => {
      if (apt.data !== dateStr) return false;
      if (!apt.hora_inicio) return false;
      const aptHour = parseInt(apt.hora_inicio.split(':')[0]);
      return aptHour === hour;
    });
  };

  const hours = Array.from({ length: 12 }, (_, i) => 6 + i); // 06:00 to 17:00
  const timeSlots = hours.map(h => `${String(h).padStart(2, '0')}:00`);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigate('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigate('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" onClick={goToToday}>
            Hoje
          </Button>
          <h2 className="text-xl font-semibold text-foreground capitalize">
            {viewMode === 'week'
              ? format(weekDays[0], "MMMM 'de' yyyy", { locale: ptBR })
              : format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-[200px]">
            <Select
              key={selectedClinicId}
              value={selectedSpecialtyName}
              onValueChange={setSelectedSpecialtyName}
            >
              <SelectTrigger>
                <SelectValue placeholder={isSpecialtiesLoading ? "Carregando..." : "Todas as especialidades"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as especialidades</SelectItem>
                {filteredSpecialties?.map((specialty) => (
                  <SelectItem key={specialty.id} value={specialty.nome}>
                    {specialty.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-[200px]">
            <Select
              value={selectedClinicId}
              onValueChange={(value) => {
                setSelectedClinicId(value);
                setSelectedSpecialtyName('all');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por clínica" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as clínicas</SelectItem>
                {clinics?.map((clinic) => (
                  <SelectItem key={clinic.id} value={clinic.id}>
                    {clinic.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="day">Dia</TabsTrigger>
              <TabsTrigger value="week">Semana</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => handleNewAppointment()}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Agendamento
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}

      {viewMode === 'week' ? (
        <Card className="overflow-hidden">
          <div className="max-h-[600px] overflow-y-auto">
            {/* Header with days - Sticky */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b sticky top-0 z-10 bg-card">
              <div className="p-2 border-r bg-secondary/30 flex items-center justify-center">
                <span className="text-xs text-muted-foreground">Hora</span>
              </div>
              {weekDays.map((day, index) => {
                const isToday = isSameDay(day, new Date());
                return (
                  <div
                    key={index}
                    className={cn(
                      'p-4 text-center border-r last:border-r-0',
                      isToday && 'bg-primary/5'
                    )}
                  >
                    <p className="text-sm text-muted-foreground capitalize">
                      {format(day, 'EEE', { locale: ptBR })}
                    </p>
                    <p
                      className={cn(
                        'text-2xl font-semibold mt-1',
                        isToday
                          ? 'text-primary-foreground bg-primary w-10 h-10 rounded-full flex items-center justify-center mx-auto'
                          : 'text-foreground'
                      )}
                    >
                      {format(day, 'd')}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Time slots with appointments */}
            <div>
              {hours.map((hour) => (
                <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b last:border-b-0">
                  <div className="py-3 px-2 text-xs text-muted-foreground border-r bg-secondary/30 flex items-start justify-center">
                    {`${String(hour).padStart(2, '0')}:00`}
                  </div>
                  {weekDays.map((day, dayIndex) => {
                    const slotAppointments = getAppointmentsForSlot(day, hour);
                    const timeString = `${hour.toString().padStart(2, '0')}:00`;

                    return (
                      <div
                        key={`${format(day, 'yyyy-MM-dd')}-${hour}`}
                        className="min-h-[120px] h-full border-b border-r p-1 hover:bg-accent/10 transition-colors flex gap-1 group overflow-hidden"
                        onClick={(e) => {
                          // Only trigger if clicking the container directly
                          if (e.target === e.currentTarget) {
                            handleNewAppointment(day, timeString);
                          }
                        }}
                      >
                        {isLoading ? (
                          <div className="animate-pulse h-full w-full bg-muted rounded" />
                        ) : (
                          <>
                            {slotAppointments?.map((appointment: any) => (
                              <div key={appointment.id} className="flex-1 min-w-0 h-full">
                                <AppointmentCard
                                  appointment={appointment as Appointment}
                                  variant="compact"
                                  onClick={() => {
                                    setSelectedAppointment(appointment as Appointment);
                                    setDialogOpen(true);
                                  }}
                                />
                              </div>
                            ))}
                            {/* Reserved empty space to ensure we can always click to create a new appointment */}
                            <div
                              className="min-w-[40px] flex-1 h-full cursor-pointer hover:bg-accent/5 transition-colors"
                              title="Clique para adicionar novo agendamento"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNewAppointment(day, timeString);
                              }}
                            />
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y">
            {timeSlots.map((time) => {
              const dayAppointments = getAppointmentsForDate(currentDate).filter(
                (apt) => apt.hora_inicio?.slice(0, 2) === time.slice(0, 2)
              );
              return (
                <div key={time} className="flex">
                  <div className="w-20 py-4 px-3 text-sm text-muted-foreground border-r bg-secondary/30">
                    {time}
                  </div>
                  <div className="flex-1 p-2 min-h-[60px]">
                    {dayAppointments.map((apt: any) => (
                      <AppointmentCard
                        key={apt.id}
                        appointment={apt as Appointment}
                        onClick={() => handleAppointmentClick(apt as Appointment)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <AppointmentActionsDialog
        appointment={selectedAppointment}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      <NewAppointmentDialog
        open={newAppointmentOpen}
        onOpenChange={setNewAppointmentOpen}
        initialDate={newAppointmentData?.date}
        initialTime={newAppointmentData?.time}
      />
    </div>
  );
}
