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
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';

type ViewMode = 'day' | 'week';

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newAppointmentOpen, setNewAppointmentOpen] = useState(false);
  const [newAppointmentData, setNewAppointmentData] = useState<{ date: Date; time: string } | undefined>(undefined);
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'ADMIN';
  const isAtendente = profile?.role === 'ATENDENTE';
  const isClinica = profile?.role === 'CLINICA';

  const canCreateAppointment = isAdmin || isAtendente;

  const [selectedClinicId, setSelectedClinicId] = useState<string>('all');
  const [selectedSpecialtyName, setSelectedSpecialtyName] = useState<string>('all');

  // Auto-select clinic if user belongs to one
  useEffect(() => {
    if (profile?.clinica_id) {
      setSelectedClinicId(profile.clinica_id);
    }
  }, [profile]);

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

  const getPositionedAppointments = (date: Date) => {
    const dayAppointments = getAppointmentsForDate(date);
    if (!dayAppointments.length) return [];

    // 1. Initial positioning and sorting
    const items = dayAppointments.map(apt => {
      const start = getMinutes(apt.hora_inicio);

      // Try to get duration from hora_fim, then duracao_minutos, then default 30
      let end = getMinutes(apt.hora_fim);
      if (!end || end <= start) {
        end = start + (apt.duracao_minutos || 30);
      }
      const duration = end - start;

      return {
        ...apt,
        startMinutes: start,
        endMinutes: end,
        top: (start - CALENDAR_START_MINUTES) * PIXELS_PER_MINUTE,
        height: Math.max(duration * PIXELS_PER_MINUTE, 25),
      };
    }).sort((a, b) => a.startMinutes - b.startMinutes || (b.endMinutes - b.startMinutes) - (a.endMinutes - a.startMinutes));

    // 2. Assign columns using a greedy approach
    const columns: any[][] = [];
    const processedItems: any[] = [];

    items.forEach(item => {
      let colIndex = -1;
      for (let i = 0; i < columns.length; i++) {
        const lastInCol = columns[i][columns[i].length - 1];
        if (item.startMinutes >= lastInCol.endMinutes) {
          colIndex = i;
          columns[i].push(item);
          break;
        }
      }
      if (colIndex === -1) {
        colIndex = columns.length;
        columns.push([item]);
      }
      processedItems.push({ ...item, colIndex });
    });

    // 3. Group into clusters of overlapping appointments
    const results: any[] = [];
    let currentCluster: any[] = [];
    let clusterEnd = 0;

    processedItems.forEach(item => {
      if (item.startMinutes < clusterEnd) {
        currentCluster.push(item);
        clusterEnd = Math.max(clusterEnd, item.endMinutes);
      } else {
        if (currentCluster.length > 0) finalizeCluster(currentCluster, results);
        currentCluster = [item];
        clusterEnd = item.endMinutes;
      }
    });
    if (currentCluster.length > 0) finalizeCluster(currentCluster, results);

    return results;
  };

  const finalizeCluster = (cluster: any[], results: any[]) => {
    // totalCols should be the maximum number of columns used in this cluster
    const maxCols = new Set(cluster.map(i => i.colIndex)).size;
    cluster.forEach(item => {
      results.push({
        ...item,
        totalCols: Math.max(maxCols, 1)
      });
    });
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

  const gridDuration = useMemo(() => {
    if (selectedSpecialtyName !== 'all' && specialties) {
      const spec = specialties.find(s => s.nome === selectedSpecialtyName);
      if (spec?.duracao_minutos) return spec.duracao_minutos;
    }
    return 60;
  }, [selectedSpecialtyName, specialties]);

  const PIXELS_PER_SLOT = 100;
  const PIXELS_PER_MINUTE = PIXELS_PER_SLOT / gridDuration;
  const CALENDAR_START_MINUTES = 360; // 06:00
  const CALENDAR_END_MINUTES = 1080; // 18:00

  const gridSlots = useMemo(() => {
    const slots = [];

    let current = CALENDAR_START_MINUTES;
    while (current < CALENDAR_END_MINUTES) {
      const h = Math.floor(current / 60);
      const m = current % 60;
      slots.push({
        time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
        startMinutes: current,
        duration: gridDuration
      });
      current += gridDuration;
    }
    return slots;
  }, [gridDuration]);

  const getMinutes = (timeStr: string | null) => {
    if (!timeStr) return 480; // Default 8:00
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

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

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[150px] sm:w-[200px]">
            <Select
              value={selectedClinicId}
              onValueChange={(value) => {
                setSelectedClinicId(value);
                setSelectedSpecialtyName('all');
              }}
              disabled={isClinica}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por clínica" />
              </SelectTrigger>
              <SelectContent>
                {!isClinica && <SelectItem value="all">Todas as clínicas</SelectItem>}
                {clinics?.map((clinic) => (
                  <SelectItem key={clinic.id} value={clinic.id}>
                    {clinic.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[150px] sm:w-[200px]">
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
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="w-auto">
            <TabsList>
              <TabsTrigger value="day">Dia</TabsTrigger>
              <TabsTrigger value="week">Semana</TabsTrigger>
            </TabsList>
          </Tabs>
          {canCreateAppointment && (
            <Button onClick={() => handleNewAppointment()} className="whitespace-nowrap">
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden xs:inline">Novo Agendamento</span>
              <span className="xs:hidden">Novo</span>
            </Button>
          )}
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="max-h-[700px] overflow-y-auto">
          {viewMode === 'week' ? (
            <div className="w-full">
              {/* Header with days */}
              <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b sticky top-0 z-20 bg-card">
                <div className="p-2 border-r bg-secondary/30 flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">Hora</span>
                </div>
                {weekDays.map((day, index) => {
                  const isToday = isSameDay(day, new Date());
                  return (
                    <div
                      key={index}
                      className={cn(
                        'p-4 text-center border-r last:border-r-0 cursor-pointer hover:bg-accent/10 transition-colors',
                        isToday && 'bg-primary/5'
                      )}
                      onClick={() => {
                        setCurrentDate(day);
                        setViewMode('day');
                      }}
                      title={`Ver agendamentos de ${format(day, "d 'de' MMMM", { locale: ptBR })}`}
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

              {/* Grid Body */}
              <div className="relative">
                {/* Background Grid Lines */}
                {gridSlots.map((slot) => (
                  <div
                    key={slot.time}
                    className="grid grid-cols-[60px_repeat(7,1fr)] border-b last:border-b-0"
                    style={{ height: `${slot.duration * PIXELS_PER_MINUTE}px` }}
                  >
                    <div className="py-2 px-1 text-[10px] text-muted-foreground border-r bg-secondary/30 flex items-start justify-center">
                      {slot.time}
                    </div>
                    {weekDays.map((_, dayIndex) => (
                      <div
                        key={dayIndex}
                        className="border-r last:border-r-0 h-full hover:bg-accent/5 transition-colors cursor-pointer"
                        onClick={() => canCreateAppointment && handleNewAppointment(weekDays[dayIndex], slot.time)}
                      />
                    ))}
                  </div>
                ))}

                {/* Appointments Overlay */}
                <div className="absolute top-0 left-[60px] right-0 bottom-0 pointer-events-none grid grid-cols-7">
                  {weekDays.map((day, dayIndex) => {
                    const positionedAppointments = getPositionedAppointments(day);
                    return (
                      <div key={format(day, 'yyyy-MM-dd')} className="relative h-full border-r last:border-r-0 pointer-events-none">
                        {positionedAppointments.map((apt: any) => (
                          <div
                            key={apt.id}
                            className="absolute z-10 pointer-events-auto"
                            style={{
                              top: `${apt.top}px`,
                              height: `${apt.height}px`,
                              left: `${(100 / apt.totalCols) * apt.colIndex}%`,
                              width: `${(100 / apt.totalCols) * 0.9}%`,
                              padding: '1px',
                              zIndex: 10 + apt.colIndex // Ensure later overlapping items are on top
                            }}
                          >
                            <AppointmentCard
                              appointment={apt}
                              variant="compact"
                              onClick={() => handleAppointmentClick(apt)}
                            />
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="relative">
              {/* Day View Background */}
              {gridSlots.map((slot) => (
                <div
                  key={slot.time}
                  className="flex border-b last:border-b-0"
                  style={{ height: `${slot.duration * PIXELS_PER_MINUTE}px` }}
                >
                  <div className="w-20 py-2 px-3 text-sm text-muted-foreground border-r bg-secondary/30">
                    {slot.time}
                  </div>
                  <div
                    className="flex-1 hover:bg-accent/5 transition-colors cursor-pointer"
                    onClick={() => canCreateAppointment && handleNewAppointment(currentDate, slot.time)}
                  />
                </div>
              ))}
              {/* Day View Appointments Overlay */}
              <div className="absolute top-0 left-20 right-0 bottom-0 pointer-events-none">
                {getPositionedAppointments(currentDate).map((apt: any) => (
                  <div
                    key={apt.id}
                    className="absolute z-10 pointer-events-auto"
                    style={{
                      top: `${apt.top}px`,
                      height: `${apt.height}px`,
                      left: `${(100 / apt.totalCols) * apt.colIndex}%`,
                      width: `${(100 / apt.totalCols) * 0.9}%`,
                      padding: '2px',
                      zIndex: 10 + apt.colIndex
                    }}
                  >
                    <AppointmentCard
                      appointment={apt}
                      onClick={() => handleAppointmentClick(apt)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

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
        initialClinicId={selectedClinicId !== 'all' ? selectedClinicId : undefined}
        initialSpecialtyId={selectedSpecialtyName !== 'all' ? specialties?.find(s => s.nome === selectedSpecialtyName)?.id : undefined}
      />
    </div>
  );
}
