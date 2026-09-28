'use client';

import { Loader2, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';

import { Input } from '@/components/ui/input';
import { formatLifeYears } from '@/lib/dates/fuzzy-date';
import { cn } from '@/lib/utils';

import { usePersonSearch } from './use-person-search';

export function SearchBox({
  compact = false,
  defaultValue = '',
  autoFocus = false,
}: {
  compact?: boolean;
  defaultValue?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const { results, loading } = usePersonSearch(open ? query : '');
  const listId = useId();

  function go(slug: string) {
    setOpen(false);
    router.push(`/people/${slug}`);
  }

  return (
    <form
      role="search"
      className="relative"
      onSubmit={(e) => {
        e.preventDefault();
        const chosen = active >= 0 ? results[active] : undefined;
        if (chosen) return go(chosen.slug);
        setOpen(false);
        router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      }}
    >
      <label htmlFor={`${listId}-input`} className="sr-only">
        Search the family by name
      </label>
      <Search
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2"
        aria-hidden
      />
      <Input
        id={`${listId}-input`}
        type="search"
        value={query}
        autoFocus={autoFocus}
        autoComplete="off"
        placeholder={compact ? 'Search names…' : 'Search by any name — birth, day, baptismal…'}
        className={cn('pl-10', compact ? 'h-10' : 'h-12 text-lg')}
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls={listId}
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, results.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, -1));
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
      />
      {loading && (
        <Loader2 className="text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin" />
      )}
      {open && results.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="bg-popover absolute inset-x-0 top-full z-50 mt-1 max-h-96 overflow-y-auto rounded-lg border p-1 shadow-lg"
        >
          {results.map((r, i) => (
            <li
              key={r.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={cn('cursor-pointer rounded-md px-3 py-2', i === active && 'bg-muted')}
              onMouseDown={(e) => {
                e.preventDefault();
                go(r.slug);
              }}
            >
              <span className="block font-medium">{r.displayName}</span>
              <span className="text-muted-foreground block text-sm">
                {[
                  r.matchedName ? `also ${r.matchedName}` : null,
                  formatLifeYears(r.card) || null,
                  r.parentNames.length ? `child of ${r.parentNames.join(' & ')}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
