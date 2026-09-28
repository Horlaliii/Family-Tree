import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { DeletePerson } from '@/components/forms/delete-person';
import { PersonForm } from '@/components/forms/person-form';
import { RelationshipsEditor } from '@/components/forms/relationships-editor';
import { personToFormInput, toPlaceOptions } from '@/server/queries/forms';
import { getPersonBySlug, getPersonFamily, getPersonNames, getPlaces } from '@/server/queries/people';
import { getDb, requireRole } from '@/server/viewer';

export const metadata: Metadata = { title: 'Edit person' };

export default async function EditPersonPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireRole('editor');
  const { slug } = await params;
  const db = await getDb();
  const person = await getPersonBySlug(db, slug);
  if (!person?.id) notFound();

  const [names, family, places] = await Promise.all([
    getPersonNames(db, person.id),
    getPersonFamily(db, person.id),
    getPlaces(db, [person.birth_place_id, person.death_place_id, person.hometown_place_id]),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <p>
        <Link href={`/people/${slug}`} className="text-primary text-sm underline-offset-4 hover:underline">
          ← Back to {person.display_name}
        </Link>
      </p>
      <h1 className="mt-2 text-3xl font-semibold">Edit {person.display_name}</h1>
      <div className="mt-6">
        <PersonForm
          personId={person.id}
          defaultValues={personToFormInput(person, names)}
          places={toPlaceOptions(places)}
          cancelHref={`/people/${slug}`}
        />
      </div>

      <section className="mt-10 space-y-3">
        <h2 className="text-2xl font-semibold">Relationships</h2>
        <p className="text-muted-foreground text-sm">
          Change how people are linked, or remove a link added by mistake. To add relatives, use the buttons
          on the profile page.
        </p>
        <RelationshipsEditor
          personId={person.id}
          parents={family.parents}
          childLinks={family.children}
          unions={family.unions}
        />
      </section>

      <section className="mt-10">
        <DeletePerson personId={person.id} name={person.display_name ?? 'this person'} />
      </section>
    </div>
  );
}
