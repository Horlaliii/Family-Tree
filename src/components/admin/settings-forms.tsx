'use client';

import { KeyRound, Loader2, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Field } from '@/components/forms/field';
import { PersonPicker } from '@/components/forms/person-picker';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { SearchResult } from '@/lib/types';
import { changePasscode, saveSiteSettings, setPasscodeEnabled } from '@/server/actions/settings';

export function SiteSettingsForm({
  siteName,
  introMd,
  featured,
}: {
  siteName: string;
  introMd: string;
  featured: SearchResult | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(siteName);
  const [intro, setIntro] = useState(introMd);
  const [person, setPerson] = useState<SearchResult | null>(featured);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await saveSiteSettings({
            siteName: name,
            introMd: intro,
            featuredPersonId: person?.id ?? null,
          });
          setMessage(res.ok ? { ok: true, text: 'Saved.' } : { ok: false, text: res.error });
          if (res.ok) router.refresh();
        });
      }}
    >
      <Field
        id="site-name"
        label="Family name"
        hint="Shown on the passcode page and at the top of every page."
      >
        <Input id="site-name" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field id="intro" label="Welcome text on the home page" hint="You can use **bold** and *italics*.">
        <Textarea id="intro" rows={5} value={intro} onChange={(e) => setIntro(e.target.value)} />
      </Field>
      <PersonPicker
        id="featured"
        label="“Start exploring from…” ancestor"
        selected={person}
        onSelect={setPerson}
      />
      {message && <Alert variant={message.ok ? 'info' : 'destructive'}>{message.text}</Alert>}
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <Save />} Save
      </Button>
    </form>
  );
}

export function PasscodeSettings({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [passcode, setPasscode] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
        <div>
          <p className="font-medium">Passcode gate is {enabled ? 'on' : 'off'}</p>
          <p className="text-muted-foreground text-sm">
            {enabled
              ? 'Visitors must enter the family passcode.'
              : 'Anyone with the link can browse as a visitor (living people stay private).'}
          </p>
        </div>
        <Button
          variant={enabled ? 'outline' : 'default'}
          disabled={pending}
          onClick={() => {
            if (
              enabled &&
              !window.confirm('Turn off the passcode? Anyone with the link could browse the tree.')
            )
              return;
            startTransition(async () => {
              const res = await setPasscodeEnabled(!enabled);
              setMessage(res.ok ? null : { ok: false, text: res.error });
              router.refresh();
            });
          }}
        >
          Turn {enabled ? 'off' : 'on'}
        </Button>
      </div>

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const res = await changePasscode({ passcode, confirm });
            if (!res.ok) return setMessage({ ok: false, text: res.error });
            setPasscode('');
            setConfirm('');
            setMessage({ ok: true, text: 'Passcode changed. Share the new one with the family.' });
            router.refresh();
          });
        }}
      >
        <p className="text-muted-foreground text-sm">
          Changing the passcode signs out every visitor; they will need the new one.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="new-passcode" label="New passcode">
            <Input
              id="new-passcode"
              type="password"
              autoComplete="new-password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
            />
          </Field>
          <Field id="confirm-passcode" label="Type it again">
            <Input
              id="confirm-passcode"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </Field>
        </div>
        {message && <Alert variant={message.ok ? 'info' : 'destructive'}>{message.text}</Alert>}
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <KeyRound />} Change passcode
        </Button>
      </form>
    </div>
  );
}
