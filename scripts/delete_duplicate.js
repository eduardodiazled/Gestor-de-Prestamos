const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing environment variables");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteDuplicate() {
    const paymentIdToDelete = '910ca665-d289-4e94-9644-b30b028e27b5'; // The latest one

    console.log(`Deleting payment: ${paymentIdToDelete}...`);

    const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentIdToDelete);

    if (error) {
        console.error("Error deleting:", error);
    } else {
        console.log("Successfully deleted duplicate payment.");
    }
}

deleteDuplicate();
