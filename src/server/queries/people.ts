import 'server-only';

import { cache } from 'react';

import type {
  CitationRow,
  FactRow,
  PersonCard,
  PersonFamily,
  PersonNameRow,
  PersonRow,
  PlaceRow,
  SearchResult,
  SourceRow,
  TreeWindow,
  Lineage,
} from '@/lib/types';

import { getPhotoThumbUrls, withSignedUrls, type SignedMedia } from '../media';
import type { Db } from '../supabase';

export const getPersonBySlug = cache(async (db: Db, slug: string): Promise<PersonRow | null> => {
  const { data, error } = await db.from('v_persons').select('*').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return data;
});

export async function getPersonById(db: Db, id: string): Promise<PersonRow | null> {
  const { data, error } = await db.from('v_persons').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getPersonNames(db: Db, personId: string): Promise<PersonNameRow[]> {
  const { data, error } = await db
    .from('v_person_names')
    .select('*')
    .eq('person_id', personId)
    .order('is_primary', { ascending: false })
    .order('sort_order');
  if (error) throw error;
  return data ?? [];
}

export async function getPersonFamily(db: Db, personId: string): Promise<PersonFamily> {
  const { data, error } = await db.rpc('get_person_family', { p_person_id: personId });
  if (error) throw error;
  return (data as unknown as PersonFamily) ?? { parents: [], unions: [], children: [], siblings: [] };
}

export async function getPlaces(
  db: Db,
  ids: (string | null | undefined)[],
): Promise<Record<string, PlaceRow>> {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (unique.length === 0) return {};
  const { data, error } = await db.from('v_places').select('*').in('id', unique);
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((p) => [p.id!, p]));
}

export interface PersonSources {
  facts: FactRow[];
  citations: CitationRow[];
  sources: Record<string, SourceRow>;
}

export async function getPersonFactsAndSources(
  db: Db,
  personId: string,
  family: PersonFamily,
  nameIds: string[],
): Promise<PersonSources> {
  const { data: facts, error } = await db.from('v_facts').select('*').eq('person_id', personId);
  if (error) throw error;

  const factIds = (facts ?? []).map((f) => f.id!);
  const parentLinkIds = family.parents.map((p) => p.linkId);
  const unionIds = family.unions.map((u) => u.id);

  const filters = [`person_id.eq.${personId}`];
  if (factIds.length) filters.push(`fact_id.in.(${factIds.join(',')})`);
  if (nameIds.length) filters.push(`name_id.in.(${nameIds.join(',')})`);
  if (parentLinkIds.length) filters.push(`parent_child_id.in.(${parentLinkIds.join(',')})`);
  if (unionIds.length) filters.push(`union_id.in.(${unionIds.join(',')})`);

  const { data: citations, error: citeError } = await db
    .from('v_citations')
    .select('*')
    .or(filters.join(','));
  if (citeError) throw citeError;

  const sourceIds = [...new Set((citations ?? []).map((c) => c.source_id!))];
  let sources: Record<string, SourceRow> = {};
  if (sourceIds.length) {
    const { data, error: sourceError } = await db.from('v_sources').select('*').in('id', sourceIds);
    if (sourceError) throw sourceError;
    sources = Object.fromEntries((data ?? []).map((s) => [s.id!, s]));
  }
  return { facts: facts ?? [], citations: citations ?? [], sources };
}

export async function getPersonMedia(db: Db, personId: string): Promise<SignedMedia[]> {
  const { data: tags, error } = await db.from('v_media_people').select('media_id').eq('person_id', personId);
  if (error) throw error;
  const ids = (tags ?? []).map((t) => t.media_id!);
  if (ids.length === 0) return [];
  const { data, error: mediaError } = await db
    .from('v_media')
    .select('*')
    .in('id', ids)
    .order('created_at', { ascending: false });
  if (mediaError) throw mediaError;
  return withSignedUrls(data ?? []);
}

export async function searchPeople(
  db: Db,
  q: string,
  { limit = 20, offset = 0 }: { limit?: number; offset?: number } = {},
): Promise<{ results: SearchResult[]; total: number }> {
  if (q.trim().length < 2) return { results: [], total: 0 };
  const { data, error } = await db.rpc('search_people', { q, max_results: limit, skip: offset });
  if (error) throw error;
  const rows = data ?? [];
  return {
    total: Number(rows[0]?.total_count ?? 0),
    results: rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      displayName: r.display_name,
      matchedName: r.matched_name,
      card: r.card as unknown as PersonCard,
      parentNames: r.parent_names ?? [],
    })),
  };
}

export async function getRecentPeople(db: Db, limit = 8): Promise<PersonRow[]> {
  const { data, error } = await db
    .from('v_persons')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getSiteStats(db: Db) {
  const { data, error } = await db.rpc('get_site_stats');
  if (error) throw error;
  return data as unknown as { people: number; generations: number; photos: number; documents: number };
}

export async function getTreeWindow(
  db: Db,
  focusId: string,
  up: number,
  down: number,
  lineage: Lineage,
): Promise<TreeWindow | null> {
  const { data, error } = await db.rpc('get_tree_window', {
    p_focus: focusId,
    p_up: up,
    p_down: down,
    p_lineage: lineage,
  });
  if (error) throw error;
  return (data as unknown as TreeWindow) ?? null;
}

/** Convert a v_persons row to the compact card shape. */
export function toCard(p: PersonRow): PersonCard {
  const yearOf = (d: string | null) => (d ? Number(d.slice(0, 4)) : null);
  return {
    id: p.id!,
    slug: p.slug!,
    name: p.display_name ?? 'Unknown',
    sex: p.sex ?? 'unknown',
    isLiving: p.is_living ?? true,
    canViewDetails: p.can_view_details ?? false,
    photoId: p.profile_photo_id,
    birthYear: p.birth_year,
    birthQualifier: p.birth_qualifier,
    birthYearEnd: yearOf(p.birth_date_end),
    deathYear: p.death_year,
    deathQualifier: p.death_qualifier,
    deathYearEnd: yearOf(p.death_date_end),
    deathText: p.death_text,
  };
}

export { getPhotoThumbUrls };
