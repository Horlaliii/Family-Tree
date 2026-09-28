import { Lightbulb } from 'lucide-react';
import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Gap } from '@/lib/profile';

export function MissingInfo({ gaps, canEdit }: { gaps: Gap[]; canEdit: boolean }) {
  if (gaps.length === 0) return null;
  return (
    <Card className="border-accent/40 bg-accent-soft/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lightbulb className="text-accent size-5" aria-hidden /> Missing information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {gaps.map((g) => (
            <li key={g.key} className="flex items-center justify-between gap-3 text-sm">
              <span>{g.message}</span>
              {canEdit && g.action && (
                <Link
                  href={g.action.href}
                  className="text-primary shrink-0 font-medium underline-offset-4 hover:underline"
                >
                  {g.action.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
        {!canEdit && (
          <p className="text-muted-foreground mt-3 text-sm">Know something? Tell the family historian.</p>
        )}
      </CardContent>
    </Card>
  );
}
