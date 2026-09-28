'use client';

import { Loader2, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { restorePerson } from '@/server/actions/people';

export function RestoreButton({ personId }: { personId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await restorePerson(personId);
            if (!res.ok) setError(res.error);
            else router.refresh();
          })
        }
      >
        {pending ? <Loader2 className="animate-spin" /> : <RotateCcw />} Restore
      </Button>
      {error && <span className="text-destructive text-sm">{error}</span>}
    </span>
  );
}
