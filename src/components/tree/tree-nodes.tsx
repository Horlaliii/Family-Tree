'use client';

import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import Link from 'next/link';
import { memo } from 'react';

import { formatLifeYears } from '@/lib/dates/fuzzy-date';
import {
  PERSON_HEIGHT,
  PERSON_WIDTH,
  PLACEHOLDER_HEIGHT,
  PLACEHOLDER_WIDTH,
  UNION_SIZE,
} from '@/lib/tree/layout';
import type { TreeNodeData } from '@/lib/types';
import { cn, initials } from '@/lib/utils';

export type PersonNodeData = {
  person: TreeNodeData;
  isFocus: boolean;
  dim: boolean;
  photoUrl: string | null;
  onSelect: (id: string) => void;
  onExpand: (id: string, direction: 'up' | 'down') => void;
};
export type PersonFlowNode = Node<PersonNodeData, 'person'>;

const hiddenHandle = '!size-1 !min-h-0 !min-w-0 !border-0 !bg-transparent';

export const PersonNode = memo(function PersonNode({ data }: NodeProps<PersonFlowNode>) {
  const { person, isFocus, dim, photoUrl } = data;
  const years = formatLifeYears(person);
  return (
    <div style={{ width: PERSON_WIDTH, height: PERSON_HEIGHT }} className="relative">
      <Handle type="target" position={Position.Top} className={hiddenHandle} isConnectable={false} />
      {person.hasMoreParents && (
        <button
          type="button"
          aria-label={`Show ${person.name}'s parents`}
          className="nodrag bg-card text-primary hover:bg-muted absolute -top-3.5 left-1/2 z-10 flex size-7 -translate-x-1/2 items-center justify-center rounded-full border shadow-sm"
          onClick={(e) => {
            e.stopPropagation();
            data.onExpand(person.id, 'up');
          }}
        >
          <ChevronUp className="size-4" />
        </button>
      )}
      <button
        type="button"
        onClick={() => data.onSelect(person.id)}
        className={cn(
          'nodrag flex size-full items-center gap-2.5 rounded-xl border-2 px-2.5 text-left shadow-sm transition-shadow hover:shadow-md',
          isFocus
            ? 'bg-card border-primary ring-primary/25 ring-4'
            : person.onLine
              ? 'bg-card border-primary/45'
              : 'border-border bg-muted/70 shadow-none',
        )}
      >
        <span
          className={cn(
            'flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full border font-serif text-sm font-semibold',
            dim && 'opacity-60 saturate-50',
            person.sex === 'female'
              ? 'border-accent/60 bg-accent-soft'
              : person.sex === 'male'
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'bg-muted',
          )}
          aria-hidden
        >
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="" loading="lazy" className="size-full object-cover" />
          ) : (
            initials(person.name)
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={cn('line-clamp-2 text-sm leading-tight font-semibold', dim && 'text-muted-foreground')}
          >
            {person.name}
          </span>
          {years && <span className="text-muted-foreground mt-0.5 block text-xs">{years}</span>}
          <span className="sr-only">{isFocus ? ' (centre of the tree)' : '. Show the tree around them'}</span>
        </span>
      </button>
      {person.hasMoreChildren && (
        <button
          type="button"
          aria-label={`Show ${person.name}'s children`}
          className="nodrag bg-card text-primary hover:bg-muted absolute -bottom-3.5 left-1/2 z-10 flex size-7 -translate-x-1/2 items-center justify-center rounded-full border shadow-sm"
          onClick={(e) => {
            e.stopPropagation();
            data.onExpand(person.id, 'down');
          }}
        >
          <ChevronDown className="size-4" />
        </button>
      )}
      <Handle type="source" position={Position.Bottom} className={hiddenHandle} isConnectable={false} />
    </div>
  );
});

export type UnionFlowNode = Node<{ onLine: boolean; ended: boolean }, 'union'>;

export const UnionNode = memo(function UnionNode({ data }: NodeProps<UnionFlowNode>) {
  return (
    <div
      style={{ width: UNION_SIZE, height: UNION_SIZE }}
      className={cn(
        'rounded-full border-2',
        data.onLine ? 'border-primary bg-accent' : 'border-muted-foreground/50 bg-card',
        data.ended && 'border-dashed',
      )}
      aria-hidden
    >
      <Handle type="target" position={Position.Top} className={hiddenHandle} isConnectable={false} />
      <Handle type="source" position={Position.Bottom} className={hiddenHandle} isConnectable={false} />
    </div>
  );
});

export type PlaceholderFlowNode = Node<{ childSlug: string; role: 'father' | 'mother' }, 'placeholder'>;

export const PlaceholderNode = memo(function PlaceholderNode({ data }: NodeProps<PlaceholderFlowNode>) {
  return (
    <div style={{ width: PLACEHOLDER_WIDTH, height: PLACEHOLDER_HEIGHT }}>
      <Link
        href={`/people/${data.childSlug}/add/${data.role}`}
        className="nodrag border-muted-foreground/40 text-muted-foreground hover:border-primary hover:text-primary flex size-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed text-sm font-medium"
      >
        <Plus className="size-4" /> Add {data.role}
      </Link>
      <Handle type="source" position={Position.Bottom} className={hiddenHandle} isConnectable={false} />
    </div>
  );
});

export const nodeTypes = { person: PersonNode, union: UnionNode, placeholder: PlaceholderNode };
