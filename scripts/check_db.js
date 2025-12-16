const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 1. Try reading .env.local, fallback to process.env
let env = {};
try {
    const envPath = path.resolve(__dirname, '../.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            env[key.trim()] = value.trim();
        }
    });
} catch (e) {
    console.log("Could not read .env.local, using process.env");
    env = process.env;
}

const url = env['NEXT_PUBLIC_SUPABASE_URL'];
const key = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

console.log(`Connecting to: ${url}`);

const supabase = createClient(url, key);

async function check() {
    const { count, error } = await supabase.from('loans').select('*', { count: 'exact', head: true });

    if (error) {
        console.error('Error connecting:', error.message);
    } else {
        console.log(`Successfully connected! Found ${count} loans in the database.`);
    }
}

check();
