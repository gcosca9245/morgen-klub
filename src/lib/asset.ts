/** Basis-Pfad des statischen Exports (z. B. „/morgen-klub“ auf GitHub Pages). */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** Löst einen Pfad aus /public gegen den Basis-Pfad auf. */
export function asset(path: `/${string}`): string {
  return `${BASE_PATH}${path}`;
}

/** Erzeugt srcSet-Strings für die in scripts/build-assets.mjs erzeugten Varianten. */
export function srcSet(name: string, widths: readonly number[], ext: 'avif' | 'webp'): string {
  return widths.map((w) => `${asset(`/media/${name}-${w}.${ext}`)} ${w}w`).join(', ');
}
