# OurFamilyTree

A private, WikiTree-style family history site for one large, extended family. Every relative gets a profile;
parent, child and marriage links join them into a tree you can explore from anyone, along the father's line,
the mother's line or both.

- **Private by default.** The whole site sits behind a family passcode. Passcode visitors see only the name,
  profile photo and relationships of living people. Signed-in members see everything.
- **Built for real families.** It handles several (and concurrent) marriages, half-siblings, adoption, fostering
  and guardianship, and every name someone went by (birth, day, baptismal, married, nickname). It also handles
  vague dates ("c. 1942", "between 1903 and 1906", "during the war").
- **Built for phones on mobile data.** The layout is mobile-first and pages are server-rendered. Photos are
  compressed before upload. The tree loads one window at a time, never the whole family.

Stack: Next.js 16 (App Router, TypeScript strict), Tailwind CSS v4 + shadcn-style components, Supabase
(Postgres + Row Level Security, Auth, Storage), React Flow + ELK for the tree, React Hook Form + Zod.

---

## Contents

1. [Run it locally](#1-run-it-locally)
2. [Set up the Supabase project](#2-set-up-the-supabase-project)
3. [Environment variables](#3-environment-variables)
4. [Migrations and seed data](#4-migrations-and-seed-data)
5. [Deploy to Vercel](#5-deploy-to-vercel)
6. [First sign-in and giving relatives access](#6-first-sign-in-and-giving-relatives-access)
7. [Backups](#7-backups)
8. [Tests](#8-tests)
9. [How privacy works](#9-how-privacy-works)
10. [Project layout](#10-project-layout)

---

## 1. Run it locally

You need Node.js 22+ and Docker (for the local Supabase stack).

```bash
npm install                      # also copies the tree-layout worker into public/
npx supabase start               # local Postgres, Auth, Storage, Studio and a test mail inbox
npx supabase status -o env       # prints the local URL and keys
cp .env.example .env.local       # then paste in the values (see section 3)
npm run dev                      # http://localhost:3000
```

`supabase start` applies every migration and loads the sample family (`supabase/seed.sql`), which has
40 people over 6 generations. The **local passcode is `family-tree`**.

To sign in locally, open **/login**, choose "Email me a sign-in link", and open the email in the local inbox at
<http://127.0.0.1:54324>. The first account ever created becomes the admin.

Useful local URLs:

| What                               | URL                    |
| ---------------------------------- | ---------------------- |
| The app                            | http://localhost:3000  |
| Supabase Studio (database browser) | http://127.0.0.1:54323 |
| Test email inbox (Mailpit)         | http://127.0.0.1:54324 |

## 2. Set up the Supabase project

1. **Create a project** at [supabase.com](https://supabase.com/dashboard). Pick the region closest to the family
   (for Ghana, `eu-west` regions are usually fastest).
2. **Link and push the schema** from this folder:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push            # applies supabase/migrations/*
   ```
   Don't load `seed.sql` into production; it's sample data.
   The migrations create everything the app needs:
   - the tables and the redacting views
   - the `visitor` role and the RLS policies
   - the private `media` storage bucket and its policies.
3. **Authentication → URL Configuration**:
   - _Site URL_: your production address, e.g. `https://ourfamilytree.example.com`.
   - _Redirect URLs_: add `https://ourfamilytree.example.com/auth/callback`. Also add
     `http://localhost:3000/auth/callback` if you'll test locally against this project.
4. **Authentication → Sign In / Providers**:
   - **Email**: enabled. Leave _Confirm email_ on; magic links double as confirmation.
   - **Google**: enable it and paste the Client ID and Secret from a Google Cloud OAuth client (type "Web
     application"). In Google Cloud, set the _Authorized redirect URI_ to the callback URL Supabase shows on the
     Google provider page (`https://<project-ref>.supabase.co/auth/v1/callback`). Then set
     `NEXT_PUBLIC_GOOGLE_SIGN_IN=true` and redeploy; the "Continue with Google" button is hidden until you do.
   - Leave _Allow new users to sign up_ **on**. The app itself decides who gets in:
     - the first person becomes admin
     - anyone else lands as "pending" and sees nothing until you activate them (see section 6)
     - once an admin exists, magic links are only sent to existing accounts.
5. **Emails**: Supabase's built-in email sender is heavily rate-limited. Before inviting relatives, set up custom
   SMTP under _Authentication → Emails → SMTP Settings_, for example with Resend, which Phase 2 uses anyway.
6. **Keys** (_Project Settings → API keys_ and _JWT Keys_): copy the anon (or publishable) key, the service-role
   key and the **legacy JWT secret** into your environment variables (section 3).
   The app signs its short-lived visitor tokens with the JWT secret, so the project must accept HS256 tokens
   signed with it. The legacy JWT secret is still verified by default. If you later move to asymmetric JWT
   signing keys, keep the legacy HS256 secret as a verification key.
7. **Storage**: nothing to do. The `media` bucket is private, and files are only ever served through short-lived
   signed URLs after a visibility check.

## 3. Environment variables

See [`.env.example`](.env.example).

| Variable                        | Where it's used     | Where to find it                                    |
| ------------------------------- | ------------------- | --------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | browser + server    | Project Settings → API                              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser + server    | Project Settings → API keys (anon / publishable)    |
| `NEXT_PUBLIC_SITE_URL`          | sign-in email links | your site's address                                 |
| `NEXT_PUBLIC_GOOGLE_SIGN_IN`    | sign-in page        | `true` once Google is set up (optional)             |
| `SUPABASE_SERVICE_ROLE_KEY`     | **server only**     | Project Settings → API keys (service_role / secret) |
| `SUPABASE_JWT_SECRET`           | **server only**     | Project Settings → JWT Keys → legacy JWT secret     |
| `PASSCODE_COOKIE_SECRET`        | **server only**     | make one: `openssl rand -hex 32`                    |

On its own, the anon key can read nothing: the migrations revoke every table and view from `anon`. That's
what stops anyone skipping the passcode by calling the Supabase API directly.

## 4. Migrations and seed data

All schema changes are versioned SQL files in `supabase/migrations`. Never edit the production schema by hand.

```bash
npx supabase migration new <name>      # create a new migration file
npx supabase db reset                  # local: re-run all migrations + seed.sql
npx supabase db push                   # production: apply new migrations
npm run db:types                       # regenerate src/lib/supabase/database.types.ts
```

| File                               | What it holds                                                                                                                             |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `…0100_core_schema.sql`            | Tables and enums. Fuzzy dates are stored as grouped columns. Indexes on every foreign key and search column                               |
| `…0200_functions_and_triggers.sql` | Who-is-living rule, integrity triggers (no cycles, at most 2 birth parents), display names, audit log, first-admin sign-up, rate limiting |
| `…0300_privacy.sql`                | `visitor` role, grants, RLS on every table, the redacting `v_*` views, storage bucket and policies                                        |
| `…0400_tree_search_and_rpcs.sql`   | Tree window, ancestors/descendants, family, search, duplicates, research gaps, `save_person` and `add_relative`                           |

**Seed data** (`supabase/seed.sql`) is the fictional Mensah family:

- Opanyin Kwame Mensah with two concurrent wives and children by each (half-siblings)
- an adopted son, a step-mother and a guardian
- day, baptismal, married and nickname names
- "about", "between", unknown and free-text dates
- two people with a missing parent
- a mix of living and deceased people, including one deceased only by inference and one marked deceased by
  the admin.

**Load testing:** `psql "$DB_URL" -f supabase/seeds/large-family.sql` adds about 3,500 synthetic people.
Measured locally for a passcode visitor:

- the default tree window loads in about 70 ms
- four generations of descendants (250+ people) load in about 0.3 s
- search takes about 150–270 ms.

## 5. Deploy to Vercel

1. Push this repository to GitHub and **import it in Vercel** (framework: Next.js; defaults are fine).
2. Add the six environment variables from section 3 for _Production_ (and _Preview_ if you use it).
3. Deploy. Then set your custom domain, and make sure it matches `NEXT_PUBLIC_SITE_URL` and the Supabase
   _Site URL_ / _Redirect URLs_.
4. Sign in once to become the admin (section 6), then open **Admin → Settings**:
   - set the family name, the welcome text and the "start exploring from" ancestor
   - **set the family passcode**. Until it's set, nobody but signed-in members can get in.

`npm install` runs `scripts/copy-elk-worker.mjs`, which puts the tree-layout worker in `public/`. Vercel runs
it automatically.

## 6. First sign-in and giving relatives access

- **The first account created becomes the admin.** Sign in with Google or a magic link before sharing the site.
- After that, **new sign-ups are "pending"**: they can use the passcode like any visitor, but see no private
  details. Phase 2 adds invite links and a user-management page. Until then, activate a relative in
  _Supabase → SQL Editor_:
  ```sql
  -- make someone a member (sees living people's details) or an editor (can edit)
  update public.user_profiles
     set status = 'active', role = 'editor'   -- or 'member'
   where email = 'relative@example.com';
  ```
- Visitors only need the **family passcode**:
  - they enter it once and a signed cookie remembers them for a year
  - after five tries from one IP address, it locks for 10 minutes
  - changing the passcode in Admin → Settings signs everyone out of the passcode.

## 7. Backups

Keep backups in at least two places.

1. **Supabase's own backups.** Paid plans take daily backups automatically (_Database → Backups_), and
   point-in-time recovery is available as an add-on. The free plan has no automatic backups, so use options 2–3.
2. **Weekly database dump via GitHub Actions**, in `.github/workflows/backup.yml`:
   - Add a repository secret `SUPABASE_DB_URL`: _Supabase → Connect → Session pooler_ connection string, with
     your database password.
   - Every Sunday it saves `roles.sql`, `schema.sql` and `data.sql` as a private workflow artifact, kept for
     90 days. You can also run it any time from the Actions tab.
   - To restore into a fresh project:
     ```bash
     psql "$NEW_DB_URL" -f roles.sql -f schema.sql -f data.sql
     ```
3. **Photos and documents** live in Supabase Storage, not the database, so a dump doesn't include them. You can
   download everything in two ways:
   - _Admin → Download everything_ gives a ZIP of `data.json` plus every file, or data-only JSON.
   - `npm run export` does the same from a trusted computer. It needs `.env.local` with the service-role key,
     and writes to `backups/<date>/`.

   Do this monthly and keep a copy off-line.

## 8. Tests

```bash
npm run check          # prettier, eslint, typecheck, unit tests (Vitest)
./scripts/test-db.sh   # pgTAP database tests against the local Supabase (plain psql)
npm run test:e2e       # Playwright smoke tests: passcode gate → tree → profile (needs npm run build first)
```

| Suite                                         | Covers                                                                                                                                                               |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `supabase/tests/database/01_privacy.test.sql` | Who-is-living rule. What anon, visitors, pending users and members can see: redacted fields, names, facts, union dates, places, every media rule, search by nickname |
| `…/02_tree_and_integrity.test.sql`            | Ancestors, descendants, adopted vs step, paternal/maternal/both windows, expand flags, step links, fuzzy search, cycle and 3-birth-parent rejection                  |
| `…/03_writes.test.sql`                        | Editors can create people and relatives, members can't; odd-date warnings; audit log grouping                                                                        |
| `tests/unit/*`                                | Fuzzy-date formatting and parsing, profile grouping/timeline/gaps, tree graph building and merging                                                                   |
| `tests/e2e/smoke.spec.ts`                     | Passcode → tree → re-centre → profile on phone and desktop; living-person privacy; noindex                                                                           |

CI (`.github/workflows/ci.yml`) runs all of it on every pull request.

## 9. How privacy works

Privacy is enforced **in the database**, never just by hiding things in the UI.

- **anon** (the public key): no access to anything.
- **Passcode visitors**:
  - The server checks the signed passcode cookie, including its passcode version, and then calls Supabase with
    a 5-minute token for the `visitor` database role.
  - That role can read only the `v_*` views. For living people, those views blank out:
    - birth, death and places
    - clan, totem, hometown, occupation and bio
    - other names
    - facts, sources and union dates.
  - Photos of living people are hidden, except each person's own profile photo.
- **Signed-in users**: RLS on the base tables checks `user_profiles`.
  - Pending or disabled users see nothing.
  - Members read everything.
  - Editors and admins write.
  - Every change is written to `audit_log` by triggers, grouped per action.
- **Who counts as living:**
  - the admin's override comes first
  - then any death record means deceased
  - then born more than 110 years ago, or a child born more than 100 years ago, means deceased
  - otherwise, including when nothing is known, the person is treated as **living**.
- **Media**: one private bucket. The server signs a URL (valid 1 hour) only for files that the viewer's own
  `v_media` view returns.
- **Search engines**: `robots.txt` disallows everything, every page has `noindex, nofollow`, and every response
  has `X-Robots-Tag`.

## 10. Project layout

```
src/
  app/                 routes (passcode, login, auth callback, (site)/… pages, api/tree, api/search, api/export)
  components/          ui/ (buttons, inputs…), layout/, person/, profile/, forms/, tree/, media/, admin/, search/
  lib/                 pure code: fuzzy dates, validation (Zod), tree graph + ELK layout, profile helpers, types
  server/              server-only: viewer (who is asking), Supabase clients, passcode, queries/, actions/
  proxy.ts             session refresh + noindex header (Next 16's name for middleware)
supabase/
  migrations/          versioned schema
  seed.sql             sample family
  seeds/               optional load-test data
  tests/database/      pgTAP tests
tests/unit, tests/e2e  Vitest and Playwright
scripts/               ELK worker copy, database test runner, command-line export
```
