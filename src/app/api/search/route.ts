import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { searchPeople } from '@/server/queries/people';
import { getViewerAndDb } from '@/server/viewer';

const query = z.object({
  q: z.string().trim().max(100).default(''),
  limit: z.coerce.number().int().min(1).max(20).default(8),
});

/** Search-as-you-type for the header box and the person picker. */
export async function GET(request: NextRequest) {
  const ctx = await getViewerAndDb();
  if (!ctx) return NextResponse.json({ error: 'Not allowed' }, { status: 401 });

  const parsed = query.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

  const { results } = await searchPeople(ctx.db, parsed.data.q, { limit: parsed.data.limit });
  return NextResponse.json({ results }, { headers: { 'Cache-Control': 'private, no-store' } });
}
