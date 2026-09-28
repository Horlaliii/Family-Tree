'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Save, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CONFIDENCE_LABELS, FACT_TYPE_LABELS } from '@/lib/types';
import { FACT_TYPES, factSchema, type FactInput, type FactValues } from '@/lib/validation/facts';
import { CONFIDENCES } from '@/lib/validation/person';
import { deleteFact, saveFact } from '@/server/actions/facts';
import type { PlaceOption } from '@/server/actions/people';

import { Field } from './field';
import { FuzzyDateInput } from './fuzzy-date-input';
import { PlacePicker } from './place-picker';

export const EMPTY_FACT: FactInput = {
  factType: 'education',
  customLabel: '',
  date: { qualifier: 'exact', year: '', month: '', day: '', endYear: '', text: '' },
  placeId: null,
  description: '',
  confidence: 'family_account',
};

export function FactForm({
  personId,
  factId = null,
  defaultValues = EMPTY_FACT,
  place,
  onDone,
}: {
  personId: string;
  factId?: string | null;
  defaultValues?: FactInput;
  place?: PlaceOption | null;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<FactInput, unknown, FactValues>({ resolver: zodResolver(factSchema), defaultValues });
  const factType = useWatch({ control: form.control, name: 'factType' });
  const id = factId ?? 'new';

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const res = await saveFact(personId, factId, values);
      if (!res.ok) return setError(res.error);
      if (!factId) form.reset(EMPTY_FACT);
      onDone?.();
      router.refresh();
    }),
  );

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={`${id}-type`} label="What happened?">
            <NativeSelect id={`${id}-type`} {...form.register('factType')}>
              {FACT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t === 'custom' ? 'Something else…' : FACT_TYPE_LABELS[t]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          {factType === 'custom' && (
            <Field
              id={`${id}-label`}
              label="Name of the event"
              error={form.formState.errors.customLabel?.message}
            >
              <Input id={`${id}-label`} placeholder="e.g. Enstoolment" {...form.register('customLabel')} />
            </Field>
          )}
        </div>
        <FuzzyDateInput name="date" id={`${id}-date`} label="When" />
        <Controller
          control={form.control}
          name="placeId"
          render={({ field }) => (
            <PlacePicker
              id={`${id}-place`}
              label="Where"
              value={field.value ?? null}
              initialPlace={place}
              onChange={field.onChange}
            />
          )}
        />
        <Field id={`${id}-desc`} label="Details">
          <Textarea id={`${id}-desc`} rows={3} {...form.register('description')} />
        </Field>
        <Field id={`${id}-conf`} label="How sure are we?">
          <NativeSelect id={`${id}-conf`} {...form.register('confidence')}>
            {CONFIDENCES.map((c) => (
              <option key={c} value={c}>
                {CONFIDENCE_LABELS[c]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Save />} {factId ? 'Save' : 'Add event'}
          </Button>
          {factId && (
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => {
                if (!confirm('Remove this life event?')) return;
                startTransition(async () => {
                  const res = await deleteFact(factId);
                  if (!res.ok) return setError(res.error);
                  onDone?.();
                  router.refresh();
                });
              }}
            >
              <Trash2 /> Remove
            </Button>
          )}
        </div>
      </form>
    </FormProvider>
  );
}
