import { FileText, ImagePlus } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatFuzzyDate, fuzzyDateFromRow } from '@/lib/dates/fuzzy-date';
import type { SignedMedia } from '@/server/media';

export function Gallery({
  media,
  slug,
  canEdit,
  canViewDetails,
}: {
  media: SignedMedia[];
  slug: string;
  canEdit: boolean;
  canViewDetails: boolean;
}) {
  const photos = media.filter((m) => m.media_type === 'photo');
  const documents = media.filter((m) => m.media_type === 'document');

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle>Photos and documents</CardTitle>
        {canEdit && (
          <Button asChild size="sm" variant="outline">
            <Link href={`/people/${slug}/media`}>
              <ImagePlus /> Add
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {media.length === 0 && (
          <p className="text-muted-foreground text-sm">
            {canViewDetails ? 'No photos or documents yet.' : 'Photos of living people are private.'}
          </p>
        )}
        {photos.length > 0 && (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/media/${m.id}`}
                  className="bg-muted block aspect-square overflow-hidden rounded-lg"
                >
                  {m.thumbUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.thumbUrl}
                      alt={m.caption ?? 'Family photo'}
                      loading="lazy"
                      decoding="async"
                      className="size-full object-cover"
                    />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
        {documents.length > 0 && (
          <ul className="divide-y rounded-lg border">
            {documents.map((m) => {
              const date = fuzzyDateFromRow(m, 'media');
              return (
                <li key={m.id}>
                  <Link href={`/media/${m.id}`} className="hover:bg-muted flex items-center gap-3 p-3">
                    <FileText className="text-primary size-6 shrink-0" aria-hidden />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {m.caption ?? m.original_filename ?? 'Document'}
                      </span>
                      {(date.date || date.text) && (
                        <span className="text-muted-foreground block text-sm">{formatFuzzyDate(date)}</span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
