import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const name = searchParams.get('name')

    const query = supabase
        .from('payments')
        .select('*, loan:loans!inner(client:clients!inner(full_name))')
        .order('payment_date', { ascending: false })

    if (name) {
        query.ilike('loan.client.full_name', `%${name}%`)
    }

    const { data, error } = await query

    return NextResponse.json({ data, error })
}
