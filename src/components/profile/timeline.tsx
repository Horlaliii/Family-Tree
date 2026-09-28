import { BookOpen, FileText, Pencil, Plus } from 'lucide-react';
import Link from 'next/link';

import { ConfidenceBadge } from '@/components/person/confidence-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatFuzzyDate } from '@/lib/dates/fuzzy-date';
import { formatPlace } from '@/lib/places';
import type { TimelineEntry } from '@/lib/profile';
import { SOURCE_TYPE_LABELS, type PlaceRow } from '@/lib/types';

export function Timeline({
  entries,
  places,
  slug,
  canEdit,
  canViewDetails,
  documentUrls,
}: {
  entries: TimelineEntry[];
  places: Record<string, PlaceRow>;
  slug: string;
  canEdit: boolean;
  canViewDetails: boolean;
  documentUrls: Record<string, string>;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle>Life events</CardTitle>
        {canEdit && (
          <Button asChild size="sm" variant="outline">
            <Link href={`/people/${slug}/facts`}>
              <Plus /> Add or edit
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {!canViewDetails ? (
          <p className="text-muted-foreground text-sm">Life events of living people are private.</p>
        ) : entries.length === 0 ? (
          <p className="text-muted-foreground text-sm">No life events recorded yet.</p>
        ) : (
          <ol className="border-accent/40 relative ml-2 space-y-5 border-l-2 pl-5">
            {entries.map((e) => {
              const place = e.placeId ? formatPlace(places[e.placeId]) : null;
              return (
                <li key={e.key} className="relative">
                  <span
                    className="bg-accent border-background absolute top-1.5 -left-[1.72rem] size-3 rounded-full border-2"
                    aria-hidden
                  />
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="text-muted-foreground text-sm font-medium">
                      {formatFuzzyDate(e.date, { unknown: 'Date unknown' })}
                    </span>
                    <ConfidenceBadge confidence={e.confidence} />
                  </div>
                  <p className="font-semibold">{e.title}</p>
                  {place && <p className="text-sm">{place}</p>}
                  {e.description && <p className="text-muted-foreground text-sm">{e.description}</p>}
                  {e.citations.length > 0 ? (
                    <ul className="mt-2 space-y-1">
                      {e.citations.map((c) => {
                        const url = c.source.media_id ? documentUrls[c.source.media_id] : undefined;
                        return (
                          <li key={c.id} className="bg-muted/60 rounded-md px-2 py-1.5 text-sm">
                            <span className="inline-flex items-start gap-1.5">
                              <BookOpen className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
                              <span>
                                <span className="font-medium">{c.source.title}</span>{' '}
                                <span className="text-muted-foreground">
                                  ({SOURCE_TYPE_LABELS[c.source.source_type!]}
                                  {c.source.informant ? `, told by ${c.source.informant}` : ''})
                                </span>
                                {c.detail && <span className="text-muted-foreground block">{c.detail}</span>}
                                {url && (
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-primary inline-flex items-center gap-1 underline underline-offset-4"
                                  >
                                    <FileText className="size-3.5" /> View document
                                  </a>
                                )}
                              </span>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    e.kind === 'fact' && (
                      <p className="text-muted-foreground mt-1 text-xs italic">No source yet</p>
                    )
                  )}
                  {canEdit && e.factId && (
                    <Link
                      href={`/people/${slug}/facts?edit=${e.factId}`}
                      className="text-primary mt-1 inline-flex items-center gap-1 text-sm underline-offset-4 hover:underline"
                    >
                      <Pencil className="size-3.5" /> Edit
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
