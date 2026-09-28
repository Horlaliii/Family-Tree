import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/** A labelled form row with hint and error text wired up for screen readers. */
export function Field({
  id,
  label,
  hint,
  error,
  children,
  className,
}: {
  id: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id} className="text-base">
        {label}
      </Label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-muted-foreground text-sm">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

export function FieldGroup({
  legend,
  description,
  children,
  className,
}: {
  legend: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={cn('bg-card space-y-4 rounded-xl border p-4 sm:p-5', className)}>
      <legend className="float-left mb-2 w-full font-serif text-lg font-semibold">{legend}</legend>
      {description && <p className="text-muted-foreground clear-both -mt-2 text-sm">{description}</p>}
      <div className="clear-both space-y-4">{children}</div>
    </fieldset>
  );
}
