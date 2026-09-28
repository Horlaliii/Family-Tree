import type { Metadata } from 'next';
import Link from 'next/link';

import { PersonLink } from '@/components/person/person-link';
import { SearchBox } from '@/components/search/search-box';
import { Button } from '@/components/ui/button';
import { getPhotoThumbUrls } from '@/server/media';
import { searchPeople } from '@/server/queries/people';
import { canEdit, getDb, requireViewer } from '@/server/viewer';

export const metadata: Metadata = { title: 'Search' };

const PAGE_SIZE = 20;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const viewer = await requireViewer();
  const db = await getDb();
  const { q = '', page = '1' } = await searchParams;
  const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
  const { results, total } = await searchPeople(db, q, {
    limit: PAGE_SIZE,
    offset: (pageNumber - 1) * PAGE_SIZE,
  });
  const photos = await getPhotoThumbUrls(
    db,
    results.map((r) => r.card.photoId),
  );
  const pages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-3xl font-semibold">Search</h1>
      <p className="text-muted-foreground mt-1">
        Try any name someone was known by. Close spellings work too.
      </p>
      <div className="mt-4">
        <SearchBox defaultValue={q} autoFocus={!q} />
      </div>

      {q.trim().length >= 2 && (
        <section className="mt-6" aria-live="polite">
          <p className="text-muted-foreground text-sm">
            {total === 0 ? `No one found for “${q}”.` : `${total} ${total === 1 ? 'person' : 'people'} found`}
          </p>
          <ul className="bg-card mt-2 divide-y rounded-xl border">
            {results.map((r) => (
              <li key={r.id}>
                <PersonLink
                  person={r.card}
                  photoUrl={r.card.photoId ? photos[r.card.photoId] : null}
                  className="rounded-none px-3 py-3"
                  note={
                    <>
                      {r.matchedName && <>also known as {r.matchedName}</>}
                      {r.matchedName && r.parentNames.length > 0 && ' · '}
                      {r.parentNames.length > 0 && <>child of {r.parentNames.join(' & ')}</>}
                    </>
                  }
                />
              </li>
            ))}
          </ul>
          {pages > 1 && (
            <nav aria-label="Pages" className="mt-4 flex items-center justify-between">
              {pageNumber > 1 ? (
                <Button asChild variant="outline">
                  <Link href={`/search?q=${encodeURIComponent(q)}&page=${pageNumber - 1}`}>Previous</Link>
                </Button>
              ) : (
                <span />
              )}
              <span className="text-muted-foreground text-sm">
                Page {pageNumber} of {pages}
              </span>
              {pageNumber < pages ? (
                <Button asChild variant="outline">
                  <Link href={`/search?q=${encodeURIComponent(q)}&page=${pageNumber + 1}`}>Next</Link>
                </Button>
              ) : (
                <span />
              )}
            </nav>
          )}
          {total === 0 && canEdit(viewer) && (
            <Button asChild className="mt-4">
              <Link href="/people/new">Add a new person</Link>
            </Button>
          )}
        </section>
      )}
    </div>
  );
}
