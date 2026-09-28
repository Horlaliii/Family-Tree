import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Runs before every page:
 *  - refreshes the Supabase session cookie (so signed-in users stay signed in)
 *  - passes the current path to Server Components (for "back to where you were")
 *  - marks every response noindex
 *
 * Access decisions are NOT made here: every page and action checks the viewer
 * on the server (src/server/viewer.ts) before reading any data.
 */
export async function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', request.nextUrl.pathname + request.nextUrl.search);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const hasAuthCookie = request.cookies.getAll().some((c) => c.name.startsWith('sb-'));
  if (hasAuthCookie) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
            response = NextResponse.next({ request: { headers: requestHeaders } });
            for (const { name, value, options } of cookiesToSet) {
              response.cookies.set(name, value, options);
            }
          },
        },
      },
    );
    // Refreshes an expired access token if needed.
    await supabase.auth.getUser();
  }

  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|logo.svg|robots.txt|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)',
  ],
};
