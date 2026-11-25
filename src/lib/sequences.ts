import manifest from './sequences.generated.json';
import { asset } from './asset';

export type SequenceName = keyof typeof manifest;

/** Wählt die passende Auflösung (720/1280) für die aktuelle Canvas-Größe. */
export function sequenceSource(name: SequenceName, cssWidth: number) {
  const dpr = typeof window === 'undefined' ? 1 : Math.min(window.devicePixelRatio || 1, 2);
  const width = cssWidth * dpr > 900 ? 1280 : 720;
  return {
    count: manifest[name],
    urlFor: (i: number) => asset(`/media/seq/${name}/${width}/${String(i + 1).padStart(3, '0')}.webp`),
    poster: asset(`/media/seq/${name}/${width}/001.webp`),
  };
}
