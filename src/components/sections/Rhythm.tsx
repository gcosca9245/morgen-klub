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
  woechentlich: 'left-[5%] top-[62%] md:left-[9%] md:top-[60%] short:left-[48%]! short:top-[72%]!',
  zweiwoechentlich: 'right-[6%] top-[44%] md:left-[47%] md:right-auto md:top-[30%] short:left-[62%]! short:top-[20%]!',
  monatlich: 'right-[6%] top-[84%] md:right-[8%] md:top-[64%] short:right-[3%]! short:top-[58%]!',
};

/**
 * „Finde deinen Rhythmus“: Der Drehteller mit den Röstungen dreht sich mit dem Scroll
 * einmal um 360°, danach fliegen die Liefer-Rhythmen als wählbare Pills herein.
 */
export function Rhythm() {
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const seq = useFrameSequence(canvas, 'turntable');
  const { rhythm } = useSelection();
  const { scrollTo } = useSmoothScroll();

  useGsap(
    ({ gsap }) => {
      const el = root.current!;
      const dots = gsap.utils.toArray<HTMLElement>('[data-dot]', el);
      if (prefersReducedMotion()) {
        gsap.set('[data-pill], [data-quote], [data-line2] [data-word]', { autoAlpha: 1 });
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
        .fromTo('[data-quote]', { autoAlpha: 0, x: -12 }, { autoAlpha: 1, x: 0, duration: 0.08, ease: EASE.out }, 0.34)
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
        className="absolute -left-[18%] bottom-[6%] aspect-video w-[136%] will-change-transform [mask-image:radial-gradient(52%_52%_at_50%_54%,#000_72%,transparent_100%)] md:-bottom-[3%] md:left-auto md:-right-[3%] md:w-[76%] short:-right-[1%]! short:bottom-[4%]! short:w-[52%]!"
      />

      <div className="relative z-10 mx-auto h-full max-w-[1600px] px-5 pt-28 md:px-10 md:pt-[22vh] short:pt-20!">
        <h2 id="rhythm-title" data-rhythm-title className="font-display max-w-[44rem] text-[clamp(2.6rem,5.4vw,5.2rem)] font-extrabold leading-[0.92] short:max-w-[48%] short:text-[2.3rem]!">
          {/* Textwechsel wie in der Referenz: Anführungszeichen setzen ein, zweite Zeile „veredelt.“ steigt auf. */}
          <span className="block">
            <span data-quote className="inline-block opacity-0" aria-hidden="true">
              „
            </span>
            Finde deinen Rhythmus
          </span>
          <span data-line2 className="block text-[1.18em]">
            <SplitWords text="veredelt.“" />
          </span>
        </h2>
        <div data-rhythm-body className="mt-5 max-w-[24rem] short:mt-3 short:max-w-[42%]">
          <p className="text-lg leading-snug text-roast/80 short:text-base">
            Frisch geröstet und so oft, wie du ihn trinkst: jede Woche, alle 14 Tage oder einmal im Monat.
          </p>
          <PillButton size="lg" className="mt-7 short:mt-4" onClick={() => scrollTo('#abo', { offset: -24 })}>
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
              // Dunkle Pills wie in der Referenz; die gewählte Option leuchtet karamell.
              rhythm === r.id ? 'bg-caramel-deep text-foam ring-2 ring-roast ring-offset-2 ring-offset-cream' : 'bg-roast text-foam hover:bg-espresso',
            )}
          >
            <span className="block motion-safe:animate-[bob_5s_ease-in-out_infinite]">{r.label}</span>
          </button>
        ))}
      </div>

      <p aria-live="polite" className="absolute bottom-16 left-5 z-20 text-sm text-roast/70 md:left-10 short:bottom-5">
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
