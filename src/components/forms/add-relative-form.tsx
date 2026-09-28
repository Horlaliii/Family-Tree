'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/select';
import { formatLifeYears, type FuzzyDateFields } from '@/lib/dates/fuzzy-date';
import {
  CONFIDENCE_LABELS,
  RELATIONSHIP_LABELS,
  UNION_TYPE_LABELS,
  type Confidence,
  type ParentRelationship,
  type PersonCard,
  type SearchResult,
  type UnionType,
} from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  CONFIDENCES,
  PARENT_RELATIONSHIPS,
  personFormSchema,
  UNION_TYPES,
  type PersonFormInput,
  type PersonFormValues,
  type Relation,
} from '@/lib/validation/person';
import { addRelative, type Warning } from '@/server/actions/people';

import { DuplicateWarning } from './duplicate-warning';
import { Field, FieldGroup } from './field';
import { EMPTY_PERSON_FORM, PersonFields } from './person-fields';
import { PersonPicker } from './person-picker';

export interface AnchorInfo {
  id: string;
  slug: string;
  name: string;
  surname: string;
  spouses: PersonCard[];
  parents: PersonCard[];
  relatedIds: string[];
}

const TITLES: Record<Relation, (name: string) => string> = {
  father: (n) => `Add ${n}'s father`,
  mother: (n) => `Add ${n}'s mother`,
  spouse: (n) => `Add ${n}'s spouse`,
  child: (n) => `Add ${n}'s child`,
  sibling: (n) => `Add ${n}'s brother or sister`,
};

function cardToResult(card: PersonCard): SearchResult {
  return { id: card.id, slug: card.slug, displayName: card.name, matchedName: null, card, parentNames: [] };
}

const EMPTY_DATE: FuzzyDateFields = {
  qualifier: 'exact',
  year: '',
  month: '',
  day: '',
  endYear: '',
  text: '',
};

