import { Plus } from 'lucide-react';
import Link from 'next/link';

import { PersonLink } from '@/components/person/person-link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatFuzzyDate } from '@/lib/dates/fuzzy-date';
import { groupChildrenByUnion } from '@/lib/profile';
import {
  RELATIONSHIP_LABELS,
  UNION_TYPE_LABELS,
  type FamilyUnion,
  type ParentRelationship,
  type PersonFamily,
} from '@/lib/types';
import { firstName, possessive } from '@/lib/utils';

function RelationshipBadge({ type }: { type: ParentRelationship }) {
  if (type === 'biological') return null;
  return <Badge variant="outline">{RELATIONSHIP_LABELS[type]}</Badge>;
}

function unionSummary(u: FamilyUnion): string {
  const parts: string[] = [UNION_TYPE_LABELS[u.type]];
  if (u.canViewDetails && (u.startDate || u.startText)) {
    parts.push(
      formatFuzzyDate({
        date: u.startDate,
        precision: u.startPrecision,
        qualifier: u.startQualifier,
        dateEnd: u.startDateEnd,
        text: u.startText,
      }),
    );
  }
  if (u.endReason === 'divorce') parts.push('divorced');
  return parts.join(' · ');
}

function AddButton({ href, label }: { href: string; label: string }) {
  return (
    <Button asChild variant="outline" size="sm">
      <Link href={href}>
        <Plus /> {label}
      </Link>
    </Button>
  );
}

export function FamilySection({
  personName,
  slug,
  family,
  photos,
  canEdit,
}: {
  personName: string;
  slug: string;
  family: PersonFamily;
  photos: Record<string, string>;
  canEdit: boolean;
}) {
  const first = firstName(personName);
  const photo = (id: string | null) => (id ? (photos[id] ?? null) : null);
  const birthParents = family.parents.filter(
    (p) => p.relationshipType === 'biological' || p.relationshipType === 'adoptive',
  );
  const hasFather = birthParents.some((p) => p.sex === 'male');
  const hasMother = birthParents.some((p) => p.sex === 'female');
  const childGroups = groupChildrenByUnion(family);
  const halfSiblings = family.siblings.filter((s) => s.kind === 'half');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Family</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Parents */}
        <section aria-labelledby="parents-heading">
          <h3 id="parents-heading" className="text-muted-foreground mb-1 text-sm font-semibold uppercase">
            Parents
          </h3>
          <ul>
            {family.parents.map((p) => (
              <li key={p.linkId}>
                <PersonLink
                  person={p}
                  photoUrl={photo(p.photoId)}
                  badge={<RelationshipBadge type={p.relationshipType} />}
                />
              </li>
            ))}
          </ul>
          {(!hasFather || !hasMother) && (
            <div className="bg-muted/50 mt-2 rounded-lg p-3 text-sm">
              {!hasFather && !hasMother ? (
                <p>We don&apos;t know {possessive(personName)} parents yet.</p>
              ) : !hasFather ? (
                <p>We don&apos;t know {possessive(personName)} father yet.</p>
              ) : (
                <p>We don&apos;t know {possessive(personName)} mother yet.</p>
              )}
              {canEdit ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {!hasFather && <AddButton href={`/people/${slug}/add/father`} label="Add father" />}
                  {!hasMother && <AddButton href={`/people/${slug}/add/mother`} label="Add mother" />}
                </div>
              ) : (
                <p className="text-muted-foreground mt-1">Know something? Tell the family historian.</p>
              )}
            </div>
          )}
        </section>

        {/* Spouses with their children */}
        <section aria-labelledby="spouses-heading">
          <div className="mb-1 flex items-center justify-between gap-2">
            <h3 id="spouses-heading" className="text-muted-foreground text-sm font-semibold uppercase">
              {family.unions.length > 1 ? 'Spouses and children' : 'Spouse and children'}
            </h3>
          </div>
          {childGroups.length === 0 && (
            <p className="text-muted-foreground text-sm">No spouse or children recorded yet.</p>
          )}
          <div className="space-y-4">
            {childGroups.map((g) => (
              <div key={g.key} className="rounded-lg border p-2">
                {g.union ? (
                  <PersonLink
                    person={g.union.partner}
                    photoUrl={photo(g.union.partner.photoId)}
                    note={unionSummary(g.union)}
                    badge={
                      family.unions.length > 1 ? (
                        <Badge variant="secondary">
                          {g.union.partner.sex === 'female'
                            ? 'Wife'
                            : g.union.partner.sex === 'male'
                              ? 'Husband'
                              : 'Spouse'}{' '}
                          {g.union.order}
                        </Badge>
                      ) : undefined
                    }
                  />
                ) : (
                  <p className="text-muted-foreground px-2 py-1 text-sm">
                    {g.children.every((c) => c.relationshipType === 'biological')
                      ? 'Children with another or unknown parent'
                      : 'Other children'}
                  </p>
                )}
                {g.children.length > 0 && (
                  <ul className="border-border mt-1 ml-6 border-l pl-2">
                    {g.children.map((c) => (
                      <li key={c.linkId}>
                        <PersonLink
                          person={c}
                          photoUrl={photo(c.photoId)}
                          badge={<RelationshipBadge type={c.relationshipType} />}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
          {canEdit && (
            <div className="mt-3 flex flex-wrap gap-2">
              <AddButton href={`/people/${slug}/add/spouse`} label="Add spouse" />
              <AddButton href={`/people/${slug}/add/child`} label="Add child" />
            </div>
          )}
        </section>

        {/* Siblings */}
        <section aria-labelledby="siblings-heading">
          <h3 id="siblings-heading" className="text-muted-foreground mb-1 text-sm font-semibold uppercase">
            Brothers and sisters
          </h3>
          {family.siblings.length === 0 ? (
            <p className="text-muted-foreground text-sm">No brothers or sisters recorded.</p>
          ) : (
            <ul>
              {family.siblings.map((s) => (
                <li key={s.id}>
                  <PersonLink
                    person={s}
                    photoUrl={photo(s.photoId)}
                    badge={
                      s.kind === 'half' ? (
                        <Badge variant="accent">
                          Half-{s.sex === 'female' ? 'sister' : s.sex === 'male' ? 'brother' : 'sibling'}
                        </Badge>
                      ) : s.kind === 'step' ? (
                        <Badge variant="outline">Step</Badge>
                      ) : undefined
                    }
                    note={
                      s.kind === 'half'
                        ? `through ${family.parents.find((p) => s.sharedParentIds.includes(p.id))?.name ?? 'one parent'}`
                        : undefined
                    }
                  />
                </li>
              ))}
            </ul>
          )}
          {halfSiblings.length > 0 && (
            <p className="text-muted-foreground mt-1 text-xs">Half-siblings share one parent with {first}.</p>
          )}
          {canEdit && (
            <div className="mt-3">
              <AddButton href={`/people/${slug}/add/sibling`} label="Add sibling" />
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
