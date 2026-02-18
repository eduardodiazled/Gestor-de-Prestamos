
const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

async function main() {
    console.log('--- INSPECTING ZURY NUMA ---')

    // 1. Find Zury's Profiles
    const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('full_name', '%Zury%')

    if (pError) console.error('Error fetching profiles:', pError)
    console.log('Profiles found:', profiles)

    if (profiles && profiles.length > 0) {
        const pIds = profiles.map(p => p.id)

        // 2. Find Loans
        const { data: loans, error: lError } = await supabase
            .from('loans')
            .select('*, client:clients(*)')
            .in('investor_id', pIds)

        if (lError) console.error('Error fetching loans:', lError)
        console.log('\nLoans found for Zury:', loans)

        if (loans && loans.length > 0) {
            const lIds = loans.map(l => l.id)

            // 3. Find Payments
            const { data: payments, error: payError } = await supabase
                .from('payments')
                .select('*')
                .in('loan_id', lIds)

            if (payError) console.error('Error fetching payments:', payError)
            console.log('\nPayments found for these loans:', payments)
        }
    }
}

main()
