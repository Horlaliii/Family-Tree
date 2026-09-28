'use client';

import { Eye, EyeOff, KeyRound, Loader2, LogIn, Mail, UserPlus } from 'lucide-react';
import { useActionState, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getBrowserSupabase } from '@/lib/supabase/browser';

import {
  createFirstAdmin,
  sendMagicLink,
  signInWithPassword,
  type MagicLinkState,
  type PasswordState,
} from './actions';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84z" />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

function Divider() {
  return (
    <div className="text-muted-foreground flex items-center gap-3 text-sm">
      <span className="bg-border h-px flex-1" /> or <span className="bg-border h-px flex-1" />
    </div>
  );
}

function FormError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p role="alert" className="text-destructive text-sm">
      {error}
    </p>
  );
}

function EmailInput({ invalid, defaultValue }: { invalid: boolean; defaultValue?: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor="email" className="text-base">
        Email address
      </Label>
      <Input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={defaultValue}
        className="h-12"
        aria-invalid={invalid}
      />
    </div>
  );
}

function PasswordInput({
  id,
  label,
  autoComplete,
  invalid,
}: {
  id: string;
  label: string;
  autoComplete: 'current-password' | 'new-password';
  invalid: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-base">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          name={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          required
          className="h-12 pr-12"
          aria-invalid={invalid}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex w-12 items-center justify-center"
          aria-label={show ? 'Hide password' : 'Show password'}
          aria-pressed={show}
        >
          {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      </div>
    </div>
  );
}

/** First run: nobody has an account yet, so the first person sets up the admin. */
export function SetupAdminForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<PasswordState, FormData>(createFirstAdmin, {});
  return (
    <form action={formAction} className="mt-8 space-y-4">
      <p className="bg-muted rounded-lg p-3 text-sm">
        No one has signed in yet. Create the <strong>admin</strong> account: it can edit everything and change
        the settings.
      </p>
      <input type="hidden" name="next" value={next} />
      <EmailInput invalid={Boolean(state.error)} defaultValue={state.email} />
      <PasswordInput
        id="password"
        label="Choose a password"
        autoComplete="new-password"
        invalid={Boolean(state.error)}
      />
      <PasswordInput
        id="confirm"
        label="Type it again"
        autoComplete="new-password"
        invalid={Boolean(state.error)}
      />
      <p className="text-muted-foreground text-sm">At least 8 characters.</p>
      <FormError error={state.error} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <UserPlus />}
        Create admin account
      </Button>
    </form>
  );
}

function MagicLinkForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<MagicLinkState, FormData>(sendMagicLink, {});

  if (state.sentTo) {
    return (
      <div className="bg-card rounded-xl border p-5 text-center" role="status">
        <Mail className="text-primary mx-auto size-8" />
        <p className="mt-3 font-medium">Check your email</p>
        <p className="text-muted-foreground mt-1 text-sm">
          If {state.sentTo} has an account, we sent it a sign-in link. Open it in this same browser.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <EmailInput invalid={Boolean(state.error)} defaultValue={state.email} />
      <FormError error={state.error} />
      <Button type="submit" variant="outline" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <Mail />}
        Email me a sign-in link
      </Button>
    </form>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<PasswordState, FormData>(signInWithPassword, {});
  const [useLink, setUseLink] = useState(false);
  const [googlePending, setGooglePending] = useState(false);

  async function signInWithGoogle() {
    setGooglePending(true);
    const { error } = await getBrowserSupabase().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) setGooglePending(false);
  }

  return (
    <div className="mt-8 space-y-6">
      {useLink ? (
        <MagicLinkForm next={next} />
      ) : (
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <EmailInput invalid={Boolean(state.error)} defaultValue={state.email} />
          <PasswordInput
            id="password"
            label="Password"
            autoComplete="current-password"
            invalid={Boolean(state.error)}
          />
          <FormError error={state.error} />
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <LogIn />}
            Sign in
          </Button>
        </form>
      )}

      <Divider />

      <div className="space-y-3">
        {/* Only offered once the Google provider is set up in Supabase. */}
        {process.env.NEXT_PUBLIC_GOOGLE_SIGN_IN === 'true' && (
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={signInWithGoogle}
            disabled={googlePending}
          >
            {googlePending ? <Loader2 className="animate-spin" /> : <GoogleIcon />}
            Continue with Google
          </Button>
        )}
        <Button variant="ghost" size="lg" className="w-full" onClick={() => setUseLink((v) => !v)}>
          {useLink ? (
            <>
              <KeyRound /> Sign in with a password
            </>
          ) : (
            <>
              <Mail /> Email me a sign-in link instead
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
