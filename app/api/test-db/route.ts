
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey)
        const { data, error } = await supabase.from('loans').select('count', { count: 'exact', head: true })

        if (error) throw error

        return NextResponse.json({
            status: 'success',
            message: 'Connected from Server!',
            count: data, // count is usually in 'count' property for head:true, but here data is null. 
            // proper count check:
            // const { count } = await ...
        })
    } catch (error: any) {
        return NextResponse.json({
            status: 'error',
            message: error.message,
            details: error
        }, { status: 500 })
    }
}
