import { Home, Network, Search, ShieldCheck, UserRound, type LucideIcon } from 'lucide-react';

export interface NavState {
  signedIn: boolean;
  canEdit: boolean;
  isAdmin: boolean;
  linkedPersonId: string | null;
}

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (path: string) => boolean;
}

export function navItems(nav: NavState): NavItem[] {
  const items: NavItem[] = [
    { href: '/', label: 'Home', icon: Home, match: (p) => p === '/' },
    { href: '/search', label: 'Search', icon: Search, match: (p) => p.startsWith('/search') },
    { href: '/tree', label: 'Tree', icon: Network, match: (p) => p.startsWith('/tree') },
  ];
  if (nav.isAdmin || nav.canEdit) {
    items.push({ href: '/admin', label: 'Admin', icon: ShieldCheck, match: (p) => p.startsWith('/admin') });
  } else if (!nav.signedIn) {
    items.push({ href: '/login', label: 'Sign in', icon: UserRound, match: (p) => p.startsWith('/login') });
  }
  return items;
}
