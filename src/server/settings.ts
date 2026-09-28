import 'server-only';

import { cache } from 'react';

import { createAdminSupabase } from './supabase';

/** Public-safe site settings. Read with the service role so the passcode page can show the family name. */
export const getSiteSettings = cache(async () => {
  const { data } = await createAdminSupabase()
    .from('site_settings')
    .select('site_name, intro_md, featured_person_id')
    .single();
  return {
    siteName: data?.site_name ?? 'Our Family Tree',
    introMd: data?.intro_md ?? null,
    featuredPersonId: data?.featured_person_id ?? null,
  };
});

/** Only allow relative, same-site redirect targets. */
export function safeNextPath(value: unknown, fallback = '/'): string {
  if (typeof value !== 'string') return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  return value;
}

export function clientIp(h: Headers): string {
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown';
}

/** Until Phase 2 invites exist, only the very first person may create an account. */
export async function signUpsOpen(): Promise<boolean> {
  const { count } = await createAdminSupabase()
    .from('user_profiles')
    .select('user_id', { count: 'exact', head: true })
    .eq('role', 'admin');
  return (count ?? 0) === 0;
}
