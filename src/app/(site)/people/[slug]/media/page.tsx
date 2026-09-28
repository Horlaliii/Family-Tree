import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Uploader } from '@/components/media/uploader';
import { Gallery } from '@/components/profile/gallery';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getPersonBySlug, getPersonMedia } from '@/server/queries/people';
import { getDb, requireRole } from '@/server/viewer';

export const metadata: Metadata = { title: 'Photos and documents' };

export default async function PersonMediaPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireRole('editor');
  const { slug } = await params;
  const db = await getDb();
  const person = await getPersonBySlug(db, slug);
  if (!person?.id) notFound();
  const media = await getPersonMedia(db, person.id);
  const name = person.display_name ?? 'this person';

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <div>
        <Link href={`/people/${slug}`} className="text-primary text-sm underline-offset-4 hover:underline">
          ← Back to {name}
        </Link>
        <h1 className="mt-2 text-3xl font-semibold">Photos and documents</h1>
        <p className="text-muted-foreground mt-1">
          Uploads are tagged with {name}. Open a photo to tag others or make it a profile photo.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Add</CardTitle>
        </CardHeader>
        <CardContent>
          <Uploader personId={person.id} personName={name} />
        </CardContent>
      </Card>
      <Gallery media={media} slug={slug} canEdit={false} canViewDetails />
    </div>
  );
}
