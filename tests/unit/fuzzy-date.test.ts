import { describe, expect, it } from 'vitest';

import {
  fieldsToFuzzyDate,
  formatFuzzyDate,
  formatLifeYears,
  formatYear,
  fuzzyDateFromRow,
  fuzzyDateToFields,
  fuzzyDateToRow,
  isValidFuzzyDate,
  type FuzzyDate,
} from '@/lib/dates/fuzzy-date';

const d = (partial: Partial<FuzzyDate>): FuzzyDate => ({
  date: null,
  precision: null,
  qualifier: null,
  dateEnd: null,
  text: null,
  ...partial,
});

describe('formatFuzzyDate', () => {
  it('shows Unknown when there is nothing', () => {
    expect(formatFuzzyDate(null)).toBe('Unknown');
    expect(formatFuzzyDate(d({}))).toBe('Unknown');
    expect(formatFuzzyDate(d({}), { unknown: '' })).toBe('');
  });

  it('uses free text when there is no date', () => {
    expect(formatFuzzyDate(d({ text: 'during the war' }))).toBe('during the war');
  });

  it('formats each precision', () => {
    expect(formatFuzzyDate(d({ date: '1942-01-01', precision: 'year' }))).toBe('1942');
    expect(formatFuzzyDate(d({ date: '1942-03-01', precision: 'month' }))).toBe('Mar 1942');
    expect(formatFuzzyDate(d({ date: '1941-03-14', precision: 'day' }))).toBe('14 Mar 1941');
  });

  it('formats qualifiers', () => {
    expect(formatFuzzyDate(d({ date: '1942-01-01', precision: 'year', qualifier: 'about' }))).toBe('c. 1942');
    expect(formatFuzzyDate(d({ date: '1960-01-01', precision: 'year', qualifier: 'before' }))).toBe(
      'before 1960',
    );
    expect(formatFuzzyDate(d({ date: '1960-01-01', precision: 'year', qualifier: 'after' }))).toBe(
      'after 1960',
    );
    expect(
      formatFuzzyDate(
        d({ date: '1903-01-01', precision: 'year', qualifier: 'between', dateEnd: '1906-01-01' }),
      ),
    ).toBe('between 1903 and 1906');
  });
});

describe('formatYear and formatLifeYears', () => {
  it('formats compact years', () => {
    expect(formatYear(1868, 'about')).toBe('c. 1868');
    expect(formatYear(1903, 'between', 1906)).toBe('1903/1906');
    expect(formatYear(null)).toBeNull();
  });

  it('formats life spans for the deceased', () => {
    expect(
      formatLifeYears({ isLiving: false, birthYear: 1868, birthQualifier: 'about', deathYear: 1941 }),
    ).toBe('c. 1868 – 1941');
    expect(formatLifeYears({ isLiving: false, deathYear: 1941 })).toBe('d. 1941');
    expect(formatLifeYears({ isLiving: false, birthYear: 1903 })).toBe('1903 – ?');
    expect(formatLifeYears({ isLiving: false })).toBe('Deceased');
  });

  it('never shows a death for the living', () => {
    expect(formatLifeYears({ isLiving: true, birthYear: 1984 })).toBe('b. 1984');
    expect(formatLifeYears({ isLiving: true })).toBe('');
  });
});

describe('form fields', () => {
  it('round-trips a full date', () => {
    const date = fieldsToFuzzyDate({
      qualifier: 'exact',
      year: '1941',
      month: '3',
      day: '14',
      endYear: '',
      text: '',
    });
    expect(date).toEqual(d({ date: '1941-03-14', precision: 'day', qualifier: 'exact' }));
    expect(fuzzyDateToFields(date)).toMatchObject({ year: '1941', month: '3', day: '14' });
  });

  it('keeps year-only dates at year precision', () => {
    expect(
      fieldsToFuzzyDate({ qualifier: 'about', year: '1868', month: '', day: '', endYear: '', text: '' }),
    ).toEqual(d({ date: '1868-01-01', precision: 'year', qualifier: 'about' }));
  });

  it('ignores a day without a month', () => {
    expect(
      fieldsToFuzzyDate({ qualifier: 'exact', year: '1900', month: '', day: '5', endYear: '', text: '' })
        .precision,
    ).toBe('year');
  });

  it('handles between ranges', () => {
    const date = fieldsToFuzzyDate({
      qualifier: 'between',
      year: '1903',
      month: '',
      day: '',
      endYear: '1906',
      text: '',
    });
    expect(date.dateEnd).toBe('1906-01-01');
    // "between" without an end year falls back to exact
    expect(
      fieldsToFuzzyDate({ qualifier: 'between', year: '1903', month: '', day: '', endYear: '', text: '' })
        .qualifier,
    ).toBe('exact');
  });

  it('keeps free text alone', () => {
    expect(
      fieldsToFuzzyDate({
        qualifier: 'exact',
        year: '',
        month: '',
        day: '',
        endYear: '',
        text: ' during the war ',
      }),
    ).toEqual(d({ text: 'during the war' }));
  });
});

describe('validation', () => {
  it('rejects impossible calendar dates', () => {
    expect(isValidFuzzyDate(d({ date: '1941-02-31', precision: 'day' }))).toBe(false);
    expect(isValidFuzzyDate(d({ date: '1941-02-28', precision: 'day' }))).toBe(true);
  });

  it('rejects a between range that ends before it starts', () => {
    expect(
      isValidFuzzyDate(
        d({ date: '1910-01-01', precision: 'year', qualifier: 'between', dateEnd: '1905-01-01' }),
      ),
    ).toBe(false);
  });
});

describe('database rows', () => {
  it('reads and writes prefixed columns', () => {
    const row = {
      birth_date: '1868-01-01',
      birth_precision: 'year',
      birth_qualifier: 'about',
      birth_date_end: null,
      birth_text: null,
    };
    const date = fuzzyDateFromRow(row, 'birth');
    expect(date).toEqual(d({ date: '1868-01-01', precision: 'year', qualifier: 'about' }));
    expect(fuzzyDateToRow('birth', date)).toEqual(row);
  });

  it('clears date columns when only text is given', () => {
    expect(fuzzyDateToRow('death', d({ text: 'during the war' }))).toEqual({
      death_date: null,
      death_precision: null,
      death_qualifier: null,
      death_date_end: null,
      death_text: 'during the war',
    });
  });
});
