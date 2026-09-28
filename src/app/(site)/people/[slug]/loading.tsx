import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10" aria-busy="true" aria-label="Loading">
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        <Skeleton className="size-28 rounded-full sm:size-32" />
        <div className="w-full flex-1 space-y-3">
          <Skeleton className="mx-auto h-9 w-2/3 sm:mx-0" />
          <Skeleton className="mx-auto h-5 w-1/2 sm:mx-0" />
          <Skeleton className="mx-auto h-5 w-1/3 sm:mx-0" />
        </div>
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <Skeleton className="h-80 lg:col-span-3" />
        <Skeleton className="h-60 lg:col-span-2" />
      </div>
    </div>
  );
}
