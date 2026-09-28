import { downloadZip } from 'client-zip';
import { NextResponse, type NextRequest } from 'next/server';

import { buildExport } from '@/server/export';
import { MEDIA_BUCKET } from '@/server/media';
import { createAdminSupabase } from '@/server/supabase';
import { getViewer, isAdmin } from '@/server/viewer';

export const maxDuration = 300;

/** Admin-only "download everything": ?format=json or ?format=zip (data + all media). */
export async function GET(request: NextRequest) {
  if (!isAdmin(await getViewer())) {
    return NextResponse.json({ error: 'Only the admin can export.' }, { status: 403 });
  }
  const format = request.nextUrl.searchParams.get('format') === 'zip' ? 'zip' : 'json';
  const db = createAdminSupabase();
  const data = await buildExport(db);
  const stamp = data.exportedAt.slice(0, 10);

  if (format === 'json') {
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="family-tree-${stamp}.json"`,
        'Cache-Control': 'no-store',
      },
    });
  }

  const media = data.tables.media as { storage_path: string; thumbnail_path: string | null }[];
  async function* files() {
    yield { name: 'data.json', input: JSON.stringify(data, null, 2), lastModified: new Date() };
    for (const m of media) {
      for (const path of [m.storage_path, m.thumbnail_path]) {
        if (!path) continue;
        const { data: blob, error } = await db.storage.from(MEDIA_BUCKET).download(path);
        if (error || !blob) {
          yield {
            name: `media/${path}.MISSING.txt`,
            input: `Could not download: ${error?.message ?? 'unknown'}`,
          };
          continue;
        }
        yield { name: `media/${path}`, input: blob };
      }
    }
  }

  const zip = downloadZip(files());
  return new NextResponse(zip.body, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="family-tree-${stamp}.zip"`,
      'Cache-Control': 'no-store',
    },
  });
}
