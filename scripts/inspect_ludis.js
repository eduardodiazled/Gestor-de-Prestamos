
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLudis() {
    const { data: clients } = await supabase.from('clients').select('id, full_name').ilike('full_name', '%Lud%'); // Ludis/Ludys

    if (!clients || clients.length === 0) {
        console.log('No client named Ludis found');
        return;
    }

    for (const client of clients) {
        console.log(`Checking Client: ${client.full_name} (${client.id})`);
        const { data: loans } = await supabase.from('loans').select('id, amount, start_date').eq('client_id', client.id);

        const loanIds = loans.map(l => l.id);
        if (loanIds.length > 0) {
            const { data: payments } = await supabase.from('payments').select('*').in('loan_id', loanIds);
            console.log('  Payments:');
            payments.forEach(p => {
                console.log(`    - Date: ${p.payment_date} | Amount: ${p.amount} | Type: '${p.payment_type}' | Notes: ${p.notes}`);
            });
        }
    }
}

checkLudis();
