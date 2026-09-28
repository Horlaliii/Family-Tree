// Writes .env.local for the local Supabase stack (run `npx supabase start`
// first). Works on Windows, macOS and Linux. Pass --force to overwrite.
import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';

const target = '.env.local';
if (existsSync(target) && !process.argv.includes('--force')) {
  console.error(`${target} already exists. Run again with --force to replace it.`);
  process.exit(1);
}

let status;
try {
  status = JSON.parse(
    execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }),
  );
} catch {
  console.error(
    'Could not read the local Supabase status. Is Docker running, and has `npx supabase start` finished?',
  );
  process.exit(1);
}

const env = {
  NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY,
  NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
  SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
  SUPABASE_JWT_SECRET: status.JWT_SECRET,
  PASSCODE_COOKIE_SECRET: randomBytes(32).toString('hex'),
};
const missing = Object.entries(env).filter(([, value]) => !value);
if (missing.length) {
  console.error(`Supabase status is missing: ${missing.map(([key]) => key).join(', ')}`);
  process.exit(1);
}

writeFileSync(
  target,
  `# Local Supabase stack, written by npm run setup:local\n${Object.entries(env)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')}\n`,
);
console.log(`Wrote ${target}. Now run: npm run dev`);
