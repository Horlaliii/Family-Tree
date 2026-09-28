import Link from 'next/link';

import { BottomNav } from '@/components/layout/bottom-nav';
import { SiteHeader } from '@/components/layout/site-header';
import { getSiteSettings } from '@/server/settings';
import { canEdit, isAdmin, requireViewer } from '@/server/viewer';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireViewer();
  const { siteName } = await getSiteSettings();
  const nav = {
    signedIn: viewer.kind === 'user',
    canEdit: canEdit(viewer),
    isAdmin: isAdmin(viewer),
    linkedPersonId: viewer.kind === 'user' ? viewer.linkedPersonId : null,
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="focus:bg-card sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:p-2"
      >
        Skip to content
      </a>
      <SiteHeader siteName={siteName} nav={nav} />
      {viewer.kind === 'visitor' && viewer.pendingEmail !== undefined && (
        <div className="bg-accent-soft border-b px-4 py-2 text-center text-sm">
          You&apos;re signed in as {viewer.pendingEmail ?? 'a new user'}, but your account hasn&apos;t been
          approved yet. Ask Ian to give you access.{' '}
          <form action="/auth/signout" method="post" className="inline">
            <button className="font-medium underline underline-offset-4">Sign out</button>
          </form>
        </div>
      )}
      <main id="main" className="flex-1 pb-24 md:pb-10">
        {children}
      </main>
      <footer className="text-muted-foreground hidden border-t py-6 text-center text-sm md:block">
        {siteName} · Private family history ·{' '}
        {viewer.kind === 'user' ? (
          <form action="/auth/signout" method="post" className="inline">
            <button className="underline underline-offset-4">Sign out</button>
          </form>
        ) : (
          <Link href="/login" className="underline underline-offset-4">
            Sign in
          </Link>
        )}
      </footer>
      <BottomNav nav={nav} />
    </div>
  );
}
