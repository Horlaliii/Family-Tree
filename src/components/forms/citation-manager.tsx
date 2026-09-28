'use client';

import { BookOpen, Loader2, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { SOURCE_TYPE_LABELS, type SourceType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { SOURCE_TYPES, type CitationTarget } from '@/lib/validation/facts';
import { addCitation, removeCitation, searchSources, type SourceOption } from '@/server/actions/facts';

export interface CitationView {
  id: string;
  detail: string | null;
  title: string;
  sourceType: SourceType;
  informant: string | null;
}

export interface DocumentOption {
  id: string;
  label: string;
}

/** The sources behind one fact (or a birth, death, marriage or parent link). */
export function CitationManager({
  target,
  citations,
  documents,
  label,
}: {
  target: CitationTarget;
  citations: CitationView[];
  documents: DocumentOption[];
  label: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<SourceOption[]>([]);
  const [chosen, setChosen] = useState<SourceOption | null>(null);
  const [draft, setDraft] = useState({
    title: '',
    sourceType: 'oral_account' as SourceType,
    informant: '',
    recordedOn: '',
    notes: '',
    mediaId: '',
  });
  const [detail, setDetail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || mode !== 'existing') return;
    const t = setTimeout(() => searchSources(query).then(setOptions), 200);
    return () => clearTimeout(t);
  }, [open, mode, query]);

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await addCitation({
        target,
        detail,
        source:
          mode === 'existing'
            ? { mode: 'existing', sourceId: chosen?.id ?? '' }
            : { mode: 'new', source: draft },
      });
      if (!res.ok) return setError(res.error);
      setOpen(false);
      setChosen(null);
      setDetail('');
      setDraft((d) => ({ ...d, title: '', informant: '', notes: '', recordedOn: '', mediaId: '' }));
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      {citations.length === 0 ? (
        <p className="text-muted-foreground text-sm italic">No source yet for {label}.</p>
      ) : (
        <ul className="space-y-1">
          {citations.map((c) => (
            <li key={c.id} className="bg-muted/60 flex items-start gap-2 rounded-md px-2 py-1.5 text-sm">
              <BookOpen className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
              <span className="flex-1">
                <span className="font-medium">{c.title}</span>{' '}
                <span className="text-muted-foreground">
                  ({SOURCE_TYPE_LABELS[c.sourceType]}
                  {c.informant ? `, told by ${c.informant}` : ''})
                </span>
                {c.detail && <span className="text-muted-foreground block">{c.detail}</span>}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove source ${c.title}`}
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const res = await removeCitation(c.id);
                    if (!res.ok) setError(res.error);
                    else router.refresh();
                  })
                }
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {!open ? (
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus /> Add a source
        </Button>
      ) : (
        <div className="space-y-3 rounded-lg border p-3">
          <div role="tablist" className="bg-muted grid grid-cols-2 gap-1 rounded-lg p-1 text-sm">
            {(
              [
                ['existing', 'A source we already have'],
                ['new', 'A new source'],
              ] as const
            ).map(([value, text]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={mode === value}
                onClick={() => setMode(value)}
                className={cn(
                  'min-h-9 rounded-md px-2',
                  mode === value ? 'bg-card shadow-sm' : 'text-muted-foreground',
                )}
              >
                {text}
              </button>
            ))}
          </div>

          {mode === 'existing' ? (
            <div className="space-y-2">
              <Label htmlFor={`src-q-${label}`}>Find a source</Label>
              <Input
                id={`src-q-${label}`}
                placeholder="Title or who told it"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <ul className="max-h-48 divide-y overflow-y-auto rounded-md border">
                {options.map((o) => (
                  <li key={o.id}>
                    <button
                      type="button"
                      onClick={() => setChosen(o)}
                      aria-pressed={chosen?.id === o.id}
                      className={cn(
                        'hover:bg-muted w-full px-3 py-2 text-left text-sm',
                        chosen?.id === o.id && 'bg-primary/10',
                      )}
                    >
                      <span className="font-medium">{o.title}</span>{' '}
                      <span className="text-muted-foreground">
                        ({SOURCE_TYPE_LABELS[o.sourceType as SourceType]})
                      </span>
                    </button>
                  </li>
                ))}
                {options.length === 0 && (
                  <li className="text-muted-foreground px-3 py-2 text-sm">
                    No sources found. Add a new one.
                  </li>
                )}
              </ul>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor={`src-title-${label}`}>Title</Label>
                <Input
                  id={`src-title-${label}`}
                  placeholder="e.g. Baptism register, Wesley Methodist Church"
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`src-type-${label}`}>Kind of source</Label>
                <NativeSelect
                  id={`src-type-${label}`}
                  value={draft.sourceType}
                  onChange={(e) => setDraft({ ...draft, sourceType: e.target.value as SourceType })}
                >
                  {SOURCE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {SOURCE_TYPE_LABELS[t]}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1">
                <Label htmlFor={`src-informant-${label}`}>Told by (for oral accounts)</Label>
                <Input
                  id={`src-informant-${label}`}
                  placeholder="e.g. Grandma Abena"
                  value={draft.informant}
                  onChange={(e) => setDraft({ ...draft, informant: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`src-date-${label}`}>Recorded on</Label>
                <Input
                  id={`src-date-${label}`}
                  type="date"
                  value={draft.recordedOn}
                  onChange={(e) => setDraft({ ...draft, recordedOn: e.target.value })}
                />
              </div>
              {documents.length > 0 && (
                <div className="space-y-1">
                  <Label htmlFor={`src-doc-${label}`}>Scanned document</Label>
                  <NativeSelect
                    id={`src-doc-${label}`}
                    value={draft.mediaId}
                    onChange={(e) => setDraft({ ...draft, mediaId: e.target.value })}
                  >
                    <option value="">None</option>
                    {documents.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              )}
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor={`src-notes-${label}`}>Notes</Label>
                <Textarea
                  id={`src-notes-${label}`}
                  rows={2}
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor={`src-detail-${label}`}>Where in the source? (optional)</Label>
            <Input
              id={`src-detail-${label}`}
              placeholder="e.g. page 41, entry 12"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={save} disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} Save source
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
