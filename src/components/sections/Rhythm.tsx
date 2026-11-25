'use client';

import { useRef } from 'react';
import { useGsap } from '@/hooks/useGsap';
import { useFrameSequence } from '@/hooks/useFrameSequence';
import { prefersReducedMotion } from '@/hooks/useReducedMotion';
import { RHYTHMS, type RhythmId } from '@/lib/catalog';
import { EASE } from '@/lib/gsap';
import { cn } from '@/lib/cn';
import { updateSelection, useSelection } from '@/lib/subscription-store';
import { PillButton } from '../ui/PillButton';
import { SplitWords } from '../ui/SplitWords';
import { useSmoothScroll } from '../providers/SmoothScroll';

/** Position der Rhythmus-Pills um den Drehteller (Desktop / Mobil). */
const PILL_LAYOUT: Record<RhythmId, string> = {
  woechentlich: 'left-[6%] top-[60%] md:left-[30%] md:top-[64%] -rotate-3',
  zweiwoechentlich: 'right-[8%] top-[47%] md:right-[26%] md:top-[30%] rotate-2',
  monatlich: 'right-[10%] top-[84%] md:right-[9%] md:top-[70%] -rotate-2',
};

/**
 * „Finde deinen Rhythmus“: Der Drehteller mit den Röstungen dreht sich mit dem Scroll
 * einmal um 360°, danach fliegen die Liefer-Rhythmen als wählbare Pills herein.
 */
export function Rhythm() {
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const seq = useFrameSequence(canvas, 'turntable', { focusX: 0.62, focusY: 0.6 });
  const { rhythm } = useSelection();
  const { scrollTo } = useSmoothScroll();

  useGsap(
    ({ gsap }) => {
      const el = root.current!;
      const dots = gsap.utils.toArray<HTMLElement>('[data-dot]', el);
      if (prefersReducedMotion()) {
        gsap.set('[data-pill], [data-line2] [data-word]', { autoAlpha: 1 });
        return;
      }
      const film = { p: 0 };
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: el,
          start: 'top top',
          end: () => `+=${window.innerHeight * 2.4}`,
          pin: true,
          scrub: 0.5,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const idx = Math.min(dots.length - 1, Math.floor(self.progress * dots.length));
            dots.forEach((d, i) => (d.dataset.active = String(i === idx)));
          },
        },
      });

      tl.to(film, { p: 1, duration: 1, onUpdate: () => seq.current?.setProgress(film.p) }, 0)
        .fromTo(canvas.current, { scale: 1.06 }, { scale: 1, duration: 0.3, ease: EASE.out }, 0)
        .to('[data-rhythm-body]', { autoAlpha: 0, y: -24, duration: 0.1, ease: 'power1.in' }, 0.3)
        .to('[data-rhythm-title]', { y: () => (window.innerWidth < 768 ? -10 : -40), duration: 0.18, ease: EASE.inOut }, 0.3)
        .fromTo(
          '[data-line2] [data-word]',
          { yPercent: 110 },
          { yPercent: 0, duration: 0.12, stagger: 0.02, ease: EASE.out },
          0.36,
        )
        .fromTo(
          '[data-pill]',
          { autoAlpha: 0, scale: 0.4, rotate: (i: number) => (i % 2 ? 10 : -10), y: 40 },
          { autoAlpha: 1, scale: 1, rotate: 0, y: 0, duration: 0.14, stagger: 0.08, ease: EASE.spring },
          0.44,
        );
    },
    root,
  );

  const active = RHYTHMS.find((r) => r.id === rhythm);

  return (
    <section
      id="rhythmus"
      ref={root}
      data-header-tone="dark"
      aria-labelledby="rhythm-title"
      className="relative h-[100svh] overflow-hidden bg-cream text-roast"
    >
      <canvas
        ref={canvas}
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[58%] w-full will-change-transform [mask-image:radial-gradient(50%_50%_at_50%_52%,#000_58%,transparent_100%)] md:inset-y-0 md:left-auto md:right-0 md:h-full md:w-[72%]"
      />

      <div className="relative z-10 mx-auto h-full max-w-[1600px] px-5 pt-28 md:px-10 md:pt-[22vh]">
        <h2 id="rhythm-title" data-rhythm-title className="font-display max-w-[44rem] text-[clamp(2.6rem,5.4vw,5.2rem)] font-extrabold leading-[0.92]">
          <span className="block">Finde deinen Rhythmus.</span>
          <span data-line2 className="block text-caramel-deep">
            <SplitWords text="Wir liefern im Takt." />
          </span>
        </h2>
        <div data-rhythm-body className="mt-5 max-w-[24rem]">
          <p className="text-lg leading-snug text-roast/80">
            Frisch geröstet und so oft, wie du ihn trinkst: jede Woche, alle 14 Tage oder einmal im Monat.
          </p>
          <PillButton size="lg" className="mt-7" onClick={() => scrollTo('#abo', { offset: -24 })}>
            Klub beitreten
          </PillButton>
        </div>
      </div>

      <div role="group" aria-label="Liefer-Rhythmus wählen" className="absolute inset-0 z-20 pointer-events-none">
        {RHYTHMS.map((r) => (
          <button
            key={r.id}
            type="button"
            data-pill
            aria-pressed={rhythm === r.id}
            onClick={() => updateSelection({ rhythm: r.id })}
            className={cn(
              'pointer-events-auto invisible absolute rounded-full px-5 py-2.5 font-display text-[clamp(1.1rem,2vw,1.9rem)] font-bold shadow-[0_14px_30px_-14px_rgba(61,34,24,0.55)] transition-colors duration-500 md:px-7 md:py-3',
              PILL_LAYOUT[r.id],
              rhythm === r.id ? 'bg-roast text-foam' : 'bg-foam text-roast ring-1 ring-roast/15 hover:bg-milk',
            )}
          >
            <span className="block motion-safe:animate-[bob_5s_ease-in-out_infinite]">{r.label}</span>
          </button>
        ))}
      </div>

      <p aria-live="polite" className="absolute bottom-16 left-5 z-20 text-sm text-roast/70 md:left-10">
        {active ? `${active.label}: ${Math.round(active.discount * 100)} % Klub-Rabatt pro Lieferung` : null}
      </p>

      <div aria-hidden="true" className="absolute inset-x-0 bottom-7 z-20 flex justify-center gap-2">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            data-dot
            data-active={i === 0}
            className="h-[6px] w-[6px] rounded-full bg-roast/30 transition-all duration-700 ease-[var(--ease-out-expo)] data-[active=true]:w-7 data-[active=true]:bg-roast"
          />
        ))}
      </div>
    </section>
  );
}
