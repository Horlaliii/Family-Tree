import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "Kwame Mensah" -> "KM" */
export function initials(name: string): string {
  const words = name
    .replace(/^(nana|opanyin|rev\.?|dr\.?|mr\.?|mrs\.?|madam)\s+/i, '')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

/** Possessive for friendly copy: "Kofi's", "Yaw's". */
export function possessive(name: string): string {
  const first = name.split(/\s+/).find((w) => !/^(nana|opanyin)$/i.test(w)) ?? name;
  return first.endsWith('s') ? `${first}'` : `${first}'s`;
}

export function firstName(name: string): string {
  return name.split(/\s+/).find((w) => !/^(nana|opanyin)$/i.test(w)) ?? name;
}

export function pronoun(sex: string | null | undefined, form: 'subject' | 'object' | 'possessive') {
  const table = {
    male: { subject: 'he', object: 'him', possessive: 'his' },
    female: { subject: 'she', object: 'her', possessive: 'her' },
    unknown: { subject: 'they', object: 'them', possessive: 'their' },
  } as const;
  const key = sex === 'male' || sex === 'female' ? sex : 'unknown';
  return table[key][form];
}
