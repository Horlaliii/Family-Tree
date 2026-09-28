'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { personFormSchema, type PersonFormInput, type PersonFormValues } from '@/lib/validation/person';
import { savePerson, type PlaceOption, type Warning } from '@/server/actions/people';

import { DuplicateWarning } from './duplicate-warning';
import { EMPTY_PERSON_FORM, PersonFields } from './person-fields';

export function PersonForm({
  personId = null,
  defaultValues = EMPTY_PERSON_FORM,
  places = {},
  cancelHref,
}: {
  personId?: string | null;
  defaultValues?: PersonFormInput;
  places?: Record<string, PlaceOption>;
  cancelHref: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<{ slug: string; items: Warning[] } | null>(null);
  const form = useForm<PersonFormInput, unknown, PersonFormValues>({
    resolver: zodResolver(personFormSchema),
    defaultValues,
    mode: 'onBlur',
  });

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const res = await savePerson(personId, values);
      if (!res.ok) return setError(res.error);
      if (res.data.warnings.length) return setWarnings({ slug: res.data.slug, items: res.data.warnings });
      router.push(`/people/${res.data.slug}`);
    });
  });

  if (warnings) {
    return (
      <div className="space-y-4">
        <Alert variant="warning">
          <div>
            <p className="font-medium">Saved — but please double-check:</p>
            <ul className="mt-1 list-disc pl-5">
              {warnings.items.map((w) => (
                <li key={w.code + w.message}>{w.message}</li>
              ))}
            </ul>
          </div>
        </Alert>
        <Button onClick={() => router.push(`/people/${warnings.slug}`)}>Continue</Button>
      </div>
    );
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        {!personId && <DuplicateWarning />}
        <PersonFields places={places} />
        {error && <Alert variant="destructive">{error}</Alert>}
        <div className="bg-background/95 sticky bottom-16 z-10 -mx-4 flex gap-2 border-t px-4 py-3 backdrop-blur md:bottom-0">
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Save />}
            {personId ? 'Save changes' : 'Add person'}
          </Button>
          <Button type="button" size="lg" variant="ghost" onClick={() => router.push(cancelHref)}>
            Cancel
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
