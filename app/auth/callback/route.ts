import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }
  
  return NextResponse.redirect(new URL('/', requestUrl.origin));
}
