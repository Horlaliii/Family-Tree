'use client';

import { Loader2, MapPin, Plus, X } from 'lucide-react';
import { useEffect, useId, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatPlace } from '@/lib/places';
import { createPlace, searchPlaces, type PlaceOption } from '@/server/actions/people';

/** Pick a place from the list, or add a new one without leaving the form. */
export function PlacePicker({
  id,
  label,
  value,
  initialPlace,
  onChange,
}: {
  id: string;
  label: string;
  value: string | null;
  initialPlace?: PlaceOption | null;
  onChange: (id: string | null) => void;
}) {
  const [selected, setSelected] = useState<PlaceOption | null>(initialPlace ?? null);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<PlaceOption[]>([]);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: '', town: '', region: '', country: '' });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      searchPlaces(query).then(setOptions);
    }, 200);
    return () => clearTimeout(timer);
  }, [query, open]);

  const current = value && selected?.id === value ? selected : null;

  if (current) {
    return (
      <div className="space-y-1.5">
        <Label className="text-base">{label}</Label>
        <div className="bg-card flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2">
          <MapPin className="text-primary size-4 shrink-0" aria-hidden />
          <span className="flex-1">{formatPlace(current)}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Clear ${label.toLowerCase()}`}
            onClick={() => {
              setSelected(null);
              onChange(null);
            }}
          >
            <X />
          </Button>
        </div>
      </div>
    );
  }

  if (adding) {
    return (
      <div className="bg-muted/40 space-y-3 rounded-lg border p-3">
        <p className="font-medium">New place for “{label.toLowerCase()}”</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ['name', 'Place name (required)', 'e.g. Wesley Methodist Church'],
              ['town', 'Town or city', 'e.g. Kumasi'],
              ['region', 'Region', 'e.g. Ashanti'],
              ['country', 'Country', 'e.g. Ghana'],
            ] as const
          ).map(([key, text, placeholder]) => (
            <div key={key} className="space-y-1">
              <Label htmlFor={`${id}-new-${key}`} className="text-sm">
                {text}
              </Label>
              <Input
                id={`${id}-new-${key}`}
                value={draft[key]}
                placeholder={placeholder}
                onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <Button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await createPlace(draft);
                if (!res.ok) return setError(res.error);
                setSelected(res.data);
                onChange(res.data.id);
                setAdding(false);
              })
            }
          >
            {pending && <Loader2 className="animate-spin" />} Save place
          </Button>
          <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative space-y-1.5">
      <Label htmlFor={id} className="text-base">
        {label}
      </Label>
      <Input
        id={id}
        value={query}
        placeholder="Type to search places"
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => setQuery(e.target.value)}
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="bg-popover absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-lg border p-1 shadow-lg"
        >
          {options.map((p) => (
            <li
              key={p.id}
              role="option"
              aria-selected={false}
              className="hover:bg-muted cursor-pointer rounded-md px-3 py-2"
              onMouseDown={(e) => {
                e.preventDefault();
                setSelected(p);
                onChange(p.id);
                setQuery('');
                setOpen(false);
              }}
            >
              {formatPlace(p)}
            </li>
          ))}
          <li
            role="option"
            aria-selected={false}
            className="text-primary hover:bg-muted flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 font-medium"
            onMouseDown={(e) => {
              e.preventDefault();
              setDraft({ name: query, town: '', region: '', country: '' });
              setAdding(true);
              setOpen(false);
            }}
          >
            <Plus className="size-4" /> Add a new place{query ? ` “${query}”` : ''}
          </li>
        </ul>
      )}
    </div>
  );
}
