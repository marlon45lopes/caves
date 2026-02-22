import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClinics } from '@/hooks/useAppointments';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, isAfter, isBefore, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, FileDown, Trash2, Search, Check, ChevronsUpDown, User } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
} from '@/components/ui/tabs';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { usePatients } from '@/hooks/useAppointments';
import { cn } from '@/lib/utils';
import { generatePatientHistoryReport } from '@/utils/pdfGenerator';

interface ReportData {
    clinicName: string;
    startDate: string;
    endDate: string;
    totalAppointments: number;
    specialties: Array<{
        nome: string;
        count: number;
    }>;
}

const RelatorioPage = () => {
    const [selectedClinicId, setSelectedClinicId] = useState<string>('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Patient Report State
    const [selectedPatientId, setSelectedPatientId] = useState<string>('');
    const [patientOpen, setPatientOpen] = useState(false);
    const [patientHistory, setPatientHistory] = useState<any[] | null>(null);
    const [activeTab, setActiveTab] = useState<string>('periodic');

    const { data: clinics } = useClinics(true);
    const { data: patients } = usePatients();

    const validateDates = () => {
        if (!startDate || !endDate) return false;
        if (isAfter(parseISO(startDate), parseISO(endDate))) {
            toast.error('A data final não pode ser menor que a data inicial');
            return false;
        }
        return true;
    };

    const handleGenerateReport = async () => {
        if (!selectedClinicId || !startDate || !endDate) {
            toast.error('Por favor, preencha todos os campos obrigatórios');
            return;
        }

        if (!validateDates()) return;

        setIsGenerating(true);
        try {
            const selectedClinic = clinics?.find(c => c.id === selectedClinicId);

            const { data, error } = await supabase
                .from('agendamentos')
                .select(`
          *,
          especialidade:especialidades(nome)
        `)
                .eq('clinica_id', selectedClinicId)
                .eq('status', 'compareceu')
                .gte('data', startDate)
                .lte('data', endDate);

            if (error) throw error;

            const items = (data as any[]) || [];
            const specialtyCounts: Record<string, number> = {};

            items.forEach(item => {
                const specName = item.especialidade?.nome || 'Não informada';
                specialtyCounts[specName] = (specialtyCounts[specName] || 0) + 1;
            });

            const specialties = Object.entries(specialtyCounts)
                .map(([nome, count]) => ({ nome, count }))
                .sort((a, b) => b.count - a.count);

            setReportData({
                clinicName: selectedClinic?.nome || '',
                startDate,
                endDate,
                totalAppointments: items.length,
                specialties
            });

            toast.success('Relatório gerado com sucesso!');
        } catch (error) {
            console.error('Error generating report:', error);
            toast.error('Erro ao gerar relatório');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGeneratePatientReport = async () => {
        if (!selectedPatientId) {
            toast.error('Por favor, selecione um paciente');
            return;
        }

        setIsGenerating(true);
        try {
            const { data, error } = await supabase
                .from('agendamentos')
                .select(`
                    *,
                    clinica:clinicas(nome),
                    especialidade:especialidades(nome)
                `)
                .eq('paciente_id', selectedPatientId)
                .order('data', { ascending: false });

            if (error) throw error;

            setPatientHistory(data as any[]);
            toast.success('Histórico do paciente carregado!');
        } catch (error) {
            console.error('Error fetching patient history:', error);
            toast.error('Erro ao carregar histórico');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleClear = () => {
        setSelectedClinicId('');
        setStartDate('');
        setEndDate('');
        setReportData(null);
        setSelectedPatientId('');
        setPatientHistory(null);
    };

    const downloadPatientPDF = () => {
        try {
            if (!patientHistory || !selectedPatientId) {
                toast.error('Nenhum histórico disponível para download');
                return;
            }
            const patient = patients?.find(p => p.id === selectedPatientId);
            if (!patient) {
                toast.error('Paciente não encontrado');
                return;
            }

            toast.info('Gerando PDF do histórico...');
            generatePatientHistoryReport(patient, patientHistory);
            toast.success('Download do histórico iniciado!');
        } catch (error) {
            console.error('Error generating patient history PDF:', error);
            toast.error('Erro ao gerar PDF do histórico');
        }
    };

    const downloadPDF = () => {
        if (!reportData) return;

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const timestamp = format(new Date(), 'dd/MM/yyyy HH:mm');

        // Header
        doc.setFontSize(18);
        doc.text('Relatório Periódico de Atendimentos', pageWidth / 2, 20, { align: 'center' });

        doc.setFontSize(12);
        doc.text(`Clínica/Empresa: ${reportData.clinicName}`, 14, 35);
        doc.text(`Período: ${format(parseISO(reportData.startDate), 'dd/MM/yyyy')} a ${format(parseISO(reportData.endDate), 'dd/MM/yyyy')}`, 14, 42);
        doc.text(`Total de atendimentos (Compareceu): ${reportData.totalAppointments}`, 14, 49);

        // Table
        autoTable(doc, {
            startY: 60,
            head: [['Especialidade', 'Quantidade']],
            body: [
                ...reportData.specialties.map(s => [s.nome, s.count]),
                ['TOTAL GERAL', reportData.totalAppointments]
            ],
            footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
            theme: 'striped',
        });

        // Footer
        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Emitido em: ${timestamp}`, 14, finalY);

        const filename = `Relatorio periodico - ${reportData.clinicName} - ${reportData.startDate} a ${reportData.endDate}.pdf`;
        doc.save(filename);
    };

    return (
        <Layout title="Relatórios">
            <div className="space-y-6 max-w-5xl mx-auto">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="periodic">Relatório Periódico</TabsTrigger>
                        <TabsTrigger value="patient">Relatório por Paciente</TabsTrigger>
                    </TabsList>

                    <TabsContent value="periodic">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg text-primary flex items-center gap-2">
                                    <FileDown className="h-5 w-5" />
                                    Configurar Filtros Periódicos
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                    <div className="space-y-2">
                                        <Label htmlFor="clinic">Clínica/Empresa *</Label>
                                        <Select value={selectedClinicId} onValueChange={setSelectedClinicId}>
                                            <SelectTrigger id="clinic">
                                                <SelectValue placeholder="Selecione a clínica" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {clinics?.map((clinic) => (
                                                    <SelectItem key={clinic.id} value={clinic.id}>
                                                        {clinic.nome}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="startDate">Data Inicial *</Label>
                                        <div className="relative">
                                            <input
                                                id="startDate"
                                                type="date"
                                                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="endDate">Data Final *</Label>
                                        <div className="relative">
                                            <input
                                                id="endDate"
                                                type="date"
                                                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-3 mt-6 justify-end">
                                    <Button variant="outline" onClick={handleClear} className="gap-2">
                                        <Trash2 className="h-4 w-4" />
                                        Limpar filtros
                                    </Button>
                                    <Button onClick={handleGenerateReport} disabled={isGenerating} className="gap-2">
                                        <CalendarIcon className="h-4 w-4" />
                                        {isGenerating ? 'Gerando...' : 'Gerar relatório'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="patient">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg text-primary flex items-center gap-2">
                                    <User className="h-5 w-5" />
                                    Relatório de Histórico do Paciente
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                    <div className="space-y-2">
                                        <Label>Selecionar Paciente *</Label>
                                        <Popover open={patientOpen} onOpenChange={setPatientOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={patientOpen}
                                                    className="w-full justify-between"
                                                >
                                                    {selectedPatientId
                                                        ? patients?.find((p) => p.id === selectedPatientId)?.nome
                                                        : "Pesquisar paciente..."}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[400px] p-0">
                                                <Command>
                                                    <CommandInput placeholder="Digite o nome ou CPF..." />
                                                    <CommandList>
                                                        <CommandEmpty>Nenhum paciente encontrado.</CommandEmpty>
                                                        <CommandGroup>
                                                            {patients?.map((p) => (
                                                                <CommandItem
                                                                    key={p.id}
                                                                    value={`${p.nome} ${p.cpf || ''}`}
                                                                    onSelect={() => {
                                                                        setSelectedPatientId(p.id);
                                                                        setPatientOpen(false);
                                                                    }}
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4",
                                                                            selectedPatientId === p.id ? "opacity-100" : "opacity-0"
                                                                        )}
                                                                    />
                                                                    <div className="flex flex-col">
                                                                        <span>{p.nome}</span>
                                                                        {p.cpf && <span className="text-xs text-muted-foreground">CPF: {p.cpf}</span>}
                                                                    </div>
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="flex gap-3 justify-start">
                                        <Button variant="outline" onClick={handleClear} className="gap-2">
                                            <Trash2 className="h-4 w-4" />
                                            Limpar
                                        </Button>
                                        <Button onClick={handleGeneratePatientReport} disabled={isGenerating || !selectedPatientId} className="gap-2 bg-primary">
                                            <Search className="h-4 w-4" />
                                            {isGenerating ? 'Buscando...' : 'Buscar Histórico'}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {activeTab === 'periodic' && reportData && (
                    <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <CardHeader className="border-b bg-muted/30">
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-xl">Resumo do Atendimento</CardTitle>
                                <Button onClick={downloadPDF} variant="secondary" className="gap-2">
                                    <FileDown className="h-4 w-4" />
                                    Download PDF
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 bg-muted/50 p-6 rounded-lg border border-border">
                                <div>
                                    <p className="text-sm text-muted-foreground">Clínica/Empresa</p>
                                    <p className="font-semibold text-lg">{reportData.clinicName}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Período</p>
                                    <p className="font-semibold">
                                        {format(parseISO(reportData.startDate), 'dd/MM/yyyy')} a {format(parseISO(reportData.endDate), 'dd/MM/yyyy')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Total de Atendimentos (Compareceu)</p>
                                    <p className="font-bold text-2xl text-primary">{reportData.totalAppointments}</p>
                                </div>
                            </div>

                            <div className="rounded-md border">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted">
                                        <tr className="border-b">
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Especialidade</th>
                                            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Quantidade</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {reportData.specialties.length > 0 ? (
                                            reportData.specialties.map((spec) => (
                                                <tr key={spec.nome} className="hover:bg-muted/50 transition-colors">
                                                    <td className="px-4 py-3 capitalize">{spec.nome}</td>
                                                    <td className="px-4 py-3 text-right font-medium">{spec.count}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={2} className="px-4 py-8 text-center text-muted-foreground italic">
                                                    Nenhum atendimento no período
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                    <tfoot className="bg-muted/50 font-bold border-t">
                                        <tr>
                                            <td className="px-4 py-3">TOTAL GERAL</td>
                                            <td className="px-4 py-3 text-right text-primary text-base">
                                                {reportData.totalAppointments}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'patient' && patientHistory && (
                    <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <CardHeader className="border-b bg-muted/30">
                            <div className="flex justify-between items-center">
                                <div className="space-y-1">
                                    <CardTitle className="text-xl">Histórico Completo</CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                        {patients?.find(p => p.id === selectedPatientId)?.nome}
                                    </p>
                                </div>
                                <Button onClick={downloadPatientPDF} variant="secondary" className="gap-2">
                                    <FileDown className="h-4 w-4" />
                                    Download PDF Completo
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="rounded-md border overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted">
                                            <tr className="border-b">
                                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data</th>
                                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Clínica/Empresa</th>
                                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Especialidade</th>
                                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Profissional</th>
                                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Observações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {patientHistory.length > 0 ? (
                                                patientHistory.map((apt) => (
                                                    <tr key={apt.id} className="hover:bg-muted/50 transition-colors">
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            {format(new Date(apt.data + 'T00:00:00'), 'dd/MM/yyyy')}
                                                        </td>
                                                        <td className="px-4 py-3 font-medium">{apt.clinica?.nome || '-'}</td>
                                                        <td className="px-4 py-3">{apt.especialidade?.nome || '-'}</td>
                                                        <td className="px-4 py-3">
                                                            <span className={cn(
                                                                "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                                                                apt.status === 'compareceu' ? "bg-green-100 text-green-700" :
                                                                    apt.status === 'faltou' ? "bg-red-100 text-red-700" :
                                                                        "bg-blue-100 text-blue-700"
                                                            )}>
                                                                {apt.status === 'compareceu' ? 'Compareceu' :
                                                                    apt.status === 'faltou' ? 'Faltou' : apt.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap">{apt.profissional || '-'}</td>
                                                        <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate" title={apt.observacoes}>
                                                            {apt.observacoes || '-'}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground italic">
                                                        Nenhum registro encontrado para este paciente.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </Layout>
    );
};

export default RelatorioPage;
