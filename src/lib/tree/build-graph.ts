// Turns a tree window from the database into a drawable graph:
// person nodes, small "union" nodes joining partners, and placeholder
// nodes ("+ Add father") for editors. Pure, so it can be unit-tested.

import type { ParentRelationship, TreeEdgeData, TreeNodeData, TreeUnionData, TreeWindow } from '@/lib/types';

export type GraphNode =
  | { kind: 'person'; id: string; person: TreeNodeData; isFocus: boolean }
  | { kind: 'union'; id: string; union: TreeUnionData; onLine: boolean }
  | { kind: 'placeholder'; id: string; childId: string; childSlug: string; role: 'father' | 'mother' };

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  kind: 'partner' | 'child' | 'placeholder';
  relationship: ParentRelationship;
  onLine: boolean;
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export const unionNodeId = (unionId: string) => `u:${unionId}`;
export const placeholderId = (childId: string, role: string) => `add:${role}:${childId}`;

/** Merge a newly fetched window into the one on screen (used by "expand"). */
export function mergeWindows(current: TreeWindow, next: TreeWindow): TreeWindow {
  const nodes = new Map(current.nodes.map((n) => [n.id, n]));
  for (const n of next.nodes) {
    const old = nodes.get(n.id);
    nodes.set(
      n.id,
      old
        ? {
            ...old,
            ...n,
            onLine: old.onLine,
            // A node has more to load only if neither window contained all its relatives.
            hasMoreParents: old.hasMoreParents && n.hasMoreParents,
            hasMoreChildren: old.hasMoreChildren && n.hasMoreChildren,
          }
        : { ...n, onLine: false },
    );
  }
  const edges = new Map(current.edges.map((e) => [e.id, e]));
  for (const e of next.edges) edges.set(e.id, e);
  const unions = new Map(current.unions.map((u) => [u.id, u]));
  for (const u of next.unions) unions.set(u.id, u);
  return {
    ...current,
    truncated: current.truncated || next.truncated,
    nodes: [...nodes.values()],
    edges: [...edges.values()],
    unions: [...unions.values()],
  };
}

/**
 * Family order: each person, then their spouses, then (recursively) their
 * children, starting from the oldest people with no parents on screen.
 * The layout keeps this left-to-right order within each generation, so
 * couples sit together and siblings stay grouped.
 */
export function familyOrder(window: TreeWindow): TreeNodeData[] {
  const people = new Map(window.nodes.map((n) => [n.id, n]));
  const byBirth = (a: TreeNodeData, b: TreeNodeData) =>
    (a.birthYear ?? 9999) - (b.birthYear ?? 9999) || a.name.localeCompare(b.name);
  const parentsOf = new Map<string, string[]>();
  const childrenOf = new Map<string, string[]>();
  for (const e of window.edges) {
    if (!people.has(e.parentId) || !people.has(e.childId)) continue;
    parentsOf.set(e.childId, [...(parentsOf.get(e.childId) ?? []), e.parentId]);
    childrenOf.set(e.parentId, [...(childrenOf.get(e.parentId) ?? []), e.childId]);
  }
  const spousesOf = new Map<string, { id: string; order: number }[]>();
  for (const u of window.unions) {
    if (!people.has(u.partnerAId) || !people.has(u.partnerBId)) continue;
    spousesOf.set(u.partnerAId, [
      ...(spousesOf.get(u.partnerAId) ?? []),
      { id: u.partnerBId, order: u.partnerAOrder },
    ]);
    spousesOf.set(u.partnerBId, [
      ...(spousesOf.get(u.partnerBId) ?? []),
      { id: u.partnerAId, order: u.partnerBOrder },
    ]);
  }

  const out: TreeNodeData[] = [];
  const seen = new Set<string>();
  const emit = (id: string) => {
    if (seen.has(id)) return false;
    seen.add(id);
    out.push(people.get(id)!);
    return true;
  };
  const visit = (id: string) => {
    if (seen.has(id)) return;
    const spouses = (spousesOf.get(id) ?? []).sort((a, b) => a.order - b.order);
    // With several spouses the person sits in the middle: first wife on the
    // left, later wives on the right, so each couple stays side by side.
    const left = spouses.length >= 2 ? spouses.slice(0, Math.floor(spouses.length / 2)) : [];
    const right = spouses.slice(left.length);
    for (const s of left) emit(s.id);
    emit(id);
    for (const s of right) emit(s.id);

    // Children grouped by marriage (in spouse order), each group oldest first;
    // then children with no recorded partner, then a spouse's other children.
    const mine = childrenOf.get(id) ?? [];
    const withSpouse = (sid: string) => mine.filter((c) => parentsOf.get(c)?.includes(sid));
    const groups = [...left, ...right].map((sp) => withSpouse(sp.id));
    const grouped = new Set(groups.flat());
    groups.push(mine.filter((c) => !grouped.has(c)));
    for (const sp of [...left, ...right]) {
      groups.push((childrenOf.get(sp.id) ?? []).filter((c) => !mine.includes(c)));
    }
    for (const group of groups) {
      const kids = [...new Set(group)].map((c) => people.get(c)!).sort(byBirth);
      for (const k of kids) visit(k.id);
    }
  };

  const roots = window.nodes.filter((n) => !parentsOf.get(n.id)?.length).sort(byBirth);
  // Start with roots who have children, so married-in spouses follow their partner.
  for (const r of roots.filter((r) => childrenOf.has(r.id))) visit(r.id);
  for (const r of roots) visit(r.id);
  for (const n of window.nodes) visit(n.id);
  return out;
}

