'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Save, Star, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Field } from '@/components/forms/field';
import { FuzzyDateInput } from '@/components/forms/fuzzy-date-input';
import { PersonPicker } from '@/components/forms/person-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { FuzzyDateFields } from '@/lib/dates/fuzzy-date';
import { fuzzyDateFieldsSchema } from '@/lib/validation/person';
import { deleteMedia, setProfilePhoto, tagPerson, untagPerson, updateMedia } from '@/server/actions/media';

const schema = z.object({ caption: z.string().max(500), date: fuzzyDateFieldsSchema });
type Input = z.input<typeof schema>;
type Output = z.output<typeof schema>;

export interface TaggedPerson {
  id: string;
  slug: string;
  name: string;
  isProfilePhoto: boolean;
}

export function MediaEditor({
  mediaId,
  isPhoto,
  caption,
  date,
  tagged,
}: {
  mediaId: string;
  isPhoto: boolean;
  caption: string;
  date: FuzzyDateFields;
  tagged: TaggedPerson[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<Input, unknown, Output>({
    resolver: zodResolver(schema),
    defaultValues: { caption, date },
  });

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    startTransition(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) return setError(res.error ?? 'Something went wrong.');
      after?.();
      router.refresh();
    });

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">People in this {isPhoto ? 'photo' : 'document'}</h2>
        <ul className="space-y-2">
          {tagged.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-2">
              <Link
                href={`/people/${p.slug}`}
                className="flex-1 font-medium underline-offset-4 hover:underline"
              >
                {p.name}
              </Link>
              {isPhoto &&
                (p.isProfilePhoto ? (
                  <span className="text-muted-foreground inline-flex items-center gap-1 text-sm">
                    <Star className="fill-accent text-accent size-4" /> Profile photo
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => run(() => setProfilePhoto(p.id, mediaId))}
                  >
                    <Star /> Use as profile photo
                  </Button>
                ))}
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Untag ${p.name}`}
                disabled={pending}
                onClick={() => run(() => untagPerson(mediaId, p.id))}
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
        <PersonPicker
          id="tag-person"
          label="Tag someone"
          selected={null}
          excludeIds={tagged.map((t) => t.id)}
          onSelect={(r) => r && run(() => tagPerson(mediaId, r.id))}
        />
      </section>

      <FormProvider {...form}>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => run(() => updateMedia(mediaId, values)))}
          noValidate
        >
          <h2 className="text-xl font-semibold">Details</h2>
          <Field id="caption" label="Caption">
            <Input id="caption" {...form.register('caption')} />
          </Field>
          <FuzzyDateInput name="date" id="media-date" label="When was it taken or written?" />
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Save />} Save details
          </Button>
        </form>
      </FormProvider>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Button
        variant="destructive"
        disabled={pending}
        onClick={() => {
          if (!confirm('Remove this from the family archive?')) return;
          run(
            () => deleteMedia(mediaId),
            () => router.push(tagged[0] ? `/people/${tagged[0].slug}` : '/'),
          );
        }}
      >
        <Trash2 /> Remove
      </Button>
    </div>
  );
}
