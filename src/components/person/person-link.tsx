import Link from 'next/link';

import { formatLifeYears } from '@/lib/dates/fuzzy-date';
import type { PersonCard } from '@/lib/types';
import { cn } from '@/lib/utils';

import { PersonAvatar } from './person-avatar';

/** A tappable row for a person: avatar, name and life years. */
export function PersonLink({
  person,
  photoUrl,
  note,
  badge,
  className,
}: {
  person: PersonCard;
  photoUrl?: string | null;
  note?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}) {
  const years = formatLifeYears(person);
  return (
    <Link
      href={`/people/${person.slug}`}
      className={cn(
        'hover:bg-muted focus-visible:bg-muted flex min-h-14 items-center gap-3 rounded-lg p-2 transition-colors',
        className,
      )}
    >
      <PersonAvatar name={person.name} url={photoUrl} sex={person.sex} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium">{person.name}</span>
          {badge}
        </span>
        {(years || note) && (
          <span className="text-muted-foreground block text-sm">
            {years}
            {years && note ? ' · ' : ''}
            {note}
          </span>
        )}
      </span>
    </Link>
  );
}
