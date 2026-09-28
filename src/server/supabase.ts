import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';

import { publicEnv } from '@/lib/env';
import type { Database } from '@/lib/supabase/database.types';

import { serverEnv } from './env';

export type Db = SupabaseClient<Database>;

/** Client acting as the signed-in user (RLS applies). */
export async function createUserSupabase(): Promise<Db> {
  const cookieStore = await cookies();
  return createServerClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component: the proxy refreshes sessions instead.
        }
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Visitor client: a short-lived JWT with role=visitor, so the database's own
// rules (the redacting v_* views) decide what a passcode visitor can see.
// ---------------------------------------------------------------------------
let visitorToken: { token: string; expiresAt: number } | undefined;

async function getVisitorToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (visitorToken && visitorToken.expiresAt - now > 60) {
    return visitorToken.token;
  }
  const expiresAt = now + 5 * 60;
  const token = await new SignJWT({ role: 'visitor' })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer('our-family-tree')
    .setIssuedAt(now)
    .setExpirationTime(expiresAt)
    .sign(new TextEncoder().encode(serverEnv.jwtSecret));
  visitorToken = { token, expiresAt };
  return token;
}

export async function createVisitorSupabase(): Promise<Db> {
  const token = await getVisitorToken();
  return createClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

/**
 * Service-role client. Bypasses RLS, so use it only for things no user
 * role may do: reading the passcode hash, rate limiting, signing storage
 * URLs after a visibility check, and the admin export.
 */
export function createAdminSupabase(): Db {
  return createClient<Database>(publicEnv.supabaseUrl, serverEnv.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
