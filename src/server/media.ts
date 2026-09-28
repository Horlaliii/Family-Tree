import 'server-only';

import type { MediaRow } from '@/lib/types';

import { createAdminSupabase, type Db } from './supabase';

export const MEDIA_BUCKET = 'media';
/** Signed URLs are short-lived; pages re-sign them on every render. */
export const SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * Sign storage paths. Callers MUST only pass paths that came from the
 * viewer-scoped v_media view, which is where visibility is decided.
 */
export async function signPaths(paths: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return {};
  const { data, error } = await createAdminSupabase()
    .storage.from(MEDIA_BUCKET)
    .createSignedUrls(unique, SIGNED_URL_TTL_SECONDS);
  if (error) {
    console.error('Could not sign media URLs', error.message);
    return {};
  }
  const out: Record<string, string> = {};
  for (const item of data) {
    if (item.path && item.signedUrl) out[item.path] = item.signedUrl;
  }
  return out;
}

export interface SignedMedia extends MediaRow {
  url: string | null;
  thumbUrl: string | null;
}

export async function withSignedUrls(rows: MediaRow[]): Promise<SignedMedia[]> {
  const urls = await signPaths(rows.flatMap((m) => [m.storage_path ?? '', m.thumbnail_path ?? '']));
  return rows.map((m) => ({
    ...m,
    url: m.storage_path ? (urls[m.storage_path] ?? null) : null,
    thumbUrl: m.thumbnail_path
      ? (urls[m.thumbnail_path] ?? null)
      : m.storage_path
        ? (urls[m.storage_path] ?? null)
        : null,
  }));
}

/** Thumbnail URLs for profile photos, keyed by media id. */
export async function getPhotoThumbUrls(
  db: Db,
  photoIds: (string | null | undefined)[],
): Promise<Record<string, string>> {
  const ids = [...new Set(photoIds.filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) return {};
  const { data } = await db.from('v_media').select('id, storage_path, thumbnail_path').in('id', ids);
  if (!data?.length) return {};
  const urls = await signPaths(data.map((m) => m.thumbnail_path ?? m.storage_path ?? ''));
  const out: Record<string, string> = {};
  for (const m of data) {
    const path = m.thumbnail_path ?? m.storage_path;
    if (m.id && path && urls[path]) out[m.id] = urls[path];
  }
  return out;
}
