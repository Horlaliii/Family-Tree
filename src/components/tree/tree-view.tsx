'use client';

import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowRight, Loader2, Minus, Plus } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { formatLifeYears } from '@/lib/dates/fuzzy-date';
import { buildGraph, DASHED_RELATIONSHIPS, mergeWindows } from '@/lib/tree/build-graph';
import { layoutGraph, PERSON_HEIGHT, PERSON_WIDTH } from '@/lib/tree/layout';
import type { Lineage, TreeWindow } from '@/lib/types';
import { cn } from '@/lib/utils';

import { nodeTypes } from './tree-nodes';

interface Payload {
  window: TreeWindow;
  photos: Record<string, string>;
}

const LINEAGES: { value: Lineage; label: string }[] = [
  { value: 'paternal', label: "Father's line" },
  { value: 'maternal', label: "Mother's line" },
  { value: 'both', label: 'Both' },
];

async function fetchTree(focus: string, up: number, down: number, line: Lineage): Promise<Payload> {
  const res = await fetch(`/api/tree?focus=${encodeURIComponent(focus)}&up=${up}&down=${down}&line=${line}`);
  if (!res.ok) throw new Error('Could not load the tree');
  return res.json();
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="bg-card flex items-center gap-1 rounded-lg border px-1" role="group" aria-label={label}>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Fewer generations ${label.toLowerCase()}`}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
      >
        <Minus />
      </Button>
      <span className="min-w-12 text-center text-sm" aria-live="polite">
        {label} {value}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`More generations ${label.toLowerCase()}`}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Plus />
      </Button>
    </div>
  );
}

function TreeCanvas({
  initial,
  initialUp,
  initialDown,
  initialLineage,
  canEdit,
}: {
  initial: Payload;
  initialUp: number;
  initialDown: number;
  initialLineage: Lineage;
  canEdit: boolean;
}) {
  const flow = useReactFlow();
  const [tree, setTree] = useState(initial.window);
  const [photos, setPhotos] = useState(initial.photos);
  const [lineage, setLineage] = useState<Lineage>(initialLineage);
  const [up, setUp] = useState(initialUp);
  const [down, setDown] = useState(initialDown);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(false);
  // The tree data most recently laid out; differs from `tree` while ELK works.
  const [laidOut, setLaidOut] = useState<TreeWindow | null>(null);
  const arranging = laidOut !== tree;
  const [error, setError] = useState<string | null>(null);
  const centerOnFocus = useRef(true);

  const focus = tree.nodes.find((n) => n.id === tree.focusId);

  const load = useCallback(async (focusId: string, u: number, d: number, line: Lineage) => {
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchTree(focusId, u, d, line);
      centerOnFocus.current = true;
      setTree(payload.window);
      setPhotos(payload.photos);
      const slug = payload.window.nodes.find((n) => n.id === payload.window.focusId)?.slug ?? focusId;
      history.replaceState(null, '', `/tree?focus=${slug}&up=${u}&down=${d}&line=${line}`);
    } catch {
      setError('Could not load that part of the tree. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const expand = useCallback(async (personId: string, direction: 'up' | 'down') => {
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchTree(
        personId,
        direction === 'up' ? 1 : 0,
        direction === 'down' ? 1 : 0,
        'both',
      );
      centerOnFocus.current = false;
      setTree((w) => {
        const merged = mergeWindows(w, payload.window);
        // The person we expanded from has now shown that direction.
        merged.nodes = merged.nodes.map((n) =>
          n.id === personId
            ? { ...n, [direction === 'up' ? 'hasMoreParents' : 'hasMoreChildren']: false }
            : n,
        );
        return merged;
      });
      setPhotos((p) => ({ ...p, ...payload.photos }));
    } catch {
      setError('Could not load more of the tree.');
    } finally {
      setLoading(false);
    }
  }, []);

  const select = useCallback(
    (personId: string) => {
      if (personId === tree.focusId) return;
      void load(personId, up, down, lineage);
    },
    [tree.focusId, up, down, lineage, load],
  );

  // Build and lay out the graph whenever the data changes.
  useEffect(() => {
    let cancelled = false;
    const graph = buildGraph(tree, { showPlaceholders: canEdit });
    layoutGraph(graph).then((positions) => {
      if (cancelled) return;
      const flowNodes: Node[] = graph.nodes.map((n) => {
        const position = positions[n.id] ?? { x: 0, y: 0 };
        if (n.kind === 'person') {
          return {
            id: n.id,
            type: 'person',
            position,
            // Nodes aren't draggable or selectable, so React Flow would make them
            // ignore pointer events; the buttons inside them need taps.
            style: { pointerEvents: 'all' },
            data: {
              person: n.person,
              isFocus: n.isFocus,
              dim: !n.isFocus && !n.person.onLine,
              photoUrl: n.person.photoId ? (photos[n.person.photoId] ?? null) : null,
              onSelect: select,
              onExpand: expand,
            },
          };
        }
        if (n.kind === 'union') {
          return { id: n.id, type: 'union', position, data: { onLine: n.onLine, ended: n.union.ended } };
        }
        return {
          id: n.id,
          type: 'placeholder',
          position,
          style: { pointerEvents: 'all' },
          data: { childSlug: n.childSlug, role: n.role },
        };
      });
      const flowEdges: Edge[] = graph.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'smoothstep',
        focusable: false,
        style: {
          stroke: e.onLine ? 'var(--tree-line-highlight)' : 'var(--tree-line)',
          strokeWidth: e.onLine ? 2.5 : 1.5,
          strokeDasharray:
            e.kind === 'placeholder' || DASHED_RELATIONSHIPS.has(e.relationship) ? '6 5' : undefined,
          opacity: e.onLine ? 1 : 0.7,
        },
      }));
      setNodes(flowNodes);
      setEdges(flowEdges);
      setLaidOut(tree);

      if (centerOnFocus.current) {
        const p = positions[tree.focusId];
        if (p) {
          requestAnimationFrame(() =>
            flow.setCenter(p.x + PERSON_WIDTH / 2, p.y + PERSON_HEIGHT / 2 - 40, {
              zoom: globalThis.innerWidth < 640 ? 0.7 : 0.9,
              duration: 400,
            }),
          );
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [tree, photos, canEdit, select, expand, flow]);

  const legend = useMemo(
    () => (
      <div className="bg-card/95 text-muted-foreground hidden items-center gap-4 rounded-lg border px-3 py-1.5 text-xs sm:flex">
        <span className="flex items-center gap-1.5">
          <svg width="24" height="4" aria-hidden>
            <line x1="0" y1="2" x2="24" y2="2" stroke="var(--tree-line-highlight)" strokeWidth="2.5" />
          </svg>
          Birth
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="24" height="4" aria-hidden>
            <line
              x1="0"
              y1="2"
              x2="24"
              y2="2"
              stroke="var(--tree-line)"
              strokeWidth="2"
              strokeDasharray="6 5"
            />
          </svg>
          Adoptive, step, foster
        </span>
      </div>
    ),
    [],
  );

  return (
    <div className="bg-background fixed inset-x-0 top-[4.25rem] bottom-16 z-30 md:bottom-0">
      <h1 className="sr-only">Family tree around {focus?.name}</h1>

      {/* Controls */}
      <div className="absolute inset-x-0 top-0 z-10 flex flex-wrap items-center gap-2 p-2 sm:p-3">
        <div
          role="radiogroup"
          aria-label="Which line to follow"
          className="bg-muted flex rounded-xl p-1 shadow-sm"
        >
          {LINEAGES.map((l) => (
            <button
              key={l.value}
              type="button"
              role="radio"
              aria-checked={lineage === l.value}
              className={cn(
                'min-h-9 rounded-lg px-3 text-sm font-medium',
                lineage === l.value ? 'bg-card shadow-sm' : 'text-muted-foreground',
              )}
              onClick={() => {
                setLineage(l.value);
                void load(tree.focusId, up, down, l.value);
              }}
            >
              {l.label}
            </button>
          ))}
        </div>
        <Stepper
          label="Up"
          value={up}
          min={0}
          max={8}
          onChange={(v) => {
            setUp(v);
            void load(tree.focusId, v, down, lineage);
          }}
        />
        <Stepper
          label="Down"
          value={down}
          min={0}
          max={8}
          onChange={(v) => {
            setDown(v);
            void load(tree.focusId, up, v, lineage);
          }}
        />
        {(loading || arranging) && (
          <span
            className="bg-card/95 text-muted-foreground flex items-center gap-2 rounded-lg border px-2 py-1 text-sm"
            role="status"
          >
            <Loader2 className="text-primary size-4 animate-spin" aria-hidden />
            {loading ? 'Loading…' : 'Arranging…'}
          </span>
        )}
        {legend}
      </div>

      {error && (
        <p
          role="alert"
          className="bg-destructive/10 text-destructive absolute top-24 left-1/2 z-10 -translate-x-1/2 rounded-lg px-3 py-2 text-sm"
        >
          {error}
        </p>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        // Keep every node reachable by keyboard and screen readers unless the window is big.
        onlyRenderVisibleElements={nodes.length > 150}
        minZoom={0.15}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        fitViewOptions={{ padding: 0.2 }}
      >
        <Background gap={24} size={1} color="var(--border)" />
        <Controls showInteractive={false} position="bottom-right" className="!hidden sm:!flex" />
      </ReactFlow>

      {/* The person in the centre */}
      {focus && (
        <div className="absolute inset-x-2 bottom-2 z-10 sm:right-auto sm:left-3 sm:w-80">
          <div className="bg-card/95 flex items-center gap-3 rounded-xl border p-3 shadow-lg backdrop-blur">
            <div className="min-w-0 flex-1">
              <p className="truncate font-serif font-semibold">{focus.name}</p>
              <p className="text-muted-foreground text-sm">{formatLifeYears(focus) || ' '}</p>
            </div>
            <Button asChild size="sm">
              <Link href={`/people/${focus.slug}`}>
                Profile <ArrowRight />
              </Link>
            </Button>
          </div>
          {tree.truncated && (
            <p className="bg-card/95 mt-2 rounded-lg border p-2 text-xs">
              Showing part of a very large tree. Reduce the generations to see everything.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function TreeView(props: {
  initial: Payload;
  initialUp: number;
  initialDown: number;
  initialLineage: Lineage;
  canEdit: boolean;
}) {
  return (
    <ReactFlowProvider>
      <TreeCanvas {...props} />
    </ReactFlowProvider>
  );
}
