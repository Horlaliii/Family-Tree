'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { clearGateCache, hashPasscode } from '../passcode';
import { createAdminSupabase, createUserSupabase } from '../supabase';
import { getViewer, isAdmin } from '../viewer';
import { dbFail, fail, zodFail, type ActionResult } from './result';

const siteSchema = z.object({
  siteName: z.string().trim().min(1, 'Enter the family name').max(80),
  introMd: z.string().trim().max(4000).default(''),
  featuredPersonId: z
    .union([z.uuid(), z.literal(''), z.null()])
    .optional()
    .transform((v) => v || null),
});

export async function saveSiteSettings(input: z.input<typeof siteSchema>): Promise<ActionResult> {
  if (!isAdmin(await getViewer())) return fail('Only the admin can change settings.');
  const parsed = siteSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const db = await createUserSupabase();
  const { error } = await db
    .from('site_settings')
    .update({
      site_name: parsed.data.siteName,
      intro_md: parsed.data.introMd || null,
      featured_person_id: parsed.data.featuredPersonId,
    })
    .eq('id', true);
  if (error) return dbFail(error);
  revalidatePath('/', 'layout');
  return { ok: true };
}

const passcodeSchema = z
  .object({
    passcode: z.string().trim().min(6, 'Use at least 6 characters').max(100),
    confirm: z.string().trim(),
  })
  .refine((v) => v.passcode === v.confirm, { message: 'The two passcodes do not match', path: ['confirm'] });

/** Set a new passcode. Everyone who entered the old one must enter the new one. */
export async function changePasscode(input: z.input<typeof passcodeSchema>): Promise<ActionResult> {
  if (!isAdmin(await getViewer())) return fail('Only the admin can change the passcode.');
  const parsed = passcodeSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const admin = createAdminSupabase();
  const { data: current, error: readError } = await admin
    .from('site_secrets')
    .select('passcode_version')
    .single();
  if (readError) return dbFail(readError);
  const { error } = await admin
    .from('site_secrets')
    .update({
      passcode_hash: await hashPasscode(parsed.data.passcode),
      passcode_version: current.passcode_version + 1,
      passcode_enabled: true,
    })
    .eq('id', true);
  if (error) return dbFail(error);
  clearGateCache();
  return { ok: true };
}

export async function setPasscodeEnabled(enabled: boolean): Promise<ActionResult> {
  if (!isAdmin(await getViewer())) return fail('Only the admin can change the passcode.');
  const admin = createAdminSupabase();
  if (enabled) {
    const { data } = await admin.from('site_secrets').select('passcode_hash').single();
    if (!data?.passcode_hash) return fail('Set a passcode first.');
  }
  const { error } = await admin.from('site_secrets').update({ passcode_enabled: enabled }).eq('id', true);
  if (error) return dbFail(error);
  clearGateCache();
  return { ok: true };
}

const passwordSchema = z
  .object({
    password: z.string().min(8, 'Use at least 8 characters').max(200),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: 'The two passwords do not match', path: ['confirm'] });

/** Set or change the signed-in user's own sign-in password. */
export async function changeOwnPassword(input: z.input<typeof passwordSchema>): Promise<ActionResult> {
  if ((await getViewer())?.kind !== 'user') return fail('Please sign in first.');
  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const { error } = await (await createUserSupabase()).auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (/different from the old/i.test(error.message)) return fail('That is already your password.');
    if (/weak/i.test(error.message)) return fail(error.message);
    console.error('Change password error', error);
    return fail('We could not change your password. Please try again.');
  }
  return { ok: true };
}
