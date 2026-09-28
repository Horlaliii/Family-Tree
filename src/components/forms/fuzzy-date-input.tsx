'use client';

import { useState } from 'react';
import { useFormContext, useWatch, type FieldErrors } from 'react-hook-form';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

type DateErrors = Partial<Record<'year' | 'month' | 'day' | 'endYear' | 'text', { message?: string }>>;

function getErrors(errors: FieldErrors, name: string): DateErrors {
  let node: unknown = errors;
  for (const part of name.split('.')) node = (node as Record<string, unknown> | undefined)?.[part];
  return (node as DateErrors) ?? {};
}

/**
 * A date that may be vague: "about 1940", "before 1960", "between 1903 and
 * 1906", only a year, or just words ("during the war").
 * Registers <name>.qualifier / .year / .month / .day / .endYear / .text.
 */
export function FuzzyDateInput({ name, label, id }: { name: string; label: string; id: string }) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext();
  const qualifier = useWatch({ control, name: `${name}.qualifier` }) as string;
  const text = useWatch({ control, name: `${name}.text` }) as string;
  const [showText, setShowText] = useState(Boolean(text));
  const err = getErrors(errors, name);
  const firstError = err.year?.message ?? err.month?.message ?? err.day?.message ?? err.endYear?.message;

  return (
    <fieldset className="space-y-2">
      <legend className="text-base leading-none font-medium">{label}</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[9rem_6rem_1fr_5rem]">
        <div className="col-span-2 sm:col-span-1">
          <Label htmlFor={`${id}-q`} className="sr-only">
            How sure is this date?
          </Label>
          <NativeSelect id={`${id}-q`} {...register(`${name}.qualifier`)}>
            <option value="exact">Exactly</option>
            <option value="about">About</option>
            <option value="before">Before</option>
            <option value="after">After</option>
            <option value="between">Between</option>
          </NativeSelect>
        </div>
        <div>
          <Label htmlFor={`${id}-y`} className="sr-only">
            Year
          </Label>
          <Input
            id={`${id}-y`}
            inputMode="numeric"
            placeholder="Year"
            maxLength={4}
            aria-invalid={Boolean(err.year)}
            {...register(`${name}.year`)}
          />
        </div>
        {qualifier === 'between' ? (
          <div className="flex items-center gap-2 sm:col-span-2">
            <span className="text-muted-foreground">and</span>
            <Label htmlFor={`${id}-ey`} className="sr-only">
              Second year
            </Label>
            <Input
              id={`${id}-ey`}
              inputMode="numeric"
              placeholder="Year"
              maxLength={4}
              aria-invalid={Boolean(err.endYear)}
              {...register(`${name}.endYear`)}
            />
          </div>
        ) : (
          <>
            <div>
              <Label htmlFor={`${id}-m`} className="sr-only">
                Month (optional)
              </Label>
              <NativeSelect id={`${id}-m`} {...register(`${name}.month`)}>
                <option value="">Month</option>
                {MONTHS.map((m, i) => (
                  <option key={m} value={String(i + 1)}>
                    {m}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div>
              <Label htmlFor={`${id}-d`} className="sr-only">
                Day (optional)
              </Label>
              <Input
                id={`${id}-d`}
                inputMode="numeric"
                placeholder="Day"
                maxLength={2}
                aria-invalid={Boolean(err.day)}
                {...register(`${name}.day`)}
              />
            </div>
          </>
        )}
      </div>
      {firstError && (
        <p role="alert" className="text-destructive text-sm">
          {firstError}
        </p>
      )}
      <div className={cn(!showText && 'hidden')}>
        <Label htmlFor={`${id}-t`} className="text-muted-foreground text-sm">
          Or describe it in words
        </Label>
        <Input
          id={`${id}-t`}
          placeholder="e.g. during the war"
          className="mt-1"
          {...register(`${name}.text`)}
        />
      </div>
      {!showText && (
        <button
          type="button"
          className="text-primary text-sm underline-offset-4 hover:underline"
          onClick={() => setShowText(true)}
        >
          No exact date? Describe it in words
        </button>
      )}
    </fieldset>
  );
}
