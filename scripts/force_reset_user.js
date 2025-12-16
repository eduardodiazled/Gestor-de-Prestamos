
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    console.log("Please ensure you have the Service Role Key allowed to bypass email confirmation.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function forceResetUser() {
    console.log("Force resetting user lueddios17@gmail.com...");

    // 1. Get User ID by Email (Admin)
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
        console.error("Error listing users:", listError);
        return;
    }

    const user = users.find(u => u.email === 'lueddios17@gmail.com');

    if (!user) {
        console.error("User not found! Creating it now...");
        const { data, error } = await supabase.auth.admin.createUser({
            email: 'lueddios17@gmail.com',
            password: 'Casablanca18@',
            email_confirm: true
        });
        if (error) console.error("Error creating user:", error);
        else console.log("User created and confirmed automatically.");
        return;
    }

    console.log(`Found user ${user.id}. Updating...`);

    // 2. Update User (Confirm Email & Set Password)
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        {
            password: 'Casablanca18@',
            email_confirm: true,
            user_metadata: { email_verified: true }
        }
    );

    if (updateError) {
        console.error("Error updating user:", updateError);
    } else {
        console.log("User updated successfully!");
        console.log("Email confirmed: TRUE");
        console.log("Password reset: TRUE");
    }
}

forceResetUser();
