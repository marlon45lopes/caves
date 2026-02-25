
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Appointment } from '@/types/appointment';

export const generateAppointmentReceipt = (appointment: Appointment) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(0, 0, 0);
    doc.text('Comprovante de Agendamento', 105, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text('Caves Vigilantes', 105, 28, { align: 'center' });

    // Line separator
    doc.setLineWidth(0.5);
    doc.line(20, 35, 190, 35);

    // Content
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);

    let yPos = 50;
    const lineHeight = 10;

    // Patient Info
    doc.setFont('helvetica', 'bold');
    doc.text('Dados do Paciente:', 20, yPos);
    yPos += lineHeight;

    doc.setFont('helvetica', 'normal');
    doc.text(`Nome: ${appointment.paciente?.nome || 'Não informado'}`, 20, yPos);
    yPos += lineHeight;

    if (appointment.paciente?.cpf) {
        doc.text(`CPF: ${appointment.paciente.cpf}`, 20, yPos);
        yPos += lineHeight;
    }

    yPos += 5; // Spacing

    // Appointment Info
    doc.setFont('helvetica', 'bold');
    doc.text('Dados da Consulta:', 20, yPos);
    yPos += lineHeight;

    doc.setFont('helvetica', 'normal');
    const dateFormatted = format(new Date(appointment.data + 'T00:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    doc.text(`Data: ${dateFormatted}`, 20, yPos);
    yPos += lineHeight;

    const isArrivingOrder = appointment.observacoes?.includes('[CHEGADA]');
    const scheduleTypeLabel = isArrivingOrder ? 'ORDEM DE CHEGADA' : 'HORA MARCADA';

    if (appointment.hora_inicio) {
        doc.text(`Horário: ${appointment.hora_inicio.slice(0, 5)} - ${appointment.hora_fim?.slice(0, 5) || ''} (${scheduleTypeLabel})`, 20, yPos);
        yPos += lineHeight;
    }

    if (appointment.clinica?.nome) {
        doc.text(`Clínica: ${appointment.clinica.nome}`, 20, yPos);
        yPos += lineHeight;
    }

    if (appointment.clinica?.endereco) {
        const splitEndereco = doc.splitTextToSize(`Endereço: ${appointment.clinica.endereco}`, 170);
        doc.text(splitEndereco, 20, yPos);
        yPos += (splitEndereco.length * lineHeight);
    }

    if (appointment.clinica?.telefone) {
        doc.text(`Telefone da Clínica: ${appointment.clinica.telefone}`, 20, yPos);
        yPos += lineHeight;
    }

    if (appointment.especialidade?.nome) {
        doc.text(`Especialidade: ${appointment.especialidade.nome}`, 20, yPos);
        yPos += lineHeight;
    }

    const isOnline = appointment.observacoes?.includes('[ONLINE]');
    const cleanObservacoes = appointment.observacoes?.replace('[ONLINE]', '').trim();

    if (appointment.profissional) {
        doc.text(`Profissional: ${appointment.profissional}`, 20, yPos);
        yPos += lineHeight;
    }

    if (isOnline) {
        doc.setFont('helvetica', 'bold');
        doc.text('CONSULTA ONLINE', 20, yPos);
        doc.setFont('helvetica', 'normal');
        yPos += lineHeight;
    }

    yPos += 5; // Spacing before observations

    if (cleanObservacoes) {
        const hasJustification = cleanObservacoes.includes('LIBERADO COM JUSTIFICATIVA:');

        const checkPageSpace = (needed: number) => {
            const pageHeight = doc.internal.pageSize.height;
            if (yPos + needed > pageHeight - 20) {
                doc.addPage();
                yPos = 20;
                return true;
            }
            return false;
        };

        if (hasJustification) {
            const parts = cleanObservacoes.split('\n\n');
            const justificationPart = parts[0];
            const otherObs = parts.length > 1 ? parts.slice(1).join('\n\n') : '';

            // Section: Justificativa
            checkPageSpace(lineHeight * 2);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(200, 0, 0); // Red for emphasis
            doc.text('Justificativa de Liberação:', 20, yPos);
            yPos += lineHeight;

            doc.setFont('helvetica', 'bold');
            const splitJustification = doc.splitTextToSize(justificationPart.replace('LIBERADO COM JUSTIFICATIVA:', '').trim(), 170);

            // Handle multi-line justification with page breaks
            splitJustification.forEach((line: string) => {
                checkPageSpace(lineHeight);
                doc.text(line, 20, yPos);
                yPos += lineHeight;
            });

            // Section: Other Observations
            if (otherObs) {
                yPos += 5;
                checkPageSpace(lineHeight * 2);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0, 0, 0);
                doc.text('Detalhes Adicionais (Observações):', 20, yPos);
                yPos += lineHeight;

                doc.setFont('helvetica', 'normal');
                const splitOther = doc.splitTextToSize(otherObs, 170);
                splitOther.forEach((line: string) => {
                    checkPageSpace(lineHeight);
                    doc.text(line, 20, yPos);
                    yPos += lineHeight;
                });
            }
        } else {
            // General Observations
            checkPageSpace(lineHeight * 2);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text('Observações / Detalhes Adicionais:', 20, yPos);
            yPos += lineHeight;

            doc.setFont('helvetica', 'normal');
            const splitObservacoes = doc.splitTextToSize(cleanObservacoes, 170);
            splitObservacoes.forEach((line: string) => {
                checkPageSpace(lineHeight);
                doc.text(line, 20, yPos);
                yPos += lineHeight;
            });
        }

        doc.setTextColor(0, 0, 0); // Reset color
    }

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 20, pageHeight - 10);
    doc.text('Este documento é um comprovante simples de agendamento.', 105, pageHeight - 10, { align: 'center' });

    // Save
    const patientName = appointment.paciente?.nome?.trim().replace(/\s+/g, '_') || 'Paciente';
    const specialtyName = appointment.especialidade?.nome?.trim().replace(/\s+/g, '_') || 'Especialidade';
    const clinicName = appointment.clinica?.nome?.trim().replace(/\s+/g, '_') || 'Clinica';

    const fileName = `comprovante_${patientName}_${specialtyName}_${clinicName}.pdf`;
    doc.save(fileName);
};

