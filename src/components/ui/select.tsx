import { ChevronDown } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * A styled native <select>. Native pickers are the most usable option on
 * phones and need no JavaScript.
 */
function NativeSelect({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <div className="relative">
      <select
        data-slot="select"
        className={cn(
          'border-input bg-card focus-visible:border-ring focus-visible:ring-ring/30 flex h-11 w-full appearance-none rounded-lg border py-2 pr-9 pl-3 text-base shadow-xs outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2"
      />
    </div>
  );
}

export { NativeSelect };
