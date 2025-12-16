/* eslint-disable */
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync'); // Using sync for simplicity in script
const crypto = require('crypto');

// Helper to generate UUIDs (v4-like random)
function uuidv4() {
    return crypto.randomUUID();
}

// Maps to store UUIDs
const investorMap = new Map(); // Name -> UUID
const clientMap = new Map();   // Name -> UUID
const loanMap = new Map();     // Legacy ID -> UUID

// Admin ID (Fixed for "Yo")
const ADMIN_ID = uuidv4();
const ADMIN_EMAIL = 'admin@prestamos.com';

let sqlOutput = `-- SEED DATA GENERATED FROM CSV
-- Date: ${new Date().toISOString()}

-- 1. PROFILES
INSERT INTO public.profiles (id, email, full_name, role) VALUES 
('${ADMIN_ID}', '${ADMIN_EMAIL}', 'Admin Principal', 'admin');
`;

// 1. Process Investors (Socias)
const investorsCsv = fs.readFileSync(path.join(__dirname, '../data/GESTOR DE PRESTAMOS - Inversionistas.csv'), 'utf8');
const investors = parse(investorsCsv, { columns: true, skip_empty_lines: true });

investors.forEach(inv => {
    const name = inv['Nombre de la Socia'].trim();
    if (!name) return;

    // Generate UUID if not exists
    if (!investorMap.has(name)) {
        const id = uuidv4();
        investorMap.set(name, id);
        const email = `${name.toLowerCase().replace(/\s/g, '.')}@socias.com`;
        sqlOutput += `INSERT INTO public.profiles (id, email, full_name, role) VALUES ('${id}', '${email}', '${name}', 'investor');\n`;
    }
});

// 2. Process Loans to extract Clients
const loansCsv = fs.readFileSync(path.join(__dirname, '../data/GESTOR DE PRESTAMOS - Resumen General.csv'), 'utf8');
const loans = parse(loansCsv, { columns: true, skip_empty_lines: true });

loans.forEach(loan => {
    const clientName = loan['Nombre del Cliente'].trim();
    if (!clientName) return;

    if (!clientMap.has(clientName)) {
        const id = uuidv4();
        clientMap.set(clientName, id);
        // Fake phone/doc for now as it's not in CSV
        const docId = `DOC-${Math.floor(Math.random() * 100000)}`;
        sqlOutput += `INSERT INTO public.clients (id, full_name, document_id) VALUES ('${id}', '${clientName}', '${docId}');\n`;
    }
});

sqlOutput += `\n-- 3. LOANS\n`;

// 3. Process Loans
loans.forEach(loan => {
    const legacyId = loan['ID Préstamo'];
    const clientName = loan['Nombre del Cliente'].trim();
    const investorName = loan['Socia'].trim();
    const amountStr = loan['Monto Prestado'].replace(/[$,]/g, '');
    const amount = parseFloat(amountStr);

    // Parse Rate (e.g., "10%")
    const rateStr = loan['Tasa de Interés Mensual'].replace('%', '');
    const rate = parseFloat(rateStr);

    // Parse Date (DD/MM/YYYY)
    const [day, month, year] = loan['Fecha de Desembolso'].split('/');
    const startDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`; // ISO format

    const clientId = clientMap.get(clientName);
    const investorId = investorMap.get(investorName);

    if (!clientId || !investorId) {
        console.warn(`Skipping loan ${legacyId}: Missing client or investor.`);
        return;
    }

    const loanUUID = uuidv4();
    loanMap.set(legacyId, loanUUID);

    // Status mapping
    let status = 'active';
    if (loan['Estado'].includes('Pagado')) status = 'paid';
    if (loan['Estado'].includes('Mora')) status = 'defaulted';

    // MANUAL OVERRIDE (User Request: Jener & Carlos are up to date)
    if (clientName.includes('Jener') || clientName.includes('Carlos')) {
        status = 'active';
    }

    sqlOutput += `INSERT INTO public.loans (id, legacy_id, client_id, investor_id, amount, interest_rate, start_date, cutoff_day, status) VALUES 
    ('${loanUUID}', ${legacyId}, '${clientId}', '${investorId}', ${amount}, ${rate}, '${startDate}', 15, '${status}');\n`;
});

sqlOutput += `\n-- 4. PAYMENTS\n`;

// 4. Process Payments
const paymentsCsv = fs.readFileSync(path.join(__dirname, '../data/GESTOR DE PRESTAMOS - Detalle de Pagos.csv'), 'utf8');
const payments = parse(paymentsCsv, { columns: true, skip_empty_lines: true });

payments.forEach(pay => {
    const legacyLoanId = pay['ID Préstamo'];
    const loanUUID = loanMap.get(legacyLoanId);

    if (!loanUUID) {
        // Might happen if loan was filtered out or data inconsistency
        return;
    }

    const amount = parseFloat(pay['Monto Pagado'].replace(/[$,]/g, ''));

    // Parse Date
    const [day, month, year] = pay['Fecha de Pago'].split('/');
    const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

    const typeRaw = pay['Tipo de Pago'].toLowerCase();
    let type = 'interest';
    if (typeRaw.includes('capital')) type = 'capital';

    const notes = pay['Notas'] || '';
    const isLate = notes.toLowerCase().includes('mora');
    const waived = notes.toLowerCase().includes('perdonada');

    sqlOutput += `INSERT INTO public.payments (loan_id, amount, payment_date, payment_type, notes, is_late, late_fee_waived) VALUES 
    ('${loanUUID}', ${amount}, '${dateStr}', '${type}', '${notes.replace(/'/g, "''")}', ${isLate}, ${waived});\n`;
});

// Write to file
fs.writeFileSync(path.join(__dirname, '../seed_data.sql'), sqlOutput);
console.log('Seed SQL generated at seed_data.sql');
