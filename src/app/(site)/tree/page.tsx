import type { Metadata } from 'next';
import Link from 'next/link';

import { TreeView } from '@/components/tree/tree-view';
import { Button } from '@/components/ui/button';
import { getSiteSettings } from '@/server/settings';
import { loadTree, resolvePersonId, treeParamsSchema } from '@/server/queries/tree';
import { canEdit, getDb, requireViewer } from '@/server/viewer';

export const metadata: Metadata = { title: 'Family tree' };

export default async function TreePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await requireViewer();
  const db = await getDb();
  const params = treeParamsSchema.parse(await searchParams);

  // Start from: the requested person, "me", the featured ancestor, or anyone.
  let focusId = params.focus ? await resolvePersonId(db, params.focus) : null;
  if (!focusId && viewer.kind === 'user' && viewer.linkedPersonId) focusId = viewer.linkedPersonId;
  if (!focusId) focusId = (await getSiteSettings()).featuredPersonId;
  if (!focusId) {
    const { data } = await db.from('v_persons').select('id').order('created_at').limit(1).maybeSingle();
    focusId = data?.id ?? null;
  }

  const payload = focusId ? await loadTree(db, focusId, params.up, params.down, params.line) : null;

  if (!payload) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">The tree is empty</h1>
        <p className="text-muted-foreground mt-2">Once people are added, you can explore them here.</p>
        {canEdit(viewer) && (
          <Button asChild className="mt-6">
            <Link href="/people/new">Add the first person</Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <TreeView
      initial={payload}
      initialUp={params.up}
      initialDown={params.down}
      initialLineage={params.line}
      canEdit={canEdit(viewer)}
    />
  );
}
