import manifest from './sequences.generated.json';
import { asset } from './asset';

export type SequenceName = keyof typeof manifest;

interface SequenceVariants {
  /** Querformat-Breiten in px, aufsteigend (Ordnername = Breite). */
  widths: readonly number[];
  /** Optionaler Hochformat-Ausschnitt (Ordner `p`) samt Fokus für Smartphones. */
  portrait?: { width: number; focusX: number; focusY: number };
  /** Bildausschnitt für die Querformat-Varianten. */
  focusX: number;
}

const VARIANTS: Record<SequenceName, SequenceVariants> = {
  hero: { widths: [1280, 1920], portrait: { width: 720, focusX: 0.5, focusY: 0.3 }, focusX: 0.62 },
  turntable: { widths: [720, 1280], focusX: 0.5 },
};

/** Ab diesem Seitenverhältnis (Breite/Höhe) wird der Hochformat-Ausschnitt geladen. */
export const PORTRAIT_MAX_ASPECT = 3 / 4;

const frameUrl = (name: SequenceName, dir: string, i: number, ext = 'webp') =>
  asset(`/media/seq/${name}/${dir}/${String(i + 1).padStart(3, '0')}.${ext}`);

/**
 * Wählt die kleinste Variante, die das Canvas bei aktueller Pixeldichte (max. 2×) scharf füllt.
 * Hochformatige Canvases bekommen – falls vorhanden – den eigens beschnittenen Hochformat-Satz.
 */
export function sequenceSource(name: SequenceName, cssWidth: number, cssHeight = 0) {
  const v = VARIANTS[name];
  const dpr = typeof window === 'undefined' ? 1 : Math.min(window.devicePixelRatio || 1, 2);
  const portrait = v.portrait && cssHeight > 0 && cssWidth / cssHeight <= PORTRAIT_MAX_ASPECT;
  let dir: string;
  let focusX = v.focusX;
  let focusY = 0.5;
  if (portrait && v.portrait) {
    dir = 'p';
    focusX = v.portrait.focusX;
    // Tablets im Hochformat schneiden oben/unten: Tasse bleibt unterhalb der Headline.
    focusY = v.portrait.focusY;
  } else {
    const needed = cssWidth * dpr * 0.85;
    dir = String(v.widths.find((w) => w >= needed) ?? v.widths[v.widths.length - 1]);
  }
  return {
    count: manifest[name],
    focusX,
    focusY,
    urlFor: (i: number) => frameUrl(name, dir, i),
    poster: frameUrl(name, dir, 0),
  };
}

/** Poster-URL eines Sequenz-Ordners (für `<picture>`-Quellen). */
export const sequencePoster = (name: SequenceName, dir: string, ext: 'webp' | 'avif') => frameUrl(name, dir, 0, ext);
