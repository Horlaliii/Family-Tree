import { z } from 'zod';

import { CONFIDENCES, fuzzyDateFieldsSchema } from './person';

export const FACT_TYPES = ['baptism', 'education', 'migration', 'burial', 'occupation', 'custom'] as const;
export const SOURCE_TYPES = [
  'certificate',
  'church_record',
  'oral_account',
  'letter',
  'photo',
  'other',
] as const;

const text = (max: number) => z.string().trim().max(max).optional().default('');

export const factSchema = z
  .object({
    factType: z.enum(FACT_TYPES),
    customLabel: text(80),
    date: fuzzyDateFieldsSchema,
    placeId: z
      .union([z.uuid(), z.literal(''), z.null()])
      .optional()
      .transform((v) => v || null),
    description: text(2000),
    confidence: z.enum(CONFIDENCES).default('family_account'),
  })
  .refine((f) => f.factType !== 'custom' || f.customLabel, {
    message: 'Give the event a name, e.g. “Enstoolment”',
    path: ['customLabel'],
  });

export type FactInput = z.input<typeof factSchema>;
export type FactValues = z.output<typeof factSchema>;

export const newSourceSchema = z.object({
  title: z.string().trim().min(1, 'Give the source a title').max(200),
  sourceType: z.enum(SOURCE_TYPES).default('other'),
  informant: text(200),
  recordedOn: z
    .string()
    .trim()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/, 'Use the date picker')
    .optional()
    .default(''),
  notes: text(4000),
  mediaId: z
    .union([z.uuid(), z.literal(''), z.null()])
    .optional()
    .transform((v) => v || null),
});
export type NewSourceInput = z.input<typeof newSourceSchema>;

export const citationTargetSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('fact'), factId: z.uuid() }),
  z.object({ kind: z.literal('birth'), personId: z.uuid() }),
  z.object({ kind: z.literal('death'), personId: z.uuid() }),
  z.object({ kind: z.literal('union'), unionId: z.uuid() }),
  z.object({ kind: z.literal('parent_child'), linkId: z.uuid() }),
]);
export type CitationTarget = z.input<typeof citationTargetSchema>;

export const addCitationSchema = z.object({
  target: citationTargetSchema,
  source: z.discriminatedUnion('mode', [
    z.object({ mode: z.literal('existing'), sourceId: z.uuid('Pick a source') }),
    z.object({ mode: z.literal('new'), source: newSourceSchema }),
  ]),
  detail: text(500),
});
export type AddCitationInput = z.input<typeof addCitationSchema>;
