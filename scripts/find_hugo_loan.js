const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('Logging in as admin...');
    const { data: authData, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'lueddios17@gmail.com',
        password: 'Casablanca18@',
    });

    if (loginError) {
        console.error('Login failed:', loginError);
        return;
    }

    console.log('Searching for client Hugo...');
    const { data: clients, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .ilike('full_name', '%Hugo%');

    if (clientError) {
        console.error('Error fetching clients:', clientError);
        return;
    }

    console.log(`Found ${clients.length} matching clients:`);
    clients.forEach(c => {
        console.log(`Client ID: ${c.id} | Name: ${c.full_name} | Document: ${c.document_id}`);
    });

    const clientIds = clients.map(c => c.id);
    if (clientIds.length === 0) {
        console.log('No clients found named Hugo.');
        return;
    }

    console.log('\nFetching loans linked to Hugo...');
    const { data: loans, error: loanError } = await supabase
        .from('loans')
        .select(`
            *,
            client:clients(full_name),
            investor:profiles(id, full_name, email)
        `)
        .in('client_id', clientIds);

    if (loanError) {
        console.error('Error fetching loans:', loanError);
        return;
    }

    console.log(`Found ${loans.length} loans for Hugo:`);
    loans.forEach(l => {
        console.log(`Loan ID: ${l.id}`);
        console.log(`  Client: ${l.client?.full_name}`);
        console.log(`  Investor: ${l.investor?.full_name} (ID: ${l.investor_id})`);
        console.log(`  Amount: $${Number(l.amount).toLocaleString()}`);
        console.log(`  Start Date: ${l.start_date}`);
        console.log(`  Status: ${l.status}`);
        console.log('-----------------------------------');
    });

    // Also check Jhonger's current payouts/injections
    const jhongerId = '477e4c55-88f5-44c3-bcdc-38fa68508a1a';
    console.log('\nChecking Jhonger\'s payouts/injections...');
    const { data: payouts } = await supabase.from('investor_payouts').select('*').eq('investor_id', jhongerId);
    payouts.forEach(p => {
        console.log(`Payout ID: ${p.id} | Date: ${p.date} | Type: ${p.type} | Amount: $${Number(p.amount).toLocaleString()} | Notes: ${p.notes}`);
    });
}

main();
