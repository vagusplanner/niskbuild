import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
  try {
    // Test if Supabase is connected
    const { data, error } = await supabase
      .from('waitlist')
      .select('count', { count: 'exact', head: true });
    
    return NextResponse.json({ 
      connected: !error, 
      error: error?.message,
      count: data 
    });
  } catch (error) {
    return NextResponse.json({ 
      connected: false, 
      error: String(error) 
    });
  }
}