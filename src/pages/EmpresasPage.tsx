import { useState } from 'react';
import { Search, Plus, Phone, Mail, MapPin, Edit2, Trash2 } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCompanies, useDeleteCompany } from '@/hooks/useAppointments';
import { CompanyDialog } from '@/components/CompanyDialog';
import { toast } from 'sonner';
import type { Company } from '@/types/appointment';

const EmpresasPage = () => {
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | undefined>();

  const { data: companies, isLoading } = useCompanies();
  const deleteCompany = useDeleteCompany();

  const filteredCompanies = companies?.filter((c) =>
    c.nome.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    setSelectedCompany(undefined);
    setIsDialogOpen(true);
  };

  const handleEdit = (company: Company) => {
    setSelectedCompany(company);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta empresa?')) {
      try {
        await deleteCompany.mutateAsync(id);
        toast.success('Empresa excluída com sucesso!');
      } catch (error) {
        console.error(error);
        toast.error('Erro ao excluir empresa.');
      }
    }
  };

  return (
    <Layout title="Empresas">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Empresa
          </Button>
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
        ) : filteredCompanies?.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Nenhuma empresa encontrada</p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCompanies?.map((company) => (
              <Card
                key={company.id}
                className="p-4 hover:shadow-md transition-shadow group relative"
              >
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(company);
                    }}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(company.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <h3 className="font-semibold text-foreground mb-2 pr-16">{company.nome}</h3>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {company.telefone && (
                    <p className="flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      {company.telefone}
                    </p>
                  )}
                  {company.email && (
                    <p className="flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      {company.email}
                    </p>
                  )}
                  {company.endereco && (
                    <p className="flex items-center gap-2">
                      <MapPin className="h-3 w-3" />
                      {company.endereco}
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CompanyDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        company={selectedCompany}
      />
    </Layout>
  );
};

export default EmpresasPage;
