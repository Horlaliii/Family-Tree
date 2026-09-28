import { Download, History, Plus, Search, Settings } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { isAdmin, requireRole } from '@/server/viewer';

export const metadata: Metadata = { title: 'Admin' };

export default async function AdminPage() {
  const viewer = await requireRole('editor');
  const sections = [
    { href: '/people/new', icon: Plus, title: 'Add a person', text: 'Start a new branch of the tree.' },
    {
      href: '/admin/research',
      icon: Search,
      title: 'Research',
      text: 'People with missing parents, dates or sources — what to find out next.',
    },
    ...(isAdmin(viewer)
      ? [
          {
            href: '/admin/audit',
            icon: History,
            title: 'Audit log',
            text: 'Every change, who made it and when. Restore removed people.',
          },
          {
            href: '/admin/settings',
            icon: Settings,
            title: 'Settings',
            text: 'Family name, welcome text, featured ancestor and the family passcode.',
          },
          {
            href: '/admin/export',
            icon: Download,
            title: 'Download everything',
            text: 'A full copy of the data and all photos, for safekeeping.',
          },
        ]
      : []),
  ];
  return (
    <div>
      <h1 className="text-3xl font-semibold">Admin</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {sections.map((s) => (
          <Link key={s.href} href={s.href} className="group">
            <Card className="group-hover:border-primary/50 h-full transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <s.icon className="text-primary size-5" aria-hidden /> {s.title}
                </CardTitle>
                <CardDescription>{s.text}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
