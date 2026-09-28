'use client';

// Lays out the graph with ELK (layered, top to bottom) in a Web Worker.

import type { ELK, ElkNode } from 'elkjs/lib/elk-api';

import type { Graph } from './build-graph';

export const PERSON_WIDTH = 176;
export const PERSON_HEIGHT = 84;
export const UNION_SIZE = 14;
export const PLACEHOLDER_WIDTH = 150;
export const PLACEHOLDER_HEIGHT = 48;

let elk: Promise<ELK> | undefined;

function getElk(): Promise<ELK> {
  elk ??= import('elkjs/lib/elk-api').then(
    ({ default: ELKConstructor }) => new ELKConstructor({ workerUrl: '/elk-worker.min.js' }),
  );
  return elk;
}

export interface Positions {
  [id: string]: { x: number; y: number };
}

function sizeOf(kind: Graph['nodes'][number]['kind']) {
  switch (kind) {
    case 'union':
      return { width: UNION_SIZE, height: UNION_SIZE };
    case 'placeholder':
      return { width: PLACEHOLDER_WIDTH, height: PLACEHOLDER_HEIGHT };
    default:
      return { width: PERSON_WIDTH, height: PERSON_HEIGHT };
  }
}

export async function layoutGraph(graph: Graph): Promise<Positions> {
  const engine = await getElk();
  const root: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.layered.layering.strategy': 'NETWORK_SIMPLEX',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
      'elk.layered.crossingMinimization.forceNodeModelOrder': 'true',
      'elk.layered.spacing.nodeNodeBetweenLayers': '36',
      'elk.spacing.nodeNode': '28',
      'elk.layered.spacing.edgeNodeBetweenLayers': '16',
      'elk.separateConnectedComponents': 'false',
    },
    children: graph.nodes.map((n) => ({ id: n.id, ...sizeOf(n.kind) })),
    edges: graph.edges.map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  };
  const result = await engine.layout(root);
  const positions: Positions = {};
  for (const child of result.children ?? []) {
    positions[child.id] = { x: child.x ?? 0, y: child.y ?? 0 };
  }
  return positions;
}
