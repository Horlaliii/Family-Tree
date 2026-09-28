import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function PersonNotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="kente-band mx-auto h-1.5 w-24 rounded-full" aria-hidden />
      <h1 className="mt-6 text-2xl font-semibold">We couldn&apos;t find that person</h1>
      <p className="text-muted-foreground mt-2">They may have been removed or the link may be old.</p>
      <Button asChild className="mt-6">
        <Link href="/search">Search the family</Link>
      </Button>
    </div>
  );
}
