import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getSiteSettings, safeNextPath, signUpsOpen } from '@/server/settings';
import { getViewer } from '@/server/viewer';

import { LoginForm, SetupAdminForm } from './login-form';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const nextPath = safeNextPath(next);
  const viewer = await getViewer();
  if (viewer?.kind === 'user') redirect(nextPath);

  const [{ siteName }, setup] = await Promise.all([getSiteSettings(), signUpsOpen()]);

  return (
    <main className="flex min-h-dvh flex-col">
      <div className="kente-band h-2" aria-hidden />
      <div className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <h1 className="text-center text-3xl font-semibold">{setup ? 'Set up' : 'Sign in'}</h1>
          <p className="text-muted-foreground mt-2 text-center">to {siteName}</p>
          {error && (
            <p role="alert" className="bg-destructive/10 text-destructive mt-6 rounded-lg p-3 text-sm">
              Sign-in did not work. Please try again.
            </p>
          )}
          {setup ? <SetupAdminForm next={nextPath} /> : <LoginForm next={nextPath} />}
          <p className="text-muted-foreground mt-8 text-center text-sm">
            Just visiting?{' '}
            <Link href="/passcode" className="text-primary font-medium underline underline-offset-4">
              Use the family passcode
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
