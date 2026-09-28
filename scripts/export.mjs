#!/usr/bin/env node
// Full backup from the command line: writes backups/<date>/data.json and
// every media file. Uses the service-role key, so run it only on a trusted
// machine:  node --env-file=.env.local scripts/export.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (e.g. node --env-file=.env.local ...)',
  );
  process.exit(1);
}

const TABLES = [
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
];

const db = createClient(url, key, { auth: { persistSession: false } });
const out = join('backups', new Date().toISOString().slice(0, 19).replace(/:/g, '-'));
mkdirSync(join(out, 'media'), { recursive: true });

const tables = {};
for (const table of TABLES) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from(table)
      .select('*')
      .range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) break;
  }
  tables[table] = rows;
  console.log(`${table}: ${rows.length} rows`);
}
writeFileSync(
  join(out, 'data.json'),
  JSON.stringify(
    { format: 'our-family-tree-export', version: 1, exportedAt: new Date().toISOString(), tables },
    null,
    2,
  ),
);

let files = 0;
for (const m of tables.media) {
  for (const path of [m.storage_path, m.thumbnail_path].filter(Boolean)) {
    const { data, error } = await db.storage.from('media').download(path);
    if (error) {
      console.warn(`Could not download ${path}: ${error.message}`);
      continue;
    }
    const target = join(out, 'media', path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, Buffer.from(await data.arrayBuffer()));
    files++;
  }
}
console.log(`Saved ${files} media files to ${out}`);
