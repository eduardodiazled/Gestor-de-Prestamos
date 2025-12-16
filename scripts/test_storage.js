
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

async function checkStorage() {
    console.log("Checking Storage Buckets...");

    // 1. List Buckets
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (bucketError) {
        console.error("Error listing buckets:", bucketError);
    } else {
        console.log("Buckets found:", buckets.map(b => b.name));
        const docBucket = buckets.find(b => b.name === 'documents');
        if (!docBucket) {
            console.error("CRITICAL: 'documents' bucket does NOT exist!");
        } else {
            console.log("'documents' bucket exists. Public:", docBucket.public);
        }
    }

    // 2. Try simple upload test
    console.log("\nAttempting Test Upload to 'documents'...");
    try {
        const { data, error } = await supabase.storage
            .from('documents')
            .upload('test_check.txt', Buffer.from('Testing upload'), { upsert: true });

        if (error) {
            console.error("Upload Failed:", error);
        } else {
            console.log("Upload Success:", data);
        }
    } catch (err) {
        console.error("Unexpected upload error:", err);
    }
}

checkStorage();
