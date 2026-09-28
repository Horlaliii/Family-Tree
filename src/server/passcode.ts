import 'server-only';

import bcrypt from 'bcryptjs';
import { jwtVerify, SignJWT } from 'jose';

import { serverEnv } from './env';
import { createAdminSupabase } from './supabase';

export const PASSCODE_COOKIE = 'oft_family';
export const PASSCODE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // one year

export interface GateSettings {
  enabled: boolean;
  version: number;
  hasPasscode: boolean;
}

// Tiny per-instance cache so every page view doesn't re-read the settings.
// Changing the passcode clears it on this instance; others catch up in 30s.
let cached: { value: GateSettings; at: number } | undefined;
const CACHE_MS = 30_000;

export async function getGateSettings(): Promise<GateSettings> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;
  const { data, error } = await createAdminSupabase()
    .from('site_secrets')
    .select('passcode_enabled, passcode_version, passcode_hash')
    .single();
  if (error) throw error;
  const value: GateSettings = {
    enabled: data.passcode_enabled && Boolean(data.passcode_hash),
    version: data.passcode_version,
    hasPasscode: Boolean(data.passcode_hash),
  };
  cached = { value, at: Date.now() };
  return value;
}

export function clearGateCache() {
  cached = undefined;
}

function cookieKey() {
  return new TextEncoder().encode(serverEnv.passcodeCookieSecret);
}

export async function signPasscodeCookie(version: number): Promise<string> {
  return new SignJWT({ v: version })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${PASSCODE_COOKIE_MAX_AGE}s`)
    .sign(cookieKey());
}

/** Returns the passcode version stored in a valid cookie, or null. */
export async function readPasscodeCookie(token: string | undefined): Promise<number | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, cookieKey(), { algorithms: ['HS256'] });
    return typeof payload.v === 'number' ? payload.v : null;
  } catch {
    return null;
  }
}

export async function verifyPasscode(input: string): Promise<boolean> {
  const { data, error } = await createAdminSupabase().from('site_secrets').select('passcode_hash').single();
  if (error) throw error;
  if (!data.passcode_hash) return false;
  return bcrypt.compare(input.trim(), data.passcode_hash);
}

export async function hashPasscode(passcode: string): Promise<string> {
  return bcrypt.hash(passcode.trim(), 10);
}

/** Fixed-window rate limit shared by all server instances (stored in Postgres). */
export async function hitRateLimit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  const { data, error } = await createAdminSupabase().rpc('hit_rate_limit', {
    p_key: key,
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  if (error) throw error;
  return data === true;
}
