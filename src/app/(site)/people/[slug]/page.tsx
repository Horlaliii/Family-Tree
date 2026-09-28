import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Markdown } from '@/components/markdown';
import { FamilySection } from '@/components/profile/family-section';
import { Gallery } from '@/components/profile/gallery';
import { MissingInfo } from '@/components/profile/missing-info';
import { ProfileHeader } from '@/components/profile/profile-header';
import { Timeline } from '@/components/profile/timeline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buildTimeline, findGaps } from '@/lib/profile';
import { getPhotoThumbUrls, signPaths } from '@/server/media';
import {
  getPersonBySlug,
  getPersonFactsAndSources,
  getPersonFamily,
  getPersonMedia,
  getPersonNames,
  getPlaces,
} from '@/server/queries/people';
import { canEdit, getDb, requireViewer } from '@/server/viewer';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const person = await getPersonBySlug(await getDb(), slug);
  return { title: person?.display_name ?? 'Person' };
}

export default async function PersonPage({ params }: Props) {
  const { slug } = await params;
  const viewer = await requireViewer();
  const db = await getDb();
  const person = await getPersonBySlug(db, slug);
  if (!person?.id) notFound();

  const editor = canEdit(viewer);
  const [names, family, media] = await Promise.all([
    getPersonNames(db, person.id),
    getPersonFamily(db, person.id),
    getPersonMedia(db, person.id),
  ]);
  const { facts, citations, sources } = await getPersonFactsAndSources(
    db,
    person.id,
    family,
    names.map((n) => n.id!),
  );

  const placeIds = [
    person.birth_place_id,
    person.death_place_id,
    person.hometown_place_id,
    ...facts.map((f) => f.place_id),
  ];
  const relatives = [
    ...family.parents,
    ...family.children,
    ...family.siblings,
    ...family.unions.map((u) => u.partner),
  ];
  const sourceMediaIds = Object.values(sources)
    .map((s) => s.media_id)
    .filter((id): id is string => Boolean(id));

  const [places, photos, sourceMedia] = await Promise.all([
    getPlaces(db, placeIds),
    getPhotoThumbUrls(db, [person.profile_photo_id, ...relatives.map((r) => r.photoId)]),
    sourceMediaIds.length
      ? db.from('v_media').select('id, storage_path').in('id', sourceMediaIds)
      : Promise.resolve({ data: [] as { id: string | null; storage_path: string | null }[] }),
  ]);
  const signedDocs = await signPaths((sourceMedia.data ?? []).map((m) => m.storage_path ?? ''));
  const documentUrls: Record<string, string> = {};
  for (const m of sourceMedia.data ?? []) {
    if (m.id && m.storage_path && signedDocs[m.storage_path])
      documentUrls[m.id] = signedDocs[m.storage_path]!;
  }

  const timeline = buildTimeline(person, family, facts, citations, sources);
  const gaps = findGaps(person, family, facts, citations);
  const name = person.display_name ?? 'Unknown';

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
      <ProfileHeader
        person={person}
        names={names}
        places={places}
        photoUrl={person.profile_photo_id ? (photos[person.profile_photo_id] ?? null) : null}
        canEdit={editor}
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          {person.bio && (
            <Card>
              <CardHeader>
                <CardTitle>About {name}</CardTitle>
              </CardHeader>
              <CardContent>
                <Markdown>{person.bio}</Markdown>
              </CardContent>
            </Card>
          )}
          <FamilySection personName={name} slug={slug} family={family} photos={photos} canEdit={editor} />
          <Timeline
            entries={timeline}
            places={places}
            slug={slug}
            canEdit={editor}
            canViewDetails={Boolean(person.can_view_details)}
            documentUrls={documentUrls}
          />
        </div>
        <div className="space-y-6 lg:col-span-2">
          <MissingInfo gaps={gaps} canEdit={editor} />
          <Gallery
            media={media}
            slug={slug}
            canEdit={editor}
            canViewDetails={Boolean(person.can_view_details)}
          />
        </div>
      </div>
    </div>
  );
}
