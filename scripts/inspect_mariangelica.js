
const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

async function main() {
    console.log('--- INSPECTING MARIANGELICA ---')

    // 1. Find profile
    const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .ilike('full_name', '%Mariangelica%')

    if (!profiles || profiles.length === 0) {
        console.log('Profile not found')
        return
    }

    const profile = profiles[0]
    console.log('Found profile:', profile.id, profile.full_name)

    // 2. Find loans
    const { data: loans } = await supabase
        .from('loans')
        .select('id, amount, status')
        .eq('investor_id', profile.id)

    console.log(`Found ${loans?.length || 0} loans`)
    const loanIds = loans?.map(l => l.id) || []

    // 3. Find payments
    if (loanIds.length > 0) {
        const { data: payments } = await supabase
            .from('payments')
            .select('amount, payment_type, loan_id')
            .in('loan_id', loanIds)

        console.log('Payments found:', payments?.length || 0)
        const types = new Set(payments?.map(p => p.payment_type))
        console.log('Unique payment types:', Array.from(types))
        console.log('Sample payments:', payments?.slice(0, 5))
    }
}

main()
