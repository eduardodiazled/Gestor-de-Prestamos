
const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

async function main() {
    console.log('--- FINDING UNIQUE PAYMENT TYPES ---')

    const { data: payments, error } = await supabase
        .from('payments')
        .select('payment_type')

    if (error) {
        console.error('Error:', error)
        return
    }

    const types = new Set(payments.map(p => p.payment_type))
    console.log('Unique payment types found:', Array.from(types))

    console.log('\n--- FINDING INVESTORS ---')
    const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'investor')

    if (pError) console.error('Error fetching profiles:', pError)
    console.log('Investors in DB:', profiles)
}

main()
