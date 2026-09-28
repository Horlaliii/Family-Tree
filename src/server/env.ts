import 'server-only';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}. See .env.example.`);
  }
  return value;
}

export const serverEnv = {
  get serviceRoleKey() {
    return required('SUPABASE_SERVICE_ROLE_KEY');
  },
  /** Signs the short-lived "visitor" database tokens. */
  get jwtSecret() {
    return required('SUPABASE_JWT_SECRET');
  },
  /** Signs the family passcode cookie. */
  get passcodeCookieSecret() {
    const value = required('PASSCODE_COOKIE_SECRET');
    if (value.length < 32) {
      throw new Error('PASSCODE_COOKIE_SECRET must be at least 32 characters.');
    }
    return value;
  },
};
