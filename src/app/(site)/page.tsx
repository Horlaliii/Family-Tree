import { ArrowRight, Network, Plus, Users } from 'lucide-react';
import Link from 'next/link';

import { Markdown } from '@/components/markdown';
import { PersonAvatar } from '@/components/person/person-avatar';
import { PersonLink } from '@/components/person/person-link';
import { SearchBox } from '@/components/search/search-box';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatLifeYears } from '@/lib/dates/fuzzy-date';
import { getPhotoThumbUrls } from '@/server/media';
import { getPersonById, getRecentPeople, getSiteStats, toCard } from '@/server/queries/people';
import { getSiteSettings } from '@/server/settings';
import { canEdit, getDb, requireViewer } from '@/server/viewer';

export default async function HomePage() {
  const viewer = await requireViewer();
  const db = await getDb();
  const settings = await getSiteSettings();

  const [stats, recent, featured] = await Promise.all([
    getSiteStats(db),
    getRecentPeople(db, 6),
    settings.featuredPersonId ? getPersonById(db, settings.featuredPersonId) : null,
  ]);
  const photos = await getPhotoThumbUrls(db, [
    featured?.profile_photo_id,
    ...recent.map((p) => p.profile_photo_id),
  ]);
  const featuredCard = featured ? toCard(featured) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
      <section className="kente-pattern -mx-4 rounded-none px-4 py-8 sm:mx-0 sm:rounded-2xl sm:px-8">
        <h1 className="text-4xl font-semibold text-balance sm:text-5xl">{settings.siteName}</h1>
        {settings.introMd ? (
          <Markdown className="text-muted-foreground mt-4 max-w-2xl text-lg">{settings.introMd}</Markdown>
        ) : (
          <p className="text-muted-foreground mt-4 max-w-2xl text-lg">
            Our family&apos;s story, one person at a time.
          </p>
        )}
        <div className="mt-6 max-w-xl">
          <SearchBox />
        </div>
      </section>

      {stats.people === 0 ? (
        <Card className="mt-8">
          <CardContent className="py-10 text-center">
            <Users className="text-accent mx-auto size-10" />
            <p className="mt-3 text-lg font-medium">The tree is waiting for its first person.</p>
            {canEdit(viewer) && (
              <Button asChild className="mt-4">
                <Link href="/people/new">
                  <Plus /> Add the first person
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-5">
          {featuredCard && (
            <Card className="md:col-span-3">
              <CardHeader>
                <p className="text-accent text-sm font-medium tracking-wide uppercase">
                  Start exploring from
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <PersonAvatar
                    name={featuredCard.name}
                    url={featuredCard.photoId ? photos[featuredCard.photoId] : null}
                    sex={featuredCard.sex}
                    size="lg"
                  />
                  <div className="min-w-0">
                    <h2 className="text-2xl font-semibold">{featuredCard.name}</h2>
                    <p className="text-muted-foreground">{formatLifeYears(featuredCard)}</p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button asChild>
                    <Link href={`/tree?focus=${featuredCard.slug}`}>
                      <Network /> See the tree
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/people/${featuredCard.slug}`}>
                      Read about {featuredCard.name.split(' ').find((w) => w !== 'Nana') ?? featuredCard.name}
                      <ArrowRight />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className={featuredCard ? 'md:col-span-2' : 'md:col-span-5'}>
            <CardHeader>
              <CardTitle>The family so far</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4">
                <Stat label="People" value={stats.people} />
                <Stat label="Generations" value={stats.generations} />
                <Stat label="Photos" value={stats.photos} />
                <Stat label="Documents" value={stats.documents} />
              </dl>
            </CardContent>
          </Card>

          <Card className="md:col-span-5">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Recently added</CardTitle>
              {canEdit(viewer) && (
                <Button asChild size="sm" variant="outline">
                  <Link href="/people/new">
                    <Plus /> Add person
                  </Link>
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <ul className="grid gap-1 sm:grid-cols-2">
                {recent.map((p) => {
                  const card = toCard(p);
                  return (
                    <li key={card.id}>
                      <PersonLink person={card} photoUrl={card.photoId ? photos[card.photoId] : null} />
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-muted/60 rounded-lg p-3">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="font-serif text-3xl font-semibold">{value}</dd>
    </div>
  );
}
