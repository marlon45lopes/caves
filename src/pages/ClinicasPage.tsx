import { useState } from 'react';
import { Search, Plus, CheckCircle, XCircle, Edit, Trash2 } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useClinics } from '@/hooks/useAppointments';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ClinicDialog } from '@/components/ClinicDialog';
import type { Clinic } from '@/types/appointment';
import { useAuth } from '@/hooks/useAuth';

const ClinicasPage = () => {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | undefined>(undefined);
  const { data: clinics, isLoading } = useClinics();
  const { profile } = useAuth();

  const isAtendente = profile?.role === 'ATENDENTE';

  const filteredClinics = clinics?.filter((c) =>
    c.nome.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = clinics?.filter(c => c.ativa).length || 0;
  const totalCount = clinics?.length || 0;

  return (
    <Layout title="Clínicas">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar clínica..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="secondary" className="whitespace-nowrap">
              {activeCount} ativas de {totalCount}
            </Badge>
          </div>
          {!isAtendente && (
            <Button
              onClick={() => {
                setSelectedClinic(undefined);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Clínica
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </Card>
            ))}
          </div>
        ) : filteredClinics?.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Nenhuma clínica encontrada</p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredClinics?.map((clinic: Clinic) => (
              <Card
                key={clinic.id}
                className={cn(
                  "p-4 hover:shadow-md transition-shadow",
                  !clinic.ativa && "opacity-60"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{clinic.nome}</h3>
                    {clinic.telefone && <p className="text-sm text-muted-foreground">{clinic.telefone}</p>}
                    {clinic.endereco && <p className="text-sm text-muted-foreground">{clinic.endereco}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'flex items-center gap-1 text-xs',
                        clinic.ativa ? 'text-status-compareceu' : 'text-status-cancelado'
                      )}
                    >
                      {clinic.ativa ? (
                        <>
                          <CheckCircle className="h-3 w-3" />
                          Ativa
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3" />
                          Inativa
                        </>
                      )}
                    </span>
                  </div>
                </div>
                {!isAtendente && (
                  <div className="flex gap-1 mt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8"
                      onClick={() => {
                        setSelectedClinic(clinic);
                        setDialogOpen(true);
                      }}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        <ClinicDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          clinic={selectedClinic}
        />
      </div>
    </Layout>
  );
};

export default ClinicasPage;
