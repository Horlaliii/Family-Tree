'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { fieldsToFuzzyDate, fuzzyDateToRow } from '@/lib/dates/fuzzy-date';
import type { Json } from '@/lib/supabase/database.types';
import type { PersonCard } from '@/lib/types';
import {
  addRelativeSchema,
  CONFIDENCES,
  PARENT_RELATIONSHIPS,
  personFormSchema,
  placeSchema,
  RELATIONS,
  toSavePersonPayload,
  UNION_END_REASONS,
  UNION_TYPES,
  fuzzyDateFieldsSchema,
  type AddRelativeInput,
  type PersonFormInput,
  type PlaceInput,
} from '@/lib/validation/person';

import { createUserSupabase } from '../supabase';
import { canEdit, getViewer, isAdmin } from '../viewer';
import { dbFail, fail, zodFail, type ActionResult } from './result';

async function editorDb() {
  const viewer = await getViewer();
  if (!canEdit(viewer)) return null;
  return createUserSupabase();
}

export interface Warning {
  code: string;
  message: string;
}

export async function savePerson(
  id: string | null,
  input: PersonFormInput,
): Promise<ActionResult<{ id: string; slug: string; warnings: Warning[] }>> {
  const db = await editorDb();
  if (!db) return fail('You do not have permission to edit people.');
  const parsed = personFormSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  if (id !== null && !z.uuid().safeParse(id).success) return fail('Unknown person.');

  const { person, names } = toSavePersonPayload(parsed.data);
  const { data, error } = await db.rpc('save_person', {
    p_id: id as string,
    p_person: person,
    p_names: names,
  });
  if (error) return dbFail(error);
  const saved = data as unknown as { id: string; slug: string };

  const { data: warnings } = await db.rpc('relationship_warnings', { p_person_id: saved.id });
  revalidatePath('/', 'layout');
  return {
    ok: true,
    data: { ...saved, warnings: (warnings ?? []).map((w) => ({ code: w.code, message: w.message })) },
  };
}

export async function addRelative(
  anchorId: string,
  relation: string,
  input: AddRelativeInput,
): Promise<ActionResult<{ id: string; slug: string; warnings: Warning[] }>> {
  const db = await editorDb();
  if (!db) return fail('You do not have permission to add relatives.');
  if (!z.uuid().safeParse(anchorId).success) return fail('Unknown person.');
  const rel = z.enum(RELATIONS).safeParse(relation);
  if (!rel.success) return fail('Unknown relationship.');
  const parsed = addRelativeSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);

  const o = parsed.data.options;
  const options: Record<string, Json> = {
    relationship_type: o.relationshipType,
    confidence: o.confidence,
  };
  if (rel.data === 'child' && o.otherParentId) options.other_parent_id = o.otherParentId;
  if (rel.data === 'sibling' && o.sharedParentIds?.length) options.shared_parent_ids = o.sharedParentIds;
  if (rel.data === 'spouse') {
    options.union = {
      union_type: o.unionType,
      ...(o.unionStart ? fuzzyDateToRow('start', fieldsToFuzzyDate(o.unionStart)) : {}),
    };
  }

  const payload =
    parsed.data.mode === 'new' ? toSavePersonPayload(parsed.data.person) : { person: null, names: null };
  const { data, error } = await db.rpc('add_relative', {
    p_anchor: anchorId,
    p_relation: rel.data,
    p_existing_id: parsed.data.mode === 'existing' ? parsed.data.personId : undefined,
    p_person: payload.person ?? undefined,
    p_names: payload.names ?? undefined,
    p_options: options,
  });
  if (error) return dbFail(error);
  revalidatePath('/', 'layout');
  return { ok: true, data: data as unknown as { id: string; slug: string; warnings: Warning[] } };
}

export async function deletePerson(id: string): Promise<ActionResult> {
  const db = await editorDb();
  if (!db) return fail('You do not have permission to remove people.');
  if (!z.uuid().safeParse(id).success) return fail('Unknown person.');
  const { error } = await db.from('persons').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) return dbFail(error);
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function restorePerson(id: string): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!isAdmin(viewer)) return fail('Only the admin can restore people.');
  const db = await createUserSupabase();
  const { error } = await db.from('persons').update({ deleted_at: null }).eq('id', id);
  if (error) return dbFail(error);
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function findDuplicates(
  givenNames: string,
  surname: string,
  birthYear: number | null,
  excludeId: string | null,
): Promise<PersonCard[]> {
  const db = await editorDb();
  if (!db) return [];
  const args = z
    .object({
      givenNames: z.string().max(120),
      surname: z.string().max(120),
      birthYear: z.number().int().min(1000).max(3000).nullable(),
      excludeId: z.uuid().nullable(),
    })
    .safeParse({ givenNames, surname, birthYear, excludeId });
  if (!args.success) return [];
  const { data } = await db.rpc('find_possible_duplicates', {
    p_given_names: args.data.givenNames,
    p_surname: args.data.surname,
    p_birth_year: args.data.birthYear ?? undefined,
    p_exclude: args.data.excludeId ?? undefined,
  });
  return (data ?? []).map((r) => r.card as unknown as PersonCard);
}

