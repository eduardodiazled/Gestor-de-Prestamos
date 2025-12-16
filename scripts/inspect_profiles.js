
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

async function inspectTable() {
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    if (error) {
        console.error(error);
    } else {
        if (data && data.length > 0) {
            console.log("Columns in 'profiles':", Object.keys(data[0]));
        } else {
            // Try to insert a dummy to see if it allows non-auth UUID?
            // No, risk of pollution.
            console.log("Table 'profiles' is empty. Can't infer keys directly.");
        }
    }
}

inspectTable();
