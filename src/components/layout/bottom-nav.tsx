'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

import { navItems, type NavState } from './nav-items';

/** Big, thumb-friendly navigation for phones. */
export function BottomNav({ nav }: { nav: NavState }) {
  const pathname = usePathname();
  const items = navItems(nav);

  return (
    <nav
      aria-label="Main"
      className="pb-safe bg-card/95 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur md:hidden"
    >
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium',
                  active ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <Icon className="size-6" aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
