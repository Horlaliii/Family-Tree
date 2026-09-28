import { z } from 'zod';

import {
  DATE_QUALIFIERS,
  fieldsToFuzzyDate,
  fuzzyDateToRow,
  isValidFuzzyDate,
  type FuzzyDateFields,
} from '@/lib/dates/fuzzy-date';

export const SEXES = ['male', 'female', 'unknown'] as const;
export const NAME_TYPES = ['birth', 'day', 'baptismal', 'married', 'nickname', 'other'] as const;
export const CONFIDENCES = ['confirmed', 'family_account', 'uncertain'] as const;
export const PARENT_RELATIONSHIPS = ['biological', 'adoptive', 'step', 'foster', 'guardian'] as const;
export const UNION_TYPES = ['customary', 'church', 'civil', 'partnership', 'unknown'] as const;
export const UNION_END_REASONS = ['divorce', 'death', 'other'] as const;
export const RELATIONS = ['father', 'mother', 'spouse', 'child', 'sibling'] as const;
export type Relation = (typeof RELATIONS)[number];

const optionalText = (max: number) => z.string().trim().max(max).optional().default('');
const uuidOrNull = z
  .union([z.uuid(), z.literal(''), z.null()])
  .optional()
  .transform((v) => (v ? v : null));

const yearField = z
  .string()
  .trim()
  .regex(/^\d{0,4}$/, 'Use a 4-digit year')
  .refine((v) => v === '' || (Number(v) >= 1000 && Number(v) <= new Date().getFullYear() + 1), {
    message: 'That year looks wrong',
  });

export const fuzzyDateFieldsSchema = z
  .object({
    qualifier: z.enum(DATE_QUALIFIERS).default('exact'),
    year: yearField.default(''),
    month: z
      .string()
      .trim()
      .regex(/^(|[1-9]|1[0-2])$/, 'Pick a month')
      .default(''),
    day: z
      .string()
      .trim()
      .regex(/^(|[1-9]|[12]\d|3[01])$/, 'Day must be 1–31')
      .default(''),
    endYear: yearField.default(''),
    text: optionalText(200),
  })
  .superRefine((f, ctx) => {
    if (f.qualifier === 'between' && f.year && !f.endYear) {
      ctx.addIssue({ code: 'custom', path: ['endYear'], message: 'Add the second year' });
    }
    if (f.year && !isValidFuzzyDate(fieldsToFuzzyDate(f as FuzzyDateFields))) {
      ctx.addIssue({ code: 'custom', path: ['day'], message: 'That date does not exist' });
    }
  });

export const nameSchema = z
  .object({
    id: z.string().optional(),
    name_type: z.enum(NAME_TYPES).default('birth'),
    title: optionalText(40),
    given_names: optionalText(120),
    surname: optionalText(120),
  })
  .refine((n) => n.given_names || n.surname, {
    message: 'Enter a first name or a surname',
    path: ['given_names'],
  });

export const personFormSchema = z.object({
  sex: z.enum(SEXES).default('unknown'),
  names: z.array(nameSchema).min(1, 'Add at least one name').max(12),
  primaryIndex: z.coerce.number().int().min(0).default(0),
  birth: fuzzyDateFieldsSchema,
  birthPlaceId: uuidOrNull,
  birthConfidence: z.enum([...CONFIDENCES, '']).default(''),
  death: fuzzyDateFieldsSchema,
  deathPlaceId: uuidOrNull,
  deathConfidence: z.enum([...CONFIDENCES, '']).default(''),
  livingStatus: z.enum(['auto', 'living', 'deceased']).default('auto'),
  hometownPlaceId: uuidOrNull,
  clan: optionalText(80),
  totem: optionalText(80),
  occupation: optionalText(160),
  bio: optionalText(20000),
});

export type PersonFormInput = z.input<typeof personFormSchema>;
export type PersonFormValues = z.output<typeof personFormSchema>;

/** Shape expected by the save_person() database function. */
export function toSavePersonPayload(v: PersonFormValues) {
  const names = v.names.map((n, i) => ({
    id: n.id || undefined,
    name_type: n.name_type,
    title: n.title,
    given_names: n.given_names,
    surname: n.surname,
    is_primary: i === Math.min(v.primaryIndex, v.names.length - 1),
  }));
  const person = {
    sex: v.sex,
    is_living_override: v.livingStatus === 'auto' ? null : v.livingStatus === 'living',
    ...fuzzyDateToRow('birth', fieldsToFuzzyDate(v.birth)),
    birth_place_id: v.birthPlaceId,
    birth_confidence: v.birthConfidence || null,
    ...fuzzyDateToRow('death', fieldsToFuzzyDate(v.death)),
    death_place_id: v.deathPlaceId,
    death_confidence: v.deathConfidence || null,
    hometown_place_id: v.hometownPlaceId,
    clan: v.clan,
    totem: v.totem,
    occupation: v.occupation,
    bio: v.bio,
  };
  return { person, names };
}

export const relativeOptionsSchema = z.object({
  relationshipType: z.enum(PARENT_RELATIONSHIPS).default('biological'),
  confidence: z.enum(CONFIDENCES).default('confirmed'),
  otherParentId: uuidOrNull,
  sharedParentIds: z.array(z.uuid()).optional(),
  unionType: z.enum(UNION_TYPES).default('unknown'),
  unionStart: fuzzyDateFieldsSchema.optional(),
});

export const addRelativeSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('new'),
    person: personFormSchema,
    options: relativeOptionsSchema,
  }),
  z.object({
    mode: z.literal('existing'),
    personId: z.uuid('Pick someone from the list'),
    options: relativeOptionsSchema,
  }),
]);

export type AddRelativeInput = z.input<typeof addRelativeSchema>;

export const placeSchema = z.object({
  name: z.string().trim().min(1, 'Enter a place name').max(160),
  town: optionalText(120),
  region: optionalText(120),
  country: optionalText(120),
});
export type PlaceInput = z.input<typeof placeSchema>;
