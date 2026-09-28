'use client';

import { KeyRound, Loader2 } from 'lucide-react';
import { useActionState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { enterPasscode, type PasscodeState } from './actions';

export function PasscodeForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<PasscodeState, FormData>(enterPasscode, {});

  return (
    <form action={formAction} className="mt-8 space-y-4 text-left">
      <input type="hidden" name="next" value={next} />
      <div className="space-y-2">
        <Label htmlFor="passcode" className="text-base">
          Family passcode
        </Label>
        <Input
          id="passcode"
          name="passcode"
          type="password"
          autoComplete="current-password"
          autoCapitalize="none"
          autoCorrect="off"
          required
          autoFocus
          className="h-12 text-lg"
          aria-invalid={Boolean(state.error)}
          aria-describedby={state.error ? 'passcode-error' : undefined}
        />
        {state.error && (
          <p id="passcode-error" role="alert" className="text-destructive text-sm">
            {state.error}
          </p>
        )}
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <KeyRound />}
        Enter
      </Button>
    </form>
  );
}
