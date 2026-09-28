import Link from 'next/link';

import { isAdmin, requireRole } from '@/server/viewer';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireRole('editor');
  const links = [
    { href: '/admin/research', label: 'Research' },
    ...(isAdmin(viewer)
      ? [
          { href: '/admin/audit', label: 'Audit log' },
          { href: '/admin/settings', label: 'Settings' },
          { href: '/admin/export', label: 'Download everything' },
        ]
      : []),
  ];
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <nav aria-label="Admin" className="-mx-4 mb-6 overflow-x-auto px-4">
        <ul className="flex gap-2">
          <li>
            <Link
              href="/admin"
              className="bg-muted hover:bg-secondary block rounded-full px-4 py-2 text-sm font-medium"
            >
              Admin
            </Link>
          </li>
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="bg-muted hover:bg-secondary block rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {children}
    </div>
  );
}
