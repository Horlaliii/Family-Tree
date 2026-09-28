'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { publicEnv } from '@/lib/env';
import { hitRateLimit } from '@/server/passcode';
import { clientIp, safeNextPath, signUpsOpen } from '@/server/settings';
import { createAdminSupabase, createUserSupabase } from '@/server/supabase';

export interface MagicLinkState {
  error?: string;
  /** Echoed back so a failed attempt doesn't clear what was typed. */
  email?: string;
  sentTo?: string;
}

export interface PasswordState {
  error?: string;
  email?: string;
}

const schema = z.object({
  email: z.email('Please enter a valid email address.'),
  next: z.string().optional(),
});

export async function sendMagicLink(_prev: MagicLinkState, formData: FormData): Promise<MagicLinkState> {
  const email = String(formData.get('email') ?? '').trim();
  const parsed = schema.safeParse({
    email,
    next: formData.get('next') ?? undefined,
  });
  if (!parsed.success) return { email, error: parsed.error.issues[0]?.message };

  const ip = clientIp(await headers());
  if (!(await hitRateLimit(`magic:${ip}`, 5, 10 * 60))) {
    return { email, error: 'Too many requests. Please wait a few minutes and try again.' };
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
    return { email, error: 'We could not send the email just now. Please try again.' };
  }
  return { sentTo: parsed.data.email };
}

const passwordSchema = z.object({
  email: z.email('Please enter a valid email address.'),
  password: z.string().min(1, 'Please enter your password.').max(200),
  next: z.string().optional(),
});

export async function signInWithPassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const email = String(formData.get('email') ?? '').trim();
  const parsed = passwordSchema.safeParse({
    email,
    password: String(formData.get('password') ?? ''),
    next: formData.get('next') ?? undefined,
  });
  if (!parsed.success) return { email, error: parsed.error.issues[0]?.message };

  const ip = clientIp(await headers());
  if (!(await hitRateLimit(`password:${ip}`, 10, 10 * 60))) {
    return { email, error: 'Too many tries. Please wait 10 minutes and try again.' };
  }

  const supabase = await createUserSupabase();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    if (!/invalid login credentials/i.test(error.message)) console.error('Password sign-in error', error);
    return { email, error: 'That email and password do not match. Please try again.' };
  }

  redirect(safeNextPath(parsed.data.next));
}

const PASSWORD_MIN = 8;

const setupSchema = z
  .object({
    email: z.email('Please enter a valid email address.'),
    password: z.string().min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`).max(200),
    confirm: z.string(),
    next: z.string().optional(),
  })
  .refine((v) => v.password === v.confirm, { message: 'The two passwords do not match.' });

/**
 * First run only: create the admin account with an email and password, no
 * email round-trip needed. Closed as soon as any admin exists.
 */
export async function createFirstAdmin(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const email = String(formData.get('email') ?? '').trim();
  const parsed = setupSchema.safeParse({
    email,
    password: String(formData.get('password') ?? ''),
    confirm: String(formData.get('confirm') ?? ''),
    next: formData.get('next') ?? undefined,
  });
  if (!parsed.success) return { email, error: parsed.error.issues[0]?.message };

  const ip = clientIp(await headers());
  if (!(await hitRateLimit(`setup:${ip}`, 5, 10 * 60))) {
    return { email, error: 'Too many tries. Please wait 10 minutes and try again.' };
  }
  if (!(await signUpsOpen())) {
    return { email, error: 'The admin account already exists. Please sign in instead.' };
  }

  const admin = createAdminSupabase();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    console.error('Create admin error', createError);
    return { email, error: createError?.message ?? 'We could not create the account. Please try again.' };
  }

  // The database makes the first account the admin. If someone else got
  // there a moment earlier, undo this one rather than leave a stray account.
  const { data: profile } = await admin
    .from('user_profiles')
    .select('role')
    .eq('user_id', created.user.id)
    .maybeSingle();
  if (profile?.role !== 'admin') {
    await admin.auth.admin.deleteUser(created.user.id);
    return { email, error: 'The admin account already exists. Please sign in instead.' };
  }

  const supabase = await createUserSupabase();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    console.error('Sign-in after setup error', error);
    return { email, error: 'Your account was created, but signing in failed. Please sign in below.' };
  }

  redirect(safeNextPath(parsed.data.next));
}