export const generateGuide = (appointment: Appointment) => {
    const doc = new jsPDF();

    // Box for the header
    doc.setDrawColor(0);
    doc.setFillColor(240, 240, 240);
    doc.rect(10, 10, 190, 30, 'F');
    doc.rect(10, 10, 190, 30);

    // Header
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('GUIA DE AUTORIZAÇÃO / ENCAMINHAMENTO', 105, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.text('CAVES - CAIXA DE ASSISTÊNCIA AO VIGILANTE - SE', 105, 28, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const today = format(new Date(), "dd/MM/yyyy");
    doc.text(`Emissão: ${today}`, 190, 38, { align: 'right' });

    // Patient Box
    let yPos = 45;
    doc.setDrawColor(0);
    doc.setFillColor(255, 255, 255);
    doc.rect(10, yPos, 190, 35);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(230, 230, 230);
    doc.rect(10, yPos, 190, 8, 'F');
    doc.text('DADOS DO BENEFICIÁRIO', 15, yPos + 6);
    doc.line(10, yPos + 8, 200, yPos + 8);

    yPos += 14;
    doc.setFont('helvetica', 'bold');
    doc.text('Nome:', 15, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(appointment.paciente?.nome?.toUpperCase() || '', 30, yPos);

    doc.setFont('helvetica', 'bold');
    doc.text('Carteira/Matrícula:', 120, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(appointment.paciente?.cpf || '', 155, yPos);

    yPos += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('Telefone:', 15, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(appointment.paciente?.telefone || '', 35, yPos);

    const tipoPaciente = appointment.paciente?.tipo_paciente;
    if (tipoPaciente) {
        doc.setFont('helvetica', 'bold');
        doc.text('Tipo:', 100, yPos);
        doc.setFont('helvetica', 'normal');
        const tipoLabel = tipoPaciente === 'EXTRAORDINARIO' ? 'EXTRAORDINÁRIO' : tipoPaciente;
        doc.text(tipoLabel, 115, yPos);
    }

    // Service Box - Calculate dynamic height based on content
    const serviceBoxTop = 90;
    let serviceYPos = serviceBoxTop + 14; // Start after header

    // Draw header first
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(230, 230, 230);
    doc.rect(10, serviceBoxTop, 190, 8, 'F');
    doc.text('DADOS DO ATENDIMENTO / PROCEDIMENTO', 15, serviceBoxTop + 6);
    doc.line(10, serviceBoxTop + 8, 200, serviceBoxTop + 8);

    // Clínica / Prestador
    doc.setFont('helvetica', 'bold');
    doc.text('Clínica / Prestador:', 15, serviceYPos);
    doc.setFont('helvetica', 'normal');
    doc.text(appointment.clinica?.nome?.toUpperCase() || '', 55, serviceYPos);

    // Endereço da Clínica (on new line, below clinic name)
    serviceYPos += 8;
    if (appointment.clinica?.endereco) {
        doc.setFont('helvetica', 'bold');
        doc.text('Endereço da Clínica:', 15, serviceYPos);
        doc.setFont('helvetica', 'normal');
        const splitEndereco = doc.splitTextToSize(appointment.clinica.endereco.toUpperCase(), 130);
        doc.text(splitEndereco, 55, serviceYPos);
        serviceYPos += (splitEndereco.length * 6);
    }

    // Tel. Clínica
    if (appointment.clinica?.telefone) {
        serviceYPos += 2;
        doc.setFont('helvetica', 'bold');
        doc.text('Tel. Clínica:', 15, serviceYPos);
        doc.setFont('helvetica', 'normal');
        doc.text(appointment.clinica.telefone, 55, serviceYPos);
        serviceYPos += 8;
    } else {
        serviceYPos += 2;
    }

    // Especialidade
    doc.setFont('helvetica', 'bold');
    doc.text('Especialidade:', 15, serviceYPos);
    doc.setFont('helvetica', 'normal');
    doc.text(appointment.especialidade?.nome?.toUpperCase() || '', 55, serviceYPos);

    serviceYPos += 8;
    // Profissional
    doc.setFont('helvetica', 'bold');
    if (appointment.profissional) {
        doc.text('Profissional:', 15, serviceYPos);
        doc.setFont('helvetica', 'normal');
        doc.text(appointment.profissional.toUpperCase(), 55, serviceYPos);
        serviceYPos += 8;
    }

    const isOnline = appointment.observacoes?.includes('[ONLINE]');
    const isArrivingOrder = appointment.observacoes?.includes('[CHEGADA]');
    const cleanObservacoes = appointment.observacoes?.replace('[ONLINE]', '').replace('[CHEGADA]', '').trim() || '';

    if (isOnline) {
        doc.setFont('helvetica', 'bold');
        doc.text('TIPO DE ATENDIMENTO:', 15, serviceYPos);
        doc.setFont('helvetica', 'normal');
        doc.text('CONSULTA ONLINE', 70, serviceYPos);
        serviceYPos += 8;
    }

    // Data e Horário
    doc.setFont('helvetica', 'bold');
    doc.text('Data Agendada:', 15, serviceYPos);
    doc.setFont('helvetica', 'normal');
    const dateFormatted = format(new Date(appointment.data + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR });
    const scheduleTypeLabel = isArrivingOrder ? 'ORDEM DE CHEGADA' : 'HORA MARCADA';
    doc.text(`${dateFormatted} - ${appointment.hora_inicio?.slice(0, 5) || ''} (${scheduleTypeLabel})`, 55, serviceYPos);
    serviceYPos += 8;

    const pageHeightLimit = doc.internal.pageSize.height;
    const signatureLimit = pageHeightLimit - 85;

    // Observações
    if (cleanObservacoes) {
        doc.setFont('helvetica', 'bold');
        doc.text('Observações:', 15, serviceYPos);
        doc.setFont('helvetica', 'normal');

        const hasJustification = cleanObservacoes.includes('LIBERADO COM JUSTIFICATIVA:');
        if (hasJustification) {
            doc.setTextColor(200, 0, 0);
            doc.setFont('helvetica', 'bold');
        }

        const splitObs = doc.splitTextToSize(cleanObservacoes, 135);

        splitObs.forEach((line: string) => {
            if (serviceYPos > signatureLimit) {
                // Draw current box border before switching page
                const startOfBox = doc.getNumberOfPages() > 1 ? 10 : serviceBoxTop;
                doc.rect(10, startOfBox, 190, serviceYPos - startOfBox + 2);

                doc.addPage();
                serviceYPos = 20;
                doc.rect(10, 10, 190, pageHeightLimit - 90);
                doc.setFont('helvetica', 'bold');
                doc.text('Observações (continuação):', 15, serviceYPos);
                serviceYPos += 8;
                doc.setFont('helvetica', 'normal');
                if (hasJustification) doc.setTextColor(200, 0, 0);
            }
            doc.text(line, 55, serviceYPos);
            serviceYPos += 5;
        });

        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
    }

    // Draw the final service box outline on the current page
    const finalStartOfBox = doc.getNumberOfPages() > 1 ? 10 : serviceBoxTop;
    const finalBoxHeight = Math.max(doc.getNumberOfPages() > 1 ? 20 : 60, serviceYPos - finalStartOfBox + 5);
    doc.rect(10, finalStartOfBox, 190, finalBoxHeight);

    // ============================================================
    // SIGNATURE AREA - Fixed at bottom of page, isolated from content
    // ============================================================
    const pageHeight = doc.internal.pageSize.height;
    const signatureAreaTop = pageHeight - 75; // 75mm from bottom

    // Separator line above signature area
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(10, signatureAreaTop - 5, 200, signatureAreaTop - 5);
    doc.setDrawColor(0, 0, 0);

    // ============================================================
    // AUTHENTICATION SEAL - Above authorizer signature (right side)
    // ============================================================
    // Generate unique verification code based on appointment data
    const appointmentString = `${appointment.id}-${appointment.data}-${appointment.hora_inicio}-${appointment.paciente?.nome || ''}`;
    let hash = 0;
    for (let i = 0; i < appointmentString.length; i++) {
        const char = appointmentString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    const verificationCode = `CAVES-${Math.abs(hash).toString(16).toUpperCase().slice(0, 8)}`;
    const timestamp = format(new Date(), "ddMMyyyy-HHmmss");

    // Draw circular seal - positioned above the authorizer signature
    const sealCenterX = 145; // Right side (above authorizer)
    const sealCenterY = signatureAreaTop + 12;
    const sealRadius = 15;

    // Outer circle
    doc.setDrawColor(0, 100, 0); // Dark green
    doc.setLineWidth(1.5);
    doc.circle(sealCenterX, sealCenterY, sealRadius);

    // Inner circle
    doc.setLineWidth(0.5);
    doc.circle(sealCenterX, sealCenterY, sealRadius - 2.5);

    // CAVES text in the seal
    doc.setFontSize(5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 100, 0);
    doc.text('★ CAVES ★', sealCenterX, sealCenterY - 5, { align: 'center' });

    // AUTORIZADO text in center
    doc.setFontSize(6);
    doc.text('AUTORIZADO', sealCenterX, sealCenterY + 1, { align: 'center' });

    // Date in seal
    doc.setFontSize(4);
    doc.setFont('helvetica', 'normal');
    doc.text(format(new Date(), "dd/MM/yyyy"), sealCenterX, sealCenterY + 5, { align: 'center' });

    // Reset line width and color
    doc.setLineWidth(0.2);
    doc.setDrawColor(0, 0, 0);

    // Signature lines
    const signatureY = signatureAreaTop + 35;

    // Beneficiary signature line (left side)
    doc.line(20, signatureY, 90, signatureY);
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text('Assinatura do Beneficiário', 55, signatureY + 5, { align: 'center' });

    // Authorizer signature line (right side) - below the seal
    doc.line(110, signatureY, 180, signatureY);
    doc.setFontSize(6);
    doc.text('CAVES - CAIXA DE ASSISTENCIA AO VIGILANTE', 145, signatureY + 5, { align: 'center' });

    // Verification code below signatures (centered)
    doc.setFontSize(6);
    doc.setTextColor(80, 80, 80);
    doc.text(`Cód. Verificação: ${verificationCode}`, 105, signatureY + 15, { align: 'center' });
    doc.setFontSize(5);
    doc.text(`Emitido em: ${timestamp}`, 105, signatureY + 19, { align: 'center' });

    // Footer at very bottom
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('CAVES - Caixa de Assistência ao Vigilante - SE | Sistema de Gestão de Saúde', 105, pageHeight - 8, { align: 'center' });

    // Save
    const patientName = appointment.paciente?.nome?.trim().replace(/\s+/g, '_') || 'Paciente';
    const specialtyName = appointment.especialidade?.nome?.trim().replace(/\s+/g, '_') || 'Especialidade';
    const clinicName = appointment.clinica?.nome?.trim().replace(/\s+/g, '_') || 'Clinica';

    const fileName = `guia_${patientName}_${specialtyName}_${clinicName}.pdf`;
    doc.save(fileName);
};

export const generatePatientHistoryReport = (patient: any, appointments: any[]) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const timestamp = format(new Date(), 'dd/MM/yyyy HH:mm');

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Histórico do Paciente', pageWidth / 2, 20, { align: 'center' });

    // Patient Info Box
    doc.setDrawColor(200);
    doc.setFillColor(245, 245, 245);
    doc.rect(14, 30, pageWidth - 28, 35, 'F');
    doc.rect(14, 30, pageWidth - 28, 35);

    doc.setFontSize(11);
    doc.setTextColor(0);

    let yPos = 40;
    doc.setFont('helvetica', 'bold');
    doc.text('Nome:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(patient.nome || 'Não informado', 45, yPos);

    yPos += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('CPF:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(patient.cpf || 'Não informado', 45, yPos);

    doc.setFont('helvetica', 'bold');
    doc.text('Tipo:', 110, yPos);
    doc.setFont('helvetica', 'normal');
    const tipoLabel = patient.tipo_paciente === 'EXTRAORDINARIO' ? 'EXTRAORDINÁRIO' : (patient.tipo_paciente || 'Não informado');
    doc.text(tipoLabel, 130, yPos);

    yPos += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('Telefone:', 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(patient.telefone || 'Não informado', 45, yPos);

    // Table
    autoTable(doc, {
        startY: 75,
        head: [['Data', 'Clínica', 'Especialidade', 'Status', 'Profissional', 'Observações']],
        body: appointments.map(apt => [
            apt.data ? format(new Date(apt.data + 'T00:00:00'), 'dd/MM/yyyy') : '-',
            apt.clinica?.nome || '-',
            apt.especialidade?.nome || '-',
            apt.status === 'compareceu' ? 'Compareceu' : (apt.status === 'faltou' ? 'Faltou' : (apt.status === 'agendado' ? 'Agendado' : apt.status)),
            apt.profissional || '-',
            apt.observacoes || '-'
        ]),
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 35 },
            2: { cellWidth: 35 },
            3: { cellWidth: 20 },
            4: { cellWidth: 30 },
            5: { cellWidth: 'auto' }
        },
        styles: { fontSize: 8, overflow: 'linebreak' },
        theme: 'grid'
    });

    // Footer
    const pageCount = (doc as any).getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        const pageHeight = doc.internal.pageSize.height;
        doc.text(`Gerado em: ${timestamp}`, 14, pageHeight - 10);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
    }

    const fileName = `Historico_${patient.nome?.replace(/\s+/g, '_') || 'Paciente'}.pdf`;
    doc.save(fileName);
};

export const generateAppointmentsReport = (appointments: Appointment[], dateRangeLabel: string, reportTitle: string, fileNamePrefix: string) => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.width;
    const timestamp = format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR });

    // Header
    doc.setFontSize(18);
    doc.text(reportTitle, pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text(dateRangeLabel, pageWidth / 2, 22, { align: 'center' });

    // Table
    autoTable(doc, {
        startY: 30,
        head: [['PACIENTE', 'TELEFONE', 'CPF', 'ESPECIALIDADE', 'OBSERVAÇÕES', 'DATA/HORA', 'CLÍNICA']],
        body: appointments.map(apt => {
            const cleanObs = (apt.observacoes || '')
                .replace('[ONLINE]', '')
                .replace('[CHEGADA]', '')
                .trim();

            return [
                apt.paciente?.nome?.toUpperCase() || '-',
                apt.paciente?.telefone || '-',
                apt.paciente?.cpf || '-',
                apt.especialidade?.nome?.toUpperCase() || '-',
                cleanObs || '-',
                `${format(new Date(apt.data + 'T00:00:00'), 'dd/MM/yy')} ${apt.hora_inicio?.slice(0, 5) || ''}`,
                apt.clinica?.nome?.toUpperCase() || '-'
            ];
        }),
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 8 },
        styles: { fontSize: 7, overflow: 'linebreak' },
        columnStyles: {
            0: { cellWidth: 50 }, // Paciente
            1: { cellWidth: 30 }, // Telefone
            2: { cellWidth: 30 }, // CPF
            3: { cellWidth: 40 }, // Especialidade
            4: { cellWidth: 'auto' }, // Observações (takes remaining space)
            5: { cellWidth: 25 }, // Data/Hora
            6: { cellWidth: 40 }  // Clínica
        },
        theme: 'grid'
    });

    // Footer
    const pageCount = (doc as any).getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        const pageHeight = doc.internal.pageSize.height;
        doc.text(`Gerado em: ${timestamp}`, 14, pageHeight - 10);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
    }

    const safeRange = dateRangeLabel.replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '_');
    doc.save(`${fileNamePrefix}_${safeRange}.pdf`);
};
