import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AddRelativeForm } from '@/components/forms/add-relative-form';
import { RELATIONS, type Relation } from '@/lib/validation/person';
import { getPersonBySlug, getPersonFamily, getPersonNames } from '@/server/queries/people';
import { getDb, requireRole } from '@/server/viewer';

const LABELS: Record<Relation, string> = {
  father: 'father',
  mother: 'mother',
  spouse: 'spouse',
  child: 'child',
  sibling: 'brother or sister',
};

type Props = { params: Promise<{ slug: string; relation: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { relation } = await params;
  return { title: `Add ${LABELS[relation as Relation] ?? 'relative'}` };
}

export default async function AddRelativePage({ params }: Props) {
  await requireRole('editor');
  const { slug, relation } = await params;
  if (!(RELATIONS as readonly string[]).includes(relation)) notFound();
  const rel = relation as Relation;

  const db = await getDb();
  const person = await getPersonBySlug(db, slug);
  if (!person?.id) notFound();
  const [family, names] = await Promise.all([getPersonFamily(db, person.id), getPersonNames(db, person.id)]);

  const name = person.display_name ?? 'this person';
  const surname = names.find((n) => n.is_primary)?.surname ?? '';
  const birthParents = family.parents.filter(
    (p) => p.relationshipType === 'biological' || p.relationshipType === 'adoptive',
  );
  const relatedIds = [
    ...family.parents.map((p) => p.id),
    ...family.children.map((c) => c.id),
    ...family.unions.map((u) => u.partner.id),
    ...family.siblings.map((s) => s.id),
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <p>
        <Link href={`/people/${slug}`} className="text-primary text-sm underline-offset-4 hover:underline">
          ← Back to {name}
        </Link>
      </p>
      <h1 className="mt-2 text-3xl font-semibold">
        Add {name}&apos;s {LABELS[rel]}
      </h1>
      <div className="mt-6">
        <AddRelativeForm
          relation={rel}
          anchor={{
            id: person.id,
            slug,
            name,
            surname,
            spouses: family.unions.map((u) => u.partner),
            parents: birthParents,
            relatedIds,
          }}
        />
      </div>
    </div>
  );
}
