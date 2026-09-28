import type { DateQualifier } from './dates/fuzzy-date';
import type { Database } from './supabase/database.types';

type Enums = Database['public']['Enums'];

export type Sex = Enums['sex_type'];
export type NameType = Enums['name_type'];
export type ParentRelationship = Enums['parent_relationship'];
export type Confidence = Enums['confidence_level'];
export type UnionType = Enums['union_type'];
export type UnionEndReason = Enums['union_end_reason'];
export type FactType = Enums['fact_type'];
export type SourceType = Enums['source_type'];
export type MediaType = Enums['media_type'];
export type Lineage = 'both' | 'paternal' | 'maternal';

export type PersonRow = Database['public']['Views']['v_persons']['Row'];
export type PersonNameRow = Database['public']['Views']['v_person_names']['Row'];
export type FactRow = Database['public']['Views']['v_facts']['Row'];
export type SourceRow = Database['public']['Views']['v_sources']['Row'];
export type CitationRow = Database['public']['Views']['v_citations']['Row'];
export type MediaRow = Database['public']['Views']['v_media']['Row'];
export type PlaceRow = Database['public']['Views']['v_places']['Row'];

/** The compact JSON built by public.person_card_json(). */
export interface PersonCard {
  id: string;
  slug: string;
  name: string;
  sex: Sex;
  isLiving: boolean;
  canViewDetails: boolean;
  photoId: string | null;
  birthYear: number | null;
  birthQualifier: DateQualifier | null;
  birthYearEnd: number | null;
  deathYear: number | null;
  deathQualifier: DateQualifier | null;
  deathYearEnd: number | null;
  deathText: string | null;
}

export interface FamilyParent extends PersonCard {
  linkId: string;
  relationshipType: ParentRelationship;
  confidence: Confidence;
}

export interface FamilyChild extends PersonCard {
  linkId: string;
  relationshipType: ParentRelationship;
  confidence: Confidence;
  otherParentIds: string[];
}

export interface FamilySibling extends PersonCard {
  sharedParentIds: string[];
  kind: 'full' | 'half' | 'step' | 'unknown';
}

export interface FamilyUnion {
  id: string;
  type: UnionType;
  order: number;
  canViewDetails: boolean;
  startDate: string | null;
  startPrecision: Enums['date_precision'] | null;
  startQualifier: DateQualifier | null;
  startDateEnd: string | null;
  startText: string | null;
  endDate: string | null;
  endPrecision: Enums['date_precision'] | null;
  endQualifier: DateQualifier | null;
  endDateEnd: string | null;
  endText: string | null;
  endReason: UnionEndReason | null;
  partner: PersonCard;
}

export interface PersonFamily {
  parents: FamilyParent[];
  unions: FamilyUnion[];
  children: FamilyChild[];
  siblings: FamilySibling[];
}

export interface TreeNodeData extends PersonCard {
  onLine: boolean;
  hasMoreParents: boolean;
  hasMoreChildren: boolean;
  hasFather: boolean;
  hasMother: boolean;
}

export interface TreeEdgeData {
  id: string;
  parentId: string;
  childId: string;
  type: ParentRelationship;
}

export interface TreeUnionData {
  id: string;
  partnerAId: string;
  partnerBId: string;
  type: UnionType;
  partnerAOrder: number;
  partnerBOrder: number;
  ended: boolean;
}

export interface TreeWindow {
  focusId: string;
  lineage: Lineage;
  up: number;
  down: number;
  truncated: boolean;
  nodes: TreeNodeData[];
  edges: TreeEdgeData[];
  unions: TreeUnionData[];
}

export interface SearchResult {
  id: string;
  slug: string;
  displayName: string;
  matchedName: string | null;
  card: PersonCard;
  parentNames: string[];
}

export const NAME_TYPE_LABELS: Record<NameType, string> = {
  birth: 'Birth name',
  day: 'Day name',
  baptismal: 'Baptismal name',
  married: 'Married name',
  nickname: 'Nickname',
  other: 'Other name',
};

export const RELATIONSHIP_LABELS: Record<ParentRelationship, string> = {
  biological: 'Birth',
  adoptive: 'Adoptive',
  step: 'Step',
  foster: 'Foster',
  guardian: 'Guardian',
};

export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  confirmed: 'Confirmed',
  family_account: 'Family account',
  uncertain: 'Uncertain',
};

export const UNION_TYPE_LABELS: Record<UnionType, string> = {
  customary: 'Customary marriage',
  church: 'Church wedding',
  civil: 'Civil marriage',
  partnership: 'Partnership',
  unknown: 'Union',
};

export const FACT_TYPE_LABELS: Record<FactType, string> = {
  baptism: 'Baptism',
  education: 'Education',
  migration: 'Moved',
  burial: 'Burial',
  occupation: 'Work',
  custom: 'Event',
};

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  certificate: 'Certificate',
  church_record: 'Church record',
  oral_account: 'Oral account',
  letter: 'Letter',
  photo: 'Photo',
  other: 'Other',
};
