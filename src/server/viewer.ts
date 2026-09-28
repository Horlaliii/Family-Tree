import 'server-only';

import { cookies, headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';

import { getGateSettings, PASSCODE_COOKIE, readPasscodeCookie } from './passcode';
import { createUserSupabase, createVisitorSupabase, type Db } from './supabase';

export type Role = 'member' | 'editor' | 'admin';

export type Viewer =
  | {
      kind: 'visitor';
      /** Signed in, but not (yet) an active member. */
      pendingEmail?: string | null;
    }
  | {
      kind: 'user';
      userId: string;
      email: string | null;
      displayName: string | null;
      role: Role;
      linkedPersonId: string | null;
    };

const RANK: Record<Role, number> = { member: 1, editor: 2, admin: 3 };

export function hasRole(viewer: Viewer | null, min: Role): boolean {
  return viewer?.kind === 'user' && RANK[viewer.role] >= RANK[min];
}

export const canEdit = (viewer: Viewer | null) => hasRole(viewer, 'editor');
export const isAdmin = (viewer: Viewer | null) => hasRole(viewer, 'admin');

/** The signed-in Supabase user and their profile, if any. */
export const getSessionUser = cache(async () => {
  const supabase = await createUserSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, status, display_name, email, linked_person_id')
    .eq('user_id', user.id)
    .maybeSingle();
  return { user, profile };
});

/**
 * Who is asking? Active users are members/editors/admins. Everyone else is
 * a visitor if they hold a valid passcode cookie (or the gate is off).
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const session = await getSessionUser();
  if (session?.profile?.status === 'active') {
    return {
      kind: 'user',
      userId: session.user.id,
      email: session.profile.email ?? session.user.email ?? null,
      displayName: session.profile.display_name,
      role: session.profile.role,
      linkedPersonId: session.profile.linked_person_id,
    };
  }

  const pendingEmail = session ? (session.user.email ?? null) : undefined;
  const gate = await getGateSettings();
  if (!gate.enabled) return { kind: 'visitor', pendingEmail };

  const cookieStore = await cookies();
  const version = await readPasscodeCookie(cookieStore.get(PASSCODE_COOKIE)?.value);
  if (version !== null && version === gate.version) {
    return { kind: 'visitor', pendingEmail };
  }
  return null;
});

/** Use at the top of every gated page: sends people to the passcode page. */
export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) {
    const h = await headers();
    const path = h.get('x-pathname') ?? '/';
    redirect(`/passcode?next=${encodeURIComponent(path)}`);
  }
  return viewer;
}

export async function requireRole(min: Role): Promise<Extract<Viewer, { kind: 'user' }>> {
  const viewer = await requireViewer();
  if (viewer.kind !== 'user' || !hasRole(viewer, min)) notFound();
  return viewer;
}

/** A database client scoped to the current viewer. */
export const getDb = cache(async (): Promise<Db> => {
  const viewer = await requireViewer();
  return viewer.kind === 'user' ? createUserSupabase() : createVisitorSupabase();
});

/** For route handlers and actions: the viewer and their client, or null. */
export async function getViewerAndDb(): Promise<{ viewer: Viewer; db: Db } | null> {
  const viewer = await getViewer();
  if (!viewer) return null;
  const db = viewer.kind === 'user' ? await createUserSupabase() : await createVisitorSupabase();
  return { viewer, db };
}
