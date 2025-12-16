
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
    const { data: clients, error: cerr } = await supabase.from('clients').select('id, full_name').ilike('full_name', '%Lud%');

    if (cerr) return console.error(cerr);
    if (!clients || clients.length === 0) return console.log('No client named Ludis found');

    for (const client of clients) {
        console.log(`Checking Client: ${client.full_name} (${client.id})`);
        const { data: loans, error: lerr } = await supabase.from('loans').select('*').eq('client_id', client.id);

        if (lerr) { console.error(lerr); continue; }
        console.log(`  Found ${loans.length} loans.`);

        for (const l of loans) {
            console.log(`  Loan ${l.id} | Amount: ${l.amount} | Investor: ${l.investor_id}`);
            const { data: payments, error: perr } = await supabase.from('payments').select('*').eq('loan_id', l.id);
            if (perr) console.error(perr);
            else {
                console.log(`    Found ${payments.length} payments:`);
                payments.forEach(p => {
                    console.log(`      - [${p.payment_type}] $${p.amount} (Date: ${p.payment_date})`);
                });
            }
        }
    }
}

checkLudis();
