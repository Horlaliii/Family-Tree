import { Lock, Network, Pencil } from 'lucide-react';
import Link from 'next/link';

import { PersonAvatar } from '@/components/person/person-avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatFuzzyDate, fuzzyDateFromRow } from '@/lib/dates/fuzzy-date';
import { formatPlace } from '@/lib/places';
import { NAME_TYPE_LABELS, type PersonNameRow, type PersonRow, type PlaceRow } from '@/lib/types';
import { firstName } from '@/lib/utils';

export function ProfileHeader({
  person,
  names,
  places,
  photoUrl,
  canEdit,
}: {
  person: PersonRow;
  names: PersonNameRow[];
  places: Record<string, PlaceRow>;
  photoUrl: string | null;
  canEdit: boolean;
}) {
  const name = person.display_name ?? 'Unknown';
  const otherNames = names.filter((n) => !n.is_primary);
  const birth = fuzzyDateFromRow(person, 'birth');
  const death = fuzzyDateFromRow(person, 'death');
  const birthPlace = person.birth_place_id ? formatPlace(places[person.birth_place_id]) : null;
  const deathPlace = person.death_place_id ? formatPlace(places[person.death_place_id]) : null;
  const hometown = person.hometown_place_id ? formatPlace(places[person.hometown_place_id]) : null;
  const hasBirth = Boolean(birth.date || birth.text || birthPlace);
  const hasDeath = !person.is_living && Boolean(death.date || death.text || deathPlace);

  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-start">
      <PersonAvatar name={name} url={photoUrl} sex={person.sex} size="xl" className="mx-auto sm:mx-0" />
      <div className="min-w-0 flex-1 text-center sm:text-left">
        <h1 className="text-3xl font-semibold text-balance sm:text-4xl">{name}</h1>

        {otherNames.length > 0 && (
          <p className="text-muted-foreground mt-1">
            Also known as{' '}
            {otherNames.map((n, i) => (
              <span key={n.id}>
                {i > 0 && ', '}
                <span className="text-foreground">
                  {[n.title, n.given_names, n.surname].filter(Boolean).join(' ')}
                </span>{' '}
                <span className="text-sm">({NAME_TYPE_LABELS[n.name_type!].toLowerCase()})</span>
              </span>
            ))}
          </p>
        )}

        <dl className="mt-3 space-y-1 text-base">
          {hasBirth && (
            <div>
              <dt className="inline font-medium">Born </dt>
              <dd className="inline">
                {birth.date || birth.text ? formatFuzzyDate(birth) : 'date unknown'}
                {birthPlace && <> in {birthPlace}</>}
              </dd>
            </div>
          )}
          {hasDeath && (
            <div>
              <dt className="inline font-medium">Died </dt>
              <dd className="inline">
                {death.date || death.text ? formatFuzzyDate(death) : 'date unknown'}
                {deathPlace && <> in {deathPlace}</>}
              </dd>
            </div>
          )}
          {!person.is_living && !hasDeath && <p className="text-muted-foreground">Deceased</p>}
        </dl>

        {(person.clan || person.totem || hometown || person.occupation) && (
          <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
            {hometown && <Badge variant="secondary">Hometown: {hometown}</Badge>}
            {person.clan && <Badge variant="accent">Clan: {person.clan}</Badge>}
            {person.totem && <Badge variant="accent">Totem: {person.totem}</Badge>}
            {person.occupation && <Badge variant="outline">{person.occupation}</Badge>}
          </div>
        )}

        {!person.can_view_details && (
          <p className="bg-muted text-muted-foreground mt-4 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm">
            <Lock className="size-4 shrink-0" aria-hidden />
            {firstName(name)} is living, so their details are private. Family members can{' '}
            <Link href="/login" className="text-primary underline underline-offset-4">
              sign in
            </Link>{' '}
            to see more.
          </p>
        )}

        <div className="mt-5 flex flex-wrap justify-center gap-2 sm:justify-start">
          <Button asChild>
            <Link href={`/tree?focus=${person.slug}`}>
              <Network /> View in tree
            </Link>
          </Button>
          {canEdit && (
            <Button asChild variant="outline">
              <Link href={`/people/${person.slug}/edit`}>
                <Pencil /> Edit
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
