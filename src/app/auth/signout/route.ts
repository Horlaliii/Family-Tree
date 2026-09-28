import { NextResponse, type NextRequest } from 'next/server';

import { createUserSupabase } from '@/server/supabase';

export async function POST(request: NextRequest) {
  const supabase = await createUserSupabase();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL('/', request.nextUrl.origin), { status: 303 });
}
