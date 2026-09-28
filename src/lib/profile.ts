// Pure helpers for the profile page: grouping the family, building the
// timeline and listing gaps. Kept free of React so they can be unit-tested.

import { fuzzyDateFromRow, fuzzyDateSortKey, type FuzzyDate } from './dates/fuzzy-date';
import type {
  CitationRow,
  Confidence,
  FactRow,
  FamilyChild,
  FamilyUnion,
  PersonFamily,
  PersonRow,
  SourceRow,
} from './types';
import { FACT_TYPE_LABELS, UNION_TYPE_LABELS } from './types';

export interface ChildGroup {
  key: string;
  union: FamilyUnion | null;
  children: FamilyChild[];
}

/** Children grouped under the union of both parents; the rest at the end. */
export function groupChildrenByUnion(family: PersonFamily): ChildGroup[] {
  const groups: ChildGroup[] = family.unions.map((u) => ({ key: u.id, union: u, children: [] }));
  const byPartner = new Map(family.unions.map((u, i) => [u.partner.id, i]));
  const other: FamilyChild[] = [];
  for (const child of family.children) {
    const idx = child.otherParentIds.map((id) => byPartner.get(id)).find((i) => i !== undefined);
    const group = idx !== undefined ? groups[idx] : undefined;
    if (group) group.children.push(child);
    else other.push(child);
  }
  if (other.length) groups.push({ key: 'other', union: null, children: other });
  return groups;
}

export interface TimelineCitation {
  id: string;
  detail: string | null;
  source: SourceRow;
}

export interface TimelineEntry {
  key: string;
  kind: 'birth' | 'death' | 'union-start' | 'union-end' | 'fact';
  title: string;
  date: FuzzyDate;
  placeId: string | null;
  description: string | null;
  confidence: Confidence | null;
  citations: TimelineCitation[];
  factId?: string;
}

function citationsFor(
  citations: CitationRow[],
  sources: Record<string, SourceRow>,
  match: (c: CitationRow) => boolean,
): TimelineCitation[] {
  return citations.filter(match).flatMap((c) => {
    const source = c.source_id ? sources[c.source_id] : undefined;
    return source && c.id ? [{ id: c.id, detail: c.detail, source }] : [];
  });
}

export function buildTimeline(
  person: PersonRow,
  family: PersonFamily,
  facts: FactRow[],
  citations: CitationRow[],
  sources: Record<string, SourceRow>,
): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  const birth = fuzzyDateFromRow(person, 'birth');
  const death = fuzzyDateFromRow(person, 'death');

  if (person.can_view_details && (birth.date || birth.text || person.birth_place_id)) {
    entries.push({
      key: 'birth',
      kind: 'birth',
      title: 'Born',
      date: birth,
      placeId: person.birth_place_id,
      description: null,
      confidence: person.birth_confidence,
      citations: citationsFor(
        citations,
        sources,
        (c) => c.person_id === person.id && c.person_field === 'birth',
      ),
    });
  }

  for (const u of family.unions) {
    if (!u.canViewDetails) continue;
    const start: FuzzyDate = {
      date: u.startDate,
      precision: u.startPrecision,
      qualifier: u.startQualifier,
      dateEnd: u.startDateEnd,
      text: u.startText,
    };
    entries.push({
      key: `union-${u.id}`,
      kind: 'union-start',
      title: `${u.type === 'unknown' ? 'Married' : UNION_TYPE_LABELS[u.type]} — ${u.partner.name}`,
      date: start,
      placeId: null,
      description: null,
      confidence: null,
      citations: citationsFor(citations, sources, (c) => c.union_id === u.id),
    });
    if (u.endReason === 'divorce' || u.endReason === 'other') {
      entries.push({
        key: `union-end-${u.id}`,
        kind: 'union-end',
        title: u.endReason === 'divorce' ? `Divorced — ${u.partner.name}` : `Separated — ${u.partner.name}`,
        date: {
          date: u.endDate,
          precision: u.endPrecision,
          qualifier: u.endQualifier,
          dateEnd: u.endDateEnd,
          text: u.endText,
        },
        placeId: null,
        description: null,
        confidence: null,
        citations: [],
      });
    }
  }

  for (const f of facts) {
    entries.push({
      key: `fact-${f.id}`,
      kind: 'fact',
      factId: f.id ?? undefined,
      title: f.fact_type === 'custom' ? (f.custom_label ?? 'Event') : FACT_TYPE_LABELS[f.fact_type!],
      date: fuzzyDateFromRow(f, 'fact'),
      placeId: f.place_id,
      description: f.description,
      confidence: f.confidence,
      citations: citationsFor(citations, sources, (c) => c.fact_id === f.id),
    });
  }

  if (!person.is_living && (death.date || death.text || person.death_place_id)) {
    entries.push({
      key: 'death',
      kind: 'death',
      title: 'Died',
      date: death,
      placeId: person.death_place_id,
      description: null,
      confidence: person.death_confidence,
      citations: citationsFor(
        citations,
        sources,
        (c) => c.person_id === person.id && c.person_field === 'death',
      ),
    });
  }

  return orderTimeline(entries);
}

