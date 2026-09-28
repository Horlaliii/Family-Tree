import type { Metadata } from 'next';

import { PersonForm } from '@/components/forms/person-form';
import { requireRole } from '@/server/viewer';

export const metadata: Metadata = { title: 'Add a person' };

export default async function NewPersonPage() {
  await requireRole('editor');
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-3xl font-semibold">Add a person</h1>
      <p className="text-muted-foreground mt-1">
        Fill in what you know — everything except a name can be added later. To add a relative of someone
        already in the tree, use “Add father”, “Add child” and so on from their page instead.
      </p>
      <div className="mt-6">
        <PersonForm cancelHref="/" />
      </div>
    </div>
  );
}
