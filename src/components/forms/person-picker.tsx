'use client';

import { Check, Loader2, X } from 'lucide-react';
import { useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePersonSearch } from '@/components/search/use-person-search';
import { formatLifeYears } from '@/lib/dates/fuzzy-date';
import type { SearchResult } from '@/lib/types';
import { cn } from '@/lib/utils';

function describe(r: SearchResult) {
  return [
    formatLifeYears(r.card) || null,
    r.parentNames.length ? `child of ${r.parentNames.join(' & ')}` : null,
    r.matchedName ? `also ${r.matchedName}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** Search-as-you-type picker for someone already in the tree. */
export function PersonPicker({
  id,
  label,
  selected,
  onSelect,
  excludeIds = [],
  error,
}: {
  id: string;
  label: string;
  selected: SearchResult | null;
  onSelect: (person: SearchResult | null) => void;
  excludeIds?: string[];
  error?: string;
}) {
  const [query, setQuery] = useState('');
  const { results, loading } = usePersonSearch(query);
  const listId = useId();
  const options = results.filter((r) => !excludeIds.includes(r.id));

  if (selected) {
    return (
      <div className="space-y-1.5">
        <Label className="text-base">{label}</Label>
        <div className="border-primary/40 bg-primary/5 flex items-center gap-3 rounded-lg border p-3">
          <Check className="text-primary size-5 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{selected.displayName}</span>
            <span className="text-muted-foreground block text-sm">{describe(selected)}</span>
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Choose someone else"
            onClick={() => onSelect(null)}
          >
            <X />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-base">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          value={query}
          placeholder="Start typing a name…"
          autoComplete="off"
          aria-controls={listId}
          aria-invalid={Boolean(error)}
          onChange={(e) => setQuery(e.target.value)}
        />
        {loading && (
          <Loader2 className="text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin" />
        )}
      </div>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      {query.trim().length >= 2 && (
        <ul id={listId} role="listbox" aria-label="Matching people" className="divide-y rounded-lg border">
          {options.length === 0 && !loading && (
            <li className="text-muted-foreground p-3 text-sm">
              No one found. Check the spelling, or add them as new.
            </li>
          )}
          {options.map((r) => (
            <li key={r.id} role="option" aria-selected={false}>
              <button
                type="button"
                className={cn('hover:bg-muted w-full p-3 text-left')}
                onClick={() => {
                  onSelect(r);
                  setQuery('');
                }}
              >
                <span className="block font-medium">{r.displayName}</span>
                <span className="text-muted-foreground block text-sm">{describe(r)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
