import { Download, FileJson } from 'lucide-react';
import type { Metadata } from 'next';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireRole } from '@/server/viewer';

export const metadata: Metadata = { title: 'Download everything' };

export default async function ExportPage() {
  await requireRole('admin');
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Download everything</h1>
      <p className="text-muted-foreground max-w-2xl">
        Keep a copy of the family history somewhere safe — on your computer and in cloud storage. The download
        includes removed people and the full audit log, but never the family passcode.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="text-primary size-5" /> Everything (ZIP)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground text-sm">
              All data as <code>data.json</code> plus every photo and document. Can be large; use Wi-Fi.
            </p>
            <Button asChild>
              <a href="/api/export?format=zip" download>
                Download ZIP
              </a>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileJson className="text-primary size-5" /> Data only (JSON)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground text-sm">
              People, relationships, events, sources and history. Small and quick.
            </p>
            <Button asChild variant="outline">
              <a href="/api/export?format=json" download>
                Download JSON
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
      <p className="text-muted-foreground text-sm">
        For a very large archive, or for scheduled backups, use <code>npm run export</code> and the database
        backup steps in the README.
      </p>
    </div>
  );
}
