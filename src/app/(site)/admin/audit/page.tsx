import type { Metadata } from 'next';
import Link from 'next/link';

import { RestoreButton } from '@/components/admin/restore-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { describeEntry, diff, personIdsIn, TABLE_LABELS } from '@/lib/audit';
import { cn } from '@/lib/utils';
import { createUserSupabase } from '@/server/supabase';
import { requireRole } from '@/server/viewer';

export const metadata: Metadata = { title: 'Audit log' };

const PAGE_SIZE = 40;
type Row = Record<string, unknown> | null;

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ table?: string; page?: string }>;
}) {
  await requireRole('admin');
  const sp = await searchParams;
  const table = sp.table && TABLE_LABELS[sp.table] ? sp.table : null;
  const page = Math.max(1, Number.parseInt(sp.page ?? '1', 10) || 1);
  const db = await createUserSupabase();

  let query = db
    .from('audit_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (table) query = query.eq('table_name', table);
  const { data: entries, count, error } = await query;
  if (error) throw error;

  const [{ data: profiles }, { data: removed }] = await Promise.all([
    db.from('user_profiles').select('user_id, display_name, email'),
    db
      .from('persons')
      .select('id, display_name, deleted_at')
      .not('deleted_at', 'is', null)
      .order('deleted_at', {
        ascending: false,
      }),
  ]);
  const actors = new Map((profiles ?? []).map((p) => [p.user_id, p.display_name ?? p.email ?? 'Someone']));

  const personIds = [
    ...new Set(
      (entries ?? []).flatMap((e) => [
        ...personIdsIn(e.table_name, e.after as Row),
        ...personIdsIn(e.table_name, e.before as Row),
      ]),
    ),
  ];
  const { data: people } = personIds.length
    ? await db.from('persons').select('id, slug, display_name, deleted_at').in('id', personIds)
    : { data: [] };
  const names = new Map((people ?? []).map((p) => [p.id, p]));
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const href = (over: Record<string, string | number | null>) => {
    const params = new URLSearchParams();
    const t = over.table === undefined ? table : over.table;
    if (t) params.set('table', String(t));
    params.set('page', String(over.page ?? page));
    return `/admin/audit?${params}`;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Audit log</h1>

      {removed && removed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Removed people</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {removed.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 py-2">
                  <span>
                    {p.display_name}{' '}
                    <span className="text-muted-foreground text-sm">
                      removed {new Date(p.deleted_at!).toLocaleDateString('en-GB')}
                    </span>
                  </span>
                  <RestoreButton personId={p.id} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2" role="group" aria-label="Show changes to">
        <Link
          href={href({ table: null, page: 1 })}
          className={cn(
            'rounded-full border px-3 py-1.5 text-sm',
            !table ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
          )}
        >
          Everything
        </Link>
        {Object.entries(TABLE_LABELS).map(([key, label]) => (
          <Link
            key={key}
            href={href({ table: key, page: 1 })}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm',
              table === key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
            )}
          >
            {label}
          </Link>
        ))}
      </div>

      <ol className="space-y-3">
        {(entries ?? []).map((e) => {
          const before = e.before as Row;
          const after = e.after as Row;
          const changes = diff(before, after);
          const who = [
            ...new Set([...personIdsIn(e.table_name, after), ...personIdsIn(e.table_name, before)]),
          ]
            .map((id) => names.get(id))
            .filter(Boolean);
          return (
            <li key={e.id} className="bg-card rounded-xl border p-3">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <Badge
                  variant={
                    e.action === 'delete' ? 'destructive' : e.action === 'insert' ? 'success' : 'secondary'
                  }
                >
                  {describeEntry(e.table_name, e.action, before, after)}
                </Badge>
                <span className="text-muted-foreground">
                  {new Date(e.created_at).toLocaleString('en-GB', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}{' '}
                  by {e.actor_id ? (actors.get(e.actor_id) ?? 'a former user') : 'the system'}
                </span>
              </div>
              {who.length > 0 && (
                <p className="mt-1 text-sm">
                  {who.map((p, i) => (
                    <span key={p!.id}>
                      {i > 0 && ' · '}
                      {p!.deleted_at ? (
                        p!.display_name
                      ) : (
                        <Link
                          href={`/people/${p!.slug}`}
                          className="text-primary underline underline-offset-4"
                        >
                          {p!.display_name}
                        </Link>
                      )}
                    </span>
                  ))}
                </p>
              )}
              {changes.length > 0 && (
                <details className="mt-2 text-sm">
                  <summary className="text-muted-foreground cursor-pointer">
                    {changes.length} {changes.length === 1 ? 'detail' : 'details'}
                  </summary>
                  <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                    {changes.map((c) => (
                      <div key={c.field} className="contents">
                        <dt className="text-muted-foreground capitalize">{c.field}</dt>
                        <dd className="break-words">
                          {e.action === 'update' ? (
                            <>
                              <span className="line-through opacity-70">{c.before}</span> → {c.after}
                            </>
                          ) : e.action === 'insert' ? (
                            c.after
                          ) : (
                            c.before
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </details>
              )}
            </li>
          );
        })}
      </ol>

      {pages > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-between">
          {page > 1 ? (
            <Button asChild variant="outline">
              <Link href={href({ page: page - 1 })}>Newer</Link>
            </Button>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground text-sm">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Button asChild variant="outline">
              <Link href={href({ page: page + 1 })}>Older</Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
