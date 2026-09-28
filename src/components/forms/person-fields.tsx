'use client';

import { Plus, Star, Trash2 } from 'lucide-react';
import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CONFIDENCE_LABELS, NAME_TYPE_LABELS } from '@/lib/types';
import { CONFIDENCES, NAME_TYPES, type PersonFormInput } from '@/lib/validation/person';
import type { PlaceOption } from '@/server/actions/people';

import { Field, FieldGroup } from './field';
import { FuzzyDateInput } from './fuzzy-date-input';
import { PlacePicker } from './place-picker';

export const EMPTY_PERSON_FORM: PersonFormInput = {
  sex: 'unknown',
  names: [{ name_type: 'birth', title: '', given_names: '', surname: '' }],
  primaryIndex: 0,
  birth: { qualifier: 'exact', year: '', month: '', day: '', endYear: '', text: '' },
  birthPlaceId: null,
  birthConfidence: '',
  death: { qualifier: 'exact', year: '', month: '', day: '', endYear: '', text: '' },
  deathPlaceId: null,
  deathConfidence: '',
  livingStatus: 'auto',
  hometownPlaceId: null,
  clan: '',
  totem: '',
  occupation: '',
  bio: '',
};

function NamesField() {
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = useFormContext<PersonFormInput>();
  const { fields, append, remove } = useFieldArray({ control, name: 'names' });
  const primaryIndex = Number(useWatch({ control, name: 'primaryIndex' }) ?? 0);

  return (
    <FieldGroup
      legend="Names"
      description="Add every name they were known by. The starred name is shown everywhere."
    >
      {fields.map((field, i) => {
        const err = errors.names?.[i];
        return (
          <div key={field.id} className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <NativeSelect aria-label="Kind of name" className="h-10" {...register(`names.${i}.name_type`)}>
                {NAME_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {NAME_TYPE_LABELS[t]}
                  </option>
                ))}
              </NativeSelect>
              <Button
                type="button"
                variant={primaryIndex === i ? 'secondary' : 'ghost'}
                size="icon-sm"
                aria-label={primaryIndex === i ? 'Main name' : 'Make this the main name'}
                aria-pressed={primaryIndex === i}
                onClick={() => setValue('primaryIndex', i, { shouldDirty: true })}
              >
                <Star className={primaryIndex === i ? 'fill-accent text-accent' : ''} />
              </Button>
              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Remove this name"
                  onClick={() => {
                    remove(i);
                    if (primaryIndex >= i && primaryIndex > 0) setValue('primaryIndex', primaryIndex - 1);
                  }}
                >
                  <Trash2 />
                </Button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-[6rem_1fr_1fr]">
              <Field id={`name-${i}-title`} label="Title">
                <Input id={`name-${i}-title`} placeholder="Nana" {...register(`names.${i}.title`)} />
              </Field>
              <Field id={`name-${i}-given`} label="First name(s)" error={err?.given_names?.message}>
                <Input
                  id={`name-${i}-given`}
                  autoComplete="off"
                  aria-invalid={Boolean(err?.given_names)}
                  {...register(`names.${i}.given_names`)}
                />
              </Field>
              <Field id={`name-${i}-surname`} label="Surname">
                <Input id={`name-${i}-surname`} autoComplete="off" {...register(`names.${i}.surname`)} />
              </Field>
            </div>
          </div>
        );
      })}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append({ name_type: 'day', title: '', given_names: '', surname: '' })}
      >
        <Plus /> Add another name
      </Button>
    </FieldGroup>
  );
}

function ConfidenceSelect({ name, id }: { name: 'birthConfidence' | 'deathConfidence'; id: string }) {
  const { register } = useFormContext<PersonFormInput>();
  return (
    <Field id={id} label="How sure are we?">
      <NativeSelect id={id} {...register(name)}>
        <option value="">Not said</option>
        {CONFIDENCES.map((c) => (
          <option key={c} value={c}>
            {CONFIDENCE_LABELS[c]}
          </option>
        ))}
      </NativeSelect>
    </Field>
  );
}

export function PersonFields({
  places,
  showSex = true,
  compact = false,
}: {
  places: Record<string, PlaceOption>;
  showSex?: boolean;
  /** Quick-add: only the essentials; details can be added later. */
  compact?: boolean;
}) {
  const { register, control } = useFormContext<PersonFormInput>();
  const livingStatus = useWatch({ control, name: 'livingStatus' });

  return (
    <div className="space-y-5">
      <NamesField />

      <FieldGroup legend="Life">
        {showSex && (
          <Field id="sex" label="Sex">
            <NativeSelect id="sex" {...register('sex')}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="unknown">Not known</option>
            </NativeSelect>
          </Field>
        )}
        <FuzzyDateInput name="birth" id="birth" label="Born" />
        <Controller
          control={control}
          name="birthPlaceId"
          render={({ field }) => (
            <PlacePicker
              id="birth-place"
              label="Birthplace"
              value={field.value ?? null}
              initialPlace={field.value ? places[field.value] : null}
              onChange={field.onChange}
            />
          )}
        />
        {!compact && <ConfidenceSelect name="birthConfidence" id="birth-confidence" />}

        <Field
          id="living"
          label="Living or deceased?"
          hint="Leave on automatic unless you know better: people with a death date, or born over 110 years ago, count as deceased."
        >
          <NativeSelect id="living" {...register('livingStatus')}>
            <option value="auto">Work it out automatically</option>
            <option value="living">Living</option>
            <option value="deceased">Deceased</option>
          </NativeSelect>
        </Field>

        {livingStatus !== 'living' && (
          <>
            <FuzzyDateInput name="death" id="death" label="Died" />
            <Controller
              control={control}
              name="deathPlaceId"
              render={({ field }) => (
                <PlacePicker
                  id="death-place"
                  label="Place of death"
                  value={field.value ?? null}
                  initialPlace={field.value ? places[field.value] : null}
                  onChange={field.onChange}
                />
              )}
            />
            {!compact && <ConfidenceSelect name="deathConfidence" id="death-confidence" />}
          </>
        )}
      </FieldGroup>

      {!compact && (
        <FieldGroup legend="Roots and work">
          <Controller
            control={control}
            name="hometownPlaceId"
            render={({ field }) => (
              <PlacePicker
                id="hometown"
                label="Hometown"
                value={field.value ?? null}
                initialPlace={field.value ? places[field.value] : null}
                onChange={field.onChange}
              />
            )}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="clan" label="Clan (abusua)">
              <Input id="clan" {...register('clan')} />
            </Field>
            <Field id="totem" label="Totem">
              <Input id="totem" {...register('totem')} />
            </Field>
          </div>
          <Field id="occupation" label="Work">
            <Input id="occupation" placeholder="e.g. Cocoa farmer" {...register('occupation')} />
          </Field>
        </FieldGroup>
      )}

      {!compact && (
        <FieldGroup legend="Their story">
          <div className="space-y-1.5">
            <Label htmlFor="bio" className="text-base">
              About them
            </Label>
            <Textarea
              id="bio"
              rows={6}
              placeholder="Stories, character, what the family remembers…"
              {...register('bio')}
            />
            <p className="text-muted-foreground text-sm">
              You can use **bold** and *italics*. Leave a blank line between paragraphs.
            </p>
          </div>
        </FieldGroup>
      )}
    </div>
  );
}
