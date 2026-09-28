'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

import { navItems, type NavState } from './nav-items';

export function HeaderNav({ nav }: { nav: NavState }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="ml-auto hidden md:ml-0 md:block">
      <ul className="flex items-center gap-1">
        {navItems(nav)
          .filter((item) => item.href !== '/search')
          .map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={item.match(pathname) ? 'page' : undefined}
                className={cn(
                  'hover:bg-muted rounded-md px-3 py-2 text-sm font-medium',
                  item.match(pathname) ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {item.label}
              </Link>
            </li>
          ))}
      </ul>
    </nav>
  );
}
