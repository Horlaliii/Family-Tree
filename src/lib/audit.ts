// Helpers for showing audit log entries in plain language.

type Json = Record<string, unknown> | null;

const HIDDEN = new Set(['updated_at', 'created_at', 'search_text', 'search_tsv', 'birth_year', 'death_year']);

export interface FieldChange {
  field: string;
  before: string;
  after: string;
}

function show(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  const text = String(value);
  return text.length > 120 ? `${text.slice(0, 117)}…` : text;
}

export function fieldLabel(field: string): string {
  return field.replace(/_id$/, '').replace(/_/g, ' ');
}

/** The fields that changed, for an update; every non-empty field for an insert/delete. */
export function diff(before: Json, after: Json): FieldChange[] {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  const out: FieldChange[] = [];
  for (const key of keys) {
    if (HIDDEN.has(key) || key === 'id') continue;
    const b = before?.[key];
    const a = after?.[key];
    if (before && after && JSON.stringify(a) === JSON.stringify(b)) continue;
    if (!before && (a === null || a === undefined || a === '')) continue;
    if (!after && (b === null || b === undefined || b === '')) continue;
    out.push({ field: fieldLabel(key), before: show(b), after: show(a) });
  }
  return out;
}

/** Person ids an entry is about, so the log can show names. */
export function personIdsIn(table: string, row: Json): string[] {
  if (!row) return [];
  const ids: unknown[] = [];
  switch (table) {
    case 'persons':
      ids.push(row.id);
      break;
    case 'parent_child':
      ids.push(row.parent_id, row.child_id);
      break;
    case 'unions':
      ids.push(row.partner_a_id, row.partner_b_id);
      break;
    case 'person_names':
    case 'facts':
    case 'media_people':
    case 'citations':
      ids.push(row.person_id);
      break;
  }
  return ids.filter((id): id is string => typeof id === 'string');
}

export const TABLE_LABELS: Record<string, string> = {
  persons: 'Person',
  person_names: 'Name',
  parent_child: 'Parent link',
  unions: 'Marriage',
  facts: 'Life event',
  sources: 'Source',
  citations: 'Source link',
  places: 'Place',
  media: 'Photo/document',
  media_people: 'Photo tag',
  user_profiles: 'User',
  site_settings: 'Site settings',
};

export function describeEntry(table: string, action: string, before: Json, after: Json): string {
  const what = TABLE_LABELS[table] ?? table;
  if (table === 'persons' && action === 'update' && before?.deleted_at == null && after?.deleted_at != null) {
    return 'Person removed';
  }
  if (table === 'persons' && action === 'update' && before?.deleted_at != null && after?.deleted_at == null) {
    return 'Person restored';
  }
  return `${what} ${action === 'insert' ? 'added' : action === 'delete' ? 'deleted' : 'changed'}`;
}
