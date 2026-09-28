import { describe, expect, it } from 'vitest';

import { buildTimeline, findGaps, groupChildrenByUnion } from '@/lib/profile';
import type { FactRow, FamilyChild, FamilyUnion, PersonCard, PersonFamily, PersonRow } from '@/lib/types';

const card = (id: string, sex: PersonCard['sex'] = 'unknown'): PersonCard => ({
  id,
  slug: id,
  name: id,
  sex,
  isLiving: false,
  canViewDetails: true,
  photoId: null,
  birthYear: null,
  birthQualifier: null,
  birthYearEnd: null,
  deathYear: null,
  deathQualifier: null,
  deathYearEnd: null,
  deathText: null,
});

const union = (id: string, partner: string, order: number): FamilyUnion => ({
  id,
  type: 'customary',
  order,
  canViewDetails: true,
  startDate: null,
  startPrecision: null,
  startQualifier: null,
  startDateEnd: null,
  startText: null,
  endDate: null,
  endPrecision: null,
  endQualifier: null,
  endDateEnd: null,
  endText: null,
  endReason: null,
  partner: card(partner, 'female'),
});

const child = (id: string, otherParentIds: string[]): FamilyChild => ({
  ...card(id),
  linkId: `link-${id}`,
  relationshipType: 'biological',
  confidence: 'confirmed',
  otherParentIds,
});

const person = (over: Partial<PersonRow> = {}): PersonRow =>
  ({
    id: 'p',
    slug: 'p',
    display_name: 'Kofi Mensah',
    sex: 'male',
    is_living: false,
    can_view_details: true,
    profile_photo_id: null,
    birth_date: null,
    birth_precision: null,
    birth_qualifier: null,
    birth_date_end: null,
    birth_text: null,
    birth_year: null,
    birth_place_id: null,
    birth_confidence: null,
    death_date: null,
    death_precision: null,
    death_qualifier: null,
    death_date_end: null,
    death_text: null,
    death_year: null,
    death_place_id: null,
    death_confidence: null,
    ...over,
  }) as PersonRow;

const emptyFamily: PersonFamily = { parents: [], unions: [], children: [], siblings: [] };

describe('groupChildrenByUnion', () => {
  it('puts each child under the union with their other parent', () => {
    const family: PersonFamily = {
      ...emptyFamily,
      unions: [union('u1', 'ama', 1), union('u2', 'yaa', 2)],
      children: [
        child('kwabena', ['ama']),
        child('akwasi', ['yaa']),
        child('efua', ['ama']),
        child('esi', []),
      ],
    };
    const groups = groupChildrenByUnion(family);
    expect(groups.map((g) => [g.key, g.children.map((c) => c.id)])).toEqual([
      ['u1', ['kwabena', 'efua']],
      ['u2', ['akwasi']],
      ['other', ['esi']],
    ]);
  });
});

describe('buildTimeline', () => {
  it('orders events by date with birth first and death last', () => {
    const p = person({
      birth_date: '1898-01-01',
      birth_precision: 'year',
      birth_qualifier: 'exact',
      death_date: '1972-08-02',
      death_precision: 'day',
      death_qualifier: 'exact',
    });
    const facts = [
      { id: 'f1', fact_type: 'burial', fact_date: '1972-08-12', fact_precision: 'day' },
      { id: 'f2', fact_type: 'occupation', fact_date: null },
      { id: 'f3', fact_type: 'baptism', fact_date: '1900-01-01', fact_precision: 'year' },
    ] as FactRow[];
    const entries = buildTimeline(p, emptyFamily, facts, [], {});
    expect(entries.map((e) => e.key)).toEqual(['birth', 'fact-f3', 'fact-f1', 'death', 'fact-f2']);
  });

  it('hides birth details that the viewer may not see', () => {
    const p = person({ can_view_details: false, is_living: true, birth_date: null });
    expect(buildTimeline(p, emptyFamily, [], [], {})).toEqual([]);
  });
});

describe('findGaps', () => {
  it('lists missing parents, dates and photo', () => {
    const gaps = findGaps(person(), emptyFamily, [], []).map((g) => g.key);
    expect(gaps).toEqual(['father', 'mother', 'birth', 'birthplace', 'death', 'photo']);
  });

  it('shows nothing when the viewer cannot see details', () => {
    expect(findGaps(person({ can_view_details: false }), emptyFamily, [], [])).toEqual([]);
  });

  it('counts unsourced facts', () => {
    const facts = [{ id: 'f1' }, { id: 'f2' }] as FactRow[];
    const gaps = findGaps(person(), emptyFamily, facts, [{ fact_id: 'f1' } as never]);
    expect(gaps.find((g) => g.key === 'sources')?.message).toBe('1 fact has no source');
  });
});
