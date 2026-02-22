import { useState } from 'react';
import { Search, Plus, Building2 } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSpecialties, useClinics } from '@/hooks/useAppointments';
import { Badge } from '@/components/ui/badge';
import { SpecialtyDialog } from '@/components/SpecialtyDialog';
import type { Specialty } from '@/types/appointment';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const EspecialidadesPage = () => {
  const [search, setSearch] = useState('');
  const [clinicFilter, setClinicFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState<Specialty | undefined>(undefined);
  const { data: specialties, isLoading } = useSpecialties();
  const { data: clinics } = useClinics(true);

  const filteredSpecialties = specialties?.filter((s) => {
    const matchesSearch = s.nome.toLowerCase().includes(search.toLowerCase());
    const matchesClinic = clinicFilter === 'all' || s.clinica_id === clinicFilter;
    return matchesSearch && matchesClinic;
  });

  // Agrupar especialidades por clínica para visualização
  const groupedByClinic = filteredSpecialties?.reduce((acc, specialty) => {
    const clinicName = (specialty as any).clinica?.nome || 'Sem clínica';
    if (!acc[clinicName]) {
      acc[clinicName] = [];
    }
    acc[clinicName].push(specialty);
    return acc;
  }, {} as Record<string, typeof specialties>);

  return (
    <Layout title="Especialidades">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar especialidade..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={clinicFilter} onValueChange={setClinicFilter}>
              <SelectTrigger className="w-[200px]">
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
            <Badge variant="secondary" className="whitespace-nowrap self-center">
              {filteredSpecialties?.length || 0} especialidades
            </Badge>
          </div>
          <Button
            onClick={() => {
              setSelectedSpecialty(undefined);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Especialidade
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="h-6 bg-muted rounded w-3/4" />
              </Card>
            ))}
          </div>
        ) : filteredSpecialties?.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Nenhuma especialidade encontrada</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByClinic || {}).map(([clinicName, specs]) => (
              <div key={clinicName}>
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-foreground">{clinicName}</h3>
                  <Badge variant="outline">{specs?.length}</Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
                  {specs?.map((specialty) => (
                    <Card
                      key={specialty.id}
                      className="p-3 hover:shadow-md transition-shadow cursor-pointer flex justify-between items-center"
                      onClick={() => {
                        setSelectedSpecialty(specialty);
                        setDialogOpen(true);
                      }}
                    >
                      <div className="flex flex-col gap-1 items-start">
                        <h4 className="font-medium text-foreground text-sm">{specialty.nome}</h4>
                        {specialty.tipo && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1 bg-primary/5 text-primary border-primary/20">
                            {specialty.tipo}
                          </Badge>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <SpecialtyDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          specialty={selectedSpecialty}
        />
      </div>
    </Layout>
  );
};

export default EspecialidadesPage;
