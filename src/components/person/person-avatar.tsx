import { cn, initials } from '@/lib/utils';

const SIZES = {
  sm: 'size-10 text-sm',
  md: 'size-12 text-base',
  lg: 'size-20 text-2xl',
  xl: 'size-28 text-4xl sm:size-32',
} as const;

export function PersonAvatar({
  name,
  url,
  sex,
  size = 'md',
  className,
}: {
  name: string;
  url?: string | null;
  sex?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 font-serif font-semibold',
        sex === 'female'
          ? 'border-accent/60 bg-accent-soft text-foreground'
          : sex === 'male'
            ? 'border-primary/40 bg-primary/10 text-primary'
            : 'border-border bg-muted text-muted-foreground',
        SIZES[size],
        className,
      )}
    >
      {url ? (
        // Signed, short-lived storage URLs: the Next image optimiser can't cache them.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
    </span>
  );
}
