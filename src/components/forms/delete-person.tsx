'use client';

import { Loader2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { deletePerson } from '@/server/actions/people';

export function DeletePerson({ personId, name }: { personId: string; name: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="border-destructive/40 space-y-2 rounded-xl border p-4">
      <h2 className="font-serif text-lg font-semibold">Remove {name}</h2>
      <p className="text-muted-foreground text-sm">
        They will disappear from the tree and search. The admin can restore them from the audit log.
      </p>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button
        variant="destructive"
        disabled={pending}
        onClick={() => {
          if (!confirm(`Remove ${name} from the family tree?`)) return;
          startTransition(async () => {
            const res = await deletePerson(personId);
            if (!res.ok) return setError(res.error);
            router.push('/');
          });
        }}
      >
        {pending ? <Loader2 className="animate-spin" /> : <Trash2 />} Remove from the tree
      </Button>
    </div>
  );
}
