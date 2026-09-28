import type { Metadata } from 'next';

import { PasscodeSettings, SiteSettingsForm } from '@/components/admin/settings-forms';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { SearchResult } from '@/lib/types';
import { getGateSettings } from '@/server/passcode';
import { getPersonById, toCard } from '@/server/queries/people';
import { getSiteSettings } from '@/server/settings';
import { getDb, requireRole } from '@/server/viewer';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  await requireRole('admin');
  const db = await getDb();
  const [settings, gate] = await Promise.all([getSiteSettings(), getGateSettings()]);
  const featured = settings.featuredPersonId ? await getPersonById(db, settings.featuredPersonId) : null;
  const featuredResult: SearchResult | null = featured
    ? {
        id: featured.id!,
        slug: featured.slug!,
        displayName: featured.display_name ?? '',
        matchedName: null,
        card: toCard(featured),
        parentNames: [],
      }
    : null;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>The site</CardTitle>
        </CardHeader>
        <CardContent>
          <SiteSettingsForm
            siteName={settings.siteName}
            introMd={settings.introMd ?? ''}
            featured={featuredResult}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Family passcode</CardTitle>
        </CardHeader>
        <CardContent>
          <PasscodeSettings enabled={gate.enabled} />
        </CardContent>
      </Card>
    </div>
  );
}
