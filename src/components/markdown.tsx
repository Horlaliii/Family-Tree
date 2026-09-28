import ReactMarkdown from 'react-markdown';

import { cn } from '@/lib/utils';

/** Renders family-written markdown (bios, intro). Raw HTML is not allowed. */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div
      className={cn(
        '[&_a]:text-primary space-y-3 leading-relaxed [&_a]:underline [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_strong]:font-semibold [&_ul]:list-disc',
        className,
      )}
    >
      <ReactMarkdown skipHtml>{children}</ReactMarkdown>
    </div>
  );
}
