'use client';

import { TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

import { formatLifeYears } from '@/lib/dates/fuzzy-date';
import type { PersonCard } from '@/lib/types';
import type { PersonFormInput } from '@/lib/validation/person';
import { findDuplicates } from '@/server/actions/people';

/** Warns when someone with a similar name and birth year is already in the tree. */
export function DuplicateWarning({
  excludeId = null,
  onUseExisting,
}: {
  excludeId?: string | null;
  onUseExisting?: (person: PersonCard) => void;
}) {
  const { control } = useFormContext<PersonFormInput>();
  const names = useWatch({ control, name: 'names' });
  const primaryIndex = Number(useWatch({ control, name: 'primaryIndex' }) ?? 0);
  const birthYear = useWatch({ control, name: 'birth.year' });
  const [matches, setMatches] = useState<PersonCard[]>([]);

  const primary = names?.[primaryIndex] ?? names?.[0];
  const given = primary?.given_names?.trim() ?? '';
  const surname = primary?.surname?.trim() ?? '';
  const year = /^\d{4}$/.test(birthYear ?? '') ? Number(birthYear) : null;

  useEffect(() => {
    if ((given + surname).length < 3) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const found = await findDuplicates(given, surname, year, excludeId);
      if (!cancelled) setMatches(found);
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [given, surname, year, excludeId]);

  if ((given + surname).length < 3 || matches.length === 0) return null;

  return (
    <div role="status" className="border-warning/40 bg-warning/8 rounded-xl border p-4">
      <p className="flex items-center gap-2 font-medium">
        <TriangleAlert className="text-warning size-5" aria-hidden />
        Is this someone already in the tree?
      </p>
      <ul className="mt-2 space-y-2">
        {matches.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span>
              <Link
                href={`/people/${m.slug}`}
                target="_blank"
                className="font-medium underline underline-offset-4"
              >
                {m.name}
              </Link>{' '}
              <span className="text-muted-foreground">{formatLifeYears(m)}</span>
            </span>
            {onUseExisting && (
              <button
                type="button"
                className="text-primary font-medium underline-offset-4 hover:underline"
                onClick={() => onUseExisting(m)}
              >
                Use this person instead
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
