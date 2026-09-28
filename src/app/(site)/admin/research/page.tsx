import type { Metadata } from 'next';
import Link from 'next/link';

import { PersonLink } from '@/components/person/person-link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { PersonCard } from '@/lib/types';
import { cn } from '@/lib/utils';
import { getDb, requireRole } from '@/server/viewer';

export const metadata: Metadata = { title: 'Research' };

const FILTERS = [
  { value: 'any', label: 'Any gap' },
  { value: 'missing_parents', label: 'Missing a parent' },
  { value: 'missing_father', label: 'No father' },
  { value: 'missing_mother', label: 'No mother' },
  { value: 'missing_dates', label: 'Missing dates' },
  { value: 'unsourced', label: 'No sources' },
] as const;

const SORTS = [
  { value: 'gaps', label: 'Most gaps' },
  { value: 'name', label: 'Name' },
  { value: 'birth', label: 'Oldest first' },
  { value: 'recent', label: 'Recently added' },
] as const;

const PAGE_SIZE = 30;

export default async function ResearchPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; sort?: string; page?: string }>;
}) {
  await requireRole('editor');
  const sp = await searchParams;
  const filter = FILTERS.find((f) => f.value === sp.filter)?.value ?? 'any';
  const sort = SORTS.find((s) => s.value === sp.sort)?.value ?? 'gaps';
  const page = Math.max(1, Number.parseInt(sp.page ?? '1', 10) || 1);
  const db = await getDb();
  const { data, error } = await db.rpc('research_gaps', {
    p_filter: filter,
    p_sort: sort,
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  });
  if (error) throw error;
  const rows = data ?? [];
  const total = Number(rows[0]?.total_count ?? 0);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (over: Record<string, string | number>) => {
    const params = new URLSearchParams({ filter, sort, page: String(page), ...over } as Record<
      string,
      string
    >);
    return `/admin/research?${params}`;
  };

  return (
    <div>
      <h1 className="text-3xl font-semibold">What to research next</h1>
      <p className="text-muted-foreground mt-1">
        {total} {total === 1 ? 'person has' : 'people have'} gaps in their records.
      </p>

      <div className="mt-5 space-y-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Show">
          {FILTERS.map((f) => (
            <Link
              key={f.value}
              href={href({ filter: f.value, page: 1 })}
              aria-current={filter === f.value ? 'true' : undefined}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm',
                filter === f.value ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted',
              )}
            >
              {f.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm" role="group" aria-label="Sort by">
          <span className="text-muted-foreground">Sort:</span>
          {SORTS.map((s) => (
            <Link
              key={s.value}
              href={href({ sort: s.value, page: 1 })}
              aria-current={sort === s.value ? 'true' : undefined}
              className={cn(
                'rounded-md px-2 py-1',
                sort === s.value ? 'bg-secondary font-medium' : 'hover:bg-muted',
              )}
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      <ul className="bg-card mt-5 divide-y rounded-xl border">
        {rows.length === 0 && (
          <li className="text-muted-foreground p-6 text-center">Nothing to research here. Well done!</li>
        )}
        {rows.map((r) => {
          const card = r.card as unknown as PersonCard;
          return (
            <li key={card.id} className="flex flex-col gap-2 p-2 sm:flex-row sm:items-center">
              <PersonLink person={card} className="flex-1" />
              <div className="flex flex-wrap gap-1.5 px-2 pb-2 sm:pb-0">
                {r.missing_father && (
                  <Link href={`/people/${card.slug}/add/father`}>
                    <Badge variant="warning">No father</Badge>
                  </Link>
                )}
                {r.missing_mother && (
                  <Link href={`/people/${card.slug}/add/mother`}>
                    <Badge variant="warning">No mother</Badge>
                  </Link>
                )}
                {r.missing_birth && <Badge variant="outline">No birth date</Badge>}
                {r.missing_death && <Badge variant="outline">No death date</Badge>}
                {r.unsourced_facts > 0 && (
                  <Link href={`/people/${card.slug}/facts`}>
                    <Badge variant="accent">
                      {r.unsourced_facts} unsourced {r.unsourced_facts === 1 ? 'event' : 'events'}
                    </Badge>
                  </Link>
                )}
                {r.unsourced_vitals && (
                  <Link href={`/people/${card.slug}/facts`}>
                    <Badge variant="accent">Dates unsourced</Badge>
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {pages > 1 && (
        <nav aria-label="Pages" className="mt-4 flex items-center justify-between">
          {page > 1 ? (
            <Button asChild variant="outline">
              <Link href={href({ page: page - 1 })}>Previous</Link>
            </Button>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground text-sm">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Button asChild variant="outline">
              <Link href={href({ page: page + 1 })}>Next</Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
