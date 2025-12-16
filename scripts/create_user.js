
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createUser() {
    console.log("Creating user lueddios17@gmail.com...");

    // 1. Sign Up
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: 'lueddios17@gmail.com',
        password: 'Casablanca18@',
    });

    if (authError) {
        console.error("Error creating user:", authError.message);
        return;
    }

    console.log("User created successfully:", authData.user?.id);

    // 2. Create Profile (Manually, if trigger doesn't work or just to be safe)
    if (authData.user) {
        console.log("Ensuring profile exists...");
        const { error: profileError } = await supabase.from('profiles').upsert({
            id: authData.user.id,
            email: authData.user.email,
            full_name: 'Luis Diaz',
            role: 'admin'
        });

        if (profileError) {
            console.error("Error creating profile:", profileError.message);
        } else {
            console.log("Profile created/updated.");
        }
    }
}

createUser();
