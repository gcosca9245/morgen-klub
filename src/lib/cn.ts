/** Minimaler className-Joiner ohne Zusatzabhängigkeit. */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}
