'use client';

import { Loader2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/select';
import { fuzzyDateToFields, type FuzzyDateFields } from '@/lib/dates/fuzzy-date';
import {
  CONFIDENCE_LABELS,
  RELATIONSHIP_LABELS,
  UNION_TYPE_LABELS,
  type Confidence,
  type FamilyChild,
  type FamilyParent,
  type FamilyUnion,
  type ParentRelationship,
  type UnionType,
} from '@/lib/types';
import { CONFIDENCES, PARENT_RELATIONSHIPS, UNION_TYPES } from '@/lib/validation/person';
import { removeParentLink, removeUnion, updateParentLink, updateUnion } from '@/server/actions/people';

function LinkRow({ link, label }: { link: FamilyParent | FamilyChild; label: string }) {
  const router = useRouter();
  const [type, setType] = useState<ParentRelationship>(link.relationshipType);
  const [confidence, setConfidence] = useState<Confidence>(link.confidence);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = type !== link.relationshipType || confidence !== link.confidence;

  return (
    <li className="space-y-2 rounded-lg border p-3">
      <p className="font-medium">
        {link.name} <span className="text-muted-foreground text-sm font-normal">({label})</span>
      </p>
      <div className="grid grid-cols-2 gap-2">
        <NativeSelect
          aria-label={`Kind of link to ${link.name}`}
          value={type}
          onChange={(e) => setType(e.target.value as ParentRelationship)}
        >
          {PARENT_RELATIONSHIPS.map((t) => (
            <option key={t} value={t}>
              {RELATIONSHIP_LABELS[t]}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label={`How sure is the link to ${link.name}?`}
          value={confidence}
          onChange={(e) => setConfidence(e.target.value as Confidence)}
        >
          {CONFIDENCES.map((c) => (
            <option key={c} value={c}>
              {CONFIDENCE_LABELS[c]}
            </option>
          ))}
        </NativeSelect>
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={!dirty || pending}
          onClick={() =>
            startTransition(async () => {
              const res = await updateParentLink(link.linkId, { relationshipType: type, confidence });
              if (!res.ok) setError(res.error);
              else router.refresh();
            })
          }
        >
          {pending && <Loader2 className="animate-spin" />} Save
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            if (!confirm(`Remove the link between ${link.name} and this person? Neither person is deleted.`))
              return;
            startTransition(async () => {
              const res = await removeParentLink(link.linkId);
              if (!res.ok) setError(res.error);
              else router.refresh();
            });
          }}
        >
          <Trash2 /> Remove link
        </Button>
      </div>
    </li>
  );
}

function YearInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: FuzzyDateFields;
  onChange: (v: FuzzyDateFields) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-sm">{label}</Label>
      <div className="flex gap-2">
        <NativeSelect
          aria-label={`${label}: how sure`}
          value={value.qualifier}
          onChange={(e) => onChange({ ...value, qualifier: e.target.value as FuzzyDateFields['qualifier'] })}
        >
          <option value="exact">In</option>
          <option value="about">About</option>
          <option value="before">Before</option>
          <option value="after">After</option>
        </NativeSelect>
        <Input
          aria-label={`${label}: year`}
          inputMode="numeric"
          maxLength={4}
          placeholder="Year"
          value={value.year}
          onChange={(e) => onChange({ ...value, year: e.target.value, month: '', day: '' })}
        />
      </div>
    </div>
  );
}

function UnionRow({ union, personId }: { union: FamilyUnion; personId: string }) {
  const router = useRouter();
  const [type, setType] = useState<UnionType>(union.type);
  const [order, setOrder] = useState(String(union.order));
  const [start, setStart] = useState(
    fuzzyDateToFields({
      date: union.startDate,
      precision: union.startPrecision,
      qualifier: union.startQualifier === 'between' ? 'about' : union.startQualifier,
      dateEnd: null,
      text: union.startText,
    }),
  );
  const [end, setEnd] = useState(
    fuzzyDateToFields({
      date: union.endDate,
      precision: union.endPrecision,
      qualifier: union.endQualifier === 'between' ? 'about' : union.endQualifier,
      dateEnd: null,
      text: union.endText,
    }),
  );
  const [endReason, setEndReason] = useState<string>(union.endReason ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <li className="space-y-3 rounded-lg border p-3">
      <p className="font-medium">{union.partner.name}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-sm">Kind of marriage</Label>
          <NativeSelect value={type} onChange={(e) => setType(e.target.value as UnionType)}>
            {UNION_TYPES.map((t) => (
              <option key={t} value={t}>
                {UNION_TYPE_LABELS[t]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label className="text-sm">Which spouse (1st, 2nd…) for this person</Label>
          <Input inputMode="numeric" value={order} onChange={(e) => setOrder(e.target.value)} />
        </div>
        <YearInput label="Started" value={start} onChange={setStart} />
        <YearInput label="Ended" value={end} onChange={setEnd} />
        <div className="space-y-1 sm:col-span-2">
          <Label className="text-sm">How it ended</Label>
          <NativeSelect value={endReason} onChange={(e) => setEndReason(e.target.value)}>
            <option value="">Still married / not known</option>
            <option value="death">A partner died</option>
            <option value="divorce">Divorce</option>
            <option value="other">Other</option>
          </NativeSelect>
        </div>
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await updateUnion(union.id, personId, {
                unionType: type,
                start,
                end,
                endReason: endReason as '',
                order: Number(order) || 1,
                confidence: 'confirmed',
              });
              if (!res.ok) setError(res.error);
              else router.refresh();
            })
          }
        >
          {pending && <Loader2 className="animate-spin" />} Save
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            if (!confirm(`Remove the marriage to ${union.partner.name}? Neither person is deleted.`)) return;
            startTransition(async () => {
              const res = await removeUnion(union.id);
              if (!res.ok) setError(res.error);
              else router.refresh();
            });
          }}
        >
          <Trash2 /> Remove
        </Button>
      </div>
    </li>
  );
}

export function RelationshipsEditor({
  personId,
  parents,
  childLinks: children,
  unions,
}: {
  personId: string;
  parents: FamilyParent[];
  childLinks: FamilyChild[];
  unions: FamilyUnion[];
}) {
  if (!parents.length && !children.length && !unions.length) {
    return <p className="text-muted-foreground text-sm">No relationships yet.</p>;
  }
  return (
    <div className="space-y-5">
      {parents.length > 0 && (
        <section>
          <h3 className="mb-2 font-semibold">Parents</h3>
          <ul className="space-y-2">
            {parents.map((p) => (
              <LinkRow key={p.linkId} link={p} label="parent" />
            ))}
          </ul>
        </section>
      )}
      {unions.length > 0 && (
        <section>
          <h3 className="mb-2 font-semibold">Marriages</h3>
          <ul className="space-y-2">
            {unions.map((u) => (
              <UnionRow key={u.id} union={u} personId={personId} />
            ))}
          </ul>
        </section>
      )}
      {children.length > 0 && (
        <section>
          <h3 className="mb-2 font-semibold">Children</h3>
          <ul className="space-y-2">
            {children.map((c) => (
              <LinkRow key={c.linkId} link={c} label="child" />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
