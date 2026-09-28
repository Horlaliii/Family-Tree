import { Download, FileText } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import { MediaEditor } from '@/components/media/media-editor';
import { Button } from '@/components/ui/button';
import { formatFuzzyDate, fuzzyDateFromRow, fuzzyDateToFields } from '@/lib/dates/fuzzy-date';
import { withSignedUrls } from '@/server/media';
import { canEdit, getDb, requireViewer } from '@/server/viewer';

export const metadata: Metadata = { title: 'Photo' };

export default async function MediaPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireViewer();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const db = await getDb();

  // v_media decides whether this viewer may see it at all.
  const { data: row } = await db.from('v_media').select('*').eq('id', id).maybeSingle();
  if (!row) notFound();
  const [media] = await withSignedUrls([row]);
  if (!media) notFound();

  const { data: tags } = await db.from('v_media_people').select('person_id').eq('media_id', id);
  const personIds = (tags ?? []).map((t) => t.person_id!);
  const { data: people } = personIds.length
    ? await db.from('v_persons').select('id, slug, display_name, profile_photo_id').in('id', personIds)
    : { data: [] };

  const date = fuzzyDateFromRow(media, 'media');
  const isPhoto = media.media_type === 'photo';
  const title = media.caption ?? media.original_filename ?? (isPhoto ? 'Family photo' : 'Document');

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {(date.date || date.text) && <p className="text-muted-foreground">{formatFuzzyDate(date)}</p>}
        {people && people.length > 0 && (
          <p className="mt-1 text-sm">
            With{' '}
            {people.map((p, i) => (
              <span key={p.id}>
                {i > 0 && ', '}
                <Link href={`/people/${p.slug}`} className="text-primary underline underline-offset-4">
                  {p.display_name}
                </Link>
              </span>
            ))}
          </p>
        )}
      </div>

      {isPhoto && media.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={media.url}
          alt={title}
          width={media.width ?? undefined}
          height={media.height ?? undefined}
          className="bg-muted mx-auto max-h-[75dvh] w-auto rounded-xl border object-contain"
        />
      ) : (
        <div className="bg-card flex flex-col items-center gap-3 rounded-xl border p-8 text-center">
          <FileText className="text-primary size-12" aria-hidden />
          <p className="font-medium">{media.original_filename ?? 'Document'}</p>
        </div>
      )}
      {media.url && (
        <Button asChild variant="outline">
          <a href={media.url} target="_blank" rel="noreferrer">
            <Download /> Open full size
          </a>
        </Button>
      )}

      {canEdit(viewer) && (
        <MediaEditor
          mediaId={id}
          isPhoto={isPhoto}
          caption={media.caption ?? ''}
          date={fuzzyDateToFields(date)}
          tagged={(people ?? []).map((p) => ({
            id: p.id!,
            slug: p.slug!,
            name: p.display_name ?? 'Unknown',
            isProfilePhoto: p.profile_photo_id === id,
          }))}
        />
      )}
    </div>
  );
}