export function buildGraph(window: TreeWindow, { showPlaceholders = false } = {}): Graph {
  const people = new Map(window.nodes.map((n) => [n.id, n]));
  const nodes: GraphNode[] = familyOrder(window).map((person) => ({
    kind: 'person',
    id: person.id,
    person,
    isFocus: person.id === window.focusId,
  }));
  const edges: GraphEdge[] = [];

  // Unions between people who are both on screen.
  const unions = window.unions.filter((u) => people.has(u.partnerAId) && people.has(u.partnerBId));
  const unionByPair = new Map<string, TreeUnionData>();
  const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  for (const u of unions) {
    const onLine = Boolean(people.get(u.partnerAId)?.onLine && people.get(u.partnerBId)?.onLine);
    const anyOnLine = Boolean(people.get(u.partnerAId)?.onLine || people.get(u.partnerBId)?.onLine);
    nodes.push({ kind: 'union', id: unionNodeId(u.id), union: u, onLine: anyOnLine });
    unionByPair.set(pairKey(u.partnerAId, u.partnerBId), u);
    for (const partner of [u.partnerAId, u.partnerBId]) {
      edges.push({
        id: `p:${u.id}:${partner}`,
        source: partner,
        target: unionNodeId(u.id),
        kind: 'partner',
        relationship: 'biological',
        onLine,
      });
    }
  }

  // Children: through their parents' union when both links are the same
  // kind, otherwise straight from each parent.
  const linksByChild = new Map<string, TreeEdgeData[]>();
  for (const e of window.edges) {
    if (!people.has(e.parentId) || !people.has(e.childId)) continue;
    const list = linksByChild.get(e.childId) ?? [];
    list.push(e);
    linksByChild.set(e.childId, list);
  }

  for (const [childId, links] of linksByChild) {
    const child = people.get(childId)!;
    const used = new Set<string>();
    for (let i = 0; i < links.length; i++) {
      for (let j = i + 1; j < links.length; j++) {
        const a = links[i]!;
        const b = links[j]!;
        if (used.has(a.id) || used.has(b.id) || a.type !== b.type) continue;
        const union = unionByPair.get(pairKey(a.parentId, b.parentId));
        if (!union) continue;
        used.add(a.id);
        used.add(b.id);
        const onLine = Boolean(
          child.onLine && (people.get(a.parentId)?.onLine || people.get(b.parentId)?.onLine),
        );
        edges.push({
          id: `c:${union.id}:${childId}`,
          source: unionNodeId(union.id),
          target: childId,
          kind: 'child',
          relationship: a.type,
          onLine,
        });
      }
    }
    for (const link of links) {
      if (used.has(link.id)) continue;
      edges.push({
        id: `l:${link.id}`,
        source: link.parentId,
        target: childId,
        kind: 'child',
        relationship: link.type,
        onLine: Boolean(child.onLine && people.get(link.parentId)?.onLine),
      });
    }
  }

  // "+ Add father / mother" for the focus and people on the line.
  if (showPlaceholders) {
    for (const person of window.nodes) {
      if (!(person.onLine || person.id === window.focusId) || person.hasMoreParents) continue;
      for (const role of ['father', 'mother'] as const) {
        const known = role === 'father' ? person.hasFather : person.hasMother;
        if (known) continue;
        const id = placeholderId(person.id, role);
        nodes.push({ kind: 'placeholder', id, childId: person.id, childSlug: person.slug, role });
        edges.push({
          id: `e:${id}`,
          source: id,
          target: person.id,
          kind: 'placeholder',
          relationship: 'biological',
          onLine: false,
        });
      }
    }
  }

  return { nodes, edges };
}

export const DASHED_RELATIONSHIPS: ReadonlySet<ParentRelationship> = new Set([
  'adoptive',
  'step',
  'foster',
  'guardian',
]);
