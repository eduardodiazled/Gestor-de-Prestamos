import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function GET() {
    const paymentIdToDelete = '910ca665-d289-4e94-9644-b30b028e27b5'; // The latest one

    const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentIdToDelete);

    if (error) return NextResponse.json({ error })
    return NextResponse.json({ success: true, deleted: paymentIdToDelete })
}
