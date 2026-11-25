'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { FrameSequence } from '@/lib/frame-sequence';
import { sequenceSource, type SequenceName } from '@/lib/sequences';

interface Options {
  /** Überschreibt den Fokus der gewählten Variante. */
  focusX?: number;
  /** Überschreibt den vertikalen Fokus der gewählten Variante. */
  focusY?: number;
  /** Laden erst starten, wenn das Canvas in die Nähe des Viewports kommt. */
  lazy?: boolean;
}

/**
 * Verbindet ein Canvas mit einer Scroll-Bildsequenz. Gibt eine Ref auf die Sequenz zurück,
 * deren `setProgress` von ScrollTrigger-Callbacks aufgerufen wird.
 */
export function useFrameSequence(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  name: SequenceName,
  { focusX, focusY, lazy = true }: Options = {},
) {
  const seqRef = useRef<FrameSequence | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const source = sequenceSource(name, canvas.clientWidth, canvas.clientHeight);
    const seq = new FrameSequence({
      urlFor: source.urlFor,
      count: source.count,
      focusX: focusX ?? source.focusX,
      focusY: focusY ?? source.focusY,
    });
    seq.attach(canvas);
    seqRef.current = seq;

    const ro = new ResizeObserver(() => seq.resize());
    ro.observe(canvas);

    let io: IntersectionObserver | undefined;
    const start = () => void seq.load();
    if (lazy) {
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            start();
            io?.disconnect();
          }
        },
        { rootMargin: '150% 0px' },
      );
      io.observe(canvas);
    } else if ('requestIdleCallback' in window) {
      window.requestIdleCallback(start, { timeout: 1200 });
    } else {
      setTimeout(start, 300);
    }

    return () => {
      ro.disconnect();
      io?.disconnect();
      seq.dispose();
      seqRef.current = null;
    };
  }, [canvasRef, name, focusX, focusY, lazy]);

  return seqRef;
}
