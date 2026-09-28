'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import {
  getGateSettings,
  hitRateLimit,
  PASSCODE_COOKIE,
  PASSCODE_COOKIE_MAX_AGE,
  signPasscodeCookie,
  verifyPasscode,
} from '@/server/passcode';
import { clientIp, safeNextPath } from '@/server/settings';

export interface PasscodeState {
  error?: string;
}

const schema = z.object({
  passcode: z.string().trim().min(1, 'Please enter the family passcode.').max(200),
  next: z.string().optional(),
});

export async function enterPasscode(_prev: PasscodeState, formData: FormData): Promise<PasscodeState> {
  const parsed = schema.safeParse({
    passcode: formData.get('passcode'),
    next: formData.get('next') ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Please enter the family passcode.' };
  }

  const ip = clientIp(await headers());
  const allowed = await hitRateLimit(`passcode:${ip}`, 5, 10 * 60);
  if (!allowed) {
    return { error: 'Too many tries. Please wait 10 minutes and try again.' };
  }

  if (!(await verifyPasscode(parsed.data.passcode))) {
    return { error: 'That passcode is not right. Please check with the family and try again.' };
  }

  const gate = await getGateSettings();
  const cookieStore = await cookies();
  cookieStore.set(PASSCODE_COOKIE, await signPasscodeCookie(gate.version), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: PASSCODE_COOKIE_MAX_AGE,
  });

  redirect(safeNextPath(parsed.data.next));
}
