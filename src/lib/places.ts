interface PlaceLike {
  name: string | null;
  town?: string | null;
  region?: string | null;
  country?: string | null;
}

/** "Wesley Methodist Church, Kumasi, Ashanti, Ghana" (skipping repeats). */
export function formatPlace(place: PlaceLike | null | undefined): string | null {
  if (!place?.name) return null;
  const parts: string[] = [];
  for (const part of [place.name, place.town, place.region, place.country]) {
    const value = part?.trim();
    if (value && !parts.some((p) => p.toLowerCase() === value.toLowerCase())) parts.push(value);
  }
  return parts.join(', ');
}

/** Just the most specific part, for tight spaces. */
export function shortPlace(place: PlaceLike | null | undefined): string | null {
  return place?.name?.trim() || null;
}
