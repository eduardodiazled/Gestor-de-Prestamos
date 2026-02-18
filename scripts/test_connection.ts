
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Error: Missing Supabase environment variables.')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testConnection() {
    console.log(`Testing connection to: ${supabaseUrl}`)

    // Try to fetch a simple query (e.g. limit 1 from a known table or just auth health)
    // We don't know exact public tables, but we can try listing unrelated thing or just auth.
    // Actually, let's try to get the session/user (should be null but not error)

    try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
            console.error('Auth Error:', error.message)
        } else {
            console.log('Supabase Auth Service is REACHABLE.')
        }
    } catch (err) {
        console.error('Connection failed:', err)
    }
}

testConnection()