// ---------------------------------------------------------------------------
// Relationship editing
// ---------------------------------------------------------------------------

const linkUpdateSchema = z.object({
  relationshipType: z.enum(PARENT_RELATIONSHIPS),
  confidence: z.enum(CONFIDENCES),
});

export async function updateParentLink(
  linkId: string,
  input: z.input<typeof linkUpdateSchema>,
): Promise<ActionResult> {
  const db = await editorDb();
  if (!db) return fail('You do not have permission to edit relationships.');
  const parsed = linkUpdateSchema.safeParse(input);
  if (!parsed.success || !z.uuid().safeParse(linkId).success) return fail('Please check the form.');
  const { error } = await db
    .from('parent_child')
    .update({ relationship_type: parsed.data.relationshipType, confidence: parsed.data.confidence })
    .eq('id', linkId);
  if (error) return dbFail(error);
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function removeParentLink(linkId: string): Promise<ActionResult> {
  const db = await editorDb();
  if (!db) return fail('You do not have permission to edit relationships.');
  if (!z.uuid().safeParse(linkId).success) return fail('Unknown link.');
  const { error } = await db.from('parent_child').delete().eq('id', linkId);
  if (error) return dbFail(error);
  revalidatePath('/', 'layout');
  return { ok: true };
}

const unionUpdateSchema = z.object({
  unionType: z.enum(UNION_TYPES),
  start: fuzzyDateFieldsSchema,
  end: fuzzyDateFieldsSchema,
  endReason: z.enum([...UNION_END_REASONS, '']).default(''),
  order: z.coerce.number().int().min(1).max(50),
  confidence: z.enum(CONFIDENCES),
});

export async function updateUnion(
  unionId: string,
  personId: string,
  input: z.input<typeof unionUpdateSchema>,
): Promise<ActionResult> {
  const db = await editorDb();
  if (!db) return fail('You do not have permission to edit relationships.');
  const parsed = unionUpdateSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const { data: union } = await db
    .from('unions')
    .select('partner_a_id, partner_b_id')
    .eq('id', unionId)
    .maybeSingle();
  if (!union) return fail('Unknown marriage.');
  const orderColumn = union.partner_a_id === personId ? 'partner_a_order' : 'partner_b_order';
  const { error } = await db
    .from('unions')
    .update({
      union_type: parsed.data.unionType,
      ...fuzzyDateToRow('start', fieldsToFuzzyDate(parsed.data.start)),
      ...fuzzyDateToRow('end', fieldsToFuzzyDate(parsed.data.end)),
      end_reason: parsed.data.endReason || null,
      confidence: parsed.data.confidence,
      [orderColumn]: parsed.data.order,
    } as never)
    .eq('id', unionId);
  if (error) return dbFail(error);
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function removeUnion(unionId: string): Promise<ActionResult> {
  const db = await editorDb();
  if (!db) return fail('You do not have permission to edit relationships.');
  if (!z.uuid().safeParse(unionId).success) return fail('Unknown marriage.');
  const { error } = await db.from('unions').delete().eq('id', unionId);
  if (error) return dbFail(error);
  revalidatePath('/', 'layout');
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Places
// ---------------------------------------------------------------------------

export interface PlaceOption {
  id: string;
  name: string;
  town: string | null;
  region: string | null;
  country: string | null;
}

export async function searchPlaces(q: string): Promise<PlaceOption[]> {
  const db = await editorDb();
  if (!db) return [];
  const term = q.trim().slice(0, 80);
  let query = db.from('v_places').select('id, name, town, region, country').order('name').limit(10);
  if (term) {
    const escaped = term.replace(/[%_,()]/g, ' ');
    query = query.or(`name.ilike.%${escaped}%,town.ilike.%${escaped}%,region.ilike.%${escaped}%`);
  }
  const { data } = await query;
  return (data ?? []).map((p) => ({
    id: p.id!,
    name: p.name!,
    town: p.town,
    region: p.region,
    country: p.country,
  }));
}

export async function createPlace(input: PlaceInput): Promise<ActionResult<PlaceOption>> {
  const db = await editorDb();
  if (!db) return fail('You do not have permission to add places.');
  const parsed = placeSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const { data, error } = await db
    .from('places')
    .insert({
      name: parsed.data.name,
      town: parsed.data.town || null,
      region: parsed.data.region || null,
      country: parsed.data.country || null,
    })
    .select('id, name, town, region, country')
    .single();
  if (error) return dbFail(error);
  return { ok: true, data };
}
