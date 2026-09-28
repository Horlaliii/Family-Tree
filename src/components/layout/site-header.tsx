import Link from 'next/link';

import { SearchBox } from '@/components/search/search-box';

import { HeaderNav } from './header-nav';
import type { NavState } from './nav-items';
import { ThemeToggle } from './theme-toggle';

export function SiteHeader({ siteName, nav }: { siteName: string; nav: NavState }) {
  return (
    <header className="bg-background/95 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" width={32} height={32} className="size-8 shrink-0 rounded-lg" />
          <span className="truncate font-serif text-lg font-semibold">{siteName}</span>
        </Link>
        <div className="ml-auto hidden w-full max-w-xs md:block">
          <SearchBox compact />
        </div>
        <HeaderNav nav={nav} />
        <ThemeToggle />
      </div>
      <div className="kente-band h-1 opacity-80" aria-hidden />
    </header>
  );
}