/**
 * Dated events in date order (ties keep their original order). An undated
 * birth goes first, undated events go just before the death, and an
 * undated death goes last.
 */
export function orderTimeline(entries: TimelineEntry[]): TimelineEntry[] {
  const dated = entries
    .map((e, i) => ({ e, i, k: fuzzyDateSortKey(e.date) }))
    .filter((x): x is { e: TimelineEntry; i: number; k: number } => x.k !== null)
    .sort((a, b) => a.k - b.k || a.i - b.i)
    .map((x) => x.e);
  const undated = entries.filter((e) => fuzzyDateSortKey(e.date) === null);
  const undatedBirth = undated.filter((e) => e.kind === 'birth');
  const undatedDeath = undated.filter((e) => e.kind === 'death');
  const undatedOther = undated.filter((e) => e.kind !== 'birth' && e.kind !== 'death');

  const result = [...undatedBirth, ...dated];
  const deathIndex = result.findIndex((e) => e.kind === 'death');
  if (deathIndex >= 0) result.splice(deathIndex, 0, ...undatedOther);
  else result.push(...undatedOther);
  return [...result, ...undatedDeath];
}

export interface Gap {
  key: string;
  message: string;
  action?: { label: string; href: string };
}

export function findGaps(
  person: PersonRow,
  family: PersonFamily,
  facts: FactRow[],
  citations: CitationRow[],
): Gap[] {
  if (!person.can_view_details) return [];
  const slug = person.slug!;
  const gaps: Gap[] = [];
  const parents = family.parents.filter(
    (p) => p.relationshipType === 'biological' || p.relationshipType === 'adoptive',
  );
  if (!parents.some((p) => p.sex === 'male')) {
    gaps.push({
      key: 'father',
      message: 'Father unknown',
      action: { label: 'Add father', href: `/people/${slug}/add/father` },
    });
  }
  if (!parents.some((p) => p.sex === 'female')) {
    gaps.push({
      key: 'mother',
      message: 'Mother unknown',
      action: { label: 'Add mother', href: `/people/${slug}/add/mother` },
    });
  }
  if (!person.birth_date && !person.birth_text) {
    gaps.push({
      key: 'birth',
      message: 'No birth date',
      action: { label: 'Add', href: `/people/${slug}/edit` },
    });
  }
  if (!person.birth_place_id) {
    gaps.push({
      key: 'birthplace',
      message: 'No birthplace',
      action: { label: 'Add', href: `/people/${slug}/edit` },
    });
  }
  if (!person.is_living && !person.death_date && !person.death_text) {
    gaps.push({
      key: 'death',
      message: 'No death date',
      action: { label: 'Add', href: `/people/${slug}/edit` },
    });
  }
  if (!person.profile_photo_id) {
    gaps.push({
      key: 'photo',
      message: 'No photo yet',
      action: { label: 'Add photo', href: `/people/${slug}/media` },
    });
  }
  const unsourced = facts.filter((f) => !citations.some((c) => c.fact_id === f.id)).length;
  if (unsourced > 0) {
    gaps.push({
      key: 'sources',
      message: `${unsourced} ${unsourced === 1 ? 'fact has' : 'facts have'} no source`,
      action: { label: 'Add sources', href: `/people/${slug}/facts` },
    });
  }
  return gaps;
}
