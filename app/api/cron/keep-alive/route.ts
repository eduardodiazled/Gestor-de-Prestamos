import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET() {
    try {
        const { data, error } = await supabase.from('profiles').select('id').limit(1);
        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }
        return NextResponse.json({ 
            success: true, 
            timestamp: new Date().toISOString(), 
            message: "Supabase database kept alive successfully" 
        });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
