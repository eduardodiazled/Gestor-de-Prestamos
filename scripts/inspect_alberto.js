const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    await supabase.auth.signInWithPassword({
        email: 'lueddios17@gmail.com',
        password: 'Casablanca18@',
    });

    const { data: clients } = await supabase.from('clients').select('*').ilike('full_name', '%Alberto%');
    console.log('Clients found:', clients);

    if (clients && clients.length > 0) {
        const clientIds = clients.map(c => c.id);
        const { data: loans } = await supabase.from('loans').select('*, investor:profiles(*)').in('client_id', clientIds);
        console.log('\nLoans found:');
        loans.forEach(l => {
            console.log(`Loan ID: ${l.id} | Amount: $${l.amount} | Rate: ${l.interest_rate}% | Start: ${l.start_date} | Cutoff: ${l.cutoff_day} | AdminFee: ${l.admin_fee_percent}% | PaidUntil: ${l.paid_until}`);
        });

        const loanIds = loans.map(l => l.id);
        const { data: payments } = await supabase.from('payments').select('*').in('loan_id', loanIds).order('payment_date', { ascending: false });
        console.log('\nPayments history:');
        payments.forEach(p => {
            console.log(`Pay ID: ${p.id} | LoanID: ${p.loan_id} | Amount: $${p.amount} | Type: ${p.payment_type} | Date: ${p.payment_date}`);
        });
    }
}

main().catch(console.error);
