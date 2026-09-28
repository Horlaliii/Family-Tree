import { NextResponse, type NextRequest } from 'next/server';

import { loadTree, resolvePersonId, treeParamsSchema } from '@/server/queries/tree';
import { getViewerAndDb } from '@/server/viewer';

/** One window of the tree around a person: used for re-centering and "expand". */
export async function GET(request: NextRequest) {
  const ctx = await getViewerAndDb();
  if (!ctx) return NextResponse.json({ error: 'Not allowed' }, { status: 401 });

  const params = treeParamsSchema.parse(Object.fromEntries(request.nextUrl.searchParams));
  if (!params.focus) return NextResponse.json({ error: 'Missing focus' }, { status: 400 });

  const focusId = await resolvePersonId(ctx.db, params.focus);
  if (!focusId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const payload = await loadTree(ctx.db, focusId, params.up, params.down, params.line);
  if (!payload) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(payload, { headers: { 'Cache-Control': 'private, no-store' } });
}
