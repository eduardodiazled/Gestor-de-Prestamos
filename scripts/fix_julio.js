
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

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixJulio() {
    const { data: clients } = await supabase.from('clients').select('id').ilike('full_name', '%Julio%');

    if (!clients || clients.length === 0) return console.log('Julio not found');
    const clientId = clients[0].id;

    // Get active loan
    const { data: loans } = await supabase.from('loans').select('id').eq('client_id', clientId).eq('status', 'active');
    if (!loans || loans.length === 0) return console.log('No active loan for Julio');

    const loanId = loans[0].id;
    console.log(`Updating Loan ${loanId} for Julio...`);

    // Update paid_until to 2026-01-07
    const { error } = await supabase.from('loans').update({ paid_until: '2026-01-07' }).eq('id', loanId);

    if (error) console.error("Error updating:", error);
    else console.log("Success! Updated paid_until to 2026-01-07");
}

fixJulio();
