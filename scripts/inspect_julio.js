
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually read .env.local
const envPath = path.resolve(__dirname, '../.env.local');
let supabaseUrl, supabaseKey;

try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const [key, val] = line.split('=');
        if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = val.trim();
        if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') supabaseKey = val.trim();
    });
} catch (e) {
    console.error("Could not read .env.local", e);
    process.exit(1);
}

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing keys in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkJulio() {
    const { data: clients } = await supabase.from('clients').select('id, full_name').ilike('full_name', '%Julio%');

    if (!clients || clients.length === 0) {
        console.log('No client named Julio found');
        return;
    }

    const clientId = clients[0].id;
    console.log(`Checking Client: ${clients[0].full_name} (${clientId})`);

    const { data: loans } = await supabase.from('loans').select('*').eq('client_id', clientId);

    if (!loans) {
        console.log('No loans found');
        return;
    }

    for (const loan of loans) {
        console.log(`\nLoan ID: ${loan.id}`);
        console.log(`  Start Date: ${loan.start_date}`);
        console.log(`  Paid Until: ${loan.paid_until}`);
        console.log(`  Status: ${loan.status}`);

        const { data: payments } = await supabase.from('payments').select('*').eq('loan_id', loan.id).order('payment_date', { ascending: true });
        console.log('  Payments:');
        payments.forEach(p => {
            console.log(`    - ${p.payment_date}: $${p.amount} (${p.payment_type}) [Notes: ${p.notes || ''}]`);
        });
    }
}

checkJulio();
