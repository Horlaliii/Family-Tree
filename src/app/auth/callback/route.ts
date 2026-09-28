import { NextResponse, type NextRequest } from 'next/server';

import { safeNextPath } from '@/server/settings';
import { createUserSupabase } from '@/server/supabase';

/** OAuth and magic-link sign-ins land here with a one-time code. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = safeNextPath(searchParams.get('next'));

  if (code) {
    const supabase = await createUserSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
    console.error('Auth callback error', error.message);
  }
  return NextResponse.redirect(new URL('/login?error=1', origin));
}
