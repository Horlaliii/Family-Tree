'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { fieldsToFuzzyDate, fuzzyDateToRow } from '@/lib/dates/fuzzy-date';
import { fuzzyDateFieldsSchema } from '@/lib/validation/person';

import { createUserSupabase } from '../supabase';
import { canEdit, getViewer } from '../viewer';
import { dbFail, fail, zodFail, type ActionResult } from './result';

async function editorDb() {
  return canEdit(await getViewer()) ? createUserSupabase() : null;
}

const pathSchema = z
  .string()
  .regex(/^[0-9a-f-]{36}\/(original\.(jpg|pdf)|thumb\.webp)$/, 'Unexpected file path');

const createSchema = z.object({
  id: z.uuid(),
  storagePath: pathSchema,
  thumbnailPath: pathSchema.nullable(),
  mediaType: z.enum(['photo', 'document']),
  mimeType: z.enum(['image/jpeg', 'application/pdf']),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  bytes: z
    .number()
    .int()
    .positive()
    .max(30 * 1024 * 1024),
  originalFilename: z.string().max(255),
  caption: z.string().trim().max(500).default(''),
  personIds: z.array(z.uuid()).max(50),
});

export async function createMedia(
  input: z.input<typeof createSchema>,
): Promise<ActionResult<{ id: string }>> {
  const db = await editorDb();
  if (!db) return fail('You do not have permission to upload.');
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);
  const m = parsed.data;
  if (!m.storagePath.startsWith(`${m.id}/`) || (m.thumbnailPath && !m.thumbnailPath.startsWith(`${m.id}/`))) {
    return fail('Unexpected file path');
  }

  const { error } = await db.from('media').insert({
    id: m.id,
    storage_path: m.storagePath,
    thumbnail_path: m.thumbnailPath,
    media_type: m.mediaType,
    mime_type: m.mimeType,
    width: m.width,
    height: m.height,
    bytes: m.bytes,
    original_filename: m.originalFilename,
    caption: m.caption || null,
  });
  if (error) return dbFail(error);
  if (m.personIds.length) {
    const { error: tagError } = await db
      .from('media_people')
      .insert(m.personIds.map((person_id) => ({ media_id: m.id, person_id })));
    if (tagError) return dbFail(tagError);
  }
  revalidatePath('/', 'layout');
  return { ok: true, data: { id: m.id } };
}

const updateSchema = z.object({
  caption: z.string().trim().max(500).default(''),
  date: fuzzyDateFieldsSchema,
});

export async function updateMedia(
  mediaId: string,
  input: z.input<typeof updateSchema>,
): Promise<ActionResult> {
  const db = await editorDb();
  if (!db) return fail('You do not have permission to edit.');
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success || !z.uuid().safeParse(mediaId).success) {
    return parsed.success ? fail('Unknown item.') : zodFail(parsed.error);
  }
  const { error } = await db
    .from('media')
    .update({
      caption: parsed.data.caption || null,
      ...fuzzyDateToRow('media', fieldsToFuzzyDate(parsed.data.date)),
    } as never)
    .eq('id', mediaId);
  if (error) return dbFail(error);
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function tagPerson(mediaId: string, personId: string): Promise<ActionResult> {
  const db = await editorDb();
  if (!db) return fail('You do not have permission to tag people.');
  if (!z.uuid().safeParse(mediaId).success || !z.uuid().safeParse(personId).success)
    return fail('Unknown item.');
  const { error } = await db.from('media_people').upsert({ media_id: mediaId, person_id: personId });
  if (error) return dbFail(error);
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function untagPerson(mediaId: string, personId: string): Promise<ActionResult> {
  const db = await editorDb();
  if (!db) return fail('You do not have permission to tag people.');
  const { error } = await db.from('media_people').delete().eq('media_id', mediaId).eq('person_id', personId);
  if (error) return dbFail(error);
  // A photo can't stay someone's profile photo once they're untagged from it.
  await db
    .from('persons')
    .update({ profile_photo_id: null })
    .eq('id', personId)
    .eq('profile_photo_id', mediaId);
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function setProfilePhoto(personId: string, mediaId: string | null): Promise<ActionResult> {
  const db = await editorDb();
  if (!db) return fail('You do not have permission to change profile photos.');
  if (!z.uuid().safeParse(personId).success || (mediaId && !z.uuid().safeParse(mediaId).success)) {
    return fail('Unknown item.');
  }
  if (mediaId) {
    const { data } = await db
      .from('media_people')
      .select('media_id, media!inner(media_type)')
      .eq('media_id', mediaId)
      .eq('person_id', personId)
      .maybeSingle();
    if (!data) return fail('Tag the person in this photo first.');
    if ((data.media as unknown as { media_type: string }).media_type !== 'photo') {
      return fail('Only photos can be profile photos.');
    }
  }
  const { error } = await db.from('persons').update({ profile_photo_id: mediaId }).eq('id', personId);
  if (error) return dbFail(error);
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function deleteMedia(mediaId: string): Promise<ActionResult> {
  const db = await editorDb();
  if (!db) return fail('You do not have permission to remove this.');
  if (!z.uuid().safeParse(mediaId).success) return fail('Unknown item.');
  await db.from('persons').update({ profile_photo_id: null }).eq('profile_photo_id', mediaId);
  const { error } = await db.from('media').update({ deleted_at: new Date().toISOString() }).eq('id', mediaId);
  if (error) return dbFail(error);
  revalidatePath('/', 'layout');
  return { ok: true };
}
