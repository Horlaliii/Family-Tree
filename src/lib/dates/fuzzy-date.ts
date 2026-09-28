// Fuzzy dates: "c. 1942", "before 1960", "between 1903 and 1906", "during the war".
// Mirrors public.format_fuzzy_date() in the database.

export const DATE_PRECISIONS = ['year', 'month', 'day'] as const;
export const DATE_QUALIFIERS = ['exact', 'about', 'before', 'after', 'between'] as const;

export type DatePrecision = (typeof DATE_PRECISIONS)[number];
export type DateQualifier = (typeof DATE_QUALIFIERS)[number];

export interface FuzzyDate {
  /** ISO date (YYYY-MM-DD). For year precision the month/day are 01. */
  date: string | null;
  precision: DatePrecision | null;
  qualifier: DateQualifier | null;
  /** Upper bound, used with the "between" qualifier. */
  dateEnd: string | null;
  /** Free text such as "during the war", used when there is no date. */
  text: string | null;
}

export const EMPTY_FUZZY_DATE: FuzzyDate = {
  date: null,
  precision: null,
  qualifier: null,
  dateEnd: null,
  text: null,
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseIso(iso: string): { year: number; month: number; day: number } | null {
  const m = /^(-?\d{1,4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

function formatPart(iso: string, precision: DatePrecision | null): string {
  const parts = parseIso(iso);
  if (!parts) return iso;
  const month = MONTHS[parts.month - 1] ?? '';
  switch (precision ?? 'day') {
    case 'year':
      return String(parts.year);
    case 'month':
      return `${month} ${parts.year}`;
    default:
      return `${parts.day} ${month} ${parts.year}`;
  }
}

export function isEmptyFuzzyDate(d: FuzzyDate | null | undefined): boolean {
  return !d || (!d.date && !d.text?.trim());
}

/** Full display text, e.g. "c. 1942", "14 Mar 1941", "Unknown". */
export function formatFuzzyDate(
  d: FuzzyDate | null | undefined,
  { unknown = 'Unknown' }: { unknown?: string } = {},
): string {
  if (!d || !d.date) {
    const text = d?.text?.trim();
    return text ? text : unknown;
  }
  const base = formatPart(d.date, d.precision);
  switch (d.qualifier ?? 'exact') {
    case 'about':
      return `c. ${base}`;
    case 'before':
      return `before ${base}`;
    case 'after':
      return `after ${base}`;
    case 'between':
      return `between ${base} and ${d.dateEnd ? formatPart(d.dateEnd, d.precision) : '?'}`;
    default:
      return base;
  }
}

/** Compact year label for cards and tree nodes, e.g. "c. 1868", "1903/1906". */
export function formatYear(
  year: number | null | undefined,
  qualifier?: DateQualifier | null,
  yearEnd?: number | null,
): string | null {
  if (year == null) return null;
  switch (qualifier ?? 'exact') {
    case 'about':
      return `c. ${year}`;
    case 'before':
      return `bef. ${year}`;
    case 'after':
      return `aft. ${year}`;
    case 'between':
      return yearEnd != null && yearEnd !== year ? `${year}/${yearEnd}` : String(year);
    default:
      return String(year);
  }
}

export interface LifeYearsInput {
  isLiving: boolean;
  birthYear?: number | null;
  birthQualifier?: DateQualifier | null;
  birthYearEnd?: number | null;
  deathYear?: number | null;
  deathQualifier?: DateQualifier | null;
  deathYearEnd?: number | null;
  deathText?: string | null;
}

/** "c. 1868 – 1941", "b. 1941", "d. 1941", "Deceased" or "" when nothing is known. */
export function formatLifeYears(p: LifeYearsInput): string {
  const birth = formatYear(p.birthYear, p.birthQualifier, p.birthYearEnd);
  const death = formatYear(p.deathYear, p.deathQualifier, p.deathYearEnd);
  if (p.isLiving) return birth ? `b. ${birth}` : '';
  if (birth && death) return `${birth} – ${death}`;
  if (birth) return `${birth} – ?`;
  if (death) return `d. ${death}`;
  return 'Deceased';
}

// ---------------------------------------------------------------------------
// Converting between database rows ("birth_date", "birth_precision", ...) and
// FuzzyDate objects.
// ---------------------------------------------------------------------------

type Prefixed<P extends string> = {
  [K in `${P}_date` | `${P}_precision` | `${P}_qualifier` | `${P}_date_end` | `${P}_text`]?: unknown;
};

export function fuzzyDateFromRow<P extends string>(row: Prefixed<P>, prefix: P): FuzzyDate {
  const r = row as Record<string, unknown>;
  return {
    date: (r[`${prefix}_date`] as string | null) ?? null,
    precision: (r[`${prefix}_precision`] as DatePrecision | null) ?? null,
    qualifier: (r[`${prefix}_qualifier`] as DateQualifier | null) ?? null,
    dateEnd: (r[`${prefix}_date_end`] as string | null) ?? null,
    text: (r[`${prefix}_text`] as string | null) ?? null,
  };
}

export function fuzzyDateToRow<P extends string>(
  prefix: P,
  d: FuzzyDate | null | undefined,
): Record<`${P}_date` | `${P}_precision` | `${P}_qualifier` | `${P}_date_end` | `${P}_text`, string | null> {
  const v = d ?? EMPTY_FUZZY_DATE;
  const hasDate = Boolean(v.date);
  return {
    [`${prefix}_date`]: hasDate ? v.date : null,
    [`${prefix}_precision`]: hasDate ? (v.precision ?? 'day') : null,
    [`${prefix}_qualifier`]: hasDate ? (v.qualifier ?? 'exact') : null,
    [`${prefix}_date_end`]: hasDate && v.qualifier === 'between' ? v.dateEnd : null,
    [`${prefix}_text`]: v.text?.trim() ? v.text.trim() : null,
  } as Record<
    `${P}_date` | `${P}_precision` | `${P}_qualifier` | `${P}_date_end` | `${P}_text`,
    string | null
  >;
}

// ---------------------------------------------------------------------------
// Form fields: people type a year, optionally a month and day.
// ---------------------------------------------------------------------------

export interface FuzzyDateFields {
  qualifier: DateQualifier;
  year: string;
  month: string; // "" or "1".."12"
  day: string; // "" or "1".."31"
  endYear: string;
  text: string;
}

export const EMPTY_FUZZY_DATE_FIELDS: FuzzyDateFields = {
  qualifier: 'exact',
  year: '',
  month: '',
  day: '',
  endYear: '',
  text: '',
};

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

export function fieldsToFuzzyDate(f: FuzzyDateFields): FuzzyDate {
  const year = Number.parseInt(f.year, 10);
  const text = f.text.trim() || null;
  if (!Number.isFinite(year)) {
    return { ...EMPTY_FUZZY_DATE, text };
  }
  const month = Number.parseInt(f.month, 10);
  const day = Number.parseInt(f.day, 10);
  const hasMonth = Number.isFinite(month) && month >= 1 && month <= 12;
  const hasDay = hasMonth && Number.isFinite(day) && day >= 1 && day <= 31;
  const precision: DatePrecision = hasDay ? 'day' : hasMonth ? 'month' : 'year';
  const date = `${pad(year, 4)}-${pad(hasMonth ? month : 1)}-${pad(hasDay ? day : 1)}`;
  const endYear = Number.parseInt(f.endYear, 10);
  const between = f.qualifier === 'between' && Number.isFinite(endYear);
  return {
    date,
    precision,
    qualifier: f.qualifier === 'between' && !between ? 'exact' : f.qualifier,
    dateEnd: between ? `${pad(endYear, 4)}-01-01` : null,
    text,
  };
}

export function fuzzyDateToFields(d: FuzzyDate | null | undefined): FuzzyDateFields {
  if (!d) return { ...EMPTY_FUZZY_DATE_FIELDS };
  const parts = d.date ? parseIso(d.date) : null;
  const end = d.dateEnd ? parseIso(d.dateEnd) : null;
  return {
    qualifier: d.qualifier ?? 'exact',
    year: parts ? String(parts.year) : '',
    month: parts && d.precision !== 'year' ? String(parts.month) : '',
    day: parts && d.precision === 'day' ? String(parts.day) : '',
    endYear: end ? String(end.year) : '',
    text: d.text ?? '',
  };
}

/** Is this a real calendar date (catches 31 Feb)? */
export function isValidFuzzyDate(d: FuzzyDate): boolean {
  if (!d.date) return true;
  const parts = parseIso(d.date);
  if (!parts) return false;
  const js = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  if (js.getUTCMonth() !== parts.month - 1 || js.getUTCDate() !== parts.day) return false;
  if (d.qualifier === 'between') {
    const end = d.dateEnd ? parseIso(d.dateEnd) : null;
    if (!end || end.year < parts.year) return false;
  }
  return true;
}

/** Sort key (year) for ordering timeline entries; null sorts last. */
export function fuzzyDateSortKey(d: FuzzyDate | null | undefined): number | null {
  if (!d?.date) return null;
  const parts = parseIso(d.date);
  return parts ? parts.year * 10000 + parts.month * 100 + parts.day : null;
}
