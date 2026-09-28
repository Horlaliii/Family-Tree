'use client';

import { CheckCircle2, FileText, ImagePlus, Loader2, TriangleAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ACCEPT_ATTRIBUTE, isPdf, isSupported, MAX_PDF_BYTES, processImage } from '@/lib/media/process-image';
import { getBrowserSupabase } from '@/lib/supabase/browser';
import { createMedia } from '@/server/actions/media';

type Status = { name: string; state: 'working' | 'done' | 'error'; message?: string };

const BUCKET = 'media';

export function Uploader({ personId, personName }: { personId: string; personName: string }) {
  const router = useRouter();
  const inputId = useId();
  const [caption, setCaption] = useState('');
  const [statuses, setStatuses] = useState<Status[]>([]);
  const busy = statuses.some((s) => s.state === 'working');

  function update(i: number, status: Partial<Status>) {
    setStatuses((all) => all.map((s, j) => (j === i ? { ...s, ...status } : s)));
  }

  async function uploadOne(file: File, i: number) {
    const supabase = getBrowserSupabase();
    const id = crypto.randomUUID();
    try {
      if (!isSupported(file)) throw new Error('Only photos (JPG, PNG, WebP, HEIC) and PDFs can be added.');
      let storagePath: string;
      let thumbnailPath: string | null = null;
      let width: number | null = null;
      let height: number | null = null;
      let bytes: number;
      let mimeType: 'image/jpeg' | 'application/pdf';

      if (isPdf(file)) {
        if (file.size > MAX_PDF_BYTES) throw new Error('PDFs must be smaller than 25 MB.');
        storagePath = `${id}/original.pdf`;
        mimeType = 'application/pdf';
        bytes = file.size;
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(storagePath, file, { contentType: mimeType, cacheControl: '3600' });
        if (error) throw error;
      } else {
        const processed = await processImage(file);
        storagePath = `${id}/original.jpg`;
        thumbnailPath = `${id}/thumb.webp`;
        mimeType = processed.mimeType;
        width = processed.width;
        height = processed.height;
        bytes = processed.original.size;
        const [full, thumb] = await Promise.all([
          supabase.storage.from(BUCKET).upload(storagePath, processed.original, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
          }),
          supabase.storage.from(BUCKET).upload(thumbnailPath, processed.thumb, {
            contentType: 'image/webp',
            cacheControl: '3600',
          }),
        ]);
        if (full.error) throw full.error;
        if (thumb.error) throw thumb.error;
      }

      const res = await createMedia({
        id,
        storagePath,
        thumbnailPath,
        mediaType: mimeType === 'application/pdf' ? 'document' : 'photo',
        mimeType,
        width,
        height,
        bytes,
        originalFilename: file.name.slice(0, 255),
        caption,
        personIds: [personId],
      });
      if (!res.ok) throw new Error(res.error);
      update(i, { state: 'done' });
    } catch (e) {
      update(i, { state: 'error', message: e instanceof Error ? e.message : 'Upload failed.' });
    }
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const list = [...files];
    setStatuses(list.map((f) => ({ name: f.name, state: 'working' })));
    // One at a time: kinder to slow mobile connections.
    for (const [i, file] of list.entries()) await uploadOne(file, i);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor={`${inputId}-caption`} className="text-base">
          Caption (optional)
        </Label>
        <Input
          id={`${inputId}-caption`}
          placeholder={`e.g. ${personName} at the family house, 1965`}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />
      </div>

      <label
        htmlFor={inputId}
        className="border-primary/40 bg-primary/5 hover:bg-primary/10 flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center"
      >
        <ImagePlus className="text-primary size-8" aria-hidden />
        <span className="font-medium">Choose photos or scanned documents</span>
        <span className="text-muted-foreground text-sm">
          JPG, PNG, WebP, HEIC or PDF. Photos are made smaller before uploading.
        </span>
        <input
          id={inputId}
          type="file"
          multiple
          accept={ACCEPT_ATTRIBUTE}
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            void onFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </label>

      {statuses.length > 0 && (
        <ul className="space-y-2" aria-live="polite">
          {statuses.map((s, i) => (
            <li key={`${s.name}-${i}`} className="flex items-start gap-2 text-sm">
              {s.state === 'working' ? (
                <Loader2 className="text-primary mt-0.5 size-4 shrink-0 animate-spin" />
              ) : s.state === 'done' ? (
                <CheckCircle2 className="text-success mt-0.5 size-4 shrink-0" />
              ) : (
                <TriangleAlert className="text-destructive mt-0.5 size-4 shrink-0" />
              )}
              <span>
                <span className="inline-flex items-center gap-1 font-medium">
                  {/\.pdf$/i.test(s.name) && <FileText className="size-4" />} {s.name}
                </span>
                {s.state === 'working' && <span className="text-muted-foreground"> — uploading…</span>}
                {s.state === 'done' && <span className="text-muted-foreground"> — added</span>}
                {s.message && <span className="text-destructive block">{s.message}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {statuses.length > 0 && !busy && (
        <Button variant="outline" onClick={() => setStatuses([])}>
          Upload more
        </Button>
      )}
    </div>
  );
}
