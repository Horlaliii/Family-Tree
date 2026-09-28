import { describe, expect, it } from 'vitest';

import { buildGraph, familyOrder, mergeWindows, unionNodeId } from '@/lib/tree/build-graph';
import type { TreeEdgeData, TreeNodeData, TreeUnionData, TreeWindow } from '@/lib/types';

const node = (id: string, over: Partial<TreeNodeData> = {}): TreeNodeData => ({
  id,
  slug: id,
  name: id,
  sex: 'unknown',
  isLiving: false,
  canViewDetails: true,
  photoId: null,
  birthYear: null,
  birthQualifier: null,
  birthYearEnd: null,
  deathYear: null,
  deathQualifier: null,
  deathYearEnd: null,
  deathText: null,
  onLine: false,
  hasMoreParents: false,
  hasMoreChildren: false,
  hasFather: true,
  hasMother: true,
  ...over,
});
const edge = (
  parentId: string,
  childId: string,
  type: TreeEdgeData['type'] = 'biological',
): TreeEdgeData => ({
  id: `${parentId}>${childId}`,
  parentId,
  childId,
  type,
});
const union = (id: string, a: string, b: string, aOrder = 1): TreeUnionData => ({
  id,
  partnerAId: a,
  partnerBId: b,
  type: 'customary',
  partnerAOrder: aOrder,
  partnerBOrder: 1,
  ended: false,
});

// Kwame with two wives: Ama (children k1, k2) and Yaa (child k3).
const polygamous: TreeWindow = {
  focusId: 'kwame',
  lineage: 'paternal',
  up: 1,
  down: 1,
  truncated: false,
  nodes: [
    node('kwame', { sex: 'male', onLine: true, birthYear: 1898 }),
    node('ama', { sex: 'female' }),
    node('yaa', { sex: 'female' }),
    node('k1', { onLine: true, birthYear: 1925 }),
    node('k2', { onLine: true, birthYear: 1928 }),
    node('k3', { onLine: true, birthYear: 1938 }),
  ],
  edges: [
    edge('kwame', 'k1'),
    edge('ama', 'k1'),
    edge('kwame', 'k2'),
    edge('ama', 'k2'),
    edge('kwame', 'k3'),
    edge('yaa', 'k3'),
  ],
  unions: [union('u1', 'kwame', 'ama', 1), union('u2', 'kwame', 'yaa', 2)],
};

describe('buildGraph', () => {
  it('routes children through the union of both their parents', () => {
    const g = buildGraph(polygamous);
    const childEdges = g.edges.filter((e) => e.kind === 'child');
    expect(childEdges.map((e) => [e.source, e.target]).sort()).toEqual([
      [unionNodeId('u1'), 'k1'],
      [unionNodeId('u1'), 'k2'],
      [unionNodeId('u2'), 'k3'],
    ]);
    expect(g.nodes.filter((n) => n.kind === 'union')).toHaveLength(2);
  });

  it('draws direct lines when the two links are different kinds', () => {
    const w: TreeWindow = {
      ...polygamous,
      edges: [edge('kwame', 'k3'), edge('yaa', 'k3', 'step')],
    };
    const g = buildGraph(w);
    const direct = g.edges.filter((e) => e.kind === 'child');
    expect(direct).toHaveLength(2);
    expect(direct.find((e) => e.source === 'yaa')?.relationship).toBe('step');
  });

  it('highlights only edges along the chosen line', () => {
    const g = buildGraph(polygamous);
    const partnerEdges = g.edges.filter((e) => e.kind === 'partner');
    expect(partnerEdges.every((e) => !e.onLine)).toBe(true); // wives are not on the paternal line
    expect(g.edges.filter((e) => e.kind === 'child').every((e) => e.onLine)).toBe(true);
  });

  it('adds "add father/mother" placeholders only for editors', () => {
    const w: TreeWindow = {
      ...polygamous,
      nodes: polygamous.nodes.map((n) =>
        n.id === 'kwame' ? { ...n, hasFather: false, hasMother: false } : n,
      ),
    };
    expect(buildGraph(w).nodes.some((n) => n.kind === 'placeholder')).toBe(false);
    const placeholders = buildGraph(w, { showPlaceholders: true }).nodes.filter(
      (n) => n.kind === 'placeholder',
    );
    expect(placeholders.map((p) => (p.kind === 'placeholder' ? p.role : null)).sort()).toEqual([
      'father',
      'mother',
    ]);
  });
});

describe('familyOrder', () => {
  it('puts a man between his two wives and groups children by marriage', () => {
    const order = familyOrder(polygamous).map((n) => n.id);
    expect(order.slice(0, 3)).toEqual(['ama', 'kwame', 'yaa']);
    expect(order.slice(3)).toEqual(['k1', 'k2', 'k3']);
  });
});

describe('mergeWindows', () => {
  it('adds new people off the line and clears expand flags once relatives are loaded', () => {
    const current: TreeWindow = {
      ...polygamous,
      nodes: polygamous.nodes.map((n) => (n.id === 'k1' ? { ...n, hasMoreChildren: true } : n)),
    };
    const next: TreeWindow = {
      ...polygamous,
      focusId: 'k1',
      nodes: [node('k1', { hasMoreChildren: false }), node('grandchild', { onLine: true })],
      edges: [edge('k1', 'grandchild')],
      unions: [],
    };
    const merged = mergeWindows(current, next);
    expect(merged.focusId).toBe('kwame');
    expect(merged.nodes.find((n) => n.id === 'k1')?.hasMoreChildren).toBe(false);
    expect(merged.nodes.find((n) => n.id === 'k1')?.onLine).toBe(true);
    expect(merged.nodes.find((n) => n.id === 'grandchild')?.onLine).toBe(false);
    expect(merged.edges).toHaveLength(polygamous.edges.length + 1);
  });
});
