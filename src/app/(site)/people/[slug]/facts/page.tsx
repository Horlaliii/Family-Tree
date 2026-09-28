import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CitationManager, type CitationView, type DocumentOption } from '@/components/forms/citation-manager';
import { FactForm } from '@/components/forms/fact-form';
import { ConfidenceBadge } from '@/components/person/confidence-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatFuzzyDate, fuzzyDateFromRow, fuzzyDateToFields } from '@/lib/dates/fuzzy-date';
import { formatPlace } from '@/lib/places';
import { FACT_TYPE_LABELS, type CitationRow, type SourceRow } from '@/lib/types';
import { toPlaceOptions } from '@/server/queries/forms';
import {
  getPersonBySlug,
  getPersonFactsAndSources,
  getPersonFamily,
  getPersonMedia,
  getPlaces,
} from '@/server/queries/people';
import { getDb, requireRole } from '@/server/viewer';

export const metadata: Metadata = { title: 'Life events and sources' };

function views(
  citations: CitationRow[],
  sources: Record<string, SourceRow>,
  match: (c: CitationRow) => boolean,
): CitationView[] {
  return citations.filter(match).flatMap((c) => {
    const s = c.source_id ? sources[c.source_id] : undefined;
    return s && c.id
      ? [{ id: c.id, detail: c.detail, title: s.title!, sourceType: s.source_type!, informant: s.informant }]
      : [];
  });
}

export default async function FactsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  await requireRole('editor');
  const { slug } = await params;
  const { edit } = await searchParams;
  const db = await getDb();
  const person = await getPersonBySlug(db, slug);
  if (!person?.id) notFound();

  const family = await getPersonFamily(db, person.id);
  const [{ facts, citations, sources }, media] = await Promise.all([
    getPersonFactsAndSources(db, person.id, family, []),
    getPersonMedia(db, person.id),
  ]);
  const places = toPlaceOptions(
    await getPlaces(
      db,
      facts.map((f) => f.place_id),
    ),
  );
  const documents: DocumentOption[] = media.map((m) => ({
    id: m.id!,
    label: m.caption ?? m.original_filename ?? (m.media_type === 'photo' ? 'Photo' : 'Document'),
  }));
  const sorted = [...facts].sort((a, b) => (a.fact_date ?? '9999').localeCompare(b.fact_date ?? '9999'));
  const birth = fuzzyDateFromRow(person, 'birth');
  const death = fuzzyDateFromRow(person, 'death');

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <div>
        <Link href={`/people/${slug}`} className="text-primary text-sm underline-offset-4 hover:underline">
          ← Back to {person.display_name}
        </Link>
        <h1 className="mt-2 text-3xl font-semibold">Life events and sources</h1>
        <p className="text-muted-foreground mt-1">
          Record what happened in {person.display_name}&apos;s life, how sure we are, and where we learned it.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Birth and death</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <p>
              <span className="font-medium">Born:</span> {formatFuzzyDate(birth)}{' '}
              <ConfidenceBadge confidence={person.birth_confidence} />
            </p>
            <CitationManager
              target={{ kind: 'birth', personId: person.id }}
              citations={views(
                citations,
                sources,
                (c) => c.person_id === person.id && c.person_field === 'birth',
              )}
              documents={documents}
              label="the birth"
            />
          </div>
          {!person.is_living && (
            <div className="space-y-2">
              <p>
                <span className="font-medium">Died:</span> {formatFuzzyDate(death)}{' '}
                <ConfidenceBadge confidence={person.death_confidence} />
              </p>
              <CitationManager
                target={{ kind: 'death', personId: person.id }}
                citations={views(
                  citations,
                  sources,
                  (c) => c.person_id === person.id && c.person_field === 'death',
                )}
                documents={documents}
                label="the death"
              />
            </div>
          )}
          <p className="text-muted-foreground text-sm">
            To change the dates themselves,{' '}
            <Link href={`/people/${slug}/edit`} className="text-primary underline underline-offset-4">
              edit {person.display_name}
            </Link>
            .
          </p>
        </CardContent>
      </Card>

      {sorted.map((f) => {
        const date = fuzzyDateFromRow(f, 'fact');
        const title = f.fact_type === 'custom' ? f.custom_label : FACT_TYPE_LABELS[f.fact_type!];
        const place = f.place_id ? places[f.place_id] : null;
        return (
          <Card key={f.id} id={`fact-${f.id}`}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2">
                {title} <ConfidenceBadge confidence={f.confidence} />
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                {formatFuzzyDate(date, { unknown: 'Date unknown' })}
                {place && ` · ${formatPlace(place)}`}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <details open={edit === f.id} className="rounded-lg border p-3">
                <summary className="cursor-pointer font-medium">Edit this event</summary>
                <div className="mt-3">
                  <FactForm
                    personId={person.id!}
                    factId={f.id}
                    place={place}
                    defaultValues={{
                      factType: f.fact_type!,
                      customLabel: f.custom_label ?? '',
                      date: fuzzyDateToFields(date),
                      placeId: f.place_id,
                      description: f.description ?? '',
                      confidence: f.confidence!,
                    }}
                  />
                </div>
              </details>
              <div>
                <h3 className="mb-2 text-sm font-semibold">Sources</h3>
                <CitationManager
                  target={{ kind: 'fact', factId: f.id! }}
                  citations={views(citations, sources, (c) => c.fact_id === f.id)}
                  documents={documents}
                  label={title ?? 'this event'}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardHeader>
          <CardTitle>Add a life event</CardTitle>
        </CardHeader>
        <CardContent>
          <FactForm personId={person.id} />
        </CardContent>
      </Card>
    </div>
  );
}
