import 'server-only';

import { fuzzyDateFromRow, fuzzyDateToFields } from '@/lib/dates/fuzzy-date';
import type { PersonNameRow, PersonRow, PlaceRow } from '@/lib/types';
import type { PersonFormInput } from '@/lib/validation/person';

import type { PlaceOption } from '../actions/people';

/** Prefill the person form from database rows. */
export function personToFormInput(person: PersonRow, names: PersonNameRow[]): PersonFormInput {
  const primaryIndex = Math.max(
    0,
    names.findIndex((n) => n.is_primary),
  );
  return {
    sex: person.sex ?? 'unknown',
    names: names.length
      ? names.map((n) => ({
          id: n.id ?? undefined,
          name_type: n.name_type ?? 'birth',
          title: n.title ?? '',
          given_names: n.given_names ?? '',
          surname: n.surname ?? '',
        }))
      : [{ name_type: 'birth', title: '', given_names: '', surname: '' }],
    primaryIndex,
    birth: fuzzyDateToFields(fuzzyDateFromRow(person, 'birth')),
    birthPlaceId: person.birth_place_id,
    birthConfidence: person.birth_confidence ?? '',
    death: fuzzyDateToFields(fuzzyDateFromRow(person, 'death')),
    deathPlaceId: person.death_place_id,
    deathConfidence: person.death_confidence ?? '',
    livingStatus:
      person.is_living_override === null || person.is_living_override === undefined
        ? 'auto'
        : person.is_living_override
          ? 'living'
          : 'deceased',
    hometownPlaceId: person.hometown_place_id,
    clan: person.clan ?? '',
    totem: person.totem ?? '',
    occupation: person.occupation ?? '',
    bio: person.bio ?? '',
  };
}

export function toPlaceOptions(places: Record<string, PlaceRow>): Record<string, PlaceOption> {
  return Object.fromEntries(
    Object.entries(places).map(([id, p]) => [
      id,
      { id, name: p.name ?? '', town: p.town, region: p.region, country: p.country },
    ]),
  );
}
