
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.log("No env vars found, checking process.env...");
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLogin() {
    console.log("Testing login for lueddios17@gmail.com...");

    const { data, error } = await supabase.auth.signInWithPassword({
        email: 'lueddios17@gmail.com',
        password: 'Casablanca18@',
    });

    if (error) {
        console.error("LOGIN FAILED:");
        console.error("Message:", error.message);
        console.error("Status:", error.status);
    } else {
        console.log("LOGIN SUCCESSFUL!");
        console.log("User ID:", data.user.id);
        console.log("Email Confirmed:", data.user.email_confirmed_at);
        // data.session is present
    }
}

testLogin();
