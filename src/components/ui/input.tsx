import * as React from 'react';

import { cn } from '@/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'border-input bg-card placeholder:text-muted-foreground/80 focus-visible:border-ring focus-visible:ring-ring/30 aria-invalid:border-destructive flex h-11 w-full min-w-0 rounded-lg border px-3 py-2 text-base shadow-xs transition-colors outline-none file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
