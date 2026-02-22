import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCompanies, useCreatePatient, useUpdatePatient } from '@/hooks/useAppointments';
import { toast } from 'sonner';
import type { Patient } from '@/types/appointment';

const patientSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  cpf: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  sexo: z.string().optional(),
  data_nascimento: z.string().optional(),
  matricula: z.string().optional(),
  empresa_id: z.string().optional(),
  tipo_paciente: z.string().optional(),
});

type PatientFormData = z.infer<typeof patientSchema>;

interface PatientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: Patient | null;
}

export function PatientFormDialog({
  open,
  onOpenChange,
  patient,
}: PatientFormDialogProps) {
  const { data: companies } = useCompanies();
  const createPatient = useCreatePatient();
  const updatePatient = useUpdatePatient();
  const isEditing = !!patient;

  const form = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      nome: '',
      cpf: '',
      telefone: '',
      email: '',
      sexo: '',
      data_nascimento: '',
      matricula: '',
      empresa_id: '',
      tipo_paciente: '',
    },
  });

  useEffect(() => {
    if (patient) {
      form.reset({
        nome: patient.nome || '',
        cpf: patient.cpf || '',
        telefone: patient.telefone || '',
        email: patient.email || '',
        sexo: patient.sexo || '',
        data_nascimento: patient['data de nascimento'] || '',
        matricula: patient.matricula || '',
        empresa_id: patient.empresa_id || '',
        tipo_paciente: patient.tipo_paciente || '',
      });
    } else {
      form.reset({
        nome: '',
        cpf: '',
        telefone: '',
        email: '',
        sexo: '',
        data_nascimento: '',
        matricula: '',
        empresa_id: '',
        tipo_paciente: '',
      });
    }
  }, [patient, form]);

  const onSubmit = async (data: PatientFormData) => {
    try {
      const patientData = {
        nome: data.nome,
        cpf: data.cpf || null,
        telefone: data.telefone || null,
        email: data.email || null,
        sexo: data.sexo || null,
        'data de nascimento': data.data_nascimento || null,
        matricula: data.matricula || null,
        empresa_id: data.empresa_id || null,
        tipo_paciente: data.tipo_paciente || null,
      };

      if (isEditing && patient) {
        await updatePatient.mutateAsync({ id: patient.id, ...patientData });
        toast.success('Paciente atualizado com sucesso!');
      } else {
        await createPatient.mutateAsync(patientData);
        toast.success('Paciente cadastrado com sucesso!');
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(isEditing ? 'Erro ao atualizar paciente' : 'Erro ao cadastrar paciente');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Paciente' : 'Novo Paciente'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome completo *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do paciente" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cpf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF</FormLabel>
                    <FormControl>
                      <Input placeholder="000.000.000-00" {...field} />
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
                      <Input placeholder="(00) 00000-0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="email@exemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sexo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sexo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="m">Masculino</SelectItem>
                        <SelectItem value="f">Feminino</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="data_nascimento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Nascimento</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="matricula"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Matrícula</FormLabel>
                    <FormControl>
                      <Input placeholder="Número da matrícula" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="empresa_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Empresa</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value
                              ? companies?.find(
                                (company) => company.id === field.value
                              )?.nome
                              : "Selecione uma empresa"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[200px] p-0">
                        <Command>
                          <CommandInput placeholder="Buscar empresa..." />
                          <CommandList>
                            <CommandEmpty>Nenhuma empresa encontrada.</CommandEmpty>
                            <CommandGroup>
                              {companies?.map((company) => (
                                <CommandItem
                                  value={company.nome}
                                  key={company.id}
                                  onSelect={() => {
                                    form.setValue("empresa_id", company.id);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      company.id === field.value
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {company.nome}
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
            </div>

            {/* Tipo de Paciente */}
            <FormField
              control={form.control}
              name="tipo_paciente"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Paciente</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="TITULAR">Titular</SelectItem>
                      <SelectItem value="DEPENDENTE">Dependente</SelectItem>
                      <SelectItem value="EXTRAORDINARIO">Extraordinário</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createPatient.isPending || updatePatient.isPending}>
                {isEditing ? 'Salvar' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
