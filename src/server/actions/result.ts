import 'server-only';

import type { PostgrestError } from '@supabase/supabase-js';
import type { z } from 'zod';

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function fail(
  error: string,
  fieldErrors?: Record<string, string>,
): { ok: false; error: string; fieldErrors?: Record<string, string> } {
  return { ok: false, error, fieldErrors };
}

export function zodFail(error: z.ZodError) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.');
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fail(error.issues[0]?.message ?? 'Please check the form.', fieldErrors);
}

/** Turn database errors into plain language. */
export function dbFail(
  error: PostgrestError | null | undefined,
  fallback = 'Something went wrong. Please try again.',
) {
  if (!error) return fail(fallback);
  if (error.hint === 'relationship_cycle') return fail('That would make someone their own ancestor.');
  if (error.hint === 'too_many_biological_parents') {
    return fail(
      'This person already has two birth parents. Choose adoptive, step, foster or guardian instead.',
    );
  }
  if (error.hint === 'sibling_needs_parent') {
    return fail('Add a father or mother first — brothers and sisters are linked through their parents.');
  }
  if (error.code === '42501') return fail('You do not have permission to do that.');
  if (error.code === '23505') return fail('That link already exists.');
  if (error.code === '23514' || error.code === '22023') return fail(error.message);
  console.error('Database error', error);
  return fail(fallback);
}
