'use client';

import { useEffect, useState } from 'react';

import type { SearchResult } from '@/lib/types';

/** Debounced search-as-you-type against /api/search. */
export function usePersonSearch(query: string, delayMs = 250) {
  const q = query.trim();
  const [state, setState] = useState<{ query: string; results: SearchResult[] }>({ query: '', results: [] });

  useEffect(() => {
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        const body = res.ok ? ((await res.json()) as { results: SearchResult[] }) : { results: [] };
        setState({ query: q, results: body.results });
      } catch {
        if (!controller.signal.aborted) setState((s) => ({ ...s, query: q }));
      }
    }, delayMs);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [q, delayMs]);

  const active = q.length >= 2;
  return {
    // Keep showing the previous results while the next ones load.
    results: active ? state.results : [],
    loading: active && state.query !== q,
  };
}
