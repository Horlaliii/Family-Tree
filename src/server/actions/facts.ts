'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { fieldsToFuzzyDate, fuzzyDateToRow } from '@/lib/dates/fuzzy-date';
import { addCitationSchema, factSchema, type AddCitationInput, type FactInput } from '@/lib/validation/facts';

import { createUserSupabase } from '../supabase';
import { canEdit, getViewer } from '../viewer';
import { dbFail, fail, zodFail, type ActionResult } from './result';

async function editorDb() {
  return canEdit(await getViewer()) ? createUserSupabase() : null;
}

export async function saveFact(
  personId: string,
  factId: string | null,
  input: FactInput,
): Promise<ActionResult<{ id: string }>> {
  const db = await editorDb();
  if (!db) return fail('You do not have permission to edit life events.');
  if (!z.uuid().safeParse(personId).success) return fail('Unknown person.');
  const parsed = factSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const v = parsed.data;
  const row = {
    person_id: personId,
    fact_type: v.factType,
    custom_label: v.factType === 'custom' ? v.customLabel : null,
    ...fuzzyDateToRow('fact', fieldsToFuzzyDate(v.date)),
    place_id: v.placeId,
    description: v.description || null,
    confidence: v.confidence,
  } as const;

  const query = factId
    ? db
        .from('facts')
        .update(row as never)
        .eq('id', factId)
        .eq('person_id', personId)
        .select('id')
        .single()
    : db
        .from('facts')
        .insert(row as never)
        .select('id')
        .single();
  const { data, error } = await query;
  if (error) return dbFail(error);
  revalidatePath('/', 'layout');
  return { ok: true, data: { id: data.id } };
}

export async function deleteFact(factId: string): Promise<ActionResult> {
  const db = await editorDb();
  if (!db) return fail('You do not have permission to edit life events.');
  if (!z.uuid().safeParse(factId).success) return fail('Unknown event.');
  const { error } = await db.from('facts').update({ deleted_at: new Date().toISOString() }).eq('id', factId);
  if (error) return dbFail(error);
  revalidatePath('/', 'layout');
  return { ok: true };
}

export interface SourceOption {
  id: string;
  title: string;
  sourceType: string;
  informant: string | null;
}

export async function searchSources(q: string): Promise<SourceOption[]> {
  const db = await editorDb();
  if (!db) return [];
  const term = q
    .trim()
    .slice(0, 80)
    .replace(/[%_,()]/g, ' ');
  let query = db.from('v_sources').select('id, title, source_type, informant').order('title').limit(10);
  if (term) query = query.or(`title.ilike.%${term}%,informant.ilike.%${term}%`);
  const { data } = await query;
  return (data ?? []).map((s) => ({
    id: s.id!,
    title: s.title!,
    sourceType: s.source_type!,
    informant: s.informant,
  }));
}

export async function addCitation(input: AddCitationInput): Promise<ActionResult> {
  const db = await editorDb();
  if (!db) return fail('You do not have permission to add sources.');
  const parsed = addCitationSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const { target, source, detail } = parsed.data;

  let sourceId: string;
  if (source.mode === 'existing') {
    sourceId = source.sourceId;
  } else {
    const s = source.source;
    const { data, error } = await db
      .from('sources')
      .insert({
        title: s.title,
        source_type: s.sourceType,
        informant: s.informant || null,
        recorded_on: s.recordedOn || null,
        notes: s.notes || null,
        media_id: s.mediaId,
      })
      .select('id')
      .single();
    if (error) return dbFail(error);
    sourceId = data.id;
  }

  const link =
    target.kind === 'fact'
      ? { fact_id: target.factId }
      : target.kind === 'union'
        ? { union_id: target.unionId }
        : target.kind === 'parent_child'
          ? { parent_child_id: target.linkId }
          : { person_id: target.personId, person_field: target.kind };

  const { error } = await db
    .from('citations')
    .insert({ source_id: sourceId, detail: detail || null, ...link });
  if (error) return dbFail(error);
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function removeCitation(citationId: string): Promise<ActionResult> {
  const db = await editorDb();
  if (!db) return fail('You do not have permission to remove sources.');
  if (!z.uuid().safeParse(citationId).success) return fail('Unknown source link.');
  const { error } = await db.from('citations').delete().eq('id', citationId);
  if (error) return dbFail(error);
  revalidatePath('/', 'layout');
  return { ok: true };
}
