import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getGateSettings } from '@/server/passcode';
import { getSiteSettings, safeNextPath } from '@/server/settings';
import { getViewer } from '@/server/viewer';

import { PasscodeForm } from './passcode-form';

export const metadata: Metadata = { title: 'Welcome' };

export default async function PasscodePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(next);
  if (await getViewer()) redirect(nextPath);

  const [{ siteName }, gate] = await Promise.all([getSiteSettings(), getGateSettings()]);

  return (
    <main className="flex min-h-dvh flex-col">
      <div className="kente-band h-2" aria-hidden />
      <div className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm text-center">
          <p className="text-accent-text text-sm font-medium tracking-widest uppercase">Welcome to</p>
          <h1 className="mt-2 text-4xl font-semibold text-balance">{siteName}</h1>
          <p className="text-muted-foreground mt-3">
            This family history is private. Enter the family passcode to come in.
          </p>
          {gate.hasPasscode ? (
            <PasscodeForm next={nextPath} />
          ) : (
            <p className="bg-muted mt-8 rounded-lg p-4 text-left">
              The family passcode hasn&apos;t been set up yet. If you look after this site, sign in and set it
              in Admin → Settings.
            </p>
          )}
          <p className="text-muted-foreground mt-8 text-sm">
            Have an account?{' '}
            <Link href="/login" className="text-primary font-medium underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
