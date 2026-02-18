
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

async function main() {
    const { data, error } = await supabase.from('profiles').insert({
        id: uuidv4(),
        full_name: 'Zury Numa',
        email: 'zury@socias.com', // Placeholder
        role: 'investor'
    }).select().single()

    if (error) {
        console.error('Error creating profile:', error)
    } else {
        console.log('Successfully created investor:', data)
    }
}

main()
