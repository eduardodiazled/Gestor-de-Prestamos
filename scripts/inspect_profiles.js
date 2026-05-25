const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectProfiles() {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) {
        console.error("Error fetching profiles:", error);
    } else {
        console.log("Profiles in the database:");
        console.log(data);
    }
}

inspectProfiles();