export function AddRelativeForm({ relation, anchor }: { relation: Relation; anchor: AnchorInfo }) {
  const router = useRouter();
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [existing, setExisting] = useState<SearchResult | null>(null);
  const [relationshipType, setRelationshipType] = useState<ParentRelationship>('biological');
  const [confidence, setConfidence] = useState<Confidence>('confirmed');
  const [otherParentId, setOtherParentId] = useState<string>(
    relation === 'child' && anchor.spouses.length === 1 ? anchor.spouses[0]!.id : '',
  );
  const [sharedParentIds, setSharedParentIds] = useState<string[]>(anchor.parents.map((p) => p.id));
  const [unionType, setUnionType] = useState<UnionType>('unknown');
  const [unionYear, setUnionYear] = useState('');
  const [unionQualifier, setUnionQualifier] = useState<FuzzyDateFields['qualifier']>('exact');
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<Warning[] | null>(null);
  const [pending, startTransition] = useTransition();

  const defaults: PersonFormInput = {
    ...EMPTY_PERSON_FORM,
    sex: relation === 'father' ? 'male' : relation === 'mother' ? 'female' : 'unknown',
    names: [
      {
        name_type: 'birth',
        title: '',
        given_names: '',
        surname: relation === 'mother' || relation === 'spouse' ? '' : anchor.surname,
      },
    ],
  };
  const form = useForm<PersonFormInput, unknown, PersonFormValues>({
    resolver: zodResolver(personFormSchema),
    defaultValues: defaults,
    mode: 'onBlur',
  });

  if (relation === 'sibling' && anchor.parents.length === 0) {
    return (
      <Alert variant="info">
        <div className="space-y-3">
          <p>
            Brothers and sisters are linked through their parents. Add {anchor.name}&apos;s father or mother
            first, then add siblings.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href={`/people/${anchor.slug}/add/father`}>Add father</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/people/${anchor.slug}/add/mother`}>Add mother</Link>
            </Button>
          </div>
        </div>
      </Alert>
    );
  }

  if (warnings) {
    return (
      <div className="space-y-4">
        <Alert variant="warning">
          <div>
            <p className="font-medium">Added — but please double-check:</p>
            <ul className="mt-1 list-disc pl-5">
              {warnings.map((w) => (
                <li key={w.code + w.message}>{w.message}</li>
              ))}
            </ul>
          </div>
        </Alert>
        <Button onClick={() => router.push(`/people/${anchor.slug}`)}>Back to {anchor.name}</Button>
      </div>
    );
  }

  const options = {
    relationshipType,
    confidence,
    otherParentId: otherParentId || null,
    sharedParentIds,
    unionType,
    unionStart: { ...EMPTY_DATE, qualifier: unionQualifier, year: unionYear },
  };

  function submit(payload: Parameters<typeof addRelative>[2]) {
    setError(null);
    startTransition(async () => {
      const res = await addRelative(anchor.id, relation, payload);
      if (!res.ok) return setError(res.error);
      if (res.data.warnings.length) return setWarnings(res.data.warnings);
      router.push(`/people/${anchor.slug}`);
      router.refresh();
    });
  }

  const onSubmitNew = form.handleSubmit((person) => submit({ mode: 'new', person, options }));
  const onSubmitExisting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!existing) return setError(`Choose who to link as ${anchor.name}'s ${relation}.`);
    submit({ mode: 'existing', personId: existing.id, options });
  };

  const relationshipOptions = (
    <FieldGroup legend="How are they related?">
      {relation === 'spouse' ? (
        <>
          <Field id="union-type" label="Kind of marriage">
            <NativeSelect
              id="union-type"
              value={unionType}
              onChange={(e) => setUnionType(e.target.value as UnionType)}
            >
              {UNION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t === 'unknown' ? 'Not known' : UNION_TYPE_LABELS[t]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <fieldset className="space-y-1.5">
            <legend className="text-base font-medium">Married (year, if known)</legend>
            <div className="grid grid-cols-2 gap-2">
              <NativeSelect
                aria-label="How sure is the year?"
                value={unionQualifier}
                onChange={(e) => setUnionQualifier(e.target.value as FuzzyDateFields['qualifier'])}
              >
                <option value="exact">In</option>
                <option value="about">About</option>
                <option value="before">Before</option>
                <option value="after">After</option>
              </NativeSelect>
              <input
                aria-label="Year married"
                inputMode="numeric"
                maxLength={4}
                placeholder="Year"
                value={unionYear}
                onChange={(e) => setUnionYear(e.target.value)}
                className="border-input bg-card h-11 rounded-lg border px-3"
              />
            </div>
          </fieldset>
        </>
      ) : relation === 'sibling' ? (
        <fieldset className="space-y-2">
          <legend className="text-base font-medium">Which parents do they share?</legend>
          <p className="text-muted-foreground text-sm">Untick one to add a half-brother or half-sister.</p>
          {anchor.parents.map((p) => (
            <label key={p.id} className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                className="accent-primary size-5"
                checked={sharedParentIds.includes(p.id)}
                onChange={(e) =>
                  setSharedParentIds((ids) =>
                    e.target.checked ? [...ids, p.id] : ids.filter((id) => id !== p.id),
                  )
                }
              />
              {p.name}
            </label>
          ))}
        </fieldset>
      ) : (
        <>
          <Field id="rel-type" label="Kind of relationship">
            <NativeSelect
              id="rel-type"
              value={relationshipType}
              onChange={(e) => setRelationshipType(e.target.value as ParentRelationship)}
            >
              {PARENT_RELATIONSHIPS.map((t) => (
                <option key={t} value={t}>
                  {t === 'biological' ? 'Birth (biological)' : RELATIONSHIP_LABELS[t]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          {relation === 'child' && (
            <Field
              id="other-parent"
              label="Other parent"
              hint={anchor.spouses.length ? undefined : 'Add a spouse first to choose them here.'}
            >
              <NativeSelect
                id="other-parent"
                value={otherParentId}
                onChange={(e) => setOtherParentId(e.target.value)}
              >
                <option value="">Not known / not listed</option>
                {anchor.spouses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {formatLifeYears(s) ? `(${formatLifeYears(s)})` : ''}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          )}
        </>
      )}
      <Field id="confidence" label="How sure are we?">
        <NativeSelect
          id="confidence"
          value={confidence}
          onChange={(e) => setConfidence(e.target.value as Confidence)}
        >
          {CONFIDENCES.map((c) => (
            <option key={c} value={c}>
              {CONFIDENCE_LABELS[c]}
            </option>
          ))}
        </NativeSelect>
      </Field>
    </FieldGroup>
  );

  const actions = (
    <div className="bg-background/95 sticky bottom-16 z-10 -mx-4 flex gap-2 border-t px-4 py-3 backdrop-blur md:bottom-0">
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <UserPlus />}
        {TITLES[relation](anchor.name).replace(`${anchor.name}'s `, '')}
      </Button>
      <Button type="button" size="lg" variant="ghost" onClick={() => router.push(`/people/${anchor.slug}`)}>
        Cancel
      </Button>
    </div>
  );

  return (
    <div className="space-y-5">
      <div
        role="tablist"
        aria-label="New or existing person"
        className="bg-muted grid grid-cols-2 gap-1 rounded-xl p-1"
      >
        {(
          [
            ['new', 'Someone new'],
            ['existing', 'Already in the tree'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            className={cn(
              'min-h-11 rounded-lg px-3 text-sm font-medium',
              mode === value ? 'bg-card shadow-sm' : 'text-muted-foreground',
            )}
            onClick={() => setMode(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'new' ? (
        <FormProvider {...form}>
          <form onSubmit={onSubmitNew} className="space-y-5" noValidate>
            <DuplicateWarning
              onUseExisting={(p) => {
                setExisting(cardToResult(p));
                setMode('existing');
              }}
            />
            <PersonFields places={{}} compact showSex={relation !== 'father' && relation !== 'mother'} />
            {relationshipOptions}
            {error && <Alert variant="destructive">{error}</Alert>}
            {actions}
          </form>
        </FormProvider>
      ) : (
        <form onSubmit={onSubmitExisting} className="space-y-5" noValidate>
          <PersonPicker
            id="existing-person"
            label={`Who is ${anchor.name}'s ${relation}?`}
            selected={existing}
            onSelect={setExisting}
            excludeIds={[anchor.id, ...anchor.relatedIds]}
          />
          {relationshipOptions}
          {error && <Alert variant="destructive">{error}</Alert>}
          {actions}
        </form>
      )}
    </div>
  );
}
