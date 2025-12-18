
import jsPDF from 'jspdf';
import { format } from 'date-fns';

interface ReceiptData {
    id: string; // Payment ID
    date: string;
    amount: number;
    clientName: string;
    concept: string; // Interest vs Capital
    investorName?: string;
}

export const generatePaymentReceipt = (data: ReceiptData) => {
    const doc = new jsPDF();

    // Config
    const margin = 20;
    let y = 30;

    // Header - ZALDO Branding
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("ZALDO", margin, y);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Soluciones Fintech", margin + 40, y);

    y += 20;

    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text("COMPROBANTE DE PAGO", margin, y);
    y += 10;

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`ID Recibo: ${data.id.substring(0, 8).toUpperCase()}`, margin, y);
    doc.text(`Fecha Emisión: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, 140, y);

    y += 20;

    // Divider
    doc.setLineWidth(0.5);
    doc.line(margin, y, 190, y);
    y += 20;

    // Content
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);

    doc.text("Recibimos de:", margin, y);
    doc.setFont("helvetica", "bold");
    doc.text(data.clientName, margin + 40, y);
    doc.setFont("helvetica", "normal");
    y += 15;

    doc.text("La suma de:", margin, y);
    doc.setFont("helvetica", "bold");
    doc.text(`$ ${data.amount.toLocaleString()}`, margin + 40, y);
    doc.setFont("helvetica", "normal");
    y += 15;

    doc.text("Por concepto de:", margin, y);
    doc.text(data.concept === 'interest' ? 'PAGO DE INTERESES' :
        data.concept === 'capital' ? 'ABONO A CAPITAL' : 'PAGO DE MORA', margin + 40, y);

    y += 40;

    // Box for details
    doc.setFillColor(245, 247, 250);
    doc.rect(margin, y, 170, 40, 'F');
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text("Detalles de la Transacción", margin + 5, y + 10);
    doc.text(`Fecha del Pago: ${data.date}`, margin + 5, y + 20);
    doc.text("Estado: APROBADO", margin + 5, y + 30);

    y += 60;

    // Signature Area
    doc.line(margin, y, margin + 80, y);
    doc.text("Firma Autorizada", margin, y + 10);

    // Save
    doc.save(`Recibo_${data.clientName}_${data.date}.pdf`);
};

export const generatePromissoryNote = (data: {
    number: string,
    amount: number,
    amountText: string,
    city: string,
    date: string,
    clientName: string,
    clientId: string,
    clientAddress: string,
    clientCity: string,
    lenderName: string,
    lenderId: string,
    interestRate: number,
    startDate: string
}) => {
    const doc = new jsPDF();
    const margin = 20;
    let y = 30;

    // Title & Branding
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("ZALDO", margin, y);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Soluciones Fintech", margin + 50, y);

    y += 20;

    // Title
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Pagaré Número: ${data.number}`, margin, y);
    y += 15;

    // Amount Section
    doc.text(`SUMA POR: $${data.amount.toLocaleString()} M/CTE`, margin, y);
    y += 7;
    doc.text(`(Son: ${data.amountText})`, margin, y);
    y += 15;

    // Location/Date
    doc.text(`Lugar y Fecha de Emisión: ${data.city}, a ${data.date}.`, margin, y);
    y += 15;

    // DEUDOR
    doc.setFont("helvetica", "bold");
    doc.text("DEUDOR:", margin, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.text(`Nombre Completo: ${data.clientName}`, margin, y);
    y += 7;
    doc.text(`Documento de Identidad: C.C: ${data.clientId}`, margin, y);
    y += 7;
    doc.text(`Dirección: ${data.clientAddress}`, margin, y);
    y += 7;
    doc.text(`Ciudad: ${data.clientCity}`, margin, y);
    y += 15;

    // ACREEDOR
    doc.setFont("helvetica", "bold");
    doc.text("ACREEDOR:", margin, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.text(`Nombre Completo: ${data.lenderName}`, margin, y);
    y += 7;
    doc.text(`Documento de Identidad: C.C. ${data.lenderId}`, margin, y);
    y += 15;

    // Body Text
    const bodyObj = `Por este pagaré, yo, ${data.clientName}, identificado(a) como aparece al pie de mi firma, me comprometo a pagar incondicionalmente a la orden de ${data.lenderName}, o a quien represente sus derechos, la suma de $${data.amount.toLocaleString()} M/CTE (${data.amountText}), el día ___ del mes de ________ del año _____.`;

    const splitBody = doc.splitTextToSize(bodyObj, 170); // 170mm width
    doc.text(splitBody, margin, y);
    y += (splitBody.length * 7) + 5;

    // Interest rate left blank for legal reasons (Usury protection)
    const interestText = `Sobre la suma adeudada se causará un interés remuneratorio a la tasa del ________ mensual, que corresponde a la tasa pactada.`;
    const splitInterest = doc.splitTextToSize(interestText, 170);
    doc.text(splitInterest, margin, y);
    y += (splitInterest.length * 7) + 5;

    const conditionsText = `El pago de los intereses se realizará en ${data.city} hasta los 8 días posteriores al mes siguiente del desembolso del dinero, si se incumple la fecha se empezará a cobrar intereses de mora desde el día 9 en adelante sobre los intereses pactados.`;
    const splitConditions = doc.splitTextToSize(conditionsText, 170);
    doc.text(splitConditions, margin, y);
    y += 30;

    doc.text("Atentamente,", margin, y);
    y += 40;

    // Signature Line
    doc.line(margin, y, margin + 80, y); // Line for signature
    y += 7;
    doc.text("Firma del Deudor", margin, y);
    y += 10;
    doc.text(`Nombre: ${data.clientName}`, margin, y);
    y += 7;
    doc.text(`C.C.: ${data.clientId}`, margin, y);

    // Save
    doc.save(`Pagare_${data.clientName}.pdf`);
}

export const generatePazYSalvo = (data: {
    clientName: string,
    clientId: string,
    loanAmount: number,
    startDate: string,
    endDate: string, // Fecha de pago final
    city: string
}) => {
    const doc = new jsPDF();
    const margin = 20;
    let y = 40;

    // Logo / Header Placeholders if any

    // Title & Branding
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("ZALDO", margin, y);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Soluciones Fintech", margin + 50, y);

    y += 15;

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("PAZ Y SALVO", 105, y, { align: "center" });
    y += 10;
    doc.setLineWidth(0.5);
    doc.line(margin, y, 190, y);
    y += 30;

    // Body
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");

    // Text
    const bodyText = `Por medio del presente documento, ZALDO CERTIFICA que el/la señor(a) ${data.clientName}, identificado(a) con Cédula de Ciudadanía No. ${data.clientId}, ha cancelado en su totalidad las obligaciones financieras adquiridas mediante el crédito por valor de $${data.loanAmount.toLocaleString()} iniciado el día ${data.startDate}.`;

    const splitBody = doc.splitTextToSize(bodyText, 170);
    doc.text(splitBody, margin, y);
    y += (splitBody.length * 8) + 15;

    const bodyText2 = `A la fecha de expedición de este documento (${data.endDate}), el cliente se encuentra a PAZ Y SALVO por todo concepto (Capital e Intereses) relacionado con dicha obligación.`;
    const splitBody2 = doc.splitTextToSize(bodyText2, 170);
    doc.text(splitBody2, margin, y);

    y += 50;

    // Signature
    doc.text("Atentamente,", margin, y);
    y += 35;

    doc.line(margin, y, margin + 80, y);
    doc.setFont("helvetica", "bold");
    doc.text("CEO Luis Eduardo Diaz", margin, y + 8);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Gerente General - ZALDO", margin, y + 14);

    // Save
    doc.save(`PazYSalvo_${data.clientName}.pdf`);
}
