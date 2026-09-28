import 'server-only';

import type { Db } from './supabase';

/** Every table worth keeping, in restore order. site_secrets is deliberately left out. */
export const EXPORT_TABLES = [
  'places',
  'persons',
  'person_names',
  'parent_child',
  'unions',
  'media',
  'media_people',
  'facts',
  'sources',
  'citations',
  'user_profiles',
  'site_settings',
  'audit_log',
] as const;

const PAGE = 1000;

async function readAll(db: Db, table: (typeof EXPORT_TABLES)[number]) {
  const rows: unknown[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from(table)
      .select('*')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

/** A complete JSON snapshot. Needs the service-role client (includes removed rows). */
export async function buildExport(db: Db) {
  const tables: Record<string, unknown[]> = {};
  for (const table of EXPORT_TABLES) tables[table] = await readAll(db, table);
  return {
    format: 'our-family-tree-export',
    version: 1,
    exportedAt: new Date().toISOString(),
    tables,
  };
}
