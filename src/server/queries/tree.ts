import 'server-only';

import { z } from 'zod';

import type { Lineage, TreeWindow } from '@/lib/types';

import { getPhotoThumbUrls } from '../media';
import type { Db } from '../supabase';
import { getTreeWindow } from './people';

export const treeParamsSchema = z.object({
  focus: z.string().trim().max(120).optional(),
  up: z.coerce.number().int().min(0).max(8).catch(3).default(3),
  down: z.coerce.number().int().min(0).max(8).catch(2).default(2),
  line: z.enum(['both', 'paternal', 'maternal']).catch('paternal').default('paternal'),
});

export type TreeParams = z.output<typeof treeParamsSchema>;

/** Accepts a person id or slug. */
export async function resolvePersonId(db: Db, idOrSlug: string): Promise<string | null> {
  const column = z.uuid().safeParse(idOrSlug).success ? 'id' : 'slug';
  const { data } = await db.from('v_persons').select('id').eq(column, idOrSlug).maybeSingle();
  return data?.id ?? null;
}

export interface TreePayload {
  window: TreeWindow;
  photos: Record<string, string>;
}

export async function loadTree(
  db: Db,
  focusId: string,
  up: number,
  down: number,
  line: Lineage,
): Promise<TreePayload | null> {
  const window = await getTreeWindow(db, focusId, up, down, line);
  if (!window) return null;
  const photos = await getPhotoThumbUrls(
    db,
    window.nodes.map((n) => n.photoId),
  );
  return { window, photos };
}
