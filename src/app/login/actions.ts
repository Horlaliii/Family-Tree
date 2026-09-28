'use server';

import { headers } from 'next/headers';
import { z } from 'zod';

import { publicEnv } from '@/lib/env';
import { hitRateLimit } from '@/server/passcode';
import { clientIp, safeNextPath } from '@/server/settings';
import { createAdminSupabase, createUserSupabase } from '@/server/supabase';

export interface MagicLinkState {
  error?: string;
  sentTo?: string;
}

const schema = z.object({
  email: z.email('Please enter a valid email address.'),
  next: z.string().optional(),
});

/** Until Phase 2 invites exist, only the very first person may create an account. */
async function signUpsOpen(): Promise<boolean> {
  const { count } = await createAdminSupabase()
    .from('user_profiles')
    .select('user_id', { count: 'exact', head: true })
    .eq('role', 'admin');
  return (count ?? 0) === 0;
}

export async function sendMagicLink(_prev: MagicLinkState, formData: FormData): Promise<MagicLinkState> {
  const parsed = schema.safeParse({
    email: String(formData.get('email') ?? '').trim(),
    next: formData.get('next') ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const ip = clientIp(await headers());
  if (!(await hitRateLimit(`magic:${ip}`, 5, 10 * 60))) {
    return { error: 'Too many requests. Please wait a few minutes and try again.' };
  }

  const next = safeNextPath(parsed.data.next);
  const supabase = await createUserSupabase();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      shouldCreateUser: await signUpsOpen(),
      emailRedirectTo: `${publicEnv.siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  // Don't reveal whether an address has an account.
  if (error && !/signups not allowed|not found/i.test(error.message)) {
    console.error('Magic link error', error);
    return { error: 'We could not send the email just now. Please try again.' };
  }
  return { sentTo: parsed.data.email };
}
