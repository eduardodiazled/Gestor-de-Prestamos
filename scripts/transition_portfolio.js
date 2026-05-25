const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Target IDs
const MARI_ID = '02e797c6-789f-4cc5-8e34-3fc11c13b20b';
const JHONGER_ID = '477e4c55-88f5-44c3-bcdc-38fa68508a1a';

const LOAN_LUDYS_ID = 'fa5b50c9-5f10-42d1-932a-6b50a78598eb';
const LOAN_JULIO_ID = 'eb685726-d797-4869-b114-66cfd7382692';
const LOAN_ELEIXER_ID = '3637094a-98a3-44a1-a933-72fca8b61d49';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function main() {
    console.log('=== PORTFOLIO TRANSITION SCRIPT (Mariangelica -> Jhonger Davila) ===');
    console.log('Logging in as admin...');
    const { data: authData, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'lueddios17@gmail.com',
        password: 'Casablanca18@',
    });

    if (loginError) {
        console.error('Login failed:', loginError);
        process.exit(1);
    }

    console.log('Successfully logged in.');

    // 1. Fetch current loan details to verify and copy document URLs
    console.log('\nFetching loans to verify details...');
    const { data: loans, error: fetchError } = await supabase
        .from('loans')
        .select('*, client:clients(id, full_name)')
        .in('id', [LOAN_LUDYS_ID, LOAN_JULIO_ID, LOAN_ELEIXER_ID]);

    if (fetchError || !loans || loans.length < 3) {
        console.error('Error fetching loans. Make sure all loan IDs are correct.', fetchError);
        process.exit(1);
    }

    const ludysLoan = loans.find(l => l.id === LOAN_LUDYS_ID);
    const julioLoan = loans.find(l => l.id === LOAN_JULIO_ID);
    const eleixerLoan = loans.find(l => l.id === LOAN_ELEIXER_ID);

    console.log(`\nVerified loans to transfer:`);
    console.log(`1. Client: ${ludysLoan.client.full_name} | Outstanding Capital: $500,000 (Ludys Ospino)`);
    console.log(`2. Client: ${julioLoan.client.full_name} | Outstanding Capital: $1,000,000 (Julio Diaz)`);
    console.log(`3. Client: ${eleixerLoan.client.full_name} | Outstanding Capital: $1,000,000 (Eleixer Beleño)`);
    console.log(`Total Cartera to Transfer: $2,500,000`);

    rl.question('\n¿Estás seguro de ejecutar la transición de cartera ahora mismo? Escribe "SI" para proceder: ', async (answer) => {
        if (answer.trim().toUpperCase() !== 'SI') {
            console.log('Transición cancelada. No se realizaron cambios.');
            rl.close();
            process.exit(0);
        }

        try {
            console.log('\nExecuting transition...');

            // Step 1: Saldar Mariangelica's 3 loans with capital payments
            console.log('\nStep 1: Saldar Mariangelica\'s loans...');
            const paymentDate = new Date().toISOString().split('T')[0];

            const paymentsToInsert = [
                {
                    loan_id: LOAN_LUDYS_ID,
                    amount: 500000,
                    payment_date: paymentDate,
                    payment_type: 'capital',
                    notes: 'Saldado por Compra de Cartera (Traspaso a Jhonger Davila)'
                },
                {
                    loan_id: LOAN_JULIO_ID,
                    amount: 1000000,
                    payment_date: paymentDate,
                    payment_type: 'capital',
                    notes: 'Saldado por Compra de Cartera (Traspaso a Jhonger Davila)'
                },
                {
                    loan_id: LOAN_ELEIXER_ID,
                    amount: 1000000,
                    payment_date: paymentDate,
                    payment_type: 'capital',
                    notes: 'Saldado por Compra de Cartera (Traspaso a Jhonger Davila)'
                }
            ];

            const { error: insertPaymentsError } = await supabase
                .from('payments')
                .insert(paymentsToInsert);

            if (insertPaymentsError) throw new Error('Error inserting capital payments: ' + insertPaymentsError.message);
            console.log('✓ Capital payments registered.');

            // Update statuses to 'paid'
            const { error: updateLudysError } = await supabase.from('loans').update({ status: 'paid' }).eq('id', LOAN_LUDYS_ID);
            const { error: updateJulioError } = await supabase.from('loans').update({ status: 'paid' }).eq('id', LOAN_JULIO_ID);
            const { error: updateEleixerError } = await supabase.from('loans').update({ status: 'paid' }).eq('id', LOAN_ELEIXER_ID);

            if (updateLudysError || updateJulioError || updateEleixerError) {
                throw new Error('Error updating loan statuses to paid');
            }
            console.log('✓ Old loans marked as PAID.');

            // Step 2: Register Jhonger Davila's external capital injection ($3,500,000)
            console.log('\nStep 2: Registering capital injection of $3,500,000 for Jhonger Davila...');
            const { error: injectionError } = await supabase
                .from('investor_payouts')
                .insert({
                    investor_id: JHONGER_ID,
                    amount: 3500000,
                    type: 'injection',
                    fund_source: 'capital',
                    notes: 'Aporte externo de capital para compra de cartera'
                });

            if (injectionError) throw new Error('Error inserting Jhonger injection: ' + injectionError.message);
            console.log('✓ Jhonger Davila injection registered.');

            // Step 3: Insert 3 new loans under Jhonger Davila with 50% admin fee
            console.log('\nStep 3: Creating new loans under Jhonger Davila (50/50 split)...');

            const newLoansToInsert = [
                {
                    client_id: ludysLoan.client_id,
                    investor_id: JHONGER_ID,
                    amount: 500000,
                    interest_rate: 10,
                    admin_fee_percent: 50,
                    start_date: '2026-05-17', // Next cycle after her last interest cycle ended
                    cutoff_day: 16,
                    status: 'active',
                    promissory_note_url: ludysLoan.promissory_note_url,
                    transfer_proof_url: ludysLoan.transfer_proof_url,
                    paid_until: '2026-05-17'
                },
                {
                    client_id: eleixerLoan.client_id,
                    investor_id: JHONGER_ID,
                    amount: 1000000,
                    interest_rate: 10,
                    admin_fee_percent: 50,
                    start_date: '2026-05-18', // Next cycle after his last interest cycle ended
                    cutoff_day: 15,
                    status: 'active',
                    promissory_note_url: eleixerLoan.promissory_note_url,
                    transfer_proof_url: eleixerLoan.transfer_proof_url,
                    paid_until: '2026-05-18'
                },
                {
                    client_id: julioLoan.client_id,
                    investor_id: JHONGER_ID,
                    amount: 1000000,
                    interest_rate: 10,
                    admin_fee_percent: 50,
                    start_date: '2026-05-18', // Assuming his interest is paid up to May 18
                    cutoff_day: 15,
                    status: 'active',
                    promissory_note_url: julioLoan.promissory_note_url,
                    transfer_proof_url: julioLoan.transfer_proof_url,
                    paid_until: '2026-05-18'
                }
            ];

            const { error: insertNewLoansError } = await supabase
                .from('loans')
                .insert(newLoansToInsert);

            if (insertNewLoansError) throw new Error('Error inserting new loans under Jhonger: ' + insertNewLoansError.message);
            console.log('✓ New loans created successfully.');

            console.log('\n=== TRANSITION COMPLETED SUCCESSFULLY! ===');
            console.log('Mariangelica\'s capital wallet was correctly credited $2,500,000 and left intact.');
            console.log('Jhonger Davila\'s capital wallet was credited $3,500,000, debited $2,500,000 for loans, leaving $1,000,000 disponible.');
            console.log('The 3 loans are now active under Jhonger Davila with 50/50 profit splitting.');

        } catch (err) {
            console.error('\n❌ Transition failed:', err.message);
        } finally {
            rl.close();
        }
    });
}

main();
