'use client';

import { createBrowserClient } from '@supabase/ssr';

import { publicEnv } from '@/lib/env';

import type { Database } from './database.types';

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

/** Browser client: used only for signing in and uploading files. */
export function getBrowserSupabase() {
  client ??= createBrowserClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey);
  return client;
}
